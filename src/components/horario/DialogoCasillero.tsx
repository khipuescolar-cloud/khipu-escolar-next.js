"use client";

import { Eraser, Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Selector } from "@/components/ui/Selector";
import { NOMBRE_DIA, rango, type DiaHorario } from "@/lib/horario";
import type { Resultado } from "@/lib/resultado";
import type { BloqueVista, PeriodoVista } from "@/lib/server/horario";

export type EditorCasillero = {
  accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
  salonId: string;
  salonNombre: string;
  cursos: { id: string; nombre: string; profesorNombre: string | null }[];
  profesores: { id: string; nombre: string }[];
  tutorId: string | null;
};

const TITULOS_SUGERIDOS = ["Tutoría", "Formación", "Plan lector", "Taller", "Estudio dirigido"];

type Props = {
  editor: EditorCasillero;
  seleccion: { dia: DiaHorario; periodo: PeriodoVista } | null;
  bloque: BloqueVista | null;
  alCerrar: () => void;
};

/** Diálogo para llenar un casillero con un curso del salón o con un bloque sin curso, o para vaciarlo. */
export function DialogoCasillero({ editor, seleccion, bloque, alCerrar }: Props) {
  const [estado, enviar, pendiente] = useActionState(editor.accion, null);
  const [tipo, setTipo] = useState<"curso" | "otro">(bloque && !bloque.cursoId ? "otro" : editor.cursos.length ? "curso" : "otro");
  const cerrar = useRef(alCerrar);
  useEffect(() => {
    cerrar.current = alCerrar;
  });
  useEffect(() => {
    if (estado?.ok) {
      if (estado.mensaje) toast.success(estado.mensaje);
      cerrar.current();
    }
  }, [estado]);

  return (
    <Dialog open={seleccion !== null} onOpenChange={(abierto) => !abierto && alCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {seleccion && (
          <>
            <DialogHeader>
              <DialogTitle>{bloque ? "Cambiar casillero" : "Asignar casillero"}</DialogTitle>
              <DialogDescription>
                {editor.salonNombre} · {NOMBRE_DIA[seleccion.dia]} · {seleccion.periodo.nombre} ({rango(seleccion.periodo)})
              </DialogDescription>
            </DialogHeader>
            <form action={enviar} className="flex flex-col gap-4">
              <input type="hidden" name="salonId" value={editor.salonId} />
              <input type="hidden" name="dia" value={seleccion.dia} />
              <input type="hidden" name="periodoId" value={seleccion.periodo.id} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm font-medium">¿Qué va en esta hora?</legend>
                <div className="flex flex-wrap gap-2">
                  {(["curso", "otro"] as const).map((t) => (
                    <label key={t} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-checked:border-primary has-checked:bg-primary/5">
                      <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="size-4 accent-primary" disabled={t === "curso" && editor.cursos.length === 0} />
                      {t === "curso" ? "Un curso del salón" : "Otro bloque (Tutoría, Formación…)"}
                    </label>
                  ))}
                </div>
              </fieldset>
              {tipo === "curso" ? (
                <Selector etiqueta="Curso" name="cursoId" defaultValue={bloque?.cursoId ?? ""} required>
                  <option value="" disabled>Elige el curso</option>
                  {editor.cursos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} · {c.profesorNombre ?? "sin profesor"}</option>
                  ))}
                </Selector>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Título" name="titulo" list="titulos-horario" maxLength={60} required defaultValue={bloque && !bloque.cursoId ? bloque.titulo : ""} placeholder="Tutoría" />
                  <datalist id="titulos-horario">{TITULOS_SUGERIDOS.map((t) => <option key={t} value={t} />)}</datalist>
                  <Selector etiqueta="A cargo de" name="profesorId" defaultValue={bloque && !bloque.cursoId ? bloque.profesorId ?? "" : editor.tutorId ?? ""}>
                    <option value="">Nadie en particular</option>
                    {editor.profesores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}{p.id === editor.tutorId ? " (tutor del salón)" : ""}</option>
                    ))}
                  </Selector>
                </div>
              )}
              <Campo etiqueta="Aula (opcional)" name="aula" maxLength={40} defaultValue={bloque?.aula ?? ""} placeholder="Laboratorio, Aula 12…" />
              {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
              <DialogFooter className="gap-2 sm:justify-between">
                {bloque ? (
                  <button type="submit" name="accion" value="vaciar" formNoValidate disabled={pendiente} className={buttonVariants({ variant: "outline" })}>
                    <Eraser strokeWidth={2} aria-hidden />Vaciar casillero
                  </button>
                ) : <span />}
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <DialogClose className={buttonVariants({ variant: "outline" })} disabled={pendiente}>Cancelar</DialogClose>
                  <button type="submit" name="accion" value="guardar" disabled={pendiente} className={buttonVariants()}>
                    {pendiente && <Loader2 className="animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden />}Guardar
                  </button>
                </div>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
