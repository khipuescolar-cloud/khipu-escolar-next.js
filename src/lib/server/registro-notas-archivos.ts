import "server-only";
import ExcelJS from "exceljs";
import { analizarArchivoNotas, exportarRegistroCsv, plantillaCsv, textoNotaExport, type AnalisisArchivoNotas } from "@/lib/notas-plantilla";
import type { Tabla } from "@/lib/carga-masiva/tabla";
import { fallo, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { cursoEscritura, cursoLectura, periodoAbierto } from "./notas";
import { crearCalificacion, registroDelCurso } from "./registro-notas";
import { type TenantContext } from "./tenant";

// Plantilla, importación y exportación del registro (specs/47). La importación crea UNA calificación con `crearCalificacion`.

const slugArchivo = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function contextoDeCurso(ctx: TenantContext, cursoId: string, periodoId: string) {
  const curso = await cursoEscritura(ctx, cursoId);
  const [periodo, alumnos, competencias, cursoInfo] = await Promise.all([
    ctx.db.periodo.findFirst({ where: { id: periodoId } }),
    ctx.db.alumno.findMany({ where: { salonId: curso.salonId, estado: "activo" }, select: { id: true, nombres: true, apellidos: true }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    ctx.db.competencia.findMany({ where: { cursoId, desactivadaAt: null }, select: { id: true, nombre: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.curso.findFirst({ where: { id: cursoId }, select: { nombre: true, salon: { select: { nombre: true } } } }),
  ]);
  return { curso, periodo, alumnos, competencias, nombreCurso: cursoInfo ? `${cursoInfo.nombre} ${cursoInfo.salon.nombre}` : "curso" };
}

/** Plantilla del curso y periodo: Excel (hoja «Datos» con `alumno_id` oculto, «Instrucciones» y «Competencias») o CSV con BOM y «;». */
export async function plantillaNotas(ctx: TenantContext, cursoId: string, periodoId: string, formato: "xlsx" | "csv"): Promise<{ nombre: string; tipo: string; contenido: Uint8Array | string }> {
  const { periodo, alumnos, competencias, nombreCurso } = await contextoDeCurso(ctx, cursoId, periodoId);
  const nombre = `plantilla-notas-${slugArchivo(nombreCurso)}-${slugArchivo(periodo?.nombre ?? "periodo")}`;
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "exportar", entidad: "plantilla_notas", entidadId: cursoId, detalle: { periodoId, formato } });
  if (formato === "csv") return { nombre: `${nombre}.csv`, tipo: "text/csv; charset=utf-8", contenido: plantillaCsv(alumnos) };
  const libro = new ExcelJS.Workbook();
  libro.creator = "Khipu Escolar";
  const datos = libro.addWorksheet("Datos", { views: [{ state: "frozen", ySplit: 1 }] });
  datos.columns = [
    { header: "alumno_id", key: "id", width: 38, hidden: true },
    { header: "apellidos_nombres", key: "nombre", width: 38 },
    { header: "nota", key: "nota", width: 10, style: { numFmt: "@" } },
    { header: "observacion", key: "obs", width: 60 },
  ];
  datos.getRow(1).font = { bold: true, color: { argb: "FF1E2A78" } };
  for (const a of alumnos) datos.addRow({ id: a.id, nombre: `${a.apellidos}, ${a.nombres}`, nota: "", obs: "" });
  const validos = ctx.tenant.escalaCalificacion === "literal" ? ["AD", "A", "B", "C", "NE"] : [...Array.from({ length: 21 }, (_, i) => String(20 - i)), "NE"];
  for (let i = 2; i <= alumnos.length + 1; i++) datos.getCell(`C${i}`).dataValidation = { type: "list", allowBlank: true, formulae: [`"${validos.join(",")}"`], showErrorMessage: true, errorTitle: "Nota inválida", error: `Usa ${validos.join(", ")}.` };
  const instrucciones = libro.addWorksheet("Instrucciones");
  instrucciones.getColumn(1).width = 110;
  instrucciones.addRow([`Khipu Escolar · Plantilla de notas · ${nombreCurso} · ${periodo?.nombre ?? ""}`]).font = { bold: true, size: 14, color: { argb: "FF1E2A78" } };
  for (const t of [
    "Esta plantilla es para UNA actividad. El nombre, la fecha y la competencia se escriben en Khipu al importar.",
    `En la hoja «Datos» llena solo las columnas «nota» (${validos.join(", ")}; «NE» = no entregó) y «observacion» (opcional, hasta 500 caracteres).`,
    "No cambies la columna «alumno_id» (está oculta) ni borres filas de alumnos. Deja «nota» vacía si el alumno queda pendiente.",
    "Una observación necesita una nota. Por defecto la observación es privada: solo la ven el profesor, el tutor y dirección.",
    "Guárdala como .xlsx (o expórtala a CSV) y súbela en Registro de notas → Importar / Exportar.",
  ]) instrucciones.addRow([`• ${t}`]).alignment = { wrapText: true, vertical: "top" };
  const hojaComp = libro.addWorksheet("Competencias");
  hojaComp.getColumn(1).width = 80;
  hojaComp.addRow(["Competencias válidas del curso (se eligen en Khipu al importar)"]).font = { bold: true };
  for (const c of competencias) hojaComp.addRow([c.nombre]);
  return { nombre: `${nombre}.xlsx`, tipo: TIPO_XLSX, contenido: new Uint8Array(await libro.xlsx.writeBuffer()) };
}

export type EntradaImportacion = { cursoId: string; periodoId: string; competenciaId: string; nombre: string; fecha: string; observacionVisible?: boolean; claveIdempotencia: string };
export type VistaPreviaRegistro = AnalisisArchivoNotas & { bloqueo: string | null };

async function validar(ctx: TenantContext, e: EntradaImportacion, tabla: Tabla) {
  const { curso, periodo, alumnos, competencias } = await contextoDeCurso(ctx, e.cursoId, e.periodoId);
  const analisis = analizarArchivoNotas(tabla, { escala: ctx.tenant.escalaCalificacion, alumnos });
  let bloqueo: string | null = null;
  if (curso.profesorId !== ctx.membership.id) bloqueo = "Solo quien dicta el curso puede importar notas.";
  else if (!e.nombre.trim() || e.nombre.trim().length < 2) bloqueo = "Escribe el nombre de la actividad.";
  else if (!competencias.some((c) => c.id === e.competenciaId)) bloqueo = "Elige una competencia activa de este curso.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha)) bloqueo = "Elige la fecha de la actividad.";
  else {
    const abierto = await periodoAbierto(ctx, e.periodoId, e.cursoId);
    if (abierto.error) bloqueo = abierto.error;
    else if (periodo && (new Date(`${e.fecha}T00:00:00.000Z`) < periodo.inicio || new Date(`${e.fecha}T00:00:00.000Z`) > periodo.fin)) bloqueo = "La fecha de la actividad debe estar dentro del periodo elegido.";
  }
  return { analisis, bloqueo };
}

/** Vista previa: filas válidas, errores por fila y pendientes. No guarda nada. */
export async function previsualizarImportacionRegistro(ctx: TenantContext, e: EntradaImportacion, tabla: Tabla): Promise<VistaPreviaRegistro> {
  const { analisis, bloqueo } = await validar(ctx, e, tabla);
  return { ...analisis, bloqueo };
}

/** Crea la calificación con las filas válidas (las filas con error se omiten). Idempotente por `claveIdempotencia`. */
export async function importarRegistro(ctx: TenantContext, e: EntradaImportacion, tabla: Tabla): Promise<Resultado & { evaluacionId?: string }> {
  const { analisis, bloqueo } = await validar(ctx, e, tabla);
  if (bloqueo) return fallo(bloqueo);
  if (analisis.filas.length === 0) return fallo(analisis.errores[0]?.mensaje ?? "No hay notas para importar.");
  const r = await crearCalificacion(ctx, {
    cursoId: e.cursoId, periodoId: e.periodoId, competenciaId: e.competenciaId, claveIdempotencia: e.claveIdempotencia, nombre: e.nombre, fecha: e.fecha,
    observacionVisible: e.observacionVisible === true,
    notas: analisis.filas.map((f) => ({ alumnoId: f.alumnoId, valor: f.nota, observacion: f.observacion || undefined })),
  });
  if (!r.ok) return r;
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "notas_curso", entidadId: e.cursoId, detalle: { periodoId: e.periodoId, importadas: analisis.filas.length, errores: analisis.errores.length, evaluacionId: r.evaluacionId ?? null } });
  const omitidas = analisis.errores.length ? ` ${analisis.errores.length} ${analisis.errores.length === 1 ? "fila no se importó" : "filas no se importaron"}.` : "";
  return { ...r, mensaje: `Importamos ${analisis.filas.length} ${analisis.filas.length === 1 ? "nota" : "notas"} en «${e.nombre.trim()}».${omitidas}` } as Resultado & { evaluacionId?: string };
}

/** CSV del registro del curso y periodo: alumnos × actividades agrupadas por competencia, con observaciones. Profesor del curso, tutor o dirección. */
export async function exportarRegistro(ctx: TenantContext, cursoId: string, periodoId: string): Promise<{ nombre: string; csv: string }> {
  await cursoLectura(ctx, cursoId);
  const r = await registroDelCurso(ctx, cursoId, periodoId);
  const orden = new Map(r.competencias.map((c, i) => [c.id, i]));
  const evaluaciones = [...r.evaluaciones].sort((a, b) => (orden.get(a.competenciaId ?? "") ?? 999) - (orden.get(b.competenciaId ?? "") ?? 999));
  const csv = exportarRegistroCsv({
    alumnos: r.alumnos,
    actividades: evaluaciones.map((e) => ({
      id: e.id, titulo: e.titulo, fecha: e.fecha.toISOString().slice(0, 10), competencia: e.competencia?.nombre ?? "Sin competencia",
      notas: e.notas.map((n) => ({ alumnoId: n.alumnoId, texto: textoNotaExport(n), observacion: n.comentario, privada: n.comentarioPrivado })),
    })),
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "exportar", entidad: "notas_curso", entidadId: cursoId, detalle: { periodoId } });
  return { nombre: `registro-${slugArchivo(`${r.curso.nombre} ${r.curso.salon.nombre}`)}-${slugArchivo(r.periodo?.nombre ?? "periodo")}.csv`, csv };
}
