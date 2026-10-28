"use client";

import { Loader2, Star } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Resultado } from "@/lib/resultado";
import { MAX_COMENTARIO_VALORACION } from "@/lib/soporte";
import { cn } from "@/lib/utils";

/** Valoración 1–5 (y comentario) de la atención, cuando la conversación está resuelta o cerrada. */
export function Valoracion({ id, inicial, comentarioInicial, accion }: {
  id: string;
  inicial: number | null;
  comentarioInicial: string | null;
  accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
}) {
  const [valor, setValor] = useState(inicial ?? 0);
  const [estado, enviar, pendiente] = useActionState(accion, null);
  useEffect(() => {
    if (estado?.ok && estado.mensaje) toast.success(estado.mensaje);
  }, [estado]);
  return (
    <form action={enviar} className="flex flex-col gap-3 rounded-lg border bg-card p-4" aria-labelledby="titulo-valoracion">
      <h2 id="titulo-valoracion" className="text-cuerpo font-semibold">¿Cómo te atendimos?</h2>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="valoracion" value={valor || ""} />
      <div className="flex gap-1" role="radiogroup" aria-label="Valoración de 1 a 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            aria-label={`${n} de 5`}
            onClick={() => setValor(n)}
            className="grid size-10 place-items-center rounded-md hover:bg-accent"
          >
            <Star className={cn("size-6", n <= valor ? "fill-maiz text-maiz" : "text-muted-foreground")} strokeWidth={2} aria-hidden />
          </button>
        ))}
      </div>
      <label htmlFor="comentario-valoracion" className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">Comentario (opcional)</span>
        <Textarea id="comentario-valoracion" name="comentario" maxLength={MAX_COMENTARIO_VALORACION} rows={2} defaultValue={comentarioInicial ?? ""} />
      </label>
      {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
      <Button type="submit" variant="outline" className="self-start" disabled={pendiente || valor === 0}>
        {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
        {inicial ? "Actualizar valoración" : "Enviar valoración"}
      </Button>
    </form>
  );
}
