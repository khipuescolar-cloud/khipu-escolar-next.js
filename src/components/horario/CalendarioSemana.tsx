"use client";

import type { ReactNode } from "react";
import { COLOR, GrillaTiempo, duracion } from "@/components/calendario/GrillaTiempo";
import type { ItemCalendario } from "@/lib/agenda-calendario";
import { formatoDia } from "@/lib/fechas";
import { DIAS, minutos } from "@/lib/horario";
import { coloresPorCurso, fechasDeLaSemana, type Jornada, type ColorCurso, type EventoSemana } from "@/lib/horario-calendario";
import type { BloqueVista } from "@/lib/server/horario";
import { cn } from "@/lib/utils";

export type AccionBloque = { href: string; texto: string; icono: "lista" | "tareas" | "notas" };
export type BloqueConAcciones = BloqueVista & { acciones: AccionBloque[]; enCruce?: boolean };

/** Bloques y eventos de «Mi horario» como ítems de la grilla de tiempo (misma forma que usa la agenda). */
export function itemsDeLaSemana(bloques: readonly BloqueConAcciones[], eventos: readonly EventoSemana[], fechas: Record<number, string>): ItemCalendario[] {
  return [
    ...bloques.map((b): ItemCalendario => ({
      id: b.id, tipo: "clase", titulo: b.titulo, descripcion: null, ambito: b.salonNombre, lugar: b.aula, fecha: fechas[b.dia],
      horaInicio: b.horaInicio, horaFin: b.horaFin, todoElDia: false, cursoId: b.cursoId, salonNombre: b.salonNombre, aula: b.aula,
      acciones: b.acciones, enCruce: b.enCruce,
    })),
    ...eventos.map((e): ItemCalendario => ({
      id: e.id, tipo: e.tipo === "reunion" ? "reunion" : "evento", subtipo: e.tipo === "reunion" ? undefined : e.tipo, titulo: e.titulo,
      descripcion: e.descripcion, ambito: e.ambito, lugar: e.lugar, fecha: fechas[e.dia], horaInicio: e.horaInicio, horaFin: e.horaFin,
      todoElDia: e.todoElDia, href: e.href,
    })),
  ];
}

/**
 * Semana de clases en cuadrícula por horas, al estilo de Google Calendar (specs/34): barra con el mes y la semana,
 * columnas de lunes a viernes con su fecha y la grilla de tiempo compartida con la agenda (`GrillaTiempo`): cada bloque
 * ubicado y medido según su hora y con el color de su curso, las clases ya dictadas atenuadas, línea de la hora actual y,
 * al tocar un bloque, su detalle con los accesos (pasar lista, tareas, notas). Abajo, la leyenda de cursos con sus horas
 * por semana. En el celular, un día a la vez.
 */
export function CalendarioSemana({ bloques, eventos = [], jornada = null, hoyIso, diaHoy, horaAhora, ahoraId, resumen }: {
  /** Entrada, salida, recreos y horas de clase de las plantillas de sus salones (specs/34). */
  jornada?: Jornada | null;
  bloques: BloqueConAcciones[]; hoyIso: string; diaHoy: number; horaAhora: string; ahoraId: string | null;
  /** Reuniones y eventos de la agenda de esta semana. */
  eventos?: EventoSemana[];
  /** «Ahora / Después», en la barra superior del calendario. */
  resumen?: ReactNode;
}) {
  const fechas = fechasDeLaSemana(hoyIso);
  const semanaEnCurso = fechas[1] <= hoyIso && hoyIso <= fechas[5];
  const colores = coloresPorCurso(bloques);
  const diaInicial = fechas[diaHoy >= 1 && diaHoy <= 5 ? (diaHoy as 1 | 2 | 3 | 4 | 5) : 1];
  const mes = formatoDia(fechas[5], { month: "long", year: "numeric" });
  const rangoSemana = fechas[1].slice(0, 7) === fechas[5].slice(0, 7)
    ? `${Number(fechas[1].slice(8))} al ${Number(fechas[5].slice(8))}`
    : `${formatoDia(fechas[1], { day: "numeric", month: "short" })} al ${formatoDia(fechas[5], { day: "numeric", month: "short" })}`;

  return (
    <section aria-labelledby="titulo-semana" className="overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="titulo-semana" className="font-heading text-lg font-semibold first-letter:uppercase">{mes}</h2>
          <p className="text-cuerpo-sm text-muted-foreground">Semana del {rangoSemana}</p>
          {!semanaEnCurso && <span className="rounded-pildora border px-2.5 py-0.5 text-etiqueta text-muted-foreground">Próxima semana</span>}
        </div>
        {resumen && <div className="rounded-md bg-muted/50 px-3 py-2 lg:max-w-[55%]">{resumen}</div>}
      </header>

      <GrillaTiempo
        dias={DIAS.map((d) => fechas[d])}
        items={itemsDeLaSemana(bloques, eventos, fechas)}
        hoyIso={hoyIso}
        horaAhora={horaAhora}
        ahoraId={ahoraId}
        jornada={jornada}
        diaInicial={diaInicial}
      />

      <Leyenda bloques={bloques} colores={colores} conEventos={eventos.length > 0} jornada={jornada} />
    </section>
  );
}

/** Cursos de la semana con su color y sus horas: identifica cada color con su nombre (no solo color). */
function Leyenda({ bloques, colores, conEventos, jornada }: { bloques: BloqueConAcciones[]; colores: Map<string, ColorCurso>; conEventos: boolean; jornada: Jornada | null }) {
  const porCurso = new Map<string, { color: ColorCurso | "sin-curso"; min: number }>();
  for (const b of bloques) {
    const actual = porCurso.get(b.titulo) ?? { color: b.cursoId ? colores.get(b.titulo) ?? "indigo" : "sin-curso", min: 0 };
    actual.min += minutos(b.horaFin) - minutos(b.horaInicio);
    porCurso.set(b.titulo, actual);
  }
  const items = [...porCurso.entries()].sort((a, b) => b[1].min - a[1].min || a[0].localeCompare(b[0], "es"));
  return (
    <footer className="border-t bg-muted/30 px-4 py-3">
      <h3 className="sr-only">Cursos de la semana</h3>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-cuerpo-sm">
        {items.map(([titulo, { color, min }]) => (
          <li key={titulo} className="inline-flex items-center gap-2">
            <span aria-hidden className={cn("size-2.5 rounded-[3px]", COLOR[color].muestra)} />
            <span className="font-medium">{titulo}</span>
            <span className="text-muted-foreground tabular-nums">{duracion(min)}</span>
          </li>
        ))}
        {conEventos && (
          <li className="inline-flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-[3px] border border-dashed border-primary" />
            <span className="font-medium">Reuniones y eventos de la agenda</span>
          </li>
        )}
        {jornada && (
          <>
            <li className="inline-flex items-center gap-2">
              <span aria-hidden className="w-4 border-t-2 border-dashed border-primary/60" />
              <span className="font-medium">Entrada {jornada.entrada} · salida {jornada.salida}</span>
            </li>
            {jornada.recreos.length > 0 && (
              <li className="inline-flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-[3px] bg-[color-mix(in_oklab,var(--maiz)_45%,transparent)]" />
                <span className="font-medium">{jornada.recreos.length === 1 ? "Recreo" : "Recreos"}</span>
              </li>
            )}
          </>
        )}
      </ul>
    </footer>
  );
}
