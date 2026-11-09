"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { ETIQUETA_LITERAL, LITERALES } from "@/lib/calificaciones";
import type { Resultado } from "@/lib/resultado";
import { solicitarRectificacionPeriodoAction } from "./actions";

/** El profesor del curso pide rectificar una calificación enviada de una libreta emitida: valor correcto, motivo y evidencia (specs/37). */
export function RectificarPeriodo({ slug, cursoId, alumnoId, alumno, periodoId, competenciaId, competencia, escala, actual }: {
  slug: string; cursoId: string; alumnoId: string; alumno: string; periodoId: string; competenciaId: string; competencia: string; escala: "literal" | "vigesimal"; actual: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(async (previo: Resultado | null, f: FormData) => {
    const r = await solicitarRectificacionPeriodoAction(slug, cursoId, alumnoId, periodoId, previo, f);
    if (r.ok) {
      if (r.mensaje) toast.success(r.mensaje);
      setAbierto(false);
      router.refresh();
    }
    return r;
  }, null);

  return (
    <>
      <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setAbierto(true)} aria-label={`Rectificar ${competencia} de ${alumno}`}>
        <PencilLine className="size-4" strokeWidth={2} aria-hidden />Rectificar
      </Boton>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rectificar calificación</DialogTitle>
            <DialogDescription>{alumno} · {competencia}. Calificación emitida: {actual || "sin calificar"}. Dirección revisará la solicitud y, si la aprueba, se emite una versión nueva de la libreta.</DialogDescription>
          </DialogHeader>
          <form action={enviar} className="flex flex-col gap-3">
            <input type="hidden" name="competenciaId" value={competenciaId} />
            {escala === "literal" ? (
              <Selector etiqueta="Calificación correcta" name="valor" required defaultValue="">
                <option value="" disabled>Elige</option>
                {LITERALES.map((l) => <option key={l} value={l}>{l} · {ETIQUETA_LITERAL[l]}</option>)}
              </Selector>
            ) : (
              <Campo etiqueta="Calificación correcta (0 a 20)" name="valor" inputMode="decimal" required />
            )}
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Conclusión descriptiva <span className="font-normal text-muted-foreground">(obligatoria en B y C)</span></span>
              <Textarea name="conclusion" rows={2} maxLength={1000} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Motivo</span>
              <Textarea name="motivo" rows={2} maxLength={1000} required minLength={10} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Evidencia <span className="font-normal text-muted-foreground">(opcional: qué registro lo respalda)</span></span>
              <Textarea name="evidencia" rows={2} maxLength={1000} />
            </label>
            <Boton type="submit" cargando={pendiente} className="self-start">Pedir rectificación</Boton>
            {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
