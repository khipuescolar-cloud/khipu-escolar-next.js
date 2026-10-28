"use client";

import { CheckSquare, Lock, Square } from "lucide-react";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import type { Resultado } from "@/lib/resultado";
import { BotonAccion } from "../_componentes/BotonAccion";

type Props = {
  plan: string;
  nombrePlan: string;
  modulo: string;
  nombreModulo: string;
  incluido: boolean;
  esencial: boolean;
  /** Colegios en piloto o activos con este plan. */
  afectados: number;
  accion: (datos: FormData) => Promise<Resultado>;
};

/** Casilla de la matriz módulos × planes. Quitar un módulo que usan colegios pide confirmación («Afecta a N colegios»). */
export function CeldaPlanModulo({ plan, nombrePlan, modulo, nombreModulo, incluido, esencial, afectados, accion }: Props) {
  if (esencial) {
    return (
      <span className="inline-flex min-h-8 items-center gap-1.5 text-cuerpo-sm text-muted-foreground" title="Módulo esencial: siempre incluido">
        <Lock className="size-4" strokeWidth={2} aria-hidden /> Siempre
      </span>
    );
  }
  const campos = { plan, modulo, incluir: incluido ? "no" : "si" };
  const etiqueta = incluido ? `Quitar ${nombreModulo} del plan ${nombrePlan}` : `Incluir ${nombreModulo} en el plan ${nombrePlan}`;
  const contenido = incluido ? (
    <>
      <CheckSquare className="text-primary" strokeWidth={2} aria-hidden /> <span aria-hidden>Incluido</span>
    </>
  ) : (
    <>
      <Square className="text-muted-foreground" strokeWidth={2} aria-hidden /> <span aria-hidden>No incluido</span>
    </>
  );

  if (incluido && afectados > 0) {
    const colegios = afectados === 1 ? "1 colegio" : `${afectados} colegios`;
    return (
      <BotonConfirmar
        etiqueta={
          <>
            {contenido}
            <span className="sr-only">{etiqueta}</span>
          </>
        }
        titulo={`¿Quitar ${nombreModulo} del plan ${nombrePlan}?`}
        descripcion={`Afecta a ${colegios} con este plan: dejarán de ver ${nombreModulo} y sus páginas responderán «sin acceso». Los colegios que lo tengan como extra lo conservan.`}
        confirmar="Quitar módulo"
        peligro
        variante="ghost"
        tamano="sm"
        accion={accion}
        campos={campos}
      />
    );
  }
  return (
    <BotonAccion accion={accion} campos={campos} variante="ghost" etiquetaAccesible={etiqueta}>
      {contenido}
    </BotonAccion>
  );
}
