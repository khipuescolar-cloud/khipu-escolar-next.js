"use client";

import { Receipt } from "lucide-react";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { METODOS_PAGO, NOMBRE_METODO } from "@/lib/comercial";
import { PanelFormulario } from "../_comun/PanelFormulario";
import { registrarPagoAction } from "../_acciones";

/** Registrar un pago recibido (manual). Los periodos vienen sugeridos según el ciclo y la próxima renovación. */
export function DialogoPago({
  tenantId, monto, fechaPago, periodoDesde, periodoHasta, hayRenovacion,
}: { tenantId: string; monto: number | null; fechaPago: string; periodoDesde: string; periodoHasta: string; hayRenovacion: boolean }) {
  return (
    <PanelFormulario
      tipo="dialog"
      boton={<><Receipt strokeWidth={2} aria-hidden /> Registrar pago</>}
      titulo="Registrar pago"
      descripcion="Anota un pago que el colegio ya hizo. No se cobra desde aquí."
      accion={registrarPagoAction}
      guardar="Registrar pago"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Monto (S/)" name="monto" type="number" min={0.01} step="0.01" required inputMode="decimal" defaultValue={monto ?? ""} />
        <Campo etiqueta="Fecha del pago" name="fechaPago" type="date" required defaultValue={fechaPago} />
        <Campo etiqueta="Periodo desde" name="periodoDesde" type="date" required defaultValue={periodoDesde} />
        <Campo etiqueta="Periodo hasta" name="periodoHasta" type="date" required defaultValue={periodoHasta} />
        <Selector etiqueta="Método" name="metodo" defaultValue="transferencia">
          {METODOS_PAGO.map((m) => <option key={m} value={m}>{NOMBRE_METODO[m]}</option>)}
        </Selector>
        <Campo etiqueta="N.º de comprobante" name="comprobante" maxLength={40} placeholder="B001-000123" />
      </div>
      {hayRenovacion && (
        <label className="flex min-h-10 cursor-pointer items-start gap-2.5 text-cuerpo-sm">
          <input type="checkbox" name="avanzarRenovacion" defaultChecked className="mt-1 size-4 accent-[var(--primary)]" />
          <span>
            <span className="font-medium">Mover la próxima renovación al terminar este periodo</span>
            <span className="block text-muted-foreground">Solo si es posterior a la fecha actual.</span>
          </span>
        </label>
      )}
    </PanelFormulario>
  );
}
