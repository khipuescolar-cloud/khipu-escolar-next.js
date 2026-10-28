// Mesa de ayuda (specs/23): textos, límites y reglas puras que comparten servidor y cliente.
import type { CategoriaTicket, EstadoTicket, PrioridadTicket } from "@/generated/prisma/enums";

export const MAX_ASUNTO = 120;
export const MAX_CUERPO_SOPORTE = 4000;
export const MAX_COMENTARIO_VALORACION = 500;
/** Captura opcional por mensaje: PNG, JPG o PDF de hasta 5 MB. */
export const MAX_BYTES_CAPTURA = 5 * 1024 * 1024;
export const ACCEPT_CAPTURA = ".png,.jpg,.jpeg,.pdf";
export const MIMES_CAPTURA: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "application/pdf"]);

/** Las conversaciones resueltas se cierran solas tras estos días sin actividad. */
export const DIAS_CIERRE_AUTOMATICO = 7;
/** Sondeo del hilo mientras la pestaña está visible. */
export const INTERVALO_SONDEO_MS = 5_000;

export const HORARIO_SOPORTE_POR_DEFECTO = "Lunes a viernes, 8:00 a. m. – 6:00 p. m.";
export const AVISO_DATOS_PERSONALES = "No compartas datos personales de alumnos si no es necesario.";

export const ESTADOS_TICKET: EstadoTicket[] = ["abierto", "en_progreso", "esperando_colegio", "resuelto", "cerrado"];
export const PRIORIDADES_TICKET: PrioridadTicket[] = ["baja", "normal", "alta", "urgente"];
export const CATEGORIAS_TICKET: CategoriaTicket[] = ["duda", "problema", "sugerencia", "facturacion", "cuentas_accesos", "otro"];

/** Estados en los que la conversación sigue viva (no resuelta ni cerrada). */
export const ESTADOS_ACTIVOS: EstadoTicket[] = ["abierto", "en_progreso", "esperando_colegio"];
/** Pendientes del equipo Khipu (contador de la bandeja y del título). */
export const ESTADOS_PENDIENTES_KHIPU: EstadoTicket[] = ["abierto", "en_progreso"];

/** Nombre del estado según quién lo lee: el colegio ve «Esperando tu respuesta», Khipu «Esperando al colegio». */
export function nombreEstado(estado: EstadoTicket, lado: "colegio" | "khipu"): string {
  switch (estado) {
    case "abierto":
      return lado === "colegio" ? "Enviada" : "Abierta";
    case "en_progreso":
      return "En progreso";
    case "esperando_colegio":
      return lado === "colegio" ? "Esperando tu respuesta" : "Esperando al colegio";
    case "resuelto":
      return "Resuelta";
    case "cerrado":
      return "Cerrada";
  }
}

export const NOMBRE_PRIORIDAD: Record<PrioridadTicket, string> = { baja: "Baja", normal: "Normal", alta: "Alta", urgente: "Urgente" };
export const ORDEN_PRIORIDAD: Record<PrioridadTicket, number> = { urgente: 0, alta: 1, normal: 2, baja: 3 };

export const NOMBRE_CATEGORIA: Record<CategoriaTicket, string> = {
  duda: "Duda",
  problema: "Problema técnico",
  sugerencia: "Sugerencia",
  facturacion: "Facturación",
  cuentas_accesos: "Cuentas y accesos",
  otro: "Otro",
};

// ───────────── SLA de primera respuesta ─────────────

/** Ámbar si espera más de 2 h hábiles; rojo si más de 8 h hábiles. */
export const SLA_AMBAR_MIN = 2 * 60;
export const SLA_ROJO_MIN = 8 * 60;
const INICIO_HABIL = 8;
const FIN_HABIL = 18;
/** Lima no tiene horario de verano: UTC−5 fijo. */
const DESFASE_LIMA_MS = 5 * 3_600_000;

/**
 * Minutos hábiles aproximados entre dos instantes: lunes a viernes de 8:00 a 18:00 (hora de Lima).
 * No descuenta feriados (es una aproximación para la etiqueta del SLA).
 */
export function minutosHabiles(desde: Date, hasta: Date): number {
  if (hasta <= desde) return 0;
  const a = desde.getTime() - DESFASE_LIMA_MS;
  const b = hasta.getTime() - DESFASE_LIMA_MS;
  let total = 0;
  const dia = new Date(a);
  dia.setUTCHours(0, 0, 0, 0);
  for (let d = dia.getTime(); d < b; d += 86_400_000) {
    const semana = new Date(d).getUTCDay();
    if (semana === 0 || semana === 6) continue;
    const ini = Math.max(a, d + INICIO_HABIL * 3_600_000);
    const fin = Math.min(b, d + FIN_HABIL * 3_600_000);
    if (fin > ini) total += fin - ini;
  }
  return Math.floor(total / 60_000);
}

/** «hace 5 min», «hace 3 h», «hace 2 días» (tiempo de reloj). */
export function haceCuanto(desde: Date, ahora: Date): string {
  const min = Math.max(0, Math.floor((ahora.getTime() - desde.getTime()) / 60_000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
}

export type NivelSla = "normal" | "ambar" | "rojo";

/** Etiqueta del SLA para una conversación que espera respuesta de Khipu desde `desde`. */
export function etiquetaSla(desde: Date, ahora: Date): { nivel: NivelSla; texto: string } {
  const habiles = minutosHabiles(desde, ahora);
  const nivel: NivelSla = habiles > SLA_ROJO_MIN ? "rojo" : habiles > SLA_AMBAR_MIN ? "ambar" : "normal";
  return { nivel, texto: `Sin respuesta ${haceCuanto(desde, ahora)}` };
}

/** Promedio en minutos de (primera respuesta − creación); null si no hay datos. */
export function promedioMinutos(pares: { createdAt: Date; primeraRespuestaAt: Date | null }[]): number | null {
  const con = pares.filter((p): p is { createdAt: Date; primeraRespuestaAt: Date } => p.primeraRespuestaAt !== null);
  if (con.length === 0) return null;
  const suma = con.reduce((s, p) => s + (p.primeraRespuestaAt.getTime() - p.createdAt.getTime()), 0);
  return Math.round(suma / con.length / 60_000);
}

/** «45 min», «3 h 20 min», «2 d 4 h». */
export function duracionLegible(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  if (h < 24) return minutos % 60 ? `${h} h ${minutos % 60} min` : `${h} h`;
  return h % 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${Math.floor(h / 24)} d`;
}
