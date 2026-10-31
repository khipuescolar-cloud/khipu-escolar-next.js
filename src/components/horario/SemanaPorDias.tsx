"use client";

import { ClipboardCheck, GraduationCap, ListTodo, MapPin, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIAS, NOMBRE_DIA, NOMBRE_DIA_CORTO, rango } from "@/lib/horario";
import type { BloqueVista } from "@/lib/server/horario";
import { cn } from "@/lib/utils";
import { InsigniaAhora, InsigniaHoy } from "./Insignias";

export type AccionBloque = { href: string; texto: string; icono: "lista" | "tareas" | "notas" };
export type BloqueConAcciones = BloqueVista & { acciones: AccionBloque[]; enCruce?: boolean };

const ICONOS = { lista: ClipboardCheck, tareas: ListTodo, notas: GraduationCap } as const;

/**
 * Semana de una persona en varios salones (el profesor): una columna por día desde `lg`, pestañas por día en pantallas
 * más chicas (por defecto hoy). Cada bloque muestra salón, hora y sus accesos (pasar lista, tareas, notas).
 */
export function SemanaPorDias({ bloques, diaHoy, ahoraId, mostrarSalon = true }: { bloques: BloqueConAcciones[]; diaHoy: number; ahoraId: string | null; mostrarSalon?: boolean }) {
  const delDia = (d: number) => bloques.filter((b) => b.dia === d);
  const diaInicial = String(diaHoy >= 1 && diaHoy <= 5 ? diaHoy : 1);
  return (
    <>
      <div className="hidden gap-3 lg:grid lg:grid-cols-5">
        {DIAS.map((d) => (
          <section key={d} aria-labelledby={`dia-${d}`} className={cn("flex flex-col gap-2 rounded-lg border p-2", d === diaHoy ? "border-primary/40 bg-primary/5" : "bg-card")}>
            <h3 id={`dia-${d}`} className="flex flex-wrap items-center gap-1.5 px-1 pt-1 font-semibold">{NOMBRE_DIA[d]}{d === diaHoy && <InsigniaHoy />}</h3>
            <ListaDia bloques={delDia(d)} ahoraId={ahoraId} mostrarSalon={mostrarSalon} />
          </section>
        ))}
      </div>
      <Tabs defaultValue={diaInicial} className="lg:hidden">
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
            <ListaDia bloques={delDia(d)} ahoraId={ahoraId} mostrarSalon={mostrarSalon} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

function ListaDia({ bloques, ahoraId, mostrarSalon }: { bloques: BloqueConAcciones[]; ahoraId: string | null; mostrarSalon: boolean }) {
  if (bloques.length === 0) return <p className="px-1 py-2 text-cuerpo-sm text-muted-foreground">Sin clases.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {bloques.map((b) => (
        <li key={b.id} className={cn("flex flex-col gap-1 rounded-md border bg-card p-2.5", b.id === ahoraId && "border-primary ring-1 ring-primary", b.enCruce && "border-falta")}>
          {b.id === ahoraId && <InsigniaAhora />}
          <span className="text-cuerpo-sm text-muted-foreground tabular-nums">{rango(b)}</span>
          <span className={cn("font-semibold", !b.cursoId && "text-turquesa")}>{b.titulo}</span>
          {mostrarSalon && <span className="text-cuerpo-sm">{b.salonNombre}</span>}
          {b.aula && (
            <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground"><MapPin className="size-3.5" strokeWidth={2} aria-hidden />{b.aula}</span>
          )}
          {b.enCruce && <span className="inline-flex items-center gap-1 text-cuerpo-sm font-medium text-falta"><TriangleAlert className="size-3.5" strokeWidth={2} aria-hidden />Se cruza con otra clase</span>}
          {b.acciones.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {b.acciones.map((a) => {
                const Icono = ICONOS[a.icono];
                return (
                  <Link key={a.href} href={a.href} className="inline-flex min-h-8 items-center gap-1 text-cuerpo-sm enlace">
                    <Icono className="size-3.5" strokeWidth={2} aria-hidden />{a.texto}
                  </Link>
                );
              })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
