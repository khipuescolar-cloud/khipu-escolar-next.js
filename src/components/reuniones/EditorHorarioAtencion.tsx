"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import type { Resultado } from "@/lib/resultado";

type Franja = { dia: number; horaDesde: string; horaHasta: string };
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Horario de atención a familias: franjas por día de la semana (specs/40). */
export function EditorHorarioAtencion({ inicial, guardar }: { inicial: Franja[]; guardar: (franjas: Franja[]) => Promise<Resultado> }) {
  const [franjas, setFranjas] = useState<Franja[]>(inicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cambiar = (i: number, cambio: Partial<Franja>) => setFranjas(franjas.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
  const campo = "h-11 rounded-[10px] border border-input bg-background px-2 text-cuerpo";
  return (
    <div className="flex flex-col gap-3">
      {franjas.length === 0 && <p className="text-cuerpo-sm text-muted-foreground">Sin horario de atención: las familias te propondrán fecha y hora.</p>}
      <ul className="flex flex-col gap-2">
        {franjas.map((f, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <select aria-label="Día" value={f.dia} onChange={(e) => cambiar(i, { dia: Number(e.target.value) })} className={campo}>
              {DIAS.map((d, n) => <option key={d} value={n + 1}>{d}</option>)}
            </select>
            <input aria-label="Desde" type="time" step={900} value={f.horaDesde} onChange={(e) => cambiar(i, { horaDesde: e.target.value })} className={campo} />
            <span>a</span>
            <input aria-label="Hasta" type="time" step={900} value={f.horaHasta} onChange={(e) => cambiar(i, { horaHasta: e.target.value })} className={campo} />
            <button type="button" onClick={() => setFranjas(franjas.filter((_, j) => j !== i))} className={buttonVariants({ variant: "ghost", size: "sm" })} aria-label="Quitar franja">
              <Trash2 strokeWidth={2} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFranjas([...franjas, { dia: 1, horaDesde: "14:00", horaHasta: "15:00" }])} className={buttonVariants({ variant: "outline" })}>
          <Plus strokeWidth={2} aria-hidden />Agregar franja
        </button>
        <button
          type="button" disabled={pendiente} className={buttonVariants()}
          onClick={() => iniciar(async () => {
            setError(null);
            const r = await guardar(franjas);
            if (r.ok) toast.success(r.mensaje ?? "Guardado.");
            else setError(r.error);
          })}
        >
          {pendiente ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : <Save strokeWidth={2} aria-hidden />}Guardar horario
        </button>
      </div>
    </div>
  );
}
