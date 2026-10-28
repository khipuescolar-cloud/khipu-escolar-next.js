// Requiere la BD local y Supabase Auth (pnpm db:start). Crea su propio colegio `test-crm-*` y lo borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Membership, Profile, Tenant } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import { cambiarEstadoMembresia, listarProfesores, listarSalones } from "@/lib/server/gestion";
import { altaPersonal, editarFicha, importarPersonalCsv, listarPersonal, obtenerFicha, reenviarBienvenida } from "@/lib/server/personal";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { TenantContext } from "@/lib/server/tenant";
import { esperarProhibido } from "./ayudantes/colegio-prueba";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";

const sufijo = randomUUID().slice(0, 8);
const correo = (n: string) => `${n}-${sufijo}@test-crm.demo`;
let tenant: Tenant;
let otroTenant: Tenant;
const perfiles: Profile[] = [];
const authCreados: string[] = [];
const ctxs: Record<string, TenantContext> = {};
const ms: Record<string, Membership> = {};

async function miembro(clave: string, rol: Rol, t: Tenant = tenant) {
  const user = await db.profile.create({ data: { id: randomUUID(), email: correo(clave), nombres: clave, apellidos: "Prueba" } });
  perfiles.push(user);
  const membership = await db.membership.create({ data: { tenantId: t.id, userId: user.id, rol } });
  ms[clave] = membership;
  ctxs[clave] = { tenant: t, user, membership, rol, roles: [rol], db: dbTenant(t.id), ...accesoModulosDeCodigo(t.plan) };
}

const base = { tipoDocumento: "dni" as const, genero: "femenino" as const };

beforeAll(async () => {
  tenant = await db.tenant.create({ data: { slug: `test-crm-${sufijo}`, nombre: "Colegio CRM", plan: "basico" } });
  otroTenant = await db.tenant.create({ data: { slug: `test-crm-otro-${sufijo}`, nombre: "Otro Colegio", plan: "basico" } });
  await miembro("dir", "direccion");
  await miembro("prof", "profesor");
  await miembro("admin", "administrativo");
  await miembro("dirotro", "direccion", otroTenant);
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: { in: [tenant.id, otroTenant.id] } } });
  await db.profile.deleteMany({ where: { id: { in: [...perfiles.map((p) => p.id), ...authCreados] } } });
  for (const id of authCreados) await supabaseAdmin().auth.admin.deleteUser(id).catch(() => {});
  await db.$disconnect();
});

describe("alta de profesor con datos personales", () => {
  let membershipId = "";
  it("crea la cuenta con el DNI como contraseña y deja la membresía activa con cargo", async () => {
    const r = await altaPersonal(ctxs.dir, { ...base, rol: "profesor", email: correo("nuevo"), nombres: "Nora", apellidos: "Nueva", numeroDocumento: "70123456", telefono: "999888777", direccion: "Av. Lima 123", fechaNacimiento: "1990-05-17", cargo: "Docente de Matemática" });
    authCreados.push(r.userId);
    membershipId = r.membershipId;
    expect(r.cuentaNueva).toBe(true);
    const perfil = await db.profile.findUniqueOrThrow({ where: { id: r.userId } });
    expect(perfil).toMatchObject({ debeCambiarPassword: true, numeroDocumento: "70123456", telefono: "999888777", direccion: "Av. Lima 123" });
    expect(perfil.fechaNacimiento?.toISOString().slice(0, 10)).toBe("1990-05-17");
    expect(await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).toMatchObject({ rol: "profesor", estado: "activa", cargo: "Docente de Matemática" });
    // La contraseña inicial es el DNI.
    const { data, error } = await supabaseAdmin().auth.signInWithPassword({ email: correo("nuevo"), password: "70123456" });
    expect(error).toBeNull();
    expect(data.user?.id).toBe(r.userId);
  });

  it("encola la bienvenida SIN el número de documento", async () => {
    const aviso = await db.aviso.findFirstOrThrow({ where: { tenantId: tenant.id, plantilla: "bienvenida", destinatario: correo("nuevo") } });
    expect(aviso.estado).toBe("pendiente");
    expect(JSON.stringify(aviso.payload)).not.toContain("70123456");
    expect(aviso.payload).toMatchObject({ cuentaNueva: true, documento: "DNI" });
  });

  it("si el correo ya existe en Khipu solo agrega la membresía y no toca su contraseña", async () => {
    const r = await altaPersonal(ctxs.dirotro, { ...base, rol: "profesor", email: correo("nuevo"), nombres: "Nora", apellidos: "Nueva", numeroDocumento: "99999999" });
    expect(r.cuentaNueva).toBe(false);
    expect((await db.profile.findUniqueOrThrow({ where: { id: r.userId } })).numeroDocumento).toBe("70123456");
    const aviso = await db.aviso.findFirstOrThrow({ where: { tenantId: otroTenant.id, plantilla: "bienvenida" } });
    expect(aviso.payload).toMatchObject({ cuentaNueva: false });
    // Su contraseña sigue siendo la original (no el 99999999).
    expect((await supabaseAdmin().auth.signInWithPassword({ email: correo("nuevo"), password: "99999999" })).error).not.toBeNull();
  });

  it("rechaza duplicado con el mismo rol y datos inválidos", async () => {
    await expect(altaPersonal(ctxs.dir, { ...base, rol: "profesor", email: correo("nuevo"), nombres: "Nora", apellidos: "Nueva", numeroDocumento: "70123456" })).rejects.toThrow("ya tiene ese rol");
    await expect(altaPersonal(ctxs.dir, { ...base, rol: "profesor", email: correo("x1"), nombres: "X", apellidos: "Y", numeroDocumento: "123" })).rejects.toThrow("DNI debe tener 8");
    await expect(altaPersonal(ctxs.dir, { ...base, rol: "profesor", email: "no-es-correo", nombres: "X", apellidos: "Y", numeroDocumento: "12345678" })).rejects.toThrow();
    expect(await db.profile.count({ where: { email: correo("x1") } })).toBe(0);
  });

  it("reenviar bienvenida encola otro aviso sin el número y desactivar/reactivar libera tutoría y cursos", async () => {
    await reenviarBienvenida(ctxs.dir, membershipId);
    const avisos = await db.aviso.findMany({ where: { tenantId: tenant.id, plantilla: "bienvenida", destinatario: correo("nuevo") } });
    expect(avisos).toHaveLength(2);
    expect(JSON.stringify(avisos.map((a) => a.payload))).not.toContain("70123456");
    const salon = await db.salon.create({ data: { tenantId: tenant.id, nombre: "1.° A", nivel: "primaria", grado: 1, seccion: "A", anio: 2026, tutorId: membershipId } });
    await cambiarEstadoMembresia(ctxs.dir, membershipId, "inactiva");
    expect((await db.salon.findUniqueOrThrow({ where: { id: salon.id } })).tutorId).toBeNull();
    await cambiarEstadoMembresia(ctxs.dir, membershipId, "activa");
    expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).estado).toBe("activa");
  });

  it("la ficha muestra el documento a dirección, se edita y deja historia sin valores sensibles", async () => {
    const ficha = await obtenerFicha(ctxs.dir, membershipId, ["profesor"]);
    expect(ficha?.user.numeroDocumento).toBe("70123456");
    await editarFicha(ctxs.dir, membershipId, ["profesor"], {
      nombres: "Nora", apellidos: "Nueva Díaz", telefono: "911222333", genero: "femenino", fechaNacimiento: "1990-05-17",
      direccion: "Jr. Cusco 45", cargo: "Tutora", tipoDocumento: "dni", numeroDocumento: "70123456",
    });
    const despues = await obtenerFicha(ctxs.dir, membershipId, ["profesor"]);
    expect(despues).toMatchObject({ cargo: "Tutora", user: { apellidos: "Nueva Díaz", telefono: "911222333" } });
    const edicion = despues!.historial.find((h) => h.accion === "editar");
    expect(edicion?.detalle).toEqual({ campos: ["apellidos", "telefono", "direccion"] });
    expect(despues!.historial.some((h) => h.accion === "ver")).toBe(true);
    expect(JSON.stringify(despues!.historial)).not.toContain("70123456");
  });

  it("una ficha de otro rol no se abre desde el ámbito de profesores", async () => {
    expect(await obtenerFicha(ctxs.dir, ms.admin.id, ["profesor"])).toBeNull();
  });
});

describe("solo dirección ve datos personales", () => {
  it("profesor y administrativo reciben 403 en lista, ficha, alta y edición", async () => {
    for (const quien of ["prof", "admin"]) {
      await esperarProhibido(listarPersonal(ctxs[quien], ["profesor"]));
      await esperarProhibido(obtenerFicha(ctxs[quien], ms.prof.id, ["profesor"]));
      await esperarProhibido(listarProfesores(ctxs[quien]));
      await esperarProhibido(altaPersonal(ctxs[quien], { ...base, rol: "profesor", email: correo("z"), nombres: "Z", apellidos: "Z", numeroDocumento: "12345678" }));
      await esperarProhibido(reenviarBienvenida(ctxs[quien], ms.prof.id));
    }
    expect(await db.profile.count({ where: { email: correo("z") } })).toBe(0);
  });

  it("la lista de dirección filtra por texto (incluido documento), estado y solo ve su colegio", async () => {
    const porDoc = await listarPersonal(ctxs.dir, ["profesor"], { q: "70123456" });
    expect(porDoc.map((p) => p.user.email)).toEqual([correo("nuevo")]);
    expect(porDoc[0].user.numeroDocumento).toBe("70123456");
    expect((await listarPersonal(ctxs.dir, ["profesor"], { estado: "inactiva" })).length).toBe(0);
    // El otro colegio tiene su propia membresía de Nora, pero dirección de este colegio no ve la del otro.
    expect(await obtenerFicha(ctxs.dirotro, ms.prof.id, ["profesor"])).toBeNull();
  });

  it("filtra profesores por salón y por curso", async () => {
    const salon = await db.salon.create({ data: { tenantId: tenant.id, nombre: "2.° B", nivel: "primaria", grado: 2, seccion: "B", anio: 2026 } });
    const curso = await db.curso.create({ data: { tenantId: tenant.id, salonId: salon.id, nombre: "Arte", profesorId: ms.prof.id } });
    expect((await listarPersonal(ctxs.dir, ["profesor"], { salonId: salon.id })).map((p) => p.id)).toEqual([ms.prof.id]);
    expect((await listarPersonal(ctxs.dir, ["profesor"], { cursoId: curso.id })).map((p) => p.id)).toEqual([ms.prof.id]);
    const lista = await listarSalones(ctxs.dir);
    expect(lista.find((s) => s.id === salon.id)).toMatchObject({ tutor: null, _count: { alumnos: 0 } });
  });
});

describe("importación CSV todo o nada", () => {
  const ENC = "nombres,apellidos,documento,correo,telefono,genero,cargo\n";

  it("si una línea falla no se crea nada y se informan los errores por línea", async () => {
    const csv = ENC + `Uno,Prueba,80000001,${correo("imp1")},,F,Docente\nDos,Prueba,123,${correo("imp2")},,,\nTres,Prueba,80000003,${correo("nuevo")},,,\n`;
    const r = await importarPersonalCsv(ctxs.dir, csv, "profesores");
    expect(r.ok).toBe(false);
    expect(r.errores.map((e) => e.linea)).toEqual([3, 4]);
    expect(r.errores[0].mensaje).toContain("DNI");
    expect(r.errores[1].mensaje).toContain("ya tiene ese rol");
    expect(await db.profile.count({ where: { email: correo("imp1") } })).toBe(0);
  });

  it("un CSV válido crea cuentas, membresías y bienvenidas", async () => {
    const csv = ENC + `Uno,Prueba,80000001,${correo("imp1")},999,F,Docente\nDos,Prueba,80000002,${correo("imp2")},,M,\n`;
    const r = await importarPersonalCsv(ctxs.dir, csv, "profesores");
    expect(r).toMatchObject({ ok: true, creados: 2 });
    for (const n of ["imp1", "imp2"]) {
      const p = await db.profile.findUniqueOrThrow({ where: { email: correo(n) } });
      authCreados.push(p.id);
      expect(await db.membership.count({ where: { tenantId: tenant.id, userId: p.id, rol: "profesor", estado: "activa" } })).toBe(1);
    }
    expect(await db.aviso.count({ where: { tenantId: tenant.id, plantilla: "bienvenida", destinatario: { in: [correo("imp1"), correo("imp2")] } } })).toBe(2);
  });

  it("el CSV de personal crea administrativos y portería y exige el rol", async () => {
    const enc = ENC.trim() + ",rol\n";
    const mal = await importarPersonalCsv(ctxs.dir, enc + `Ana,Sec,80000010,${correo("sec")},,,Secretaria,docente\n`, "personal");
    expect(mal.ok).toBe(false);
    const ok = await importarPersonalCsv(ctxs.dir, enc + `Ana,Sec,80000010,${correo("sec")},,,Secretaria,administrativo\nJulio,Port,80000011,${correo("port")},,,Portero,porteria\n`, "personal");
    expect(ok.ok).toBe(true);
    for (const n of ["sec", "port"]) authCreados.push((await db.profile.findUniqueOrThrow({ where: { email: correo(n) } })).id);
    const lista = await listarPersonal(ctxs.dir, ["administrativo", "porteria"]);
    expect(lista.map((p) => [p.rol, p.cargo]).sort()).toEqual([["administrativo", null], ["administrativo", "Secretaria"], ["porteria", "Portero"]]);
  });
});
