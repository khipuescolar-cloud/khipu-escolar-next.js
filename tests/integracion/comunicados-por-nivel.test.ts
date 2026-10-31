// Comunicados por nivel y por grado (specs/09): destinatarios, alcance de lectura y permisos.
// Crea su propio colegio (test-nivel-<azar>) y lo borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Rol } from "@/generated/prisma/enums";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { puedeVerComunicado } from "@/lib/server/archivos";
import { listarComunicados, publicarComunicado } from "@/lib/server/comunicados";
import { db, dbTenant } from "@/lib/server/db";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("comunicados por nivel y por grado", () => {
  let c: ColegioPrueba;
  const perfiles: string[] = [];
  const ctxs: Record<string, TenantContext> = {};

  async function miembro(rol: Rol, nombre: string) {
    const id = randomUUID();
    perfiles.push(id);
    const user = await db.profile.create({ data: { id, email: `${nombre}-${id.slice(0, 8)}@test-nivel.local`, nombres: nombre, apellidos: "Prueba" } });
    const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: id, rol } });
    ctxs[nombre] = { tenant: c.tenant, user, membership, rol, roles: [rol], db: dbTenant(c.tenant.id), ...accesoModulosDeCodigo(c.tenant.plan) };
    return membership;
  }

  /** Apoderado con consentimiento de un alumno nuevo del salón. */
  async function familia(nombre: string, salonId: string, opciones: { recibeAvisos?: boolean; retirado?: boolean } = {}) {
    const m = await miembro("apoderado", nombre);
    const alumno = await db.alumno.create({ data: { tenantId: c.tenant.id, salonId, nombres: `Hijo de ${nombre}`, apellidos: "Prueba", estado: opciones.retirado ? "retirado" : "activo" } });
    const consentimiento = await db.consentimiento.create({ data: { tenantId: c.tenant.id, apoderadoId: m.id, versionTexto: "test" } });
    await db.apoderadoAlumno.create({ data: { tenantId: c.tenant.id, apoderadoId: m.id, alumnoId: alumno.id, consentimientoId: consentimiento.id, recibeAvisos: opciones.recibeAvisos ?? true } });
    return m;
  }

  const salonNuevo = (nombre: string, nivel: "primaria" | "secundaria", grado: number, archivado = false) =>
    db.salon.create({ data: { tenantId: c.tenant.id, nombre, nivel, grado, seccion: nombre.slice(-1), anio: 2026, ...(archivado ? { archivadoAt: new Date() } : {}) } });

  beforeAll(async () => {
    c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nivel" });
    // 3.° B (madre de Mateo) y 5.° A del ayudante: se les pone grado.
    await db.salon.update({ where: { id: c.salon.id }, data: { grado: 3 } });
    await db.salon.update({ where: { id: c.otroSalon.id }, data: { grado: 5 } });
    const tresA = await salonNuevo("3.° A", "primaria", 3);
    const tresC = await salonNuevo("3.° C", "primaria", 3, true);
    const unoSec = await salonNuevo("1.° A Sec.", "secundaria", 1);
    await familia("tresA", tresA.id);
    await familia("tresAsinAvisos", tresA.id, { recibeAvisos: false });
    await familia("tresAretirado", tresA.id, { retirado: true });
    await familia("archivado", tresC.id);
    await familia("cincoA", c.otroSalon.id);
    await familia("secundaria", unoSec.id);
    await miembro("administrativo", "secretaria");
    for (const k of ["direccion", "tutora", "otroProfesor", "madre"] as const) ctxs[k] = c.ctxDe(k);
  });
  afterAll(async () => {
    await c?.limpiar();
    await db.profile.deleteMany({ where: { id: { in: perfiles } } });
  });

  const destinatarios = async (comunicadoId: string) => {
    const avisos = await c.db.aviso.findMany({ where: { referenciaId: comunicadoId }, select: { apoderadoId: true } });
    const nombres = await db.membership.findMany({ where: { id: { in: avisos.map((a) => a.apoderadoId!) } }, select: { user: { select: { nombres: true } } } });
    return nombres.map((n) => n.user.nombres).sort();
  };

  it("por nivel avisa a las familias de los alumnos activos de salones activos de ese nivel", async () => {
    const r = await publicarComunicado(ctxs.direccion, { titulo: "Primaria", cuerpo: "Para primaria.", audiencia: { tipo: "niveles", niveles: ["primaria"] } });
    // Madre (3.° B), 3.° A y 5.° A. No: sin avisos, retirado, salón archivado, secundaria, sin consentimiento.
    expect(await destinatarios(r.id)).toEqual(["Rosa", "cincoA", "tresA"].sort());
    expect(r.avisados).toBe(3);
    const fila = await c.db.comunicado.findUniqueOrThrow({ where: { id: r.id } });
    expect([fila.salonId, fila.niveles, fila.grado]).toEqual([null, ["primaria"], null]);
  });

  it("varios niveles y un grado (todas sus secciones)", async () => {
    const dos = await publicarComunicado(ctxs.secretaria, { titulo: "Prim y Sec", cuerpo: "x", audiencia: { tipo: "niveles", niveles: ["secundaria", "primaria"] } });
    expect(await destinatarios(dos.id)).toEqual(["Rosa", "cincoA", "secundaria", "tresA"].sort());
    const grado = await publicarComunicado(ctxs.direccion, { titulo: "Tercero", cuerpo: "Paseo de 3.°", audiencia: { tipo: "grado", nivel: "primaria", grado: 3 } });
    expect(await destinatarios(grado.id)).toEqual(["Rosa", "tresA"].sort());
  });

  it("cada rol ve los de su nivel y su grado, con la etiqueta del destino", async () => {
    const titulos = async (quien: string) => (await listarComunicados(ctxs[quien])).map((x) => x.titulo);
    expect(await titulos("madre")).toEqual(expect.arrayContaining(["Primaria", "Prim y Sec", "Tercero"]));
    expect(await titulos("secundaria")).toEqual(expect.arrayContaining(["Prim y Sec"]));
    expect(await titulos("secundaria")).not.toContain("Primaria");
    expect(await titulos("cincoA")).toContain("Primaria");
    expect(await titulos("cincoA")).not.toContain("Tercero");
    expect(await titulos("tutora")).toContain("Tercero"); // tutora de 3.° B
    expect(await titulos("otroProfesor")).not.toContain("Tercero"); // 5.° A
    expect(await titulos("secretaria")).toEqual(expect.arrayContaining(["Primaria", "Prim y Sec", "Tercero"]));

    const etiquetas = Object.fromEntries((await listarComunicados(ctxs.direccion)).map((x) => [x.titulo, x.audiencia]));
    expect(etiquetas).toMatchObject({ Primaria: "Primaria", "Prim y Sec": "Primaria y secundaria", Tercero: "3.° grado de primaria" });

    const tercero = (await listarComunicados(ctxs.direccion)).find((x) => x.titulo === "Tercero")!;
    expect(await puedeVerComunicado(ctxs.madre, tercero.id)).toBe(true);
    expect(await puedeVerComunicado(ctxs.cincoA, tercero.id)).toBe(false);
    expect(await puedeVerComunicado(ctxs.secretaria, tercero.id)).toBe(true);
  });

  it("el profesor solo publica para sus salones; nivel o grado sin salones activos no se publica", async () => {
    await expect(publicarComunicado(ctxs.tutora, { titulo: "x", cuerpo: "y", audiencia: { tipo: "niveles", niveles: ["primaria"] } })).rejects.toThrow("Elige uno de tus salones.");
    await expect(publicarComunicado(ctxs.tutora, { titulo: "x", cuerpo: "y", audiencia: { tipo: "grado", nivel: "primaria", grado: 3 } })).rejects.toThrow("Elige uno de tus salones.");
    await expect(publicarComunicado(ctxs.direccion, { titulo: "x", cuerpo: "y", audiencia: { tipo: "niveles", niveles: ["inicial"] } })).rejects.toThrow("no tiene salones activos de inicial");
    await expect(publicarComunicado(ctxs.direccion, { titulo: "x", cuerpo: "y", audiencia: { tipo: "grado", nivel: "primaria", grado: 6 } })).rejects.toThrow("6.° grado de primaria");
    await expect(publicarComunicado(ctxs.madre, { titulo: "x", cuerpo: "y", audiencia: { tipo: "colegio" } })).rejects.toThrow();
    // Compatibilidad: salonId sigue funcionando.
    const r = await publicarComunicado(ctxs.tutora, { titulo: "Solo 3.° B", cuerpo: "y", salonId: c.salon.id });
    expect(await destinatarios(r.id)).toEqual(["Rosa"]);
  });
});
