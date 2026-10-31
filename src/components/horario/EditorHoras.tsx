"use client";

import { Clock4, Loader2, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { minutos, ordenarPorHora } from "@/lib/horario";
import type { Resultado } from "@/lib/resultado";
import type { PeriodoVista } from "@/lib/server/horario";
import { cn } from "@/lib/utils";

type Fila = { clave: string; id?: string; nombre: string; horaInicio: string; horaFin: string; tipo: "clase" | "recreo" };

let contador = 0;
const nuevaClave = () => `nueva-${++contador}`;

/** Suma minutos a «HH:mm» (sin pasar de 23:59). */
function sumar(hora: string, mins: number): string {
  const total = Math.min(minutos(hora) + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Panel «Horas del día» de una plantilla: retoques a mano de nombre, inicio, fin y tipo de cada hora. Guarda la lista completa. */
export function EditorHoras({ plantillaNombre, periodos, accion }: { plantillaNombre: string; periodos: PeriodoVista[]; accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado> }) {
  const [abierto, setAbierto] = useState(false);
  const inicial = () => periodos.map((p) => ({ ...p, clave: p.id }));
  const [filas, setFilas] = useState<Fila[]>(inicial);
  const [estado, enviar, pendiente] = useActionState(async (previo: Resultado | null, datos: FormData) => {
    const r = await accion(previo, datos);
    if (r.ok) {
      if (r.mensaje) toast.success(r.mensaje);
      setAbierto(false);
    }
    return r;
  }, null);

  const cambiar = (clave: string, campo: keyof Fila, valor: string) => setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, [campo]: valor } : f)));
  const agregar = () =>
    setFilas((fs) => {
      const ultima = ordenarPorHora(fs).at(-1);
      const inicio = ultima?.horaFin ?? "08:00";
      const clases = fs.filter((f) => f.tipo === "clase").length;
      return [...fs, { clave: nuevaClave(), nombre: `${clases + 1}.ª hora`, horaInicio: inicio, horaFin: sumar(inicio, 45), tipo: "clase" }];
    });

  return (
    <Sheet open={abierto} onOpenChange={(a) => { setAbierto(a); if (a) setFilas(inicial()); }}>
      <SheetTrigger className={buttonVariants({ variant: "outline" })}>
        <Clock4 strokeWidth={2} aria-hidden />Horas del día
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Horas del día · {plantillaNombre}</SheetTitle>
          <SheetDescription>Las comparten todos los salones con la plantilla «{plantillaNombre}». Si quitas una hora o la vuelves recreo, sus casilleros se vacían.</SheetDescription>
        </SheetHeader>
        <form action={enviar} className="flex flex-col gap-3 px-4 pb-4">
          <input type="hidden" name="periodos" value={JSON.stringify(filas.map((f) => ({ id: f.id, nombre: f.nombre, horaInicio: f.horaInicio, horaFin: f.horaFin, tipo: f.tipo })))} />
          <ul className="flex flex-col gap-3">
            {filas.map((f, i) => (
              <li key={f.clave} className="rounded-lg border p-3">
                <fieldset className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                  <legend className="sr-only">Hora {i + 1}</legend>
                  <label className="col-span-4 flex flex-col gap-1 text-sm">
                    <span className="font-medium">Nombre</span>
                    <Input value={f.nombre} maxLength={40} onChange={(e) => cambiar(f.clave, "nombre", e.target.value)} required />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Inicio</span>
                    <Input type="time" value={f.horaInicio} onChange={(e) => cambiar(f.clave, "horaInicio", e.target.value)} required />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Fin</span>
                    <Input type="time" value={f.horaFin} onChange={(e) => cambiar(f.clave, "horaFin", e.target.value)} required />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Tipo</span>
                    <select className={cn(CLASE_CAMPO, "cursor-pointer")} value={f.tipo} onChange={(e) => cambiar(f.clave, "tipo", e.target.value)}>
                      <option value="clase">Clase</option>
                      <option value="recreo">Recreo</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
                    className={buttonVariants({ variant: "ghost", size: "icon" })}
                    aria-label={`Quitar ${f.nombre || `la hora ${i + 1}`}`}
                  >
                    <Trash2 strokeWidth={2} aria-hidden />
                  </button>
                </fieldset>
              </li>
            ))}
          </ul>
          <button type="button" onClick={agregar} className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
            <Plus strokeWidth={2} aria-hidden />Agregar hora
          </button>
          {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
          <SheetFooter className="px-0">
            <button type="submit" disabled={pendiente} className={buttonVariants()}>
              {pendiente && <Loader2 className="animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden />}Guardar horas
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
