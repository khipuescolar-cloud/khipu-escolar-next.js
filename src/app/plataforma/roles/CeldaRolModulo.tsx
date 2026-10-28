"use client";

import { Ban, CheckCircle2, CircleOff, Lock } from "lucide-react";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import type { Resultado } from "@/lib/resultado";
import { BotonAccion } from "../_componentes/BotonAccion";

type Props = {
  rol: string;
  nombreRol: string;
  modulo: string;
  nombreModulo: string;
  estado: "habilitado" | "desactivado" | "no_disponible" | "esencial";
  accion: (datos: FormData) => Promise<Resultado>;
};

/** Celda de la matriz rol × módulo: habilitado / desactivado / no disponible (el código no lo soporta) / esencial. */
export function CeldaRolModulo({ rol, nombreRol, modulo, nombreModulo, estado, accion }: Props) {
  if (estado === "no_disponible") {
    return (
      <span className="inline-flex min-h-8 items-center gap-1.5 text-cuerpo-sm text-muted-foreground/80" title="No disponible para este rol">
        <Ban className="size-4" strokeWidth={2} aria-hidden /> No disponible
        <span className="sr-only"> para este rol</span>
      </span>
    );
  }
  if (estado === "esencial") {
    return (
      <span className="inline-flex min-h-8 items-center gap-1.5 text-cuerpo-sm text-muted-foreground" title="Módulo esencial: no se desactiva">
        <Lock className="size-4" strokeWidth={2} aria-hidden /> Esencial
      </span>
    );
  }
  if (estado === "desactivado") {
    return (
      <BotonAccion accion={accion} campos={{ rol, modulo, habilitado: "si" }} variante="ghost" etiquetaAccesible={`Habilitar ${nombreModulo} para ${nombreRol}`}>
        <CircleOff className="text-falta" strokeWidth={2} aria-hidden /> <span aria-hidden>Desactivado</span>
      </BotonAccion>
    );
  }
  return (
    <BotonConfirmar
      etiqueta={
        <>
          <CheckCircle2 className="text-llego" strokeWidth={2} aria-hidden /> <span aria-hidden>Habilitado</span>
          <span className="sr-only">Desactivar {nombreModulo} para {nombreRol}</span>
        </>
      }
      titulo={`¿Desactivar ${nombreModulo} para ${nombreRol}?`}
      descripcion={`Afecta a todos los colegios: el rol ${nombreRol} dejará de ver ${nombreModulo} y sus páginas y acciones responderán «sin acceso». Puedes volver a habilitarlo cuando quieras.`}
      confirmar="Desactivar"
      peligro
      variante="ghost"
      tamano="sm"
      accion={accion}
      campos={{ rol, modulo, habilitado: "no" }}
    />
  );
}
