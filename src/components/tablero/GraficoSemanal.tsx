"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tarjeta } from "@/components/ui/Tarjeta";

// Línea por semana para el tablero (specs/33). Mismos tokens y accesibilidad que `GraficoDiario` de la plataforma (specs/16):
// colores --chart-1/--chart-2, 2.ª serie punteada y tabla sr-only con los mismos datos.

export type SerieSemanal = { clave: string; etiqueta: string; color: "var(--chart-1)" | "var(--chart-2)"; punteada?: boolean };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const semanaCorta = (iso: string) => `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1] ?? ""}`;

export function GraficoSemanal({
  titulo, descripcion, datos, series, unidad = "", dominio, testId,
}: {
  titulo: string;
  descripcion?: string;
  datos: ({ semana: string } & Record<string, number | string>)[];
  series: SerieSemanal[];
  unidad?: string;
  dominio?: [number, number];
  testId?: string;
}) {
  const config: ChartConfig = Object.fromEntries(series.map((s) => [s.clave, { label: s.etiqueta, color: s.color }]));
  return (
    <Tarjeta className="flex min-w-0 flex-col gap-3 p-4" data-testid={testId}>
      <div>
        <h3 className="font-heading text-titulo-2">{titulo}</h3>
        {descripcion && <p className="text-cuerpo-sm text-muted-foreground">{descripcion}</p>}
      </div>
      <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-hidden>
        <LineChart data={datos} margin={{ left: 0, right: 8, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeOpacity={0.5} />
          <XAxis dataKey="semana" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={semanaCorta} />
          <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} domain={dominio} tickFormatter={(v: number) => `${v}${unidad}`} />
          <ChartTooltip cursor content={<ChartTooltipContent labelFormatter={(v) => `Semana del ${semanaCorta(String(v))}`} />} />
          {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {series.map((s) => (
            <Line key={s.clave} dataKey={s.clave} type="linear" stroke={`var(--color-${s.clave})`} strokeWidth={2} strokeDasharray={s.punteada ? "5 4" : undefined} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>{titulo} por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana del</th>
            {series.map((s) => <th key={s.clave} scope="col">{s.etiqueta}</th>)}
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.semana}>
              <th scope="row">{d.semana}</th>
              {series.map((s) => <td key={s.clave}>{Number(d[s.clave] ?? 0)}{unidad}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Tarjeta>
  );
}
