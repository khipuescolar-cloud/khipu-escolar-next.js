// Requiere la BD local. Crea su propio colegio `test-extras-*` y lo borra al terminar (también sus archivos locales).
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type Membership, type Profile, type Tenant } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { actualizarEvento, crearEvento, itemsDeAgenda } from "@/lib/server/agenda";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant, MODELOS_GLOBALES } from "@/lib/server/db";
import { exportarColegio, exportarColegioZip, TABLAS_OMITIDAS, tablasExportadas } from "@/lib/server/exportar";
import { borrarArchivoDelProveedor, guardarArchivo } from "@/lib/server/storage";
import { actualizarTarea, crearTarea } from "@/lib/server/tareas";
import type { TenantContext } from "@/lib/server/tenant";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";

const sufijo = randomUUID().slice(0, 8);
let tenant: Tenant;
const perfiles: Profile[] = [];
const m: Record<string, Membership> = {};
const ctxs: Record<string, TenantContext> = {};
let cursoId = "", salonId = "", otroSalonId = "";
let archivoId = "";
let archivoPublicId = "";

async function persona(clave: string, rol: Rol, nombres: string) {
  const user = await db.profile.create({ data: { id: randomUUID(), email: `${clave}-${sufijo}@prueba.demo`, nombres, apellidos: "Extras" } });
  perfiles.push(user);
  m[clave] = await db.membership.create({ data: { tenantId: tenant.id, userId: user.id, rol } });
  ctxs[clave] = { tenant, user, membership: m[clave], rol, roles: [rol], db: dbTenant(tenant.id), ...accesoModulosDeCodigo(tenant.plan) };
}

const manana = new Date(Date.now() + 2 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
const pasado = new Date(Date.now() + 5 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });

beforeAll(async () => {
  tenant = await db.tenant.create({ data: { slug: `test-extras-${sufijo}`, nombre: "Colegio Extras", plan: "promax" } });
  await persona("dir", "direccion", "Dora");
  await persona("prof", "profesor", "Pedro");
  await persona("otro", "profesor", "Ana");
  await persona("madre", "apoderado", "Rosa");
  const salon = await db.salon.create({ data: { tenantId: tenant.id, nombre: "3.° B", nivel: "primaria", anio: 2026, tutorId: m.prof.id } });
  const otro = await db.salon.create({ data: { tenantId: tenant.id, nombre: "5.° A", nivel: "primaria", anio: 2026, tutorId: m.otro.id } });
  salonId = salon.id;
  otroSalonId = otro.id;
  cursoId = (await db.curso.create({ data: { tenantId: tenant.id, salonId, nombre: "Ciencia", profesorId: m.prof.id } })).id;
  const hijo = await db.alumno.create({ data: { tenantId: tenant.id, salonId, nombres: "Mateo", apellidos: "Hijo" } });
  await db.apoderadoAlumno.create({ data: { tenantId: tenant.id, apoderadoId: m.madre.id, alumnoId: hijo.id, parentesco: "madre" } });
});

afterAll(async () => {
  if (archivoPublicId) await borrarArchivoDelProveedor({ id: archivoId, proveedor: "local", publicId: archivoPublicId, mimeType: "image/png", privado: true, url: null, tenantId: tenant.id } as never).catch(() => {});
  await db.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
  await db.profile.deleteMany({ where: { id: { in: perfiles.map((p) => p.id) } } });
  await db.$disconnect();
});

describe("editar tareas", () => {
  it("el profesor del curso edita su tarea y queda auditado; otro profesor no puede", async () => {
    expect((await crearTarea(ctxs.prof, { cursoId, titulo: "Fichas", descripcion: "pág. 1", fechaEntrega: manana })).ok).toBe(true);
    const t = await db.tarea.findFirstOrThrow({ where: { tenantId: tenant.id } });
    const r = await actualizarTarea(ctxs.prof, t.id, { titulo: "Fichas corregidas", descripcion: "", fechaEntrega: pasado });
    expect(r.ok).toBe(true);
    const despues = await db.tarea.findFirstOrThrow({ where: { id: t.id } });
    expect(despues.titulo).toBe("Fichas corregidas");
    expect(despues.descripcion).toBeNull();
    expect(despues.fechaEntrega.toISOString()).toBe(new Date(`${pasado}T08:00:00-05:00`).toISOString());
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, entidad: "tarea", accion: "editar", entidadId: t.id } })).toBe(1);

    await expect(actualizarTarea(ctxs.otro, t.id, { titulo: "Hackeada", fechaEntrega: pasado })).rejects.toThrow();
    await expect(actualizarTarea(ctxs.madre, t.id, { titulo: "Hackeada", fechaEntrega: pasado })).rejects.toThrow();
    expect((await db.tarea.findFirstOrThrow({ where: { id: t.id } })).titulo).toBe("Fichas corregidas");
  });

  it("valida título y fecha", async () => {
    const t = await db.tarea.findFirstOrThrow({ where: { tenantId: tenant.id } });
    expect((await actualizarTarea(ctxs.prof, t.id, { titulo: "x", fechaEntrega: pasado })).ok).toBe(false);
    expect((await actualizarTarea(ctxs.prof, t.id, { titulo: "Título válido", fechaEntrega: "2020-01-01" })).ok).toBe(false);
  });
});

describe("editar eventos", () => {
  it("el profesor edita solo el suyo; dirección edita cualquiera", async () => {
    expect((await crearEvento(ctxs.prof, { titulo: "Reunión", tipo: "reunion", fecha: manana, salonId })).ok).toBe(true);
    expect((await crearEvento(ctxs.dir, { titulo: "Feriado", tipo: "feriado", fecha: pasado })).ok).toBe(true);
    const suyo = await db.eventoAgenda.findFirstOrThrow({ where: { tenantId: tenant.id, titulo: "Reunión" } });
    const general = await db.eventoAgenda.findFirstOrThrow({ where: { tenantId: tenant.id, titulo: "Feriado" } });

    expect((await actualizarEvento(ctxs.prof, suyo.id, { titulo: "Reunión de aula", tipo: "reunion", fecha: pasado, hora: "10:30" })).ok).toBe(true);
    const e = await db.eventoAgenda.findFirstOrThrow({ where: { id: suyo.id } });
    expect(e.titulo).toBe("Reunión de aula");
    expect(e.inicio.toISOString()).toBe(new Date(`${pasado}T10:30:00-05:00`).toISOString());
    expect(e.salonId).toBe(salonId);

    expect((await actualizarEvento(ctxs.prof, general.id, { titulo: "Cambiado", tipo: "feriado", fecha: pasado })).ok).toBe(false);
    await expect(actualizarEvento(ctxs.madre, suyo.id, { titulo: "Cambiado", tipo: "evento", fecha: pasado })).rejects.toThrow();
    expect((await actualizarEvento(ctxs.dir, suyo.id, { titulo: "Por dirección", tipo: "evento", fecha: pasado })).ok).toBe(true);
    expect((await actualizarEvento(ctxs.dir, general.id, { titulo: "Feriado largo", tipo: "feriado", fecha: pasado })).ok).toBe(true);
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, entidad: "evento_agenda", accion: "editar" } })).toBe(3);
  });

  it("no cruza colegios: un evento de otro colegio no se edita", async () => {
    const ajeno = await db.tenant.create({ data: { slug: `test-extras-${randomUUID().slice(0, 8)}`, nombre: "Otro", plan: "promax" } });
    try {
      const autor = await db.membership.create({ data: { tenantId: ajeno.id, userId: ctxs.prof.user.id, rol: "profesor" } });
      const ev = await db.eventoAgenda.create({ data: { tenantId: ajeno.id, creadoPorId: autor.id, titulo: "Ajeno", tipo: "evento", inicio: new Date() } });
      expect((await actualizarEvento(ctxs.dir, ev.id, { titulo: "Robado", tipo: "evento", fecha: manana })).ok).toBe(false);
      expect((await db.eventoAgenda.findFirstOrThrow({ where: { id: ev.id } })).titulo).toBe("Ajeno");
    } finally {
      await db.tenant.delete({ where: { id: ajeno.id } });
    }
  });
});

describe("agenda para .ics", () => {
  it("cada rol ve solo lo suyo (base del calendario)", async () => {
    const desde = new Date(Date.now() - 86_400_000);
    const hasta = new Date(Date.now() + 30 * 86_400_000);
    await crearEvento(ctxs.dir, { titulo: "Solo 5.° A", tipo: "evento", fecha: manana, salonId: otroSalonId });
    const madre = await itemsDeAgenda(ctxs.madre, desde, hasta);
    expect(madre.map((i) => i.titulo)).not.toContain("Solo 5.° A");
    expect(madre.map((i) => i.titulo)).toContain("Entrega: Fichas corregidas");
    const dir = await itemsDeAgenda(ctxs.dir, desde, hasta);
    expect(dir.map((i) => i.titulo)).toContain("Solo 5.° A");
  });
});

describe("exportación ZIP", () => {
  it("cubre todos los modelos con tenantId del esquema Prisma (salvo los omitidos a propósito)", () => {
    const esquema = readFileSync(path.resolve(import.meta.dirname, "../../prisma/schema.prisma"), "utf8");
    const conTenant = [...esquema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
      .filter(([, nombre, cuerpo]) => /^\s+tenantId\s+String/m.test(cuerpo) && !MODELOS_GLOBALES.has(nombre))
      .map(([, nombre]) => nombre);
    expect(conTenant.length).toBeGreaterThan(20);
    const exportadas = new Set(tablasExportadas());
    const omitidas = new Set<string>(TABLAS_OMITIDAS);
    const faltan = conTenant.filter((n) => !exportadas.has(n.charAt(0).toLowerCase() + n.slice(1)) && !omitidas.has(n));
    expect(faltan, `Modelos con tenantId sin exportar: ${faltan.join(", ")}`).toEqual([]);
    // Todo lo exportado es un modelo real con tenantId (no se cuela una tabla global).
    for (const n of Object.values(Prisma.ModelName)) {
      if (MODELOS_GLOBALES.has(n)) expect(exportadas.has(n.charAt(0).toLowerCase() + n.slice(1))).toBe(false);
    }
    expect(conTenant.filter((n) => omitidas.has(n)).sort()).toEqual([...TABLAS_OMITIDAS].sort());
  });

  it("el ZIP trae un JSON por tabla, README, el archivo subido, es solo de dirección y queda auditado", async () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("datos-de-prueba")]);
    const guardado = await guardarArchivo(ctxs.dir.db, png, { tenantId: tenant.id, carpeta: "test-extras", subidoPorId: m.dir.id });
    if (!guardado.ok) throw new Error(guardado.error);
    archivoId = guardado.archivo.id;
    archivoPublicId = guardado.archivo.publicId;

    await expect(exportarColegioZip(ctxs.prof)).rejects.toThrow();
    await expect(exportarColegioZip(ctxs.madre)).rejects.toThrow();
    const antes = await db.auditoria.count({ where: { tenantId: tenant.id, accion: "exportar" } });
    const zip = unzipSync(await exportarColegioZip(ctxs.dir));
    for (const tabla of [...tablasExportadas(), "perfiles"]) expect(zip[`tablas/${tabla}.json`], tabla).toBeDefined();
    expect(zip["README.txt"]).toBeDefined();
    expect(strFromU8(zip["README.txt"])).toContain("\r\n");
    expect(JSON.parse(strFromU8(zip["colegio.json"])).slug ?? JSON.parse(strFromU8(zip["colegio.json"])).colegio.slug).toBe(tenant.slug);
    expect(JSON.parse(strFromU8(zip["tablas/tarea.json"]))).toHaveLength(1);
    expect(Buffer.from(zip[`archivos/${archivoId}.png`]).equals(png)).toBe(true);
    expect(Object.keys(zip).join()).not.toContain("tokenHash");
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, accion: "exportar" } })).toBe(antes + 1);

    const json = await exportarColegio(ctxs.dir);
    expect(json.tarea).toHaveLength(1);
  });
});
