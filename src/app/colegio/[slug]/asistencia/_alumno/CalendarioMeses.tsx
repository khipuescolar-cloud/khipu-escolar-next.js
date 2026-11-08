import { ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

// Calendarios de lunes a viernes, uno por mes del rango (el más reciente primero), con cada día de clase pintado según
// su estado: ícono + hora, y el texto completo para lectores de pantalla y al pasar el cursor (specs/27).

export type DiaCalendario = {
  fecha: string;
  /** null: día de clase sin registro. */
  estado: Estado | null;
  /** Hora corta que se muestra en la celda («8:03»); opcional. */
  hora?: string | null;
  /** Texto completo del día (lector de pantalla y `title`). */
  texto: string;
};

const DIAS = [
  { corto: "L", largo: "lunes" }, { corto: "M", largo: "martes" }, { corto: "M", largo: "miércoles" },
  { corto: "J", largo: "jueves" }, { corto: "V", largo: "viernes" },
];
const ORDEN: Estado[] = ["llego", "tarde", "falta", "problema"];

function isoDe(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Semanas (lunes a viernes) del mes `clave` (AAAA-MM); cada celda es una fecha o null si es de otro mes. */
function semanasDelMes(clave: string): (string | null)[][] {
  const [anio, mes] = clave.split("-").map(Number);
  const primero = new Date(Date.UTC(anio, mes - 1, 1, 12));
  const inicio = new Date(primero);
  inicio.setUTCDate(1 - ((primero.getUTCDay() + 6) % 7));
  const semanas: (string | null)[][] = [];
  for (const d = new Date(inicio); d.getUTCMonth() === mes - 1 || d < primero; d.setUTCDate(d.getUTCDate() + 7)) {
    const semana: (string | null)[] = [];
    for (let i = 0; i < 5; i++) {
      const dia = new Date(d);
      dia.setUTCDate(d.getUTCDate() + i);
      semana.push(dia.getUTCMonth() === mes - 1 ? isoDe(dia) : null);
    }
    if (semana.some(Boolean)) semanas.push(semana);
  }
  return semanas;
}

function mesesDelRango(desde: string, hasta: string): string[] {
  const meses: string[] = [];
  for (let clave = hasta.slice(0, 7); clave >= desde.slice(0, 7);) {
    meses.push(clave);
    const [a, m] = clave.split("-").map(Number);
    clave = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
  }
  return meses;
}

/**
 * `dias`: días con algo que mostrar (puede haber varios por fecha, p. ej. dos clases el mismo día). Un día hábil del
 * rango sin entrada se muestra vacío (`vacio`: «Sin clase» o «Sin registro»).
 */
export function CalendarioMeses({ dias, desde, hasta, hoy, vacio, className, omitirMesesVacios = false }: {
  dias: DiaCalendario[]; desde: string; hasta: string; hoy: string; vacio: string; className?: string;
  /** No dibujar los meses sin ninguna entrada (p. ej. un curso sin clases con lista ese mes). */
  omitirMesesVacios?: boolean;
}) {
  const porFecha = new Map<string, DiaCalendario[]>();
  for (const d of dias) porFecha.set(d.fecha, [...(porFecha.get(d.fecha) ?? []), d]);
  return (
    <div className={cn("grid gap-6", className)}>
      {mesesDelRango(desde, hasta).filter((clave) => !omitirMesesVacios || dias.some((d) => d.fecha.startsWith(clave))).map((clave) => {
        const nombre = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${clave}-15T12:00:00Z`));
        const delMes = dias.filter((d) => d.fecha.startsWith(clave));
        return (
          <section key={clave} aria-labelledby={`cal-${clave}`} className="flex flex-col gap-3 rounded-[14px] border border-borde-sutil bg-superficie p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 id={`cal-${clave}`} className="font-heading text-[16px] leading-6 font-semibold first-letter:uppercase">{nombre}</h3>
              <ul className="flex flex-wrap gap-x-3 text-cuerpo-sm text-muted-foreground" aria-label={`Resumen de ${nombre}`}>
                {ORDEN.map((e) => {
                  const n = delMes.filter((d) => d.estado === e).length;
                  if (n === 0) return null;
                  const { Icono, palabra } = ESTADOS_ASISTENCIA[e];
                  return (
                    <li key={e} className="inline-flex items-center gap-1 tabular-nums">
                      <Icono className={cn("size-3.5", ESTADOS_ASISTENCIA[e].clase.split(" ").find((c) => c.startsWith("text-")))} strokeWidth={2} aria-hidden />
                      <span className="sr-only">{palabra}:</span> {n}
                    </li>
                  );
                })}
              </ul>
            </div>
            <table className="w-full table-fixed border-separate border-spacing-1" aria-labelledby={`cal-${clave}`}>
              <thead>
                <tr>
                  {DIAS.map((d) => (
                    <th key={d.largo} scope="col" className="pb-1 text-center text-etiqueta font-medium text-muted-foreground">
                      <abbr title={d.largo} className="no-underline">{d.corto}</abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semanasDelMes(clave).map((semana) => (
                  <tr key={semana.find(Boolean)}>
                    {semana.map((fecha, i) => {
                      if (!fecha) return <td key={`${clave}-${i}`} aria-hidden className="h-14" />;
                      const entradas = porFecha.get(fecha) ?? [];
                      const fuera = fecha < desde || fecha > hasta;
                      return <Celda key={fecha} fecha={fecha} entradas={entradas} fuera={fuera} esHoy={fecha === hoy} vacio={vacio} />;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

function Celda({ fecha, entradas, fuera, esHoy, vacio }: { fecha: string; entradas: DiaCalendario[]; fuera: boolean; esHoy: boolean; vacio: string }) {
  const dia = Number(fecha.slice(8));
  const anillo = esHoy && "ring-2 ring-indigo-cielo";
  const principal = entradas.find((e) => e.estado);
  if (!principal) {
    const texto = entradas[0]?.texto ?? `${dia}: ${fuera ? "fuera del periodo" : vacio.toLowerCase()}`;
    return (
      <td title={fuera ? undefined : texto} className={cn("h-14 rounded-md align-top", fuera ? "" : entradas.length ? "border border-dashed border-muted-foreground/40" : "bg-superficie-2/60", anillo)}>
        <span className={cn("block px-1.5 pt-1 text-xs font-semibold tabular-nums", fuera ? "text-muted-foreground/50" : "text-muted-foreground")} aria-hidden>{dia}</span>
        <span className="sr-only">{texto}{esHoy ? " (hoy)" : ""}</span>
      </td>
    );
  }
  const { Icono, clase } = ESTADOS_ASISTENCIA[principal.estado!];
  const extra = entradas.filter((e) => e.estado).length - 1;
  return (
    <td title={entradas.map((e) => e.texto).join("\n")} className={cn("h-14 rounded-md border border-current/20 align-top", clase, anillo)}>
      <span aria-hidden className="flex h-full flex-col justify-between px-1.5 py-1">
        <span className="flex items-center justify-between text-xs font-semibold tabular-nums">
          {dia}
          <Icono className="size-3.5" strokeWidth={2.25} />
        </span>
        <span className="truncate text-[12px] leading-4 tabular-nums">
          {principal.estado === "falta" ? "Faltó" : principal.hora ?? ""}
          {extra > 0 && ` +${extra}`}
        </span>
      </span>
      <span className="sr-only">{entradas.map((e) => e.texto).join(". ")}{esHoy ? " (hoy)" : ""}</span>
    </td>
  );
}
