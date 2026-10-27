"use client";

import { useState } from "react";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Selector } from "@/components/ui/Selector";
import type { EstadoTenant } from "@/generated/prisma/enums";

const AVISO: Record<EstadoTenant, string> = {
  suspendido: "Nadie del colegio podrá entrar hasta que lo vuelvas a activar.",
  activo: "El colegio quedará activo y sus usuarios podrán entrar.",
  piloto: "El colegio quedará en piloto y sus usuarios podrán entrar.",
};

/** Cambio de estado con confirmación: suspender deja sin acceso a todo el colegio. */
export function CambiarEstado({
  tenantId, nombre, estadoActual, accion,
}: {
  tenantId: string;
  nombre: string;
  estadoActual: EstadoTenant;
  accion: (datos: FormData) => Promise<void>;
}) {
  const [estado, setEstado] = useState<EstadoTenant>(estadoActual);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Selector etiqueta="Estado" name="estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoTenant)}>
        <option value="piloto">Piloto</option>
        <option value="activo">Activo</option>
        <option value="suspendido">Suspendido (nadie puede entrar)</option>
      </Selector>
      <BotonConfirmar
        etiqueta="Cambiar estado"
        titulo={`¿Cambiar el estado de ${nombre}?`}
        descripcion={AVISO[estado]}
        confirmar={estado === "suspendido" ? "Suspender colegio" : "Cambiar estado"}
        peligro={estado === "suspendido"}
        variante={estado === "suspendido" ? "destructive" : "outline"}
        accion={accion}
        campos={{ tenantId, estado }}
      />
    </div>
  );
}
