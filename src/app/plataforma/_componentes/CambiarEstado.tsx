"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Selector } from "@/components/ui/Selector";
import type { EstadoTenant } from "@/generated/prisma/enums";

const AVISO: Record<EstadoTenant, string> = {
  suspendido:
    "Nadie del colegio podrá entrar hasta que lo vuelvas a activar: se corta el acceso de dirección, profesores y familias, la portería deja de registrar ingresos y dejan de salir los avisos de asistencia a las familias. Los datos no se borran.",
  activo: "El colegio quedará activo y sus usuarios podrán entrar.",
  piloto: "El colegio quedará en piloto y sus usuarios podrán entrar.",
};

/**
 * Política de impagos aprobada (specs/20): revisión humana antes de suspender, nunca borrar datos y no cortar los
 * avisos críticos. Suspender hoy SÍ los corta (no hay modo restringido todavía), por eso se advierte aquí. Solo texto.
 */
const ADVERTENCIA_SUSPENDER =
  "La política aprobada exige revisión humana antes de suspender y no cortar los avisos críticos a las familias. Suspender corta el acceso, la portería y los avisos de asistencia: úsalo solo como último recurso, tras hablar con el colegio.";

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
        descripcion={
          estado === "suspendido" ? (
            <>
              {AVISO.suspendido} <strong>{ADVERTENCIA_SUSPENDER}</strong>
            </>
          ) : (
            AVISO[estado]
          )
        }
        confirmar={estado === "suspendido" ? "Suspender colegio" : "Cambiar estado"}
        peligro={estado === "suspendido"}
        variante={estado === "suspendido" ? "destructive" : "outline"}
        accion={accion}
        campos={{ tenantId, estado }}
      />
      {estado === "suspendido" && estadoActual !== "suspendido" && (
        <p role="alert" data-testid="advertencia-suspender" className="flex basis-full items-start gap-2 rounded-lg border border-falta/40 bg-falta-fondo p-3 text-sm text-falta">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
          <span>{ADVERTENCIA_SUSPENDER}</span>
        </p>
      )}
    </div>
  );
}
