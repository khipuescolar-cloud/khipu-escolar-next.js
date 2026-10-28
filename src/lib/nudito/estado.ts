// Estado visual de Nudito (docs/marca/documentos/05-nudito-personaje.md §3). Lógica pura, sin React.

export type EstadoNudito = "reposo" | "saludo" | "pensando" | "avisando" | "celebrando" | "preocupado" | "durmiendo";

/** Horario escolar en hora de Lima: de 7:00 (incluida) a 17:00 (excluida). Configurable por colegio más adelante. */
export const HORARIO_ESCOLAR = { inicio: 7, fin: 17 } as const;

/** Horario guardado en `ConfigPlataforma` («nudito:horario», p. ej. `{ inicio: "07:00", fin: "17:00" }`) → horas enteras. Si no es válido, el horario por defecto. */
export function horarioDesdeConfig(valor: unknown): { inicio: number; fin: number } {
  const hora = (v: unknown) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? Number(v.slice(0, 2)) : null);
  const o = (valor ?? {}) as { inicio?: unknown; fin?: unknown };
  const inicio = hora(o.inicio);
  const fin = hora(o.fin);
  return inicio !== null && fin !== null && inicio < fin ? { inicio, fin } : { ...HORARIO_ESCOLAR };
}

/** Hora (0–23) en Lima de una fecha. */
export function horaEnLima(ahora: Date): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", hour: "numeric", hourCycle: "h23" }).format(ahora);
  return Number(h) % 24;
}

export function esHorarioEscolar(ahora: Date, horario: { inicio: number; fin: number } = HORARIO_ESCOLAR): boolean {
  const h = horaEnLima(ahora);
  return h >= horario.inicio && h < horario.fin;
}

export type EntradaEstado = {
  ahora: Date;
  /** Nudito está respondiendo o cargando datos. */
  pensando?: boolean;
  /** Algo reciente que celebrar (p. ej. tarea entregada). */
  celebrando?: boolean;
  /** Tarea vencida, o el padre abrió el chat después de un aviso de falta. */
  preocupado?: boolean;
  /** Saludo al abrir el chat (1,2 s). */
  saludando?: boolean;
  /** Cantidad de avisos nuevos sin ver. */
  avisos?: number;
  horario?: { inicio: number; fin: number };
};

/** Prioridad: pensando > durmiendo (fuera de horario) > preocupado > celebrando > saludo > avisando > reposo. */
export function elegirEstadoNudito(e: EntradaEstado): EstadoNudito {
  if (e.pensando) return "pensando";
  if (!esHorarioEscolar(e.ahora, e.horario)) return "durmiendo";
  if (e.preocupado) return "preocupado";
  if (e.celebrando) return "celebrando";
  if (e.saludando) return "saludo";
  if ((e.avisos ?? 0) > 0) return "avisando";
  return "reposo";
}
