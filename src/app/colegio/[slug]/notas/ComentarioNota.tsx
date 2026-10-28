"use client";

import { Loader2, MessageSquare, MessageSquareText } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { guardarComentarioNotaAction } from "./actions";

export const MAX_COMENTARIO = 500;

type Props = {
  slug: string;
  evaluacionId: string;
  alumnoId: string;
  alumno: string;
  evaluacion: string;
  comentario: string;
  /** Hay nota en la celda (sin nota no se puede comentar). */
  hayNota: boolean;
  editable: boolean;
  alGuardar: (comentario: string) => void;
};

/** Botón por celda que abre un diálogo con la observación de la nota (máx. 500 caracteres). */
export function ComentarioNota({ slug, evaluacionId, alumnoId, alumno, evaluacion, comentario, hayNota, editable, alGuardar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(comentario);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const tiene = comentario !== "";
  if (!editable && !tiene) return null;

  const guardar = () =>
    iniciar(async () => {
      setError(null);
      const r = await guardarComentarioNotaAction(slug, evaluacionId, alumnoId, texto);
      if (!r.ok) return setError(r.error);
      alGuardar(texto.trim());
      if (r.mensaje) toast.success(r.mensaje);
      setAbierto(false);
    });

  const Icono = tiene ? MessageSquareText : MessageSquare;
  const etiqueta = editable ? (tiene ? "Editar observación" : "Agregar observación") : "Ver observación";
  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (v) {
          setTexto(comentario);
          setError(null);
        }
      }}
    >
      <DialogTrigger
        disabled={editable && !hayNota}
        title={editable && !hayNota ? "Primero pon la nota" : etiqueta}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), tiene && "text-primary")}
      >
        <Icono strokeWidth={2} aria-hidden />
        <span className="sr-only">{etiqueta} de {alumno} en {evaluacion}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Observación de la nota</DialogTitle>
          <DialogDescription>{alumno} · {evaluacion}. La familia la verá junto a la nota.</DialogDescription>
        </DialogHeader>
        {editable ? (
          <Textarea
            aria-label="Observación"
            value={texto}
            maxLength={MAX_COMENTARIO}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej.: Mejoró mucho en el procedimiento."
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{comentario}</p>
        )}
        {editable && <p className="text-cuerpo-sm text-muted-foreground">{texto.length}/{MAX_COMENTARIO} caracteres</p>}
        {error && <Alerta tipo="error">{error}</Alerta>}
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: "outline" })} disabled={pendiente}>{editable ? "Cancelar" : "Cerrar"}</DialogClose>
          {editable && (
            <button type="button" onClick={guardar} disabled={pendiente} className={buttonVariants()}>
              {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
              Guardar observación
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
