"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { ETIQUETA_LITERAL, LITERALES } from "@/lib/calificaciones";
import { solicitarRectificacionAction } from "./actions";

/** Pedir la rectificación de una calificación de la libreta emitida: valor correcto, motivo y evidencia (specs/37). */
export function FormRectificacion({ slug, alumnoId, periodoId, escala, competencias }: {
  slug: string; alumnoId: string; periodoId: string; escala: "literal" | "vigesimal";
  competencias: { id: string; nombre: string; actual: string }[];
}) {
  const [estado, enviar, pendiente] = useActionState(solicitarRectificacionAction.bind(null, slug, alumnoId, periodoId), null);
  useEffect(() => {
    if (estado?.ok && estado.mensaje) toast.success(estado.mensaje);
  }, [estado]);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <Selector etiqueta="Competencia" name="competenciaId" required defaultValue="">
        <option value="" disabled>Elige la competencia</option>
        {competencias.map((c) => <option key={c.id} value={c.id}>{c.nombre} (emitida: {c.actual})</option>)}
      </Selector>
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
      <Boton type="submit" disabled={pendiente} className="self-start">
        {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
        Pedir rectificación
      </Boton>
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
    </form>
  );
}
