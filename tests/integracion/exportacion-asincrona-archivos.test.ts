// Requiere la BD local. Crea su propio colegio `test-exportacion-*`; la limpieza borra también sus archivos locales.
import { randomUUID } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Archivo } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import {
  EXPORTACION_VENCE_DIAS, exportacionDescargable, listarExportaciones, procesarExportaciones, solicitarExportacion, solicitarExportacionDireccion,
} from "@/lib/server/exportar";
import { encontrarArchivosHuerfanos, limpiarArchivosHuerfanos, migrarArchivos } from "@/lib/server/mantenimiento-archivos";
import { borrarArchivoDelProveedor, guardarArchivo, leerArchivo } from "@/lib/server/storage";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("exportacion-test")]);
const dias = (n: number) => new Date(Date.now() - n * 86_400_000);

beforeAll(async () => {
  c = await crearColegioPrueba({ prefijo: "test-exportacion", plan: "promax" });
});
afterAll(async () => {
  const archivos = await db.archivo.findMany({ where: { tenantId: c.tenant.id } });
  for (const a of archivos) await borrarArchivoDelProveedor(a).catch(() => undefined);
  await c.limpiar();
});

const dir = () => c.ctxDe("direccion");
const worker = () => procesarExportaciones(new Date(), { tenantId: c.tenant.id });

describe("exportación asíncrona", () => {
  it("solo dirección solicita; no duplica si hay una pendiente o procesando", async () => {
    await esperarProhibido(solicitarExportacionDireccion(c.ctxDe("madre")));
    await esperarProhibido(solicitarExportacionDireccion(c.ctxDe("tutora")));
    const a = await solicitarExportacionDireccion(dir());
    const b = await solicitarExportacionDireccion(dir());
    expect(b.id).toBe(a.id);
    expect(a.estado).toBe("pendiente");
    await db.exportacionColegio.update({ where: { id: a.id }, data: { estado: "procesando" } });
    expect((await solicitarExportacion(c.tenant.id, c.miembros.direccion.user.id)).id).toBe(a.id);
    await db.exportacionColegio.delete({ where: { id: a.id } });
  });

  it("el worker arma el ZIP, lo guarda privado, marca lista, audita y permite descargar solo en su colegio", async () => {
    const guardado = await guardarArchivo(c.db, PNG, { tenantId: c.tenant.id, carpeta: "test", subidoPorId: c.miembros.direccion.user.id });
    if (!guardado.ok) throw new Error(guardado.error);
    const e = await solicitarExportacionDireccion(dir());
    const r = await worker();
    expect(r).toMatchObject({ listas: 1, conError: 0 });
    const fila = await db.exportacionColegio.findUniqueOrThrow({ where: { id: e.id }, include: { archivo: true } });
    expect(fila).toMatchObject({ estado: "lista", intentos: 1, error: null });
    expect(fila.terminadoAt).not.toBeNull();
    expect(fila.archivo).toMatchObject({ privado: true, mimeType: "application/zip", tenantId: c.tenant.id });

    const zip = unzipSync(new Uint8Array(await leerArchivo(fila.archivo!)));
    expect(zip["README.txt"]).toBeDefined();
    expect(zip[`archivos/${guardado.archivo.id}.png`]).toBeDefined();
    expect(Object.keys(zip).some((k) => k.startsWith(`archivos/${fila.archivoId}`))).toBe(false); // no se mete a sí mismo
    expect(JSON.parse(strFromU8(zip["tablas/exportacionColegio.json"])).length).toBeGreaterThan(0);
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, accion: "exportar", entidad: "colegio" } })).toBe(1);

    expect(await exportacionDescargable(c.tenant.id, e.id)).not.toBeNull();
    const otro = await db.tenant.findFirstOrThrow({ where: { id: { not: c.tenant.id } } });
    expect(await exportacionDescargable(otro.id, e.id)).toBeNull();
    const vista = (await listarExportaciones(c.tenant.id))[0];
    expect(vista).toMatchObject({ estado: "lista", descargable: true });
    expect(vista.venceAt!.getTime() - fila.terminadoAt!.getTime()).toBe(EXPORTACION_VENCE_DIAS * 86_400_000);

    // La siguiente exportación no incluye el ZIP anterior.
    const e2 = await solicitarExportacionDireccion(dir());
    await worker();
    const f2 = await db.exportacionColegio.findUniqueOrThrow({ where: { id: e2.id }, include: { archivo: true } });
    const zip2 = unzipSync(new Uint8Array(await leerArchivo(f2.archivo!)));
    expect(Object.keys(zip2).some((k) => k.includes(fila.archivoId!))).toBe(false);
  });

  it("la reserva es atómica: dos workers a la vez procesan la exportación una sola vez", async () => {
    const e = await solicitarExportacionDireccion(dir());
    const [a, b] = await Promise.all([worker(), worker()]);
    expect(a.procesadas + b.procesadas).toBe(1);
    expect((await db.exportacionColegio.findUniqueOrThrow({ where: { id: e.id } })).intentos).toBe(1);
  });

  it("recupera las colgadas >15 min (reintenta) y pasa a error tras 3 intentos", async () => {
    const hace = new Date(Date.now() - 20 * 60_000);
    const colgada = await db.exportacionColegio.create({ data: { tenantId: c.tenant.id, solicitadoPorId: c.miembros.direccion.user.id, estado: "procesando", intentos: 1, terminadoAt: hace } });
    const agotada = await db.exportacionColegio.create({ data: { tenantId: c.tenant.id, solicitadoPorId: c.miembros.direccion.user.id, estado: "procesando", intentos: 3, terminadoAt: hace } });
    const reciente = await db.exportacionColegio.create({ data: { tenantId: c.tenant.id, solicitadoPorId: c.miembros.direccion.user.id, estado: "procesando", intentos: 1, terminadoAt: new Date() } });
    const r = await worker();
    expect(r.recuperadas).toBe(2);
    expect((await db.exportacionColegio.findUniqueOrThrow({ where: { id: colgada.id } })).estado).toBe("lista"); // se reintentó y terminó
    expect((await db.exportacionColegio.findUniqueOrThrow({ where: { id: agotada.id } })).estado).toBe("error");
    expect((await db.exportacionColegio.findUniqueOrThrow({ where: { id: reciente.id } })).estado).toBe("procesando");
    await db.exportacionColegio.deleteMany({ where: { id: { in: [agotada.id, reciente.id] } } });
  });

  it("un error guarda el mensaje; reintenta y al tercer intento queda en error", async () => {
    // Quien pidió ya no existe: armar el contexto falla siempre.
    const fantasma = randomUUID();
    const e = await db.exportacionColegio.create({ data: { tenantId: c.tenant.id, solicitadoPorId: fantasma } });
    const silencio = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await worker();
    let fila = await db.exportacionColegio.findUniqueOrThrow({ where: { id: e.id } });
    expect(fila).toMatchObject({ estado: "pendiente", intentos: 1 });
    expect(fila.error).toContain("ya no existe");
    await worker();
    await worker();
    silencio.mockRestore();
    fila = await db.exportacionColegio.findUniqueOrThrow({ where: { id: e.id } });
    expect(fila).toMatchObject({ estado: "error", intentos: 3 });
    expect((await listarExportaciones(c.tenant.id)).find((v) => v.id === e.id)).toMatchObject({ estado: "error", descargable: false });
  });

  it("a los 7 días el cron borra el archivo y la exportación queda vencida", async () => {
    const e = await db.exportacionColegio.findFirstOrThrow({ where: { tenantId: c.tenant.id, estado: "lista", archivoId: { not: null } }, include: { archivo: true } });
    await db.exportacionColegio.update({ where: { id: e.id }, data: { terminadoAt: dias(8) } });
    const r = await worker();
    expect(r.caducadas).toBeGreaterThanOrEqual(1);
    const fila = await db.exportacionColegio.findUniqueOrThrow({ where: { id: e.id } });
    expect(fila).toMatchObject({ estado: "lista", archivoId: null });
    expect(await db.archivo.count({ where: { id: e.archivoId! } })).toBe(0);
    await expect(leerArchivo(e.archivo!)).rejects.toThrow();
    expect(await exportacionDescargable(c.tenant.id, e.id)).toBeNull();
    expect((await listarExportaciones(c.tenant.id)).find((v) => v.id === e.id)?.estado).toBe("vencida");
  });
});

describe("mantenimiento de archivos", () => {
  async function archivo(extra: Partial<Archivo> = {}): Promise<Archivo> {
    const g = await guardarArchivo(c.db, Buffer.concat([PNG, Buffer.from(randomUUID())]), { tenantId: c.tenant.id, carpeta: "huerfanos" });
    if (!g.ok) throw new Error(g.error);
    return db.archivo.update({ where: { id: g.archivo.id }, data: { createdAt: dias(2), ...extra } });
  }

  it("detecta solo los huérfanos de más de 24 h y los borra con --confirmar", async () => {
    const huerfano = await archivo();
    const reciente = await archivo({ createdAt: new Date() });
    const logo = await archivo();
    await db.tenant.update({ where: { id: c.tenant.id }, data: { logoArchivoId: logo.id } });
    const foto = await archivo();
    await db.alumno.update({ where: { id: c.alumnos.mateo.id }, data: { fotoArchivoId: foto.id } });
    const tarea = await db.tarea.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, titulo: "T", fechaEntrega: new Date(), creadoPorId: c.miembros.tutora.membership.id } });
    const adjuntoTarea = await archivo({ tareaId: tarea.id });

    const ids = (await encontrarArchivosHuerfanos(db)).map((a) => a.id);
    expect(ids).toContain(huerfano.id);
    for (const a of [reciente, logo, foto, adjuntoTarea]) expect(ids).not.toContain(a.id);

    // Simulacro: no borra. Confirmado: borra del almacenamiento y de la BD solo los de este colegio de prueba que sean huérfanos.
    const propios = (await encontrarArchivosHuerfanos(db)).filter((a) => a.tenantId === c.tenant.id);
    const borrarSoloPropios = async (a: Archivo) => {
      if (a.tenantId !== c.tenant.id) throw new Error("ajeno: no se toca");
      await borrarArchivoDelProveedor(a);
    };
    const simulacro = await limpiarArchivosHuerfanos(db, { confirmar: false });
    expect(simulacro.borrados).toBe(0);
    expect(await db.archivo.count({ where: { id: huerfano.id } })).toBe(1);
    const real = await limpiarArchivosHuerfanos(db, { confirmar: true, borrarDelProveedor: borrarSoloPropios });
    expect(real.borrados).toBeGreaterThanOrEqual(propios.length);
    expect(await db.archivo.count({ where: { id: huerfano.id } })).toBe(0);
    await expect(leerArchivo(huerfano)).rejects.toThrow();
    for (const a of [reciente, logo, foto, adjuntoTarea]) expect(await db.archivo.count({ where: { id: a.id } })).toBe(1);
  });

  it("migrar copia al destino, actualiza proveedor/publicId/url y borra el original; el simulacro no toca nada", async () => {
    const a = await archivo({ privado: true });
    const subidos: string[] = [];
    const destino = {
      proveedor: "s3" as const,
      subir: async (_b: Buffer, o: { tenantId: string; carpeta: string }) => {
        subidos.push(o.carpeta);
        return { proveedor: "s3" as const, publicId: `khipu/${o.tenantId}/migrados/${a.id}.png`, url: null };
      },
      urlTemporal: async () => "",
      borrar: async () => undefined,
    };
    // Aislado del resto de archivos locales de otras pruebas: el lector falla para los que no son de este test.
    const leer = async (x: Archivo) => {
      if (x.id !== a.id) throw new Error("otro archivo");
      return PNG;
    };
    const sim = await migrarArchivos(db, { de: "local", a: "s3", simulacro: true, leer, destino });
    expect(sim.migrados).toBe(0);
    expect((await db.archivo.findUniqueOrThrow({ where: { id: a.id } })).proveedor).toBe("local");
    const r = await migrarArchivos(db, { de: "local", a: "s3", simulacro: false, leer, destino });
    expect(subidos).toContain("migrados");
    expect(r.migrados).toBeGreaterThanOrEqual(1);
    expect(await db.archivo.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({ proveedor: "s3", publicId: `khipu/${c.tenant.id}/migrados/${a.id}.png` });
    await expect(migrarArchivos(db, { de: "s3", a: "s3", simulacro: true })).rejects.toThrow();
  });
});
