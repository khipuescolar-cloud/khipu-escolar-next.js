"use client";

import { useState } from "react";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";

/** Meses, monto (se recalcula al cambiar los meses), número de operación y fecha del Yape. */
export function CamposPago({ precioMensual, hoy, minimo }: { precioMensual: number; hoy: string; minimo: string }) {
  const [meses, setMeses] = useState(1);
  const [monto, setMonto] = useState(precioMensual.toFixed(2));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Selector
        etiqueta="Meses que pagaste"
        name="meses"
        value={meses}
        onChange={(e) => {
          const n = Number(e.target.value);
          setMeses(n);
          setMonto((precioMensual * n).toFixed(2));
        }}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n === 1 ? "1 mes" : `${n} meses`}</option>
        ))}
      </Selector>
      <Campo etiqueta="Monto pagado (S/)" name="monto" type="number" inputMode="decimal" min="0.01" step="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} />
      <Campo etiqueta="Número de operación" name="referencia" required minLength={4} maxLength={40} autoComplete="off" inputMode="numeric" ayuda="Aparece en la constancia de Yape." />
      <Campo etiqueta="Fecha del pago" name="fechaPago" type="date" required defaultValue={hoy} min={minimo} max={hoy} />
    </div>
  );
}
