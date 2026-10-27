"use client";

import { XCircle } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

/**
 * Registros guardados sin conexión que el servidor no pudo recibir tras varios intentos («No se pudo enviar»).
 * El profesor decide: descartarlos y volver a registrar. Ícono + palabra; se anuncia a lectores de pantalla.
 */
export function AvisoColaFallida({
  cantidad, singular, plural, onDescartar,
}: { cantidad: number; singular: string; plural: string; onDescartar: () => void }) {
  if (cantidad === 0) return null;
  return (
    <div role="alert" data-testid="aviso-cola-fallida" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-falta/20 bg-falta-fondo px-3.5 py-3 text-sm text-falta">
      <p className="flex items-start gap-2.5">
        <XCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
        <span>
          <span className="font-semibold">No se pudo enviar.</span>{" "}
          {cantidad === 1 ? `1 ${singular} guardada` : `${cantidad} ${plural} guardadas`} en este dispositivo no llegó al colegio tras varios intentos. Descarta y vuelve a registrar.
        </span>
      </p>
      <Boton type="button" variante="secundario" tamano="sm" onClick={onDescartar}>Descartar</Boton>
    </div>
  );
}
