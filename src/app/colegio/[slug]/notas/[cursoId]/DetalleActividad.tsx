"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ClipboardList, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { asignarCompetenciaAction } from "./actions";
import { Elegir, fechaHora, fechaIso, origenDe, type Datos, type Evaluacion } from "./comun";

export function DetalleActividad({ evaluacion, datos, slug, onCerrar, onAsignada }: {
  evaluacion: Evaluacion | null; datos: Datos; slug: string; onCerrar: () => void; onAsignada: () => void;
}) {
  const [competenciaId, setCompetenciaId] = useState("");
  const [error, setError] = useState("");
  const [pendiente, transicion] = useTransition();
  const e = evaluacion;
  const autor = e?.creadaPor?.user ? `${e.creadaPor.user.nombres} ${e.creadaPor.user.apellidos}` : "Sin dato";
  const asignar = () => {
    if (!e) return;
    setError("");
    transicion(async () => {
      const r = await asignarCompetenciaAction(slug, e.id, competenciaId);
      if (r.ok) { setCompetenciaId(""); onAsignada(); } else setError(r.error);
    });
  };
  return (
    <Sheet open={!!e} onOpenChange={(v) => { if (!v) onCerrar(); }}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{e?.titulo}</SheetTitle>
          <SheetDescription>Detalle de la calificación</SheetDescription>
        </SheetHeader>
        {e && (
          <div className="space-y-4 px-4">
            <p className={e.descripcion ? "" : "text-muted-foreground"}>{e.descripcion || "Sin descripción"}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Actividad</dt><dd>{fechaIso(e.fecha)}</dd>
              <dt className="text-muted-foreground">Registrada el</dt><dd>{fechaHora(e.creadaAt)}</dd>
              <dt className="text-muted-foreground">Registró</dt><dd>{autor}</dd>
              <dt className="text-muted-foreground">Competencia</dt><dd>{e.competencia?.nombre ?? "Sin competencia"}</dd>
              <dt className="text-muted-foreground">Origen</dt>
              <dd className="flex items-center gap-1.5">{e.tareaId ? <ClipboardList className="size-4" aria-hidden /> : <PenLine className="size-4" aria-hidden />}{origenDe(e)}</dd>
            </dl>
            {e.tareaId && <Link className="inline-block text-sm underline underline-offset-4" href={`/tareas/${e.tareaId}`}>Abrir tarea</Link>}
            {e.tareaId && !e.competenciaId && datos.puedeEditar && (
              <div className="grid gap-2">
                <span className="font-medium">Asignar competencia</span>
                <Elegir value={competenciaId} onChange={setCompetenciaId} opciones={datos.competencias.map((c) => ({ value: c.id, label: c.nombre }))} etiqueta="Competencia de la tarea" className="w-full" />
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button disabled={!competenciaId || pendiente} onClick={asignar}>Asignar competencia</Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
