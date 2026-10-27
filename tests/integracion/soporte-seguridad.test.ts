// Soporte y seguridad (specs/16, 01, 02, 11): aviso a dirección al entrar en modo soporte, campana,
// solo lectura también en SQL crudo y transacciones, soporte en colegios suspendidos, último ingreso
// fuera de `iniciarSesion` y título del tutor en la libreta. Requiere la BD local; datos con sufijo y limpieza.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { registrarIngreso } from "@/lib/server/auth";
import { db, ErrorSoloLectura } from "@/lib/server/db";
import { datosLibreta } from "@/lib/server/libreta";
import { iniciarAccesoSoporte, terminarAccesoSoporte, type AdminContext } from "@/lib/server/plataforma";
import { resolverContextoColegio, soporteVigenteHasta } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));

const sufijo = randomUUID().slice(0, 8);
let colegio: ColegioPrueba;
let superadmin: Profile;
let admin: AdminContext;
let directora2: Profile;

const endpoint = `https://push.test-soporte.local/${sufijo}`;

beforeAll(async () => {
  colegio = await crearColegioPrueba({ plan: "promax", prefijo: "test-soporte-seg" });
  superadmin = await db.profile.create({ data: { id: randomUUID(), email: `super-seg-${sufijo}@test-soporte.local`, nombres: "Equipo", apellidos: "Soporte" } });
  await db.adminPlataforma.create({ data: { userId: superadmin.id } });
  admin = { user: superadmin };
  // Segunda directora: sin correo (preferencia apagada) y con un dispositivo push.
  directora2 = await db.profile.create({ data: { id: randomUUID(), email: `dir2-${sufijo}@test-soporte.local`, nombres: "Ana", apellidos: "Dir", genero: "femenino" } });
  const m = await db.membership.create({ data: { tenantId: colegio.tenant.id, userId: directora2.id, rol: "direccion" } });

  await db.preferenciaAviso.create({ data: { tenantId: colegio.tenant.id, apoderadoId: m.id, correo: false, push: true } });
  await db.pushSuscripcion.create({ data: { userId: directora2.id, endpoint, p256dh: "p".repeat(20), auth: "a".repeat(12) } });
});

afterAll(async () => {
  const ids = [superadmin.id, directora2.id];
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: { in: ids } } });
  await db.loginIntento.deleteMany({ where: { userId: { in: [...ids, colegio.miembros.tutora.user.id] } } });
  await db.pushSuscripcion.deleteMany({ where: { endpoint } });
  await colegio.limpiar();
  await db.profile.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

describe("aviso a la dirección al iniciar soporte", () => {
  let accesoId = "";

  it("encola soporte_inicio a cada directora según sus preferencias y a nadie más", async () => {
    expect(await soporteVigenteHasta(colegio.tenant.id)).toBeNull();
    const r = await iniciarAccesoSoporte(admin, colegio.tenant.id, { motivo: "Revisar la asistencia del día", minutos: 30 });
    accesoId = r.accesoId;
    const avisos = await db.aviso.findMany({ where: { tenantId: colegio.tenant.id, plantilla: "soporte_inicio" } });
    expect(avisos.every((a) => a.tipo === "alerta_direccion" && a.referenciaId === accesoId && a.apoderadoId === null)).toBe(true);
    const destinos = avisos.map((a) => `${a.canal}:${a.destinatario}`).sort();
    expect(destinos).toEqual([`correo:${colegio.miembros.direccion.user.email}`, `push:${endpoint}`].sort());
    expect(avisos[0].asunto).toContain("modo soporte");
    expect(avisos[0].payload).toMatchObject({ motivo: "Revisar la asistencia del día", url: expect.stringContaining("/configuracion/auditoria") });
    // Ni profesores, portería ni familias.
    const otros = [colegio.miembros.tutora, colegio.miembros.porteria, colegio.miembros.madre].map((x) => x.user.email);
    expect(avisos.some((a) => otros.includes(a.destinatario))).toBe(false);
  });

  it("la campana de dirección muestra el soporte vigente hasta su vencimiento", async () => {
    const hasta = await soporteVigenteHasta(colegio.tenant.id);
    expect(hasta?.getTime()).toBe((await db.accesoSoporte.findUniqueOrThrow({ where: { id: accesoId } })).expiraAt.getTime());
    await terminarAccesoSoporte(admin, accesoId);
    expect(await soporteVigenteHasta(colegio.tenant.id)).toBeNull();
  });

  it("no cuenta accesos de un super administrador inactivo", async () => {
    const r = await iniciarAccesoSoporte(admin, colegio.tenant.id, { motivo: "Otro acceso de prueba", minutos: 30 });
    await db.adminPlataforma.update({ where: { userId: superadmin.id }, data: { activo: false } });
    try {
      expect(await soporteVigenteHasta(colegio.tenant.id)).toBeNull();
    } finally {
      await db.adminPlataforma.update({ where: { userId: superadmin.id }, data: { activo: true } });
      await terminarAccesoSoporte(admin, r.accesoId);
    }
  });
});

describe("solo lectura completo en modo soporte", () => {
  it("bloquea SQL crudo de escritura y transacciones con escrituras; permite lecturas", async () => {
    const r = await iniciarAccesoSoporte(admin, colegio.tenant.id, { motivo: "Prueba de solo lectura", minutos: 30 });
    try {
      const ctx = await resolverContextoColegio(superadmin, colegio.tenant.slug);
      const { mateo } = colegio.alumnos;
      await expect(ctx.db.$executeRaw`UPDATE alumnos SET nombres = 'X' WHERE id = ${mateo.id}::uuid`).rejects.toBeInstanceOf(ErrorSoloLectura);
      await expect(ctx.db.$executeRawUnsafe(`UPDATE alumnos SET nombres = 'X' WHERE id = $1::uuid`, mateo.id)).rejects.toThrow("Modo soporte: solo lectura");
      await expect(ctx.db.$queryRaw`UPDATE alumnos SET nombres = 'X' WHERE id = ${mateo.id}::uuid RETURNING id`).rejects.toThrow("Modo soporte");
      await expect(ctx.db.$queryRawUnsafe(`DELETE FROM alumnos WHERE id = $1::uuid RETURNING id`, mateo.id)).rejects.toThrow("Modo soporte");
      await expect(ctx.db.$queryRaw`WITH x AS (UPDATE alumnos SET nombres = 'X' WHERE id = ${mateo.id}::uuid RETURNING id) SELECT * FROM x`).rejects.toThrow("Modo soporte");
      await expect(ctx.db.$queryRaw`SELECT id FROM alumnos WHERE id = ${mateo.id}::uuid FOR UPDATE`).rejects.toThrow("Modo soporte");
      await expect(ctx.db.$transaction([ctx.db.alumno.count(), ctx.db.alumno.deleteMany({ where: { id: mateo.id } })])).rejects.toThrow("Modo soporte");
      await expect(
        ctx.db.$transaction(async (tx) => tx.alumno.update({ where: { id: mateo.id }, data: { nombres: "X" } })),
      ).rejects.toThrow("Modo soporte");
      await expect(ctx.db.$transaction(async (tx) => tx.$executeRaw`UPDATE alumnos SET nombres = 'X' WHERE id = ${mateo.id}::uuid`)).rejects.toThrow("Modo soporte");
      // Lecturas permitidas.
      const filas = await ctx.db.$queryRaw<{ id: string }[]>`SELECT id FROM alumnos WHERE id = ${mateo.id}::uuid`;
      expect(filas).toHaveLength(1);
      expect(await ctx.db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM alumnos WHERE tenant_id = $1::uuid`, colegio.tenant.id)).toEqual([{ n: BigInt(3) }]);
      expect(await ctx.db.$transaction(async (tx) => tx.alumno.count())).toBe(3);
      expect((await db.alumno.findUniqueOrThrow({ where: { id: mateo.id } })).nombres).toBe("Mateo");
    } finally {
      await terminarAccesoSoporte(admin, r.accesoId);
    }
  });

  it("el cliente normal del colegio sigue pudiendo usar SQL crudo", async () => {
    const n = await colegio.db.$executeRaw`UPDATE alumnos SET nombres = nombres WHERE id = ${colegio.alumnos.mateo.id}::uuid`;
    expect(n).toBe(1);
  });
});

describe("soporte en un colegio suspendido", () => {
  it("se permite entrar como soporte (solo lectura) pero los miembros siguen sin entrar", async () => {
    await db.tenant.update({ where: { id: colegio.tenant.id }, data: { estado: "suspendido" } });
    try {
      await esperarProhibido(resolverContextoColegio(colegio.miembros.direccion.user, colegio.tenant.slug));
      await esperarProhibido(resolverContextoColegio(superadmin, colegio.tenant.slug));
      const r = await iniciarAccesoSoporte(admin, colegio.tenant.id, { motivo: "Colegio suspendido con dudas", minutos: 30 });
      const ctx = await resolverContextoColegio(superadmin, colegio.tenant.slug);
      expect(ctx.soporte?.accesoId).toBe(r.accesoId);
      await expect(ctx.db.alumno.deleteMany({})).rejects.toThrow("Modo soporte");
      await esperarProhibido(resolverContextoColegio(colegio.miembros.direccion.user, colegio.tenant.slug));
      const audit = await db.auditoriaPlataforma.findFirstOrThrow({ where: { actorId: superadmin.id, accion: "soporte_inicio", tenantId: colegio.tenant.id }, orderBy: { createdAt: "desc" } });
      expect(audit.detalle).toMatchObject({ accesoId: r.accesoId, suspendido: true });
      await terminarAccesoSoporte(admin, r.accesoId);
    } finally {
      await db.tenant.update({ where: { id: colegio.tenant.id }, data: { estado: "activo" } });
    }
  });
});

describe("último ingreso fuera de iniciarSesion", () => {
  it("registrarIngreso guarda userId y ultimoIngresoAt, sin duplicar en la ventana", async () => {
    const tutora = colegio.miembros.tutora.user;
    const ahora = new Date();
    expect(await registrarIngreso({ id: tutora.id, email: null }, "127.0.0.7", ahora)).toBe(true);
    const filas = await db.loginIntento.findMany({ where: { userId: tutora.id } });
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ exito: true, email: tutora.email, ip: "127.0.0.7" });
    expect((await db.profile.findUniqueOrThrow({ where: { id: tutora.id } })).ultimoIngresoAt?.getTime()).toBe(ahora.getTime());
    // Callback → restablecer en el mismo flujo: no suma otra fila.
    expect(await registrarIngreso({ id: tutora.id, email: tutora.email }, "127.0.0.7", new Date(ahora.getTime() + 60_000))).toBe(false);
    expect(await db.loginIntento.count({ where: { userId: tutora.id } })).toBe(1);
    // Pasada la ventana, sí.
    const despues = new Date(ahora.getTime() + 10 * 60_000);
    expect(await registrarIngreso({ id: tutora.id, email: tutora.email }, "127.0.0.7", despues)).toBe(true);
    expect((await db.profile.findUniqueOrThrow({ where: { id: tutora.id } })).ultimoIngresoAt?.getTime()).toBe(despues.getTime());
  });
});

describe("libreta: título del tutor según su género", () => {
  it("Tutora con género femenino, Tutor(a) sin dato", async () => {
    const periodo = await db.periodo.create({
      data: { tenantId: colegio.tenant.id, anio: 2026, tipo: "bimestre", numero: 1, nombre: "I Bimestre", inicio: new Date("2026-03-01"), fin: new Date("2026-05-10") },
    });
    const ctx = colegio.ctxDe("direccion");
    expect((await datosLibreta(ctx, colegio.alumnos.mateo.id, periodo.id)).alumno.tutorTitulo).toBe("Tutor(a)");
    await db.profile.update({ where: { id: colegio.miembros.tutora.user.id }, data: { genero: "femenino" } });
    expect((await datosLibreta(ctx, colegio.alumnos.mateo.id, periodo.id)).alumno).toMatchObject({ tutorTitulo: "Tutora", tutor: "Lucia Prueba" });
    await db.profile.update({ where: { id: colegio.miembros.tutora.user.id }, data: { genero: "masculino" } });
    expect((await datosLibreta(ctx, colegio.alumnos.mateo.id, periodo.id)).alumno.tutorTitulo).toBe("Tutor");
  });
});


