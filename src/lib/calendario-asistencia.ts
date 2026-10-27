import type { EstadoAsistencia } from "@/generated/prisma/enums";
import { cuadriculaMes, esFechaIso, sumarDias } from "./fechas";

// Calendario mensual de asistencia para la familia (specs/04). Funciones puras; las fechas son «AAAA-MM-DD»
// en la zona horaria del colegio (por defecto America/Lima), que decide el servidor al pasar `hoy`.

export type RegistroCalendario = { fecha: string; estado: EstadoAsistencia; /** true si es el ingreso al colegio (no un curso). */ esDia: boolean };

export type DiaCalendario = {
  fecha: string;
  dia: number;
  delMes: boolean;
  esHoy: boolean;
  esFuturo: boolean;
  esFinDeSemana: boolean;
  /** Estado que representa al día; null si no hay registro. */
  estado: EstadoAsistencia | null;
};

export type MesAsistencia = {
  anio: number;
  mes: number;
  clave: string;
  semanas: DiaCalendario[][];
  conteo: Record<EstadoAsistencia, number>;
};

/** Gravedad para elegir un estado cuando el día solo tiene registros de cursos: lo más importante primero. */
const GRAVEDAD: Record<EstadoAsistencia, number> = { falta: 4, problema: 3, tarde: 2, llego: 1 };

/** Estado de un día: manda el registro del ingreso; si no hay, el más grave de los cursos. */
export function estadoDelDia(registros: Pick<RegistroCalendario, "estado" | "esDia">[]): EstadoAsistencia | null {
  if (registros.length === 0) return null;
  const ingreso = registros.find((r) => r.esDia);
  if (ingreso) return ingreso.estado;
  return registros.reduce((peor, r) => (GRAVEDAD[r.estado] > GRAVEDAD[peor.estado] ? r : peor)).estado;
}

export function claveMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

/** «AAAA-MM» → {anio, mes}; null si no es válido. */
export function parseClaveMes(clave: string | undefined): { anio: number; mes: number } | null {
  const m = clave?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  return m ? { anio: Number(m[1]), mes: Number(m[2]) } : null;
}

export function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function mesSiguiente(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/** Primer y último día (ISO) del mes. */
export function rangoDelMes(anio: number, mes: number): { desde: string; hasta: string } {
  const desde = `${claveMes(anio, mes)}-01`;
  const { anio: a, mes: m } = mesSiguiente(anio, mes);
  return { desde, hasta: sumarDias(`${claveMes(a, m)}-01`, -1) };
}

/** Mes pedido en la URL, acotado: no pasa del mes de hoy ni retrocede más de `maxMesesAtras`. Si no es válido, el mes de hoy. */
export function mesPedido(clave: string | undefined, hoy: string, maxMesesAtras = 24): { anio: number; mes: number } {
  if (!esFechaIso(hoy)) throw new Error("hoy debe ser AAAA-MM-DD");
  const actual = { anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) };
  const pedido = parseClaveMes(clave);
  if (!pedido) return actual;
  const indice = (x: { anio: number; mes: number }) => x.anio * 12 + x.mes;
  if (indice(pedido) > indice(actual)) return actual;
  if (indice(actual) - indice(pedido) > maxMesesAtras) return actual;
  return pedido;
}

/** Arma la cuadrícula (lunes a domingo) del mes con el estado de cada día. */
export function armarMesAsistencia(anio: number, mes: number, registros: RegistroCalendario[], hoy: string): MesAsistencia {
  const porFecha = new Map<string, RegistroCalendario[]>();
  for (const r of registros) porFecha.set(r.fecha, [...(porFecha.get(r.fecha) ?? []), r]);
  const clave = claveMes(anio, mes);
  const conteo: Record<EstadoAsistencia, number> = { llego: 0, tarde: 0, falta: 0, problema: 0 };

  const semanas = cuadriculaMes(anio, mes).map((semana) =>
    semana.map<DiaCalendario>((fecha, i) => {
      const delMes = fecha.startsWith(`${clave}-`);
      const estado = delMes ? estadoDelDia(porFecha.get(fecha) ?? []) : null;
      if (estado) conteo[estado]++;
      return { fecha, dia: Number(fecha.slice(8, 10)), delMes, esHoy: fecha === hoy, esFuturo: fecha > hoy, esFinDeSemana: i >= 5, estado };
    }),
  );
  return { anio, mes, clave, semanas, conteo };
}
