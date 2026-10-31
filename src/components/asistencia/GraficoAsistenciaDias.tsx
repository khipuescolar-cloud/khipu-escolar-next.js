"use client";

import { Check, CircleAlert, Clock, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Rectangle, XAxis, YAxis, type BarShapeProps, type TooltipContentProps } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { agruparConteos, type ConteoDia, type ConteoGrupo, type Agrupacion } from "@/lib/grafico-asistencia";
import { formatoDia } from "@/lib/fechas";
import { cn } from "@/lib/utils";

// Barras apiladas de asistencia (specs/27): Llegó, Tarde y No llegó con los colores de estado de la marca. «No llegó» lleva
// además un rayado a 45°: tarde y falta casi no se distinguen con daltonismo deutan (validador del skill dataviz, ΔE 1.0),
// así que la identidad nunca depende solo del color. Rangos largos se agrupan por semana o por mes (`agruparConteos`).
// Leyenda con totales, tooltip con ícono + palabra + número, % solo sobre las barras con faltas y tabla sr-only.

export type { ConteoDia } from "@/lib/grafico-asistencia";

type Serie = { clave: "llego" | "tarde" | "falta"; etiqueta: string; color: string; Icono: LucideIcon; clase: string };
const SERIES: Serie[] = [
  { clave: "llego", etiqueta: "Llegó", color: "var(--estado-llego)", Icono: Check, clase: "bg-llego-fondo text-llego" },
  { clave: "tarde", etiqueta: "Tarde", color: "var(--estado-tarde)", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  { clave: "falta", etiqueta: "No llegó", color: "var(--estado-falta)", Icono: CircleAlert, clase: "bg-falta-fondo text-falta" },
];

const config: ChartConfig = Object.fromEntries(SERIES.map((s) => [s.clave, { label: s.etiqueta, color: s.color }]));
const RAYADO = "rayado-no-llego";
/** Muestra de «No llegó» en la leyenda: el mismo rayado que la barra. */
const MUESTRA_RAYADA = "repeating-linear-gradient(45deg, var(--estado-falta) 0 3px, color-mix(in oklab, var(--estado-falta) 40%, var(--card)) 3px 5px)";
const NUM = new Intl.NumberFormat("es-PE");
const PCT = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

/** Etiqueta del eje según la agrupación: «lun 26», «6 oct» (semana del lunes) o «oct». */
function etiquetaEje(g: ConteoGrupo, agrupacion: Agrupacion): string {
  if (agrupacion === "mes") return MESES[Number(g.desde.slice(5, 7)) - 1] ?? g.desde;
  if (agrupacion === "semana") return `${Number(g.desde.slice(8, 10))} ${MESES[Number(g.desde.slice(5, 7)) - 1]}`;
  return formatoDia(g.desde, { weekday: "short", day: "numeric" });
}

/** Título del tooltip y de la fila de la tabla: el día, la semana o el mes completos. */
function etiquetaLarga(g: ConteoGrupo, agrupacion: Agrupacion): string {
  if (agrupacion === "dia") return formatoDia(g.desde);
  if (agrupacion === "semana") return `Semana del ${formatoDia(g.desde, { day: "numeric", month: "long" })}`;
  return formatoDia(g.desde, { month: "long", year: "numeric" });
}

/** Segmento que queda arriba de la pila (el último con valor): solo ese lleva las esquinas redondeadas. */
function segmentoSuperior(g: ConteoGrupo): Serie["clave"] | null {
  return [...SERIES].reverse().find((s) => g[s.clave] > 0)?.clave ?? null;
}

/** % sobre la barra: texto SVG de una sola línea (LabelList partía «90 %» en dos y se cortaba arriba). */
function EtiquetaPorcentaje({ x, y, width, value }: { x?: number | string; y?: number | string; width?: number | string; value?: unknown }) {
  // En barras angostas (celular, muchas semanas) los % chocaban entre sí: ahí solo van en el tooltip.
  if (!value || Number(width) < 28) return null;
  return (
    <text x={Number(x) + Number(width) / 2} y={Number(y) - 7} textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium tabular-nums">
      {String(value)}
    </text>
  );
}

/** prefers-reduced-motion como estado de React (sin animación de barras si la persona la pidió). */
function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

function Tooltip({ active, payload, agrupacion }: Partial<TooltipContentProps<number, string>> & { agrupacion: Agrupacion }) {
  const g = payload?.[0]?.payload as ConteoGrupo | undefined;
  if (!active || !g) return null;
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2.5 text-cuerpo-sm text-popover-foreground shadow-md">
      <p className="mb-1.5 font-semibold first-letter:uppercase">{etiquetaLarga(g, agrupacion)}</p>
      <ul className="flex flex-col gap-1">
        {SERIES.map(({ clave, etiqueta, Icono, clase }) => (
          <li key={clave} className="flex items-center gap-2">
            <span className={cn("flex size-5 items-center justify-center rounded", clase)}>
              <Icono className="size-3.5" strokeWidth={2} aria-hidden />
            </span>
            <span className="flex-1 text-muted-foreground">{etiqueta}</span>
            <span className="font-semibold tabular-nums">{NUM.format(g[clave])}</span>
          </li>
        ))}
      </ul>
      {g.porcentaje !== null && (
        <p className="mt-2 border-t pt-1.5 text-muted-foreground">
          Asistencia <span className="font-semibold text-foreground tabular-nums">{PCT.format(g.porcentaje)} %</span>
        </p>
      )}
    </div>
  );
}

export function GraficoAsistenciaDias({ datos, titulo, etiquetaFila = "Día" }: { datos: ConteoDia[]; titulo: string; etiquetaFila?: string }) {
  const reducido = useMovimientoReducido();
  const { grupos, agrupacion } = agruparConteos(datos);
  const totales = SERIES.map((s) => ({ ...s, total: grupos.reduce((n, g) => n + g[s.clave], 0) }));
  const nota = agrupacion === "semana" ? "Agrupado por semana." : agrupacion === "mes" ? "Agrupado por mes." : null;
  const fila = agrupacion === "dia" ? etiquetaFila : agrupacion === "semana" ? "Semana" : "Mes";

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="sr-only">{titulo}</figcaption>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ul className="flex flex-wrap gap-2" aria-hidden>
          {totales.map((s) => (
            <li key={s.clave} className="inline-flex items-center gap-2 rounded-pildora border bg-card py-1 pr-3 pl-2 text-cuerpo-sm">
              <span className="size-3 rounded-[3px]" style={{ background: s.clave === "falta" ? MUESTRA_RAYADA : s.color }} />
              <span className="text-muted-foreground">{s.etiqueta}</span>
              <span className="font-semibold tabular-nums">{NUM.format(s.total)}</span>
            </li>
          ))}
        </ul>
        {nota && <p className="text-cuerpo-sm text-muted-foreground">{nota}</p>}
      </div>
      <ChartContainer config={config} className="aspect-auto h-64 w-full" aria-hidden>
        <BarChart data={grupos} margin={{ left: 0, right: 4, top: 26 }} accessibilityLayer barCategoryGap={grupos.length > 15 ? "18%" : "30%"}>
          <defs>
            <pattern id={RAYADO} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--estado-falta)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--card)" strokeOpacity={0.6} strokeWidth="2" />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 4" strokeOpacity={0.6} />
          <XAxis
            dataKey="desde"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            // Por día («lun 26») cabe cada etiqueta; por semana o mes se dejan más separadas.
            minTickGap={agrupacion === "dia" ? 2 : 18}
            interval="equidistantPreserveStart"
            tickFormatter={(_, i) => (grupos[i] ? etiquetaEje(grupos[i], agrupacion) : "")}
          />
          <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} tickMargin={4} />
          <ChartTooltip cursor={{ fill: "var(--muted)", fillOpacity: 0.6, radius: 6 }} content={<Tooltip agrupacion={agrupacion} />} />
          {SERIES.map((s, i) => (
            <Bar
              key={s.clave}
              dataKey={s.clave}
              stackId="asistencia"
              fill={s.clave === "falta" ? `url(#${RAYADO})` : s.color}
              // 2 px del color de la tarjeta entre segmentos; esquinas redondeadas solo en el segmento de arriba de cada pila.
              stroke="var(--card)"
              strokeWidth={2}
              shape={(props: BarShapeProps) => (
                <Rectangle {...props} radius={segmentoSuperior(props.payload as ConteoGrupo) === s.clave ? [6, 6, 0, 0] : 0} />
              )}
              maxBarSize={48}
              isAnimationActive={!reducido}
              animationDuration={500}
              animationEasing="ease-out"
            >
              {/* % solo sobre las barras con faltas: lo que pide atención (etiquetas selectivas, no un número en cada barra). */}
              {i === SERIES.length - 1 && grupos.length <= 23 && (
                <LabelList dataKey="etiquetaFalta" content={EtiquetaPorcentaje} />
              )}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>{titulo}{nota ? ` (${nota.toLowerCase()})` : ""}</caption>
        <thead>
          <tr>
            <th scope="col">{fila}</th>
            {SERIES.map((s) => <th key={s.clave} scope="col">{s.etiqueta}</th>)}
            <th scope="col">% asistencia</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <tr key={g.desde}>
              <th scope="row">{etiquetaLarga(g, agrupacion)}</th>
              <td>{g.llego}</td>
              <td>{g.tarde}</td>
              <td>{g.falta}</td>
              <td>{g.porcentaje === null ? "Sin datos" : `${PCT.format(g.porcentaje)} %`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
