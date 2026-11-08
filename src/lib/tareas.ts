// Reglas puras de tareas estilo Classroom (specs/39): plazo, tardías, enlaces y tipos de archivo.
// Las comparten servidor y cliente; se prueban en tests/unit/tareas-reglas.test.ts.
import { diasEntre, instanteEnZona, momentoEnZona } from "./fechas";

/** Techo duro de archivos por elemento y MB por archivo: 5 × 10 MB cabe en el `bodySizeLimit` (55 MB) de las server actions. */
export const TECHO_ARCHIVOS_TAREA = 5;
export const TECHO_MB_TAREA = 10;
export const MAX_INSTRUCCIONES = 5000;
export const MAX_COMENTARIO_TAREA = 1000;
export const MAX_TEXTO_ENTREGA = 5000;
export const MAX_ENLACES_TAREA = 10;

export type EstadoTareaT = "borrador" | "publicada" | "cerrada" | "archivada";
export type EstadoEntregaT = "asignada" | "en_proceso" | "entregada" | "devuelta" | "revisada";

export const ETIQUETA_ESTADO_TAREA: Record<EstadoTareaT, string> = {
  borrador: "Borrador", publicada: "Publicada", cerrada: "Entregas cerradas", archivada: "Archivada",
};
export const ETIQUETA_ESTADO_ENTREGA: Record<EstadoEntregaT, string> = {
  asignada: "Pendiente", en_proceso: "En proceso", entregada: "Entregada", devuelta: "Devuelta", revisada: "Revisada",
};

/** Límites del colegio acotados al techo duro. */
export function limitesAdjuntosTarea(t: { tareasMaxArchivos?: number | null; tareasMaxMb?: number | null }) {
  const archivos = Math.max(1, Math.min(TECHO_ARCHIVOS_TAREA, t.tareasMaxArchivos ?? TECHO_ARCHIVOS_TAREA));
  const mb = Math.max(1, Math.min(TECHO_MB_TAREA, t.tareasMaxMb ?? TECHO_MB_TAREA));
  return { archivos, mb, bytes: mb * 1024 * 1024 };
}

/**
 * Instante en que vence la entrega. Sin fecha → null (nunca vence). Con hora → ese instante. Sin hora → fin del día
 * (23:59:59.999) en la zona del colegio.
 */
export function limiteEfectivo(fecha: Date | null, conHora: boolean, zona = "America/Lima"): Date | null {
  if (!fecha) return null;
  if (conHora) return fecha;
  const dia = momentoEnZona(fecha, zona).isoFecha;
  return new Date(instanteEnZona(dia, "23:59", zona).getTime() + 59_999);
}

/** Instante a guardar en `fecha_entrega`: con hora, ese; sin hora, las 08:00 del día (compatibilidad con agenda e .ics). */
export function instanteDeEntrega(isoFecha: string, hora: string | null, zona = "America/Lima"): Date {
  return instanteEnZona(isoFecha, hora ?? "08:00", zona);
}

export const estaVencida = (limite: Date | null, ahora: Date = new Date()) => limite !== null && ahora.getTime() > limite.getTime();
export const esTarde = (enviada: Date, limite: Date | null) => limite !== null && enviada.getTime() > limite.getTime();

export type ReglaEnvio = { ok: true; tarde: boolean } | { ok: false; error: string };

/** ¿Se puede enviar una entrega ahora? Bloquea si la tarea no está publicada, si se cerró o si venció sin permitir tardías. */
export function puedeEnviar(t: { estado: EstadoTareaT; permiteTardias: boolean; limite: Date | null }, ahora: Date = new Date()): ReglaEnvio {
  if (t.estado === "cerrada") return { ok: false, error: "El profesor cerró las entregas de esta tarea." };
  if (t.estado !== "publicada") return { ok: false, error: "Esta tarea ya no recibe entregas." };
  const tarde = estaVencida(t.limite, ahora);
  if (tarde && !t.permiteTardias) return { ok: false, error: "Venció el plazo y esta tarea no acepta entregas tardías." };
  return { ok: true, tarde };
}

/** Enlace válido (solo http/https, sin credenciales) normalizado, o null. */
export function normalizarEnlace(url: string): string | null {
  const texto = url.trim();
  if (!texto || texto.length > 2000) return null;
  try {
    const u = new URL(texto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Extensiones aceptadas por tipo real (detectado por magic bytes) en materiales y entregas de tareas. */
export const EXTENSIONES_POR_MIME: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.oasis.opendocument.text": ["odt"],
};
export const TIPOS_TAREA_TEXTO = "PDF, JPG, PNG, WEBP, DOCX, XLSX, PPTX u ODT";
export const ACCEPT_TAREAS = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx,.odt";

/** La extensión del nombre corresponde al tipo real del archivo (una «foto.pdf» que en realidad es un PNG no pasa). */
export function extensionCoincide(nombre: string, mime: string): boolean {
  const ext = /\.([a-z0-9]{2,5})$/i.exec(nombre.trim())?.[1]?.toLowerCase();
  return !!ext && (EXTENSIONES_POR_MIME[mime] ?? []).includes(ext);
}

/** Días que mira hacia adelante la lista «Próximos días» del docente. */
export const HORIZONTE_REVISION_DIAS = 7;

type SeccionRevisable = { limite: Date | null; contadores: { porRevisar: number } };
type TareaRevisable = { estado: string; programada: boolean; secciones: SeccionRevisable[] };
export type ItemRevision<T, S> = { tarea: T; seccion: S; dias: number | null };

/**
 * Agenda de revisión del docente (specs/39), por sección de cada tarea publicada o cerrada:
 * - **hoy**: el plazo vence hoy, o ya venció / no tiene fecha y quedan entregas sin revisar;
 * - **proximos**: el plazo vence en los próximos `horizonte` días.
 * `dias` = días desde hoy hasta el último día del plazo en la zona del colegio (negativo si venció; null sin fecha).
 */
export function agendaDeRevision<T extends TareaRevisable>(tareas: T[], ahora: Date, zona: string, horizonte = HORIZONTE_REVISION_DIAS) {
  type S = T["secciones"][number];
  const hoyIso = momentoEnZona(ahora, zona).isoFecha;
  const hoy: ItemRevision<T, S>[] = [];
  const proximos: ItemRevision<T, S>[] = [];
  for (const tarea of tareas) {
    if ((tarea.estado !== "publicada" && tarea.estado !== "cerrada") || tarea.programada) continue;
    for (const seccion of tarea.secciones as S[]) {
      const dias = seccion.limite ? diasEntre(hoyIso, momentoEnZona(seccion.limite, zona).isoFecha) : null;
      const pendientes = seccion.contadores.porRevisar > 0;
      if (dias === 0 || (pendientes && (dias === null || dias < 0))) hoy.push({ tarea, seccion, dias });
      else if (dias !== null && dias > 0 && dias <= horizonte) proximos.push({ tarea, seccion, dias });
    }
  }
  const orden = (a: ItemRevision<T, S>, b: ItemRevision<T, S>) => (a.dias ?? Infinity) - (b.dias ?? Infinity) || b.seccion.contadores.porRevisar - a.seccion.contadores.porRevisar;
  return { hoy: hoy.sort(orden), proximos: proximos.sort(orden) };
}
