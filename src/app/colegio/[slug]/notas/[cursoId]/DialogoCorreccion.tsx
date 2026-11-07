"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type Correccion = { evaluacionId: string; actividad: string; alumno: string; alumnoId: string; previo: string; nuevo: string };
const MINIMO = 8;
const texto = (v: string) => v || "Pendiente";

export function DialogoCorreccion({ correccion, guardando, errorServidor, onCancelar, onGuardar }: {
  correccion: Correccion | null; guardando: boolean; errorServidor: string; onCancelar: () => void; onGuardar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [tocado, setTocado] = useState(false);
  const corto = motivo.trim().length < MINIMO;
  const error = tocado && corto ? `Escribe al menos ${MINIMO} caracteres.` : errorServidor;
  const cerrar = () => { setMotivo(""); setTocado(false); onCancelar(); };
  const guardar = () => { setTocado(true); if (!corto) onGuardar(motivo.trim()); };
  return (
    <Dialog open={!!correccion} onOpenChange={(v) => { if (!v) cerrar(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corregir nota</DialogTitle>
          <DialogDescription>{correccion?.alumno} · {correccion?.actividad}</DialogDescription>
        </DialogHeader>
        {correccion && (
          <form className="grid gap-4" onSubmit={(ev) => { ev.preventDefault(); guardar(); }}>
            <div className="flex items-center gap-3 rounded-md bg-superficie-2 px-4 py-3">
              <div><p className="text-xs text-muted-foreground">Valor anterior</p><p className="text-lg font-semibold">{texto(correccion.previo)}</p></div>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              <div><p className="text-xs text-muted-foreground">Valor nuevo</p><p className="text-lg font-semibold">{texto(correccion.nuevo)}</p></div>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="motivo-correccion" className="text-sm font-medium">Motivo de la corrección</label>
              <Textarea id="motivo-correccion" value={motivo} onChange={(e) => setMotivo(e.target.value)} onBlur={() => setTocado(true)} aria-invalid={!!error} aria-describedby={error ? "motivo-error" : undefined} placeholder="Ej.: error de digitación al pasar la nota" maxLength={300} autoFocus />
              {error && <p id="motivo-error" role="alert" className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrar}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar corrección"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
