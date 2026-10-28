// Requiere la BD local y Supabase Auth (pnpm db:start). Crea filas con sufijo único y las borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { expiracionJustificacion } from "@/lib/plazo-justificacion";
import { db } from "@/lib/server/db";
import { crearAnuncio, anunciosVigentes, editarAnuncio, eliminarAnuncio } from "@/lib/server/plataforma-anuncios";
import {
  agregarFeriado, feriadosAplicables, feriadosDelAnio, guardarHorarioNudito, horarioNudito, limpiarCacheFeriados, quitarFeriado,
  CLAVE_HORARIO_NUDITO,
} from "@/lib/server/plataforma-configuracion";
import { agregarMiembro, cambiarActivoMiembro, listarEquipo } from "@/lib/server/plataforma-equipo";
import type { AdminContext } from "@/lib/server/plataforma";
import { supabaseAdmin } from "@/lib/server/supabase";

const sufijo = randomUUID().slice(0, 8);
const correo = (n: string) => `${n}-${sufijo}@test-p4c.demo`;
let yo: Profile;
let admin: AdminContext;
const tenants: string[] = [];

beforeAll(async () => {
  yo = await db.profile.create({ data: { id: randomUUID(), email: correo("yo"), nombres: "Equipo", apellidos: "Prueba" } });
  await db.adminPlataforma.create({ data: { userId: yo.id } });
  admin = { user: yo };
});

afterAll(async () => {
  await db.feriadoExtra.deleteMany({ where: { nombre: { contains: sufijo } } });
  await db.anuncioPlataforma.deleteMany({ where: { titulo: { contains: sufijo } } });
  await db.tenant.deleteMany({ where: { id: { in: tenants } } });
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: yo.id } });
  const perfiles = await db.profile.findMany({ where: { email: { endsWith: `-${sufijo}@test-p4c.demo` } } });
  for (const p of perfiles) await supabaseAdmin().auth.admin.deleteUser(p.id).catch(() => {});
  await db.profile.deleteMany({ where: { id: { in: perfiles.map((p) => p.id) } } });
  await db.configPlataforma.deleteMany({ where: { clave: CLAVE_HORARIO_NUDITO, valor: { equals: { inicio: "06:00", fin: "18:00" } } } });
  await db.$disconnect();
});

describe("equipo Khipu", () => {
  it("agrega a un miembro con documento, lo lista, lo desactiva, lo reactiva y lo audita", async () => {
    const email = correo("nuevo");
    const r = await agregarMiembro(admin, { email, nombres: "Nuevo", apellidos: "Miembro", documento: "70123456" });
    expect(r.cuentaNueva).toBe(true);
    expect(r.contrasenaTemporal).toBeUndefined();
    const perfil = await db.profile.findUnique({ where: { email } });
    expect(perfil?.debeCambiarPassword).toBe(true);

    const miembro = (await listarEquipo(admin)).find((m) => m.email === email)!;
    expect(miembro.activo).toBe(true);
    await cambiarActivoMiembro(admin, miembro.adminId, false);
    expect((await db.adminPlataforma.findUnique({ where: { id: miembro.adminId } }))?.activo).toBe(false);
    await cambiarActivoMiembro(admin, miembro.adminId, true);
    expect((await db.adminPlataforma.findUnique({ where: { id: miembro.adminId } }))?.activo).toBe(true);
    const acciones = (await db.auditoriaPlataforma.findMany({ where: { actorId: yo.id } })).map((a) => a.accion);
    expect(acciones).toEqual(expect.arrayContaining(["equipo_agregar", "equipo_desactivar", "equipo_reactivar"]));
  });

  it("sin documento no expone contraseña", async () => {
    const r = await agregarMiembro(admin, { email: correo("enlace"), nombres: "Sin", apellidos: "Documento" });
    expect(r.cuentaNueva).toBe(true);
    expect(r.contrasenaTemporal).toBeUndefined();
  });

  it("no puedes desactivarte a ti mismo", async () => {
    const mio = (await listarEquipo(admin)).find((m) => m.userId === yo.id)!;
    await expect(cambiarActivoMiembro(admin, mio.adminId, false)).rejects.toThrow(/ti mismo/);
  });

  it("rechaza un documento inválido", async () => {
    await expect(agregarMiembro(admin, { email: correo("malo"), nombres: "A", apellidos: "B", documento: "123" })).rejects.toThrow(/documento/);
  });
});

describe("anuncios", () => {
  const base = (t: string) => ({ titulo: `${t} ${sufijo}`, cuerpo: "Mensaje de prueba", nivel: "novedad" as const, audiencia: "direccion" as const, planes: [] as never[] });
  const ctx = (rol: "direccion" | "profesor" | "apoderado", plan: "basico" | "promax", soporte = false) => ({ rol, tenant: { plan }, soporte: soporte ? {} : null });
  const mios = (l: { titulo: string }[]) => l.filter((a) => a.titulo.includes(sufijo)).map((a) => a.titulo.split(" ")[0]);

  it("CRUD y filtro por vigencia, rol, plan y modo soporte", async () => {
    const ahora = new Date();
    const h = (horas: number) => new Date(ahora.getTime() + horas * 3_600_000);
    const lima = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 16);
    await crearAnuncio(admin, { ...base("vigenteDireccion"), desde: lima(h(-1)), hasta: lima(h(2)) });
    await crearAnuncio(admin, { ...base("vigenteTodos"), audiencia: "todos", nivel: "urgente", desde: lima(h(-1)), hasta: lima(h(2)) });
    await crearAnuncio(admin, { ...base("soloPromax"), audiencia: "todos", planes: ["promax"], desde: lima(h(-1)), hasta: lima(h(2)) });
    await crearAnuncio(admin, { ...base("programado"), desde: lima(h(5)), hasta: lima(h(9)) });
    await crearAnuncio(admin, { ...base("terminado"), desde: lima(h(-9)), hasta: lima(h(-5)) });

    expect(mios(await anunciosVigentes(ctx("direccion", "basico"), ahora))).toEqual(["vigenteTodos", "vigenteDireccion"]); // urgente primero
    const promax = mios(await anunciosVigentes(ctx("direccion", "promax"), ahora));
    expect(promax[0]).toBe("vigenteTodos");
    expect([...promax].sort()).toEqual(["soloPromax", "vigenteDireccion", "vigenteTodos"]);
    expect(mios(await anunciosVigentes(ctx("profesor", "basico"), ahora))).toEqual(["vigenteTodos"]);
    expect(mios(await anunciosVigentes(ctx("apoderado", "promax"), ahora)).sort()).toEqual(["soloPromax", "vigenteTodos"]);
    expect(await anunciosVigentes(ctx("direccion", "promax", true), ahora)).toEqual([]);
  });

  it("valida las fechas, edita y elimina", async () => {
    await expect(crearAnuncio(admin, { ...base("malo"), desde: "2026-11-02T10:00", hasta: "2026-11-02T09:00" })).rejects.toThrow(/posterior/);
    const a = await crearAnuncio(admin, { ...base("editable"), desde: "2026-11-02T10:00", hasta: "2026-11-03T09:00" });
    const e = await editarAnuncio(admin, a.id, { ...base("editado"), desde: "2026-11-02T10:00", hasta: "2026-11-03T09:00" });
    expect(e.titulo).toContain("editado");
    await eliminarAnuncio(admin, a.id);
    expect(await db.anuncioPlataforma.findUnique({ where: { id: a.id } })).toBeNull();
  });
});

describe("feriados extra", () => {
  async function colegio(ciudad: string | null) {
    const t = await db.tenant.create({ data: { slug: `test-p4c-${sufijo}-${tenants.length}`, nombre: `Colegio p4c ${sufijo}`, ciudad } });
    tenants.push(t.id);
    return t;
  }

  beforeEach(async () => {
    await db.feriadoExtra.deleteMany({ where: { nombre: { contains: sufijo } } });
    limpiarCacheFeriados();
  });

  it("aplica nacionales extra, de la región (sin tildes) y del propio colegio", async () => {
    const cusco = await colegio("Cusco");
    const lima = await colegio("Lima");
    await agregarFeriado(admin, { fecha: "2026-11-04", nombre: `Decretado ${sufijo}`, alcance: "nacional" });
    await agregarFeriado(admin, { fecha: "2026-11-05", nombre: `Regional ${sufijo}`, alcance: "regional", region: "CUSCO " });
    await agregarFeriado(admin, { fecha: "2026-11-06", nombre: `Propio ${sufijo}`, alcance: "colegio", tenantId: lima.id });
    limpiarCacheFeriados();
    expect(await feriadosAplicables(cusco.id, "2026-11-01", "2026-11-30")).toEqual(["2026-11-04", "2026-11-05"]);
    expect(await feriadosAplicables(lima.id, "2026-11-01", "2026-11-30")).toEqual(["2026-11-04", "2026-11-06"]);
    expect(await feriadosAplicables(lima.id, "2026-11-05", "2026-11-05")).toEqual([]);

    const lista = await feriadosDelAnio(admin, 2026);
    expect(lista.filter((f) => f.fijo)).toHaveLength(16);
    expect(lista.some((f) => f.nombre === `Propio ${sufijo}` && f.colegio)).toBe(true);
  });

  it("un feriado extra corre el vencimiento de la justificación y quitarlo lo revierte", async () => {
    const t = await colegio("Tacna");
    const sin = expiracionJustificacion("2026-11-02", 5);
    const f = await agregarFeriado(admin, { fecha: "2026-11-04", nombre: `Corre ${sufijo}`, alcance: "colegio", tenantId: t.id }).then(async () =>
      db.feriadoExtra.findFirstOrThrow({ where: { nombre: `Corre ${sufijo}` } }),
    );
    const con = expiracionJustificacion("2026-11-02", 5, "America/Lima", await feriadosAplicables(t.id, "2026-11-02", "2026-12-31"));
    expect(con.getTime() - sin.getTime()).toBe(86_400_000);
    await quitarFeriado(admin, f.id);
    expect(await feriadosAplicables(t.id, "2026-11-02", "2026-12-31")).toEqual([]);
  });

  it("rechaza alcance regional sin región y colegio inexistente", async () => {
    await expect(agregarFeriado(admin, { fecha: "2026-11-04", nombre: "Sin región", alcance: "regional" })).rejects.toThrow(/región/);
    await expect(agregarFeriado(admin, { fecha: "2026-11-04", nombre: "Sin colegio", alcance: "colegio", tenantId: randomUUID() })).rejects.toThrow(/colegio/);
  });
});

describe("horario de Nudito", () => {
  it("se guarda, se lee y valida fin > inicio", async () => {
    const previo = await db.configPlataforma.findUnique({ where: { clave: CLAVE_HORARIO_NUDITO } });
    try {
      await guardarHorarioNudito(admin, { inicio: "06:00", fin: "18:00" });
      expect(await horarioNudito()).toEqual({ inicio: 6, fin: 18 });
      await expect(guardarHorarioNudito(admin, { inicio: "18:00", fin: "06:00" })).rejects.toThrow(/posterior/);
    } finally {
      if (previo) await db.configPlataforma.update({ where: { clave: CLAVE_HORARIO_NUDITO }, data: { valor: previo.valor as object } });
      else await db.configPlataforma.deleteMany({ where: { clave: CLAVE_HORARIO_NUDITO } });
    }
  });
});
