// Tipos del motor de Nudito. Sin dependencias de servidor: lo usan también los tests y la UI.
import type { TenantContext } from "@/lib/server/tenant";

export type Intencion =
  | "saludo"
  | "ayuda"
  | "tareas_pendientes"
  | "proximas_fechas"
  | "asistencia_hoy"
  | "notas"
  | "horario"
  | "reglamento"
  | "hablar_con_persona"
  | "desconocido";

export type AccionNudito = {
  tipo: "abrir_chat" | "elegir_hijo" | "ir";
  etiqueta: string;
  /** abrir_chat / ir: ruta dentro del colegio. elegir_hijo: texto que se envía como mensaje (nombre del hijo). */
  valor: string;
};

export type RespuestaNudito = {
  texto: string;
  /** Intención detectada. Si se pregunta por un hijo: `elegir_hijo:<intencion pendiente>`. */
  intencion: string;
  derivado: boolean;
  acciones?: AccionNudito[];
  /** Hijo al que se refiere la respuesta (para guardarlo en la conversación). */
  alumnoId?: string;
};

export type MensajeHistorial = {
  autor: "usuario" | "nudito";
  cuerpo: string;
  intencion: string | null;
  derivado: boolean;
};

export type Hijo = { id: string; nombres: string; salonId: string };

export interface NuditoProvider {
  responder(ctx: TenantContext, entrada: string, historial: MensajeHistorial[]): Promise<RespuestaNudito>;
}
