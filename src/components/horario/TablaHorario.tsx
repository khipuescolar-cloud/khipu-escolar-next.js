"use client";

import { Coffee, Plus } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIAS, NOMBRE_DIA, NOMBRE_DIA_CORTO, rango, type DiaHorario } from "@/lib/horario";
import type { BloqueVista, PeriodoVista } from "@/lib/server/horario";
import { cn } from "@/lib/utils";
import { DialogoCasillero, type EditorCasillero } from "./DialogoCasillero";
import { InsigniaAhora, InsigniaHoy } from "./Insignias";

type Props = {
  /** Nombre accesible de la tabla («Horario de 3.° B»). */
  etiqueta: string;
  periodos: PeriodoVista[];
  bloques: BloqueVista[];
  /** Día de hoy en el colegio (1 = lunes … 7 = domingo). */
  diaHoy: number;
  /** Bloque en curso ahora (solo si es hoy). */
  ahoraId: string | null;
  /** Solo dirección: cada casillero abre el diálogo para llenarlo o vaciarlo. */
  editor?: EditorCasillero;
};

type Seleccion = { dia: DiaHorario; periodo: PeriodoVista } | null;

/**
 * Horario semanal de un salón. Desde `md`: tabla con columnas Lun–Vie y filas por hora. En el celular: pestañas por día
 * (por defecto hoy) con la lista de horas. Hoy y el bloque en curso se marcan con ícono + palabra.
 */
export function TablaHorario({ etiqueta, periodos, bloques, diaHoy, ahoraId, editor }: Props) {
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const bloque = (dia: number, periodoId: string) => bloques.find((b) => b.dia === dia && b.periodoId === periodoId) ?? null;
  const diaInicial = String(diaHoy >= 1 && diaHoy <= 5 ? diaHoy : 1);
  const actual = seleccion ? bloque(seleccion.dia, seleccion.periodo.id) : null;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
        <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm">
          <caption className="sr-only">{etiqueta}</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="w-32 px-3 py-2.5 text-left text-etiqueta text-muted-foreground">Hora</th>
              {DIAS.map((d) => (
                <th key={d} scope="col" className={cn("px-2 py-2.5 text-left font-semibold", d === diaHoy && "bg-primary/5")}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {NOMBRE_DIA[d]}
                    {d === diaHoy && <InsigniaHoy />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodos.map((p) => (
              <tr key={p.id} className="border-b last:border-b-0">
                <th scope="row" className="px-3 py-2 text-left align-top font-normal">
                  <span className="block font-medium">{p.nombre}</span>
                  <span className="block text-cuerpo-sm text-muted-foreground tabular-nums">{rango(p)}</span>
                </th>
                {p.tipo === "recreo" ? (
                  <td colSpan={5} className="bg-muted/60 px-3 py-2 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Coffee className="size-4" strokeWidth={2} aria-hidden />Recreo</span>
                  </td>
                ) : (
                  DIAS.map((d) => (
                    <td key={d} className={cn("p-1 align-top", d === diaHoy && "bg-primary/5")}>
                      <Casillero
                        bloque={bloque(d, p.id)}
                        ahora={ahoraId !== null && bloque(d, p.id)?.id === ahoraId}
                        etiquetaVacio={`${NOMBRE_DIA[d]}, ${p.nombre}`}
                        alEditar={editor ? () => setSeleccion({ dia: d, periodo: p }) : undefined}
                      />
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Tabs defaultValue={diaInicial} className="md:hidden">
        <TabsList className="w-full" aria-label="Día de la semana">
          {DIAS.map((d) => (
            <TabsTrigger key={d} value={String(d)} className="min-h-10">
              <span aria-hidden>{NOMBRE_DIA_CORTO[d]}</span>
              <span className="sr-only">{NOMBRE_DIA[d]}{d === diaHoy ? " (hoy)" : ""}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {DIAS.map((d) => (
          <TabsContent key={d} value={String(d)} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 pt-1 font-semibold">{NOMBRE_DIA[d]}{d === diaHoy && <InsigniaHoy />}</h3>
            <ul className="flex flex-col gap-2">
              {periodos.map((p) => (
                <li key={p.id} className="grid grid-cols-[5.5rem_1fr] items-start gap-2">
                  <span className="pt-2 text-cuerpo-sm text-muted-foreground tabular-nums">
                    <span className="block font-medium text-foreground">{p.nombre}</span>
                    {rango(p)}
                  </span>
                  {p.tipo === "recreo" ? (
                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-muted/60 px-3 text-muted-foreground">
                      <Coffee className="size-4" strokeWidth={2} aria-hidden />Recreo
                    </span>
                  ) : (
                    <Casillero
                      bloque={bloque(d, p.id)}
                      ahora={ahoraId !== null && bloque(d, p.id)?.id === ahoraId}
                      etiquetaVacio={`${NOMBRE_DIA[d]}, ${p.nombre}`}
                      alEditar={editor ? () => setSeleccion({ dia: d, periodo: p }) : undefined}
                    />
                  )}
                </li>
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>

      {editor && (
        <DialogoCasillero
          key={seleccion ? `${seleccion.dia}-${seleccion.periodo.id}` : "cerrado"}
          editor={editor}
          seleccion={seleccion}
          bloque={actual}
          alCerrar={() => setSeleccion(null)}
        />
      )}
    </>
  );
}

function Casillero({ bloque, ahora, etiquetaVacio, alEditar }: { bloque: BloqueVista | null; ahora: boolean; etiquetaVacio: string; alEditar?: () => void }) {
  const contenido = bloque ? (
    <>
      {ahora && <InsigniaAhora />}
      <span className={cn("block font-semibold", !bloque.cursoId && "text-turquesa")}>{bloque.titulo}</span>
      {bloque.profesorNombre && <span className="block text-cuerpo-sm text-muted-foreground">{bloque.profesorNombre}</span>}
      {bloque.aula && <span className="block text-cuerpo-sm text-muted-foreground">Aula: {bloque.aula}</span>}
    </>
  ) : alEditar ? (
    <span className="inline-flex items-center gap-1 text-muted-foreground"><Plus className="size-4" strokeWidth={2} aria-hidden />Asignar<span className="sr-only">: {etiquetaVacio}</span></span>
  ) : (
    <span className="text-muted-foreground"><span aria-hidden>—</span><span className="sr-only">Libre</span></span>
  );
  const clase = cn(
    "flex min-h-14 w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left",
    bloque && "border bg-card",
    ahora && "border-primary ring-1 ring-primary",
    !bloque && alEditar && "border border-dashed",
  );
  if (!alEditar) return <div className={clase}>{contenido}</div>;
  return (
    <button
      type="button"
      onClick={alEditar}
      className={cn(clase, "transition-colors hover:bg-accent motion-reduce:transition-none")}
      aria-label={bloque ? `${etiquetaVacio}: ${bloque.titulo}. Cambiar` : undefined}
      aria-haspopup="dialog"
    >
      {contenido}
    </button>
  );
}
