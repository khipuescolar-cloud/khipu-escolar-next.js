// Adjuntos de comunicados y tareas: validación, control de acceso a la descarga y borrado (specs/09, 12, 14).
// Crea su propio colegio (test-adjuntos-<azar>) y lo borra al terminar. Los archivos van al almacenamiento local (.uploads).
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { rm } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { itemsDeAgenda } from "@/lib/server/agenda";
import { eliminarSalon } from "@/lib/server/gestion";
import { LocalStorage } from "@/lib/server/storage/local";
import { requireArchivoVisible } from "@/lib/server/archivos";
import { borrarComunicado, editarComunicado, listarComunicados, publicarComunicado } from "@/lib/server/comunicados";
import { db } from "@/lib/server/db";
import { detectarMimeAdjunto, MIME_DOCX, MIME_XLSX, type EntradaAdjunto } from "@/lib/server/adjuntos";
import { crearTarea, eliminarTarea, tareasDeFamilia } from "@/lib/server/tareas";
import type { TenantContext } from "@/lib/server/tenant";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const pdf = (nombre = "circular.pdf", relleno = 0): EntradaAdjunto => ({ nombre, buffer: Buffer.concat([Buffer.from("%PDF-1.4\n%contenido\n"), Buffer.alloc(relleno)]) });
const docx = (): EntradaAdjunto => ({ nombre: "autorizacion.docx", buffer: Buffer.from(zipSync({ "word/document.xml": new Uint8Array([60, 62]) })) });
const xlsx = (): EntradaAdjunto => ({ nombre: "horario.xlsx", buffer: Buffer.from(zipSync({ "xl/workbook.xml": new Uint8Array([60, 62]) })) });

describe("adjuntos de comunicados y tareas", () => {
  let c: ColegioPrueba;
  let otraFamilia: TenantContext;
  let administrativo: TenantContext;
  const perfiles: string[] = [];

  beforeAll(async () => {
    c = await crearColegioPrueba({ plan: "fase2", prefijo: "test-adjuntos" });
    const mk = async (rol: "apoderado" | "administrativo", nombre: string) => {
      const id = randomUUID();
      perfiles.push(id);
      const user = await db.profile.create({ data: { id, email: `${nombre}-${id.slice(0, 8)}@test-adjuntos.local`, nombres: nombre, apellidos: "Prueba" } });
      const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: id, rol } });
      return { tenant: c.tenant, user, membership, rol, roles: [rol], db: c.db, ...accesoModulosDeCodigo(c.tenant.plan) } as TenantContext;
    };
    otraFamilia = await mk("apoderado", "Marta");
    administrativo = await mk("administrativo", "Ana");
    await c.db.apoderadoAlumno.create({ data: { tenantId: c.tenant.id, apoderadoId: otraFamilia.membership.id, alumnoId: c.alumnos.thiago.id } });
  });
  afterAll(async () => {
    await c?.limpiar();
    await db.profile.deleteMany({ where: { id: { in: perfiles } } });
  });

  it("detecta PDF, imágenes, DOCX y XLSX por su contenido y rechaza lo demás", () => {
    expect(detectarMimeAdjunto(pdf().buffer)).toBe("application/pdf");
    expect(detectarMimeAdjunto(docx().buffer)).toBe(MIME_DOCX);
    expect(detectarMimeAdjunto(xlsx().buffer)).toBe(MIME_XLSX);
    expect(detectarMimeAdjunto(Buffer.from("hola"))).toBeNull();
    expect(detectarMimeAdjunto(Buffer.from(zipSync({ "otra/cosa.txt": new Uint8Array([1]) })))).toBeNull();
  });

  it("valida tipo, tamaño (10 MB) y cantidad (5) al publicar", async () => {
    const dir = c.ctxDe("direccion");
    const base = { titulo: "Reunión", cuerpo: "Cuerpo", salonId: null };
    await expect(publicarComunicado(dir, base, [{ nombre: "x.txt", buffer: Buffer.from("texto") }])).rejects.toThrow(/no se puede adjuntar/);
    await expect(publicarComunicado(dir, base, [pdf("grande.pdf", 10 * 1024 * 1024)])).rejects.toThrow(/más de 10 MB/);
    await expect(publicarComunicado(dir, base, Array.from({ length: 6 }, (_, i) => pdf(`a${i}.pdf`)))).rejects.toThrow(/hasta 5 archivos/);
    expect(await c.db.comunicado.count({ where: { titulo: "Reunión" } })).toBe(0);
  });

  it("comunicado de un salón: lo descargan autor, dirección, familias y profesores del salón; no otro salón ni portería", async () => {
    const dir = c.ctxDe("direccion");
    const { id } = await publicarComunicado(dir, { titulo: "Paseo 3.° B", cuerpo: "Salida al museo", salonId: c.salon.id }, [pdf(), docx(), xlsx()]);
    const adjuntos = (await listarComunicados(dir)).find((x) => x.id === id)!.adjuntos;
    expect(adjuntos.map((a) => a.nombre)).toEqual(["circular.pdf", "autorizacion.docx", "horario.xlsx"]);
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { comunicadoId: id, nombre: "circular.pdf" } });
    expect(archivo).toMatchObject({ privado: true, mimeType: "application/pdf", subidoPorId: dir.user.id });

    for (const quien of [dir, c.ctxDe("madre"), c.ctxDe("tutora")]) {
      expect((await requireArchivoVisible(quien, archivo.id)).id).toBe(archivo.id);
    }
    // Apoderado de otro salón, profesor de otro salón, personal administrativo y portería: 403.
    await esperarProhibido(requireArchivoVisible(otraFamilia, archivo.id));
    await esperarProhibido(requireArchivoVisible(c.ctxDe("otroProfesor"), archivo.id));
    await esperarProhibido(requireArchivoVisible(administrativo, archivo.id));
    await esperarProhibido(requireArchivoVisible(c.ctxDe("porteria"), archivo.id));
  });

  it("comunicado de todo el colegio: lo descarga cualquier familia o profesor; portería no", async () => {
    const dir = c.ctxDe("direccion");
    const { id } = await publicarComunicado(dir, { titulo: "Feriado", cuerpo: "No hay clases", salonId: null }, [pdf("feriado.pdf")]);
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { comunicadoId: id } });
    for (const quien of [otraFamilia, c.ctxDe("madre"), c.ctxDe("otroProfesor"), administrativo]) {
      expect((await requireArchivoVisible(quien, archivo.id)).id).toBe(archivo.id);
    }
    await esperarProhibido(requireArchivoVisible(c.ctxDe("porteria"), archivo.id));
  });

  it("editar quita y agrega adjuntos respetando el máximo; borrar elimina filas y archivos", async () => {
    const dir = c.ctxDe("direccion");
    const { id } = await publicarComunicado(dir, { titulo: "Editable", cuerpo: "x", salonId: null }, [pdf("a.pdf"), pdf("b.pdf"), pdf("c.pdf"), pdf("d.pdf")]);
    await expect(editarComunicado(dir, id, { titulo: "Editable", cuerpo: "x" }, { nuevos: [pdf("e.pdf"), pdf("f.pdf")] })).rejects.toThrow(/hasta 5 archivos/);

    const [a] = await c.db.archivo.findMany({ where: { comunicadoId: id }, orderBy: { createdAt: "asc" } });
    await editarComunicado(dir, id, { titulo: "Editable", cuerpo: "x" }, { quitar: [a.id, "no-es-un-id"], nuevos: [pdf("e.pdf"), pdf("f.pdf")] });
    const restantes = await c.db.archivo.findMany({ where: { comunicadoId: id } });
    expect(restantes.map((r) => r.nombre).sort()).toEqual(["b.pdf", "c.pdf", "d.pdf", "e.pdf", "f.pdf"]);
    const rutaQuitada = path.resolve(process.cwd(), ".uploads", a.publicId);
    expect(existsSync(rutaQuitada)).toBe(false);

    const rutas = restantes.map((r) => path.resolve(process.cwd(), ".uploads", r.publicId));
    expect(rutas.every((r) => existsSync(r))).toBe(true);
    await borrarComunicado(dir, id);
    expect(await c.db.archivo.count({ where: { comunicadoId: id } })).toBe(0);
    expect(rutas.some((r) => existsSync(r))).toBe(false);
  });

  it("tarea: la descargan el profesor, dirección y las familias de su salón; no otro salón", async () => {
    const tutora = c.ctxDe("tutora");
    const fecha = sumarDias(fechaLima(new Date()), 3);
    expect(await crearTarea(tutora, { cursoId: c.cursoTutora.id, titulo: "Ficha con adjunto", fechaEntrega: fecha }, [pdf("ficha.pdf"), docx()])).toMatchObject({ ok: true });
    expect(await crearTarea(tutora, { cursoId: c.cursoTutora.id, titulo: "Mala", fechaEntrega: fecha }, [{ nombre: "x.exe", buffer: Buffer.from("MZ") }])).toMatchObject({ ok: false });
    const tarea = await c.db.tarea.findFirstOrThrow({ where: { titulo: "Ficha con adjunto" } });
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { tareaId: tarea.id, nombre: "ficha.pdf" } });

    const hijos = await tareasDeFamilia(c.ctxDe("madre"));
    expect(hijos[0].grupos.semana.concat(hijos[0].grupos.manana, hijos[0].grupos.despues).find((t) => t.id === tarea.id)?.adjuntos).toHaveLength(2);

    for (const quien of [tutora, c.ctxDe("direccion"), c.ctxDe("madre")]) {
      expect((await requireArchivoVisible(quien, archivo.id)).id).toBe(archivo.id);
    }
    await esperarProhibido(requireArchivoVisible(otraFamilia, archivo.id));
    await esperarProhibido(requireArchivoVisible(c.ctxDe("otroProfesor"), archivo.id));
    await esperarProhibido(requireArchivoVisible(administrativo, archivo.id));

    // La agenda lista los adjuntos con el mismo control de acceso que la descarga.
    const desde = new Date();
    const hasta = new Date(Date.now() + 10 * 86_400_000);
    const entrega = async (quien: TenantContext) => (await itemsDeAgenda(quien, desde, hasta)).find((i) => i.id === tarea.id);
    expect((await entrega(c.ctxDe("madre")))?.adjuntos.map((a) => a.nombre).sort()).toEqual(["autorizacion.docx", "ficha.pdf"]);
    expect((await entrega(tutora))?.adjuntos).toHaveLength(2);
    expect((await entrega(c.ctxDe("direccion")))?.adjuntos).toHaveLength(2);
    expect((await entrega(administrativo))?.adjuntos ?? []).toEqual([]); // no puede descargarlos: no se los muestra

    const ruta = path.resolve(process.cwd(), ".uploads", archivo.publicId);
    expect(existsSync(ruta)).toBe(true);
    expect(await eliminarTarea(tutora, tarea.id)).toMatchObject({ ok: true });
    expect(await c.db.archivo.count({ where: { tareaId: tarea.id } })).toBe(0);
    expect(existsSync(ruta)).toBe(false);
  });

  it("al borrar un salón se borran del proveedor los adjuntos de sus comunicados (no quedan huérfanos)", async () => {
    const salon = await c.db.salon.create({ data: { tenantId: c.tenant.id, nombre: "Salón efímero", nivel: "primaria", anio: 2026 } });
    const { id } = await publicarComunicado(c.ctxDe("direccion"), { titulo: "Del salón", cuerpo: "Cuerpo", salonId: salon.id }, [pdf("salon.pdf")]);
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { comunicadoId: id } });
    const ruta = path.resolve(process.cwd(), ".uploads", archivo.publicId);
    expect(existsSync(ruta)).toBe(true);
    await eliminarSalon(c.ctxDe("direccion"), salon.id);
    expect(await c.db.archivo.count({ where: { id: archivo.id } })).toBe(0);
    expect(existsSync(ruta)).toBe(false);
  });

  it("si el proveedor falla al borrar, la operación no se rompe", async () => {
    const dir = c.ctxDe("direccion");
    const { id: comunicadoId } = await publicarComunicado(dir, { titulo: "Falla", cuerpo: "Cuerpo", salonId: null }, [pdf("falla.pdf")]);
    const espia = vi.spyOn(LocalStorage.prototype, "borrar").mockRejectedValue(new Error("proveedor caído"));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { comunicadoId } });
    try {
      await expect(borrarComunicado(dir, archivo.comunicadoId!)).resolves.toBeUndefined();
      expect(silencio).toHaveBeenCalled();
    } finally {
      espia.mockRestore();
      silencio.mockRestore();
    }
    expect(await c.db.comunicado.count({ where: { id: archivo.comunicadoId! } })).toBe(0);
    await rm(path.resolve(process.cwd(), ".uploads", archivo.publicId), { force: true });
  });
});
