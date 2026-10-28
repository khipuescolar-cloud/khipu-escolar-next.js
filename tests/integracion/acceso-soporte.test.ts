// Acceso de soporte del super administrador a un colegio (specs/16): solo lectura, con vencimiento,
// sin chats/notas/libreta/Nudito y auditado. Requiere la BD local. Crea datos con sufijo aleatorio y los borra.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { registrarIntentoLogin } from "@/lib/server/auth";
import { crearCuentaConDocumento, revertirCamposCompletados } from "@/lib/server/cuentas";
import { db, ErrorSoloLectura } from "@/lib/server/db";
import { requireFeature, tieneFeature } from "@/lib/server/plan";
import {
  accesoSoporteActual, detalleColegio, iniciarAccesoSoporte, metricasPlataforma, reporteColegios, terminarAccesoSoporte,
  type AdminContext,
} from "@/lib/server/plataforma";
import { requireTenantContext, resolverContextoColegio } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

// Sesión simulada para requireTenantContext (Supabase Auth y cookies del request).
const sesion = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/lib/server/supabase", async (original) => ({
  ...(await original<typeof import("@/lib/server/supabase")>()),
  supabaseServidor: async () => ({ auth: { getUser: async () => ({ data: { user: sesion.userId ? { id: sesion.userId } : null } }) } }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));

const sufijo = randomUUID().slice(0, 8);
let colegio: ColegioPrueba;
let superadmin: Profile;
let impostor: Profile;
let admin: AdminContext;

beforeAll(async () => {
  colegio = await crearColegioPrueba({ plan: "promax", prefijo: "test-soporte" });
  superadmin = await db.profile.create({ data: { id: randomUUID(), email: `super-${sufijo}@test-soporte.local`, nombres: "Equipo", apellidos: "Soporte" } });
  await db.adminPlataforma.create({ data: { userId: superadmin.id } });
  impostor = await db.profile.create({ data: { id: randomUUID(), email: `impostor-${sufijo}@test-soporte.local`, nombres: "Otro", apellidos: "Usuario" } });
  admin = { user: superadmin };
});

afterAll(async () => {
  const ids = [superadmin.id, impostor.id];
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: { in: ids } } });
  await db.loginIntento.deleteMany({ where: { userId: { in: [...ids, colegio.miembros.direccion.user.id] } } });
  await colegio.limpiar(); // cascade: accesos_soporte y auditoría del colegio
  await db.profile.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

describe("acceso de soporte vigente", () => {
  let accesoId = "";

  it("sin acceso, el super administrador no entra al colegio", async () => {
    await esperarProhibido(resolverContextoColegio(superadmin, colegio.tenant.slug));
  });

  it("valida motivo y duración", async () => {
    await expect(iniciarAccesoSoporte(admin, colegio.tenant.id, { motivo: "", minutos: 30 })).rejects.toThrow(/motivo/);
    await expect(iniciarAccesoSoporte(admin, colegio.tenant.id, { motivo: "Revisar asistencia", minutos: 45 })).rejects.toThrow(/duración/);
  });

  it("crea el acceso, lo audita en la plataforma y da un contexto de dirección en solo lectura", async () => {
    const r = await iniciarAccesoSoporte(admin, colegio.tenant.id, { motivo: "La directora no ve la asistencia", minutos: 30 });
    accesoId = r.accesoId;
    expect(r.url).toContain(`${colegio.tenant.slug}.`);
    expect(r.expiraAt.getTime() - Date.now()).toBeGreaterThan(29 * 60_000);
    expect(await db.auditoriaPlataforma.count({ where: { actorId: superadmin.id, accion: "soporte_inicio", tenantId: colegio.tenant.id } })).toBe(1);
    expect((await accesoSoporteActual(admin, colegio.tenant.id))?.id).toBe(accesoId);

    const ctx = await resolverContextoColegio(superadmin, colegio.tenant.slug);
    expect(ctx.rol).toBe("direccion");
    expect(ctx.soporte?.accesoId).toBe(accesoId);
    // Lectura permitida y aislada al colegio.
    expect(await ctx.db.alumno.count()).toBe(3);
  });

  it("toda escritura lanza «Modo soporte: solo lectura»", async () => {
    const ctx = await resolverContextoColegio(superadmin, colegio.tenant.slug);
    const { mateo } = colegio.alumnos;
    await expect(ctx.db.alumno.update({ where: { id: mateo.id }, data: { nombres: "X" } })).rejects.toBeInstanceOf(ErrorSoloLectura);
    await expect(ctx.db.alumno.create({ data: { tenantId: colegio.tenant.id, salonId: colegio.salon.id, nombres: "N", apellidos: "N" } })).rejects.toThrow("Modo soporte: solo lectura");
    await expect(ctx.db.alumno.deleteMany({})).rejects.toThrow("Modo soporte: solo lectura");
    await expect(ctx.db.salon.upsert({ where: { id: colegio.salon.id }, create: { tenantId: colegio.tenant.id, nombre: "Z", nivel: "primaria", anio: 2026 }, update: { nombre: "Z" } })).rejects.toThrow("Modo soporte");
    await expect(ctx.db.profile.update({ where: { id: superadmin.id }, data: { nombres: "Y" } })).rejects.toThrow("Modo soporte");
    await expect(ctx.db.auditoria.createMany({ data: [{ tenantId: colegio.tenant.id, accion: "ver", entidad: "x" }] })).rejects.toThrow("Modo soporte");
    expect((await db.alumno.findUniqueOrThrow({ where: { id: mateo.id } })).nombres).toBe("Mateo");
  });

  it("niega mensajes, notas, libreta, Nudito y la mesa de ayuda aunque el plan los incluya", async () => {
    const ctx = await resolverContextoColegio(superadmin, colegio.tenant.slug);
    for (const f of ["mensajes", "notas", "libreta", "nudito", "soporte"] as const) {
      expect(tieneFeature(ctx, f)).toBe(false);
      await esperarProhibido(Promise.resolve().then(() => requireFeature(ctx, f)));
    }
    expect(() => requireFeature(ctx, "asistencia")).not.toThrow();
    // Dirección normal sí los tiene (plan Pro Max).
    expect(tieneFeature(colegio.ctxDe("direccion"), "mensajes")).toBe(true);
  });

  it("requireTenantContext registra cada request en la auditoría del colegio (soporte_ver)", async () => {
    sesion.userId = superadmin.id;
    const ctx = await requireTenantContext(colegio.tenant.slug);
    expect(ctx.soporte?.accesoId).toBe(accesoId);
    const filas = await db.auditoria.findMany({ where: { tenantId: colegio.tenant.id, actorId: superadmin.id, accion: "soporte_ver" } });
    expect(filas.length).toBeGreaterThanOrEqual(1);
    expect(filas[0].detalle).toMatchObject({ accesoId });
  });

  it("al terminarlo ya no entra y queda soporte_fin", async () => {
    expect(await terminarAccesoSoporte(admin, accesoId)).toEqual({ tenantId: colegio.tenant.id });
    expect(await db.auditoriaPlataforma.count({ where: { actorId: superadmin.id, accion: "soporte_fin", tenantId: colegio.tenant.id } })).toBe(1);
    await esperarProhibido(resolverContextoColegio(superadmin, colegio.tenant.slug));
    expect(await accesoSoporteActual(admin, colegio.tenant.id)).toBeNull();
  });
});

describe("accesos no vigentes o ajenos", () => {
  it("un acceso vencido no da entrada", async () => {
    await db.accesoSoporte.create({
      data: { tenantId: colegio.tenant.id, adminId: superadmin.id, motivo: "vencido", inicioAt: new Date(Date.now() - 3_600_000), expiraAt: new Date(Date.now() - 60_000) },
    });
    await esperarProhibido(resolverContextoColegio(superadmin, colegio.tenant.slug));
  });

  it("un super administrador inactivo no entra aunque el acceso siga vigente", async () => {
    await db.accesoSoporte.create({ data: { tenantId: colegio.tenant.id, adminId: superadmin.id, motivo: "inactivo", expiraAt: new Date(Date.now() + 600_000) } });
    await db.adminPlataforma.update({ where: { userId: superadmin.id }, data: { activo: false } });
    try {
      await esperarProhibido(resolverContextoColegio(superadmin, colegio.tenant.slug));
    } finally {
      await db.adminPlataforma.update({ where: { userId: superadmin.id }, data: { activo: true } });
      await db.accesoSoporte.updateMany({ where: { adminId: superadmin.id, cerradoAt: null }, data: { cerradoAt: new Date() } });
    }
  });

  it("un usuario que no es super administrador no entra con un AccesoSoporte a su nombre", async () => {
    await db.accesoSoporte.create({ data: { tenantId: colegio.tenant.id, adminId: impostor.id, motivo: "ajeno", expiraAt: new Date(Date.now() + 600_000) } });
    await esperarProhibido(resolverContextoColegio(impostor, colegio.tenant.slug));
  });

  it("no se puede terminar el acceso de otro administrador", async () => {
    const ajeno = await db.accesoSoporte.findFirstOrThrow({ where: { adminId: impostor.id } });
    expect(await terminarAccesoSoporte(admin, ajeno.id)).toBeNull();
    expect((await db.accesoSoporte.findUniqueOrThrow({ where: { id: ajeno.id } })).cerradoAt).toBeNull();
  });

  it("un miembro del colegio sigue entrando con su membresía (sin modo soporte)", async () => {
    const ctx = await resolverContextoColegio(colegio.miembros.direccion.user, colegio.tenant.slug);
    expect(ctx.soporte).toBeUndefined();
    expect(ctx.membership.id).toBe(colegio.miembros.direccion.membership.id);
  });
});

describe("último ingreso y usuarios activos", () => {
  it("el login exitoso guarda userId y ultimoIngresoAt; el fallido no", async () => {
    const direccion = colegio.miembros.direccion.user;
    await registrarIntentoLogin({ email: direccion.email, ip: "127.0.0.9", userId: null });
    expect((await db.profile.findUniqueOrThrow({ where: { id: direccion.id } })).ultimoIngresoAt).toBeNull();
    const ahora = new Date();
    await registrarIntentoLogin({ email: direccion.email, ip: "127.0.0.9", userId: direccion.id }, ahora);
    const intento = await db.loginIntento.findFirstOrThrow({ where: { userId: direccion.id } });
    expect(intento.exito).toBe(true);
    expect((await db.profile.findUniqueOrThrow({ where: { id: direccion.id } })).ultimoIngresoAt?.getTime()).toBe(ahora.getTime());
  });

  it("el reporte cuenta activos y último ingreso por membresía del colegio", async () => {
    const [fila] = await reporteColegios(admin, { q: colegio.tenant.slug });
    expect(fila.usuariosActivos7d).toBe(1);
    expect(fila.ultimoIngreso).not.toBeNull();
    const { dias } = await detalleColegio(admin, colegio.tenant.id);
    expect(dias.reduce((s, d) => s + d.ingresos, 0)).toBe(1);
    expect((await metricasPlataforma(admin)).usuariosActivos7d).toBeGreaterThanOrEqual(1);
  });
});

describe("crearCuentaConDocumento devuelve los campos que completó", () => {
  it("y revertirCamposCompletados los vuelve a null", async () => {
    const entrada = { email: impostor.email, nombres: "Otro", apellidos: "Usuario", tipoDocumento: "dni" as const, numeroDocumento: "45678912", telefono: "987654321" };
    const cuenta = await crearCuentaConDocumento(entrada);
    expect(cuenta.nueva).toBe(false);
    expect(cuenta.camposCompletados.sort()).toEqual(["numeroDocumento", "telefono", "tipoDocumento"]);
    await revertirCamposCompletados(cuenta, entrada);
    expect(await db.profile.findUniqueOrThrow({ where: { id: impostor.id } })).toMatchObject({ telefono: null, tipoDocumento: null, numeroDocumento: null });
  });
});
