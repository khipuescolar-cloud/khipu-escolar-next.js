"use client";

import { Pencil, Receipt } from "lucide-react";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { NOMBRE_CICLO, NOMBRE_ESTADO_SUSCRIPCION } from "@/lib/comercial";
import { NOMBRE_PLAN } from "@/lib/planes";
import { PanelFormulario } from "../_comun/PanelFormulario";
import { guardarSuscripcionAction } from "../_acciones";

export type DatosSuscripcion = {
  plan: string;
  ciclo: string;
  estado: string;
  montoPorCiclo: number | null;
  alumnosContratados: number | null;
  inicio: string;
  proximaRenovacion: string;
  notas: string | null;
};

/** Crear o editar la suscripción del colegio (Sheet). `actual` es null si aún no tiene. */
export function HojaSuscripcion({ tenantId, datos, existe }: { tenantId: string; datos: DatosSuscripcion; existe: boolean }) {
  return (
    <PanelFormulario
      tipo="sheet"
      boton={existe ? <><Pencil strokeWidth={2} aria-hidden /> Editar suscripción</> : <><Receipt strokeWidth={2} aria-hidden /> Crear suscripción</>}
      variante={existe ? "outline" : "default"}
      titulo={existe ? "Editar suscripción" : "Crear suscripción"}
      descripcion="Condiciones acordadas con el colegio. Los pagos se registran a mano: Khipu no cobra automáticamente."
      accion={guardarSuscripcionAction}
      guardar="Guardar suscripción"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Selector etiqueta="Plan" name="plan" defaultValue={datos.plan}>
          {Object.entries(NOMBRE_PLAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Selector>
        <Selector etiqueta="Ciclo de facturación" name="ciclo" defaultValue={datos.ciclo}>
          {Object.entries(NOMBRE_CICLO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Selector>
        <Selector etiqueta="Estado" name="estado" defaultValue={datos.estado}>
          {Object.entries(NOMBRE_ESTADO_SUSCRIPCION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Selector>
        <Campo etiqueta="Monto por ciclo (S/)" name="montoPorCiclo" type="number" min={0} step="0.01" required inputMode="decimal" defaultValue={datos.montoPorCiclo ?? ""} />
        <Campo etiqueta="Alumnos contratados" name="alumnosContratados" type="number" min={0} step={1} inputMode="numeric" defaultValue={datos.alumnosContratados ?? ""} ayuda="Opcional. Se compara con los alumnos activos." />
        <span className="hidden sm:block" />
        <Campo etiqueta="Inicio" name="inicio" type="date" required defaultValue={datos.inicio} />
        <Campo etiqueta="Próxima renovación" name="proximaRenovacion" type="date" required defaultValue={datos.proximaRenovacion} />
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">Notas (opcional)</span>
        <Textarea name="notas" rows={3} maxLength={500} defaultValue={datos.notas ?? ""} placeholder="Descuento por convenio, acuerdos de pago…" />
      </label>
    </PanelFormulario>
  );
}
