"use client";

import { useState, type ReactNode } from "react";

/** Casilla con etiqueta táctil (≥ 40 px). Con `hijos`, los muestra solo si está marcada. */
export function CasillaCampo({ nombre, etiqueta, ayuda, hijos, marcada = false }: { nombre: string; etiqueta: string; ayuda?: string; hijos?: ReactNode; marcada?: boolean }) {
  const [activa, setActiva] = useState(marcada);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-10 cursor-pointer items-start gap-2.5 text-cuerpo-sm">
        <input type="checkbox" name={nombre} checked={activa} onChange={(e) => setActiva(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
        <span>
          <span className="font-medium text-foreground">{etiqueta}</span>
          {ayuda && <span className="block text-muted-foreground">{ayuda}</span>}
        </span>
      </label>
      {activa && hijos}
    </div>
  );
}
