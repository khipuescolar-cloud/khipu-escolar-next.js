"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENTRADA_PASO, TituloPaso, VozNudito, type NivelVista } from "./piezas";

/** Saludo animado de Nudito con el primer nombre; ofrece reanudar una sesión activa de menos de 24 h. */
export function Bienvenida({
  nombre,
  mensaje,
  nivel,
  reanudable,
  ocupado,
  onEmpezar,
  onReanudar,
}: {
  nombre: string;
  mensaje: string;
  nivel: NivelVista;
  reanudable?: { sesionId: string; tema: string };
  ocupado: boolean;
  onEmpezar: () => void;
  onReanudar: () => void;
}) {
  return (
    <section aria-labelledby="paso-bienvenida" className={`flex flex-col gap-4 ${ENTRADA_PASO}`}>
      <TituloPaso id="paso-bienvenida">¡Hola, {nombre}!</TituloPaso>
      <VozNudito estado="saludo" tamano={nivel === "primaria" ? 72 : 56}>
        {mensaje}
      </VozNudito>
      <div className="flex flex-col gap-2 sm:flex-row">
        {reanudable && (
          <Button size="lg" className="min-h-11" onClick={onReanudar} disabled={ocupado}>
            <RotateCcw strokeWidth={2} aria-hidden />
            Seguir con {reanudable.tema}
          </Button>
        )}
        <Button size="lg" variant={reanudable ? "outline" : "default"} className="min-h-11" onClick={onEmpezar} disabled={ocupado}>
          {reanudable ? "Empezar algo nuevo" : "¡Empecemos!"}
          <ArrowRight strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
