"use client";

import { CheckCircle2, CircleDashed, Loader2, Wand2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Calificacion } from "@/components/Calificacion";
import {
  ETIQUETA_LITERAL, LITERALES, formatearNumero, requiereConclusion, textoValor, type Escala, type Literal, type ValorCalificacion,
} from "@/lib/calificaciones";
import { guardarCalificacionAction } from "./actions";

type Guardado = { valorLiteral: Literal | null; valorNumerico: number | null; conclusion: string | null };

const comoTexto = (v: { valorLiteral: Literal | null; valorNumerico: number | null } | null): string =>
  v?.valorLiteral ?? (v?.valorNumerico != null ? formatearNumero(v.valorNumerico).replace(",", ".") : "");

/** Calificación de una competencia para un alumno: sugerida, valor y conclusión descriptiva. */
export function FilaCalificacion({
  slug, escala, editable, alumno, competenciaId, periodoId, guardado, sugerido, cantidadNotas,
}: {
  slug: string;
  escala: Escala;
  editable: boolean;
  alumno: { id: string; nombres: string; apellidos: string };
  competenciaId: string;
  periodoId: string;
  guardado: Guardado | null;
  sugerido: ValorCalificacion | null;
  cantidadNotas: number;
}) {
  const [estado, enviar, pendiente] = useActionState(guardarCalificacionAction.bind(null, slug), null);
  const [valor, setValor] = useState(comoTexto(guardado ?? sugerido));
  const [conclusion, setConclusion] = useState(guardado?.conclusion ?? "");
  const obligatoria = escala === "literal" && requiereConclusion(valor.toUpperCase() as Literal);

  return (
    <div className="rounded-lg border border-arena bg-superficie p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{alumno.apellidos}, {alumno.nombres}</p>
        {guardado ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-llego"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />Confirmada</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-pizarra"><CircleDashed className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />Sin confirmar</span>
        )}
      </div>
      <p className="mt-1 text-sm text-pizarra">
        {sugerido ? <>Sugerida: <strong className="text-tinta">{textoValor(sugerido)}</strong> según {cantidadNotas} {cantidadNotas === 1 ? "nota" : "notas"}.</> : "Sin notas para sugerir una calificación."}
      </p>

      {!editable ? (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {guardado ? <Calificacion valor={guardado} /> : <span className="text-pizarra">Sin calificar</span>}
          {guardado?.conclusion && <p>{guardado.conclusion}</p>}
        </div>
      ) : (
        <form action={enviar} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="alumnoId" value={alumno.id} />
          <input type="hidden" name="competenciaId" value={competenciaId} />
          <input type="hidden" name="periodoId" value={periodoId} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Calificación</span>
              {escala === "literal" ? (
                <select name="valor" value={valor} onChange={(e) => setValor(e.target.value)} className="rounded-md border border-arena bg-superficie px-3 py-2.5">
                  <option value="">Sin calificar</option>
                  {LITERALES.map((l) => <option key={l} value={l}>{l} · {ETIQUETA_LITERAL[l]}</option>)}
                </select>
              ) : (
                <input name="valor" type="number" min={0} max={20} step={0.5} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="w-24 rounded-md border border-arena bg-superficie px-3 py-2.5" />
              )}
            </label>
            {sugerido && (
              <Boton type="button" variante="secundario" onClick={() => setValor(comoTexto(sugerido))}>
                <Wand2 className="h-4 w-4" strokeWidth={2} aria-hidden />Usar la sugerida
              </Boton>
            )}
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Conclusión descriptiva{obligatoria ? " (obligatoria)" : " (opcional)"}</span>
            <textarea
              name="conclusion" rows={2} maxLength={1000} value={conclusion} onChange={(e) => setConclusion(e.target.value)}
              required={obligatoria} className="rounded-md border border-arena bg-superficie px-3 py-2.5 text-base"
            />
          </label>
          <div className="flex flex-col gap-2">
            <Boton type="submit" disabled={pendiente} className="self-start">
              {pendiente && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />}
              Confirmar calificación
            </Boton>
            {estado && (estado.ok ? (estado.mensaje && <Alerta tipo="exito">{estado.mensaje}</Alerta>) : <Alerta tipo="error">{estado.error}</Alerta>)}
          </div>
        </form>
      )}
    </div>
  );
}
