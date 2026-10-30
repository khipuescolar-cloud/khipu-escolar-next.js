// Nudito+ (specs/28): reglas puras de licencias, configuración y dominios permitidos.
// Archivo compartido cliente/servidor: sin acceso a BD. Fechas «AAAA-MM-DD» en hora de Lima.
import { z } from "zod";
import { diasEntre, sumarDias } from "@/lib/fechas";

// ───────────── Configuración global (ConfigPlataforma) ─────────────

export const CLAVES_NUDITO_PLUS = {
  precio: "nudito_plus:precio",
  yape: "nudito_plus:yape",
  consentimiento: "nudito_plus:consentimiento",
  limites: "nudito_plus:limites",
  proveedor: "nudito_plus:proveedor",
} as const;

export type PrecioNudito = { montoMensual: number; moneda: string };
export type YapeNudito = { numero: string; titular: string };
export type ConsentimientoNudito = { version: string; texto: string };
export type LimitesNudito = { mensajesPorMes: number; tokensPorMes: number; costoMaxUsdPorMes: number };

export const PRECIO_POR_DEFECTO: PrecioNudito = { montoMensual: 20, moneda: "PEN" };
export const LIMITES_POR_DEFECTO: LimitesNudito = { mensajesPorMes: 300, tokensPorMes: 300_000, costoMaxUsdPorMes: 1.5 };
export const CONSENTIMIENTO_POR_DEFECTO: ConsentimientoNudito = {
  version: "v1",
  texto: [
    "Nudito+ es un tutor con inteligencia artificial que ayuda a tu hijo a repasar lo que aprende en el colegio, según su grado.",
    "Tu hijo conversará con un sistema automático, no con una persona. Las respuestas pueden tener errores: anímalo a consultar sus dudas con su profesor.",
    "Guardamos las conversaciones para dar el servicio y cuidar a tu hijo. Tú no las verás, pero sí recibirás reportes, alertas y resúmenes de su avance. El colegio tampoco las ve.",
    "Nudito+ solo recomienda materiales de sitios educativos revisados por el equipo de Khipu Escolar.",
    "Puedes retirar esta autorización cuando quieras desde esta misma pantalla; al hacerlo, tu hijo deja de usar Nudito+.",
  ].join("\n\n"),
};
export const MESES_MAXIMOS = 12;

const numero = (min: number, max: number) => z.coerce.number().refine((n) => Number.isFinite(n) && n >= min && n <= max);

export function leerPrecio(valor: unknown): PrecioNudito {
  const r = z.object({ montoMensual: numero(0.01, 10_000), moneda: z.string().min(3).max(3).default("PEN") }).safeParse(valor);
  return r.success ? r.data : PRECIO_POR_DEFECTO;
}

export function leerYape(valor: unknown): YapeNudito | null {
  const r = z.object({ numero: z.string().trim().min(6), titular: z.string().trim().min(2) }).safeParse(valor);
  return r.success ? r.data : null;
}

export function leerConsentimiento(valor: unknown): ConsentimientoNudito {
  const r = z.object({ version: z.string().trim().min(1).max(40), texto: z.string().trim().min(20) }).safeParse(valor);
  return r.success ? r.data : CONSENTIMIENTO_POR_DEFECTO;
}

export function leerLimites(valor: unknown): LimitesNudito {
  const v = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const campo = (k: keyof LimitesNudito, max: number) => {
    const r = numero(0, max).safeParse(v[k]);
    return r.success ? r.data : LIMITES_POR_DEFECTO[k];
  };
  return {
    mensajesPorMes: Math.round(campo("mensajesPorMes", 100_000)),
    tokensPorMes: Math.round(campo("tokensPorMes", 100_000_000)),
    costoMaxUsdPorMes: campo("costoMaxUsdPorMes", 1_000),
  };
}

/** Párrafos del texto de consentimiento (separados por una línea en blanco). */
export function parrafos(texto: string): string[] {
  return texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

// ───────────── Fechas de licencias ─────────────

/** Suma meses calendario; si el día no existe en el mes destino, usa el último día (31 ene + 1 → 28 feb). */
export function sumarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const total = a * 12 + (m - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/** Periodo nuevo de N meses desde hoy: `hasta` es el día anterior al mismo día N meses después (incluido). */
export function periodoNuevo(hoy: string, meses: number): { desde: string; hasta: string } {
  return { desde: hoy, hasta: sumarDias(sumarMeses(hoy, meses), -1) };
}

/** Extiende un `hasta` N meses: el nuevo periodo empieza el día siguiente al `hasta` actual. */
export function extenderHasta(hasta: string, meses: number): string {
  return sumarDias(sumarMeses(sumarDias(hasta, 1), meses), -1);
}

export type LicenciaFechas = { estado: "activa" | "vencida" | "cancelada"; desde: string; hasta: string };

/** Vigente = activa y hoy entre `desde` y `hasta` (ambos incluidos). */
export function esVigente(l: LicenciaFechas, hoy: string): boolean {
  return l.estado === "activa" && l.desde <= hoy && hoy <= l.hasta;
}

/**
 * Qué hace verificar un pago de N meses: si hay una licencia activa que aún no vence (`hasta >= hoy`), se extiende;
 * si no, se crea una nueva desde hoy.
 */
export function calcularActivacion(activa: Pick<LicenciaFechas, "hasta"> | null, hoy: string, meses: number):
  { tipo: "extender"; hasta: string } | { tipo: "nueva"; desde: string; hasta: string } {
  if (activa && activa.hasta >= hoy) return { tipo: "extender", hasta: extenderHasta(activa.hasta, meses) };
  return { tipo: "nueva", ...periodoNuevo(hoy, meses) };
}

/** Días que faltan para el último día de la licencia (0 = vence hoy). */
export function diasParaVencer(hasta: string, hoy: string): number {
  return diasEntre(hoy, hasta);
}

export const DIAS_RECORDATORIO = 3;

/** Mes calendario «AAAA-MM» de una fecha ISO. */
export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

/** Estado que ve la familia para un hijo. «revision» = hay un pago reportado sin verificar y no hay licencia vigente. */
export type EstadoFamilia =
  | { tipo: "activa"; hasta: string; pagoEnRevision: boolean }
  | { tipo: "revision" }
  | { tipo: "vencida"; hasta: string }
  | { tipo: "sin" };

export function estadoParaFamilia(
  licencias: LicenciaFechas[],
  pagoPendiente: boolean,
  hoy: string,
): EstadoFamilia {
  const vigente = licencias.filter((l) => esVigente(l, hoy)).sort((a, b) => b.hasta.localeCompare(a.hasta))[0];
  if (vigente) return { tipo: "activa", hasta: vigente.hasta, pagoEnRevision: pagoPendiente };
  if (pagoPendiente) return { tipo: "revision" };
  const ultima = licencias.filter((l) => l.estado !== "cancelada" && l.hasta < hoy).sort((a, b) => b.hasta.localeCompare(a.hasta))[0];
  if (ultima) return { tipo: "vencida", hasta: ultima.hasta };
  return { tipo: "sin" };
}

// ───────────── Dominios permitidos ─────────────

const DOMINIO = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * «https://www.PeruEduca.pe/cursos?x» → «perueduca.pe». Sin esquema, «www.», usuario, puerto, ruta ni punto final.
 * Devuelve null si no parece un dominio.
 */
export function normalizarDominio(entrada: string): string | null {
  let d = entrada.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  d = d.split(/[/?#]/)[0] ?? "";
  d = d.replace(/^[^@]*@/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  while (d.startsWith("www.")) d = d.slice(4);
  return DOMINIO.test(d) ? d : null;
}

/** true si la URL es del dominio o de un subdominio de alguno de la lista. */
export function urlPermitida(url: string, dominios: readonly string[]): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return false;
  }
  return dominios.some((d) => host === d || host.endsWith(`.${d}`));
}

// ───────────── Textos ─────────────

export function formatoMonto(monto: number, moneda = "PEN"): string {
  const n = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
  return moneda === "PEN" ? `S/ ${n}` : `${moneda} ${n}`;
}

export function textoMeses(n: number): string {
  return n === 1 ? "1 mes" : `${n} meses`;
}

export const NOMBRE_ORIGEN: Record<"pago" | "cortesia" | "prueba", string> = { pago: "Pago", cortesia: "Cortesía", prueba: "Prueba" };
export const NOMBRE_ESTADO_LICENCIA: Record<"activa" | "vencida" | "cancelada", string> = { activa: "Activa", vencida: "Vencida", cancelada: "Cancelada" };
export const NOMBRE_TIPO_ALERTA: Record<"seguridad" | "animo" | "dificultad" | "uso", string> = {
  seguridad: "Cuidado",
  animo: "Ánimo",
  dificultad: "Dificultad",
  uso: "Uso",
};
