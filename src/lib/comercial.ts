// Responsables y suscripciones de los colegios (specs/20). Archivo compartido cliente/servidor: solo datos y funciones puras.
import type { CicloFacturacion, EstadoSuscripcion, TipoContacto } from "@/generated/prisma/enums";
import { diasEntre } from "./fechas";

export const NOMBRE_TIPO_CONTACTO: Record<TipoContacto, string> = {
  principal: "Principal",
  direccion_academica: "Dirección académica",
  administrativo: "Administración",
  facturacion: "Facturación",
  tecnico: "Soporte técnico",
  otro: "Otro",
};

/** Tipos que se pueden elegir al agregar o editar; «Principal» solo se asigna con «Marcar como principal». */
export const TIPOS_ELEGIBLES: TipoContacto[] = ["direccion_academica", "administrativo", "facturacion", "tecnico", "otro"];

export const NOMBRE_ESTADO_SUSCRIPCION: Record<EstadoSuscripcion, string> = {
  prueba: "En prueba",
  activa: "Activa",
  suspendida: "Suspendida",
  cancelada: "Cancelada",
};

export const NOMBRE_CICLO: Record<CicloFacturacion, string> = { mensual: "Mensual", anual: "Anual" };

export const METODOS_PAGO = ["transferencia", "yape", "plin", "deposito", "otro"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];
export const NOMBRE_METODO: Record<MetodoPago, string> = {
  transferencia: "Transferencia",
  yape: "Yape",
  plin: "Plin",
  deposito: "Depósito",
  otro: "Otro",
};
/** El campo `metodo` es texto libre en la BD: tolera valores viejos. */
export const nombreMetodo = (m: string) => NOMBRE_METODO[m as MetodoPago] ?? m;

export const DIAS_AVISO_RENOVACION = 30;

export const formatoSoles = (n: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);

/** Monto mensual equivalente: lo anual se divide entre 12. */
export const montoMensual = (monto: number, ciclo: CicloFacturacion) => (ciclo === "anual" ? monto / 12 : monto);

/** Ingreso mensual recurrente estimado: solo suscripciones activas (las de prueba aún no pagan). */
export function ingresoMensualRecurrente(subs: { estado: EstadoSuscripcion; ciclo: CicloFacturacion; monto: number }[]): number {
  const total = subs.filter((s) => s.estado === "activa").reduce((suma, s) => suma + montoMensual(s.monto, s.ciclo), 0);
  return Math.round(total * 100) / 100;
}

export type EstadoRenovacion = { tipo: "vencida" | "por_vencer" | "vigente"; dias: number };

/**
 * Compara la próxima renovación con hoy (ambas AAAA-MM-DD; hoy = fecha de Lima).
 * `dias` > 0 faltan; 0 vence hoy; < 0 días de atraso. Vence hoy cuenta como «por vencer» (aún no pasó el día).
 */
export function estadoRenovacion(proximaRenovacion: string, hoy: string): EstadoRenovacion {
  const dias = diasEntre(hoy, proximaRenovacion);
  if (dias < 0) return { tipo: "vencida", dias };
  return { tipo: dias <= DIAS_AVISO_RENOVACION ? "por_vencer" : "vigente", dias };
}

export function textoRenovacion(e: EstadoRenovacion): string {
  if (e.tipo === "vencida") return e.dias === -1 ? "Vencida hace 1 día" : `Vencida hace ${-e.dias} días`;
  if (e.dias === 0) return "Vence hoy";
  return e.dias === 1 ? "Vence en 1 día" : `Vence en ${e.dias} días`;
}

/** Último día de un periodo que empieza en `desde` (AAAA-MM-DD): un mes o un año después, menos un día. */
export function finDePeriodo(desde: string, ciclo: CicloFacturacion): string {
  const [a, m, d] = desde.split("-").map(Number);
  const meses = ciclo === "anual" ? 12 : 1;
  const destino = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(d, ultimo));
  destino.setUTCDate(destino.getUTCDate() - 1);
  return destino.toISOString().slice(0, 10);
}
