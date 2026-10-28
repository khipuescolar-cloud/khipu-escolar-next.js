"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tarjeta } from "@/components/ui/Tarjeta";

// Gráficos del panel de plataforma (specs/16). Solo conteos agregados.
// Colores: tokens --chart-1 y --chart-2 (par validado para daltonismo); la 2.ª serie además va punteada.
// Cada gráfico lleva su tabla `sr-only` con los mismos datos (lectores de pantalla).

export type Serie = { clave: string; etiqueta: string; color: "var(--chart-1)" | "var(--chart-2)"; punteada?: boolean };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
/** "2026-10-27" → "27 oct" */
const diaCorto = (iso: string) => `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1] ?? ""}`;
const numero = (n: number) => n.toLocaleString("es-PE");

function configDe(series: Serie[]): ChartConfig {
  return Object.fromEntries(series.map((s) => [s.clave, { label: s.etiqueta, color: s.color }]));
}

function Marco({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <Tarjeta className="flex min-w-0 flex-col gap-3 p-4">
      <div>
        <h3 className="font-heading text-titulo-2">{titulo}</h3>
        {descripcion && <p className="text-cuerpo-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {children}
    </Tarjeta>
  );
}

/** Serie diaria (tantos días como filas tenga `datos`) con una o dos líneas de la misma unidad. */
export function GraficoDiario({
  titulo, descripcion, datos, series,
}: {
  titulo: string;
  descripcion?: string;
  datos: ({ fecha: string } & Record<string, number | string>)[];
  series: Serie[];
}) {
  const total = (clave: string) => datos.reduce((s, d) => s + Number(d[clave] ?? 0), 0);
  return (
    <Marco titulo={titulo} descripcion={descripcion}>
      <ChartContainer config={configDe(series)} className="aspect-auto h-56 w-full" aria-hidden>
        <LineChart data={datos} margin={{ left: 0, right: 8, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeOpacity={0.5} />
          <XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={diaCorto} />
          <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <ChartTooltip cursor content={<ChartTooltipContent labelFormatter={(v) => diaCorto(String(v))} />} />
          {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          {series.map((s) => (
            <Line
              key={s.clave}
              dataKey={s.clave}
              type="linear"
              stroke={`var(--color-${s.clave})`}
              strokeWidth={2}
              strokeDasharray={s.punteada ? "5 4" : undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <p className="text-cuerpo-sm text-muted-foreground">
        Total {datos.length} días: {series.map((s) => `${s.etiqueta.toLowerCase()} ${numero(total(s.clave))}`).join(" · ")}
      </p>
      <table className="sr-only">
        <caption>{titulo} por día</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            {series.map((s) => <th key={s.clave} scope="col">{s.etiqueta}</th>)}
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.fecha}>
              <th scope="row">{d.fecha}</th>
              {series.map((s) => <td key={s.clave}>{Number(d[s.clave] ?? 0)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Marco>
  );
}

/** Barras horizontales (p. ej. alumnos por colegio), ordenadas de mayor a menor. */
export function GraficoBarras({
  titulo, descripcion, datos, etiqueta,
}: {
  titulo: string;
  descripcion?: string;
  datos: { nombre: string; valor: number }[];
  etiqueta: string;
}) {
  const config: ChartConfig = { valor: { label: etiqueta, color: "var(--chart-1)" } };
  return (
    <Marco titulo={titulo} descripcion={descripcion}>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(120, datos.length * 32 + 24) }} aria-hidden>
        <BarChart data={datos} layout="vertical" margin={{ left: 0, right: 24 }} barCategoryGap={4} accessibilityLayer>
          <CartesianGrid horizontal={false} strokeOpacity={0.5} />
          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="nombre" tickLine={false} axisLine={false} width={170} tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="valor" fill="var(--color-valor)" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr><th scope="col">Colegio</th><th scope="col">{etiqueta}</th></tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.nombre}><th scope="row">{d.nombre}</th><td>{d.valor}</td></tr>
          ))}
        </tbody>
      </table>
    </Marco>
  );
}
