"use client";
import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { editarObservacionAction } from "./actions";

export type CeldaObservacion = { evaluacionId: string; alumnoId: string; alumno: string; actividad: string; observacion: string; visible: boolean };
export const MAX_OBSERVACION = 500;

/** Observación de la nota de un alumno: privada por defecto; el interruptor la muestra a la familia (specs/38 y 47). */
export function DialogoObservacion({ celda, slug, editable, onCerrar, onGuardada }: {
  celda: CeldaObservacion | null; slug: string; editable: boolean; onCerrar: () => void; onGuardada: () => void;
}) {
  return (
    <Dialog open={!!celda} onOpenChange={(v) => { if (!v) onCerrar(); }}>
      <DialogContent>
        {celda && <Formulario key={`${celda.evaluacionId}:${celda.alumnoId}`} celda={celda} slug={slug} editable={editable} onCerrar={onCerrar} onGuardada={onGuardada} />}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ celda, slug, editable, onCerrar, onGuardada }: { celda: CeldaObservacion; slug: string; editable: boolean; onCerrar: () => void; onGuardada: () => void }) {
  const [texto, setTexto] = useState(celda.observacion);
  const [visible, setVisible] = useState(celda.visible);
  const [error, setError] = useState("");
  const [pendiente, transicion] = useTransition();
  const guardar = () => {
    setError("");
    transicion(async () => {
      const r = await editarObservacionAction(slug, celda.evaluacionId, celda.alumnoId, texto, visible);
      if (r.ok) onGuardada(); else setError(r.error);
    });
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Observación</DialogTitle>
        <DialogDescription>{celda.alumno} · {celda.actividad}</DialogDescription>
      </DialogHeader>
      {editable ? (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
          <div className="grid gap-1.5">
            <label htmlFor="texto-observacion" className="text-sm font-medium">¿Qué hizo o dijo? ¿Por qué esta nota?</label>
            <Textarea id="texto-observacion" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={MAX_OBSERVACION} rows={4} autoFocus />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{texto.length}/{MAX_OBSERVACION}</p>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-superficie-2 px-3">
            <span className="text-sm"><span className="font-medium">Visible para la familia</span><br /><span className="text-muted-foreground">{visible ? "La familia la verá cuando publiques los resultados." : "Privada: solo la ven tú, el tutor y dirección."}</span></span>
            <Switch checked={visible} onCheckedChange={setVisible} aria-label="Visible para la familia" />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button>
            <Button type="submit" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar observación"}</Button>
          </DialogFooter>
        </form>
      ) : (
        <div className="grid gap-3">
          <p className="whitespace-pre-wrap">{celda.observacion}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">{celda.visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}{celda.visible ? "Visible para la familia" : "Privada"}</p>
          <DialogFooter><Button variant="outline" onClick={onCerrar}>Cerrar</Button></DialogFooter>
        </div>
      )}
    </>
  );
}
