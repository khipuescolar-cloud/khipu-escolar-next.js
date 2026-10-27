"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Input } from "@/components/ui/input";

/** Revisión de una justificación pendiente: la decisión avisa a la familia, por eso pide confirmación. */
export function RevisionJustificacion({
  revisar,
  alumno,
}: {
  revisar: (datos: FormData) => Promise<void>;
  alumno: string;
}) {
  const [comentario, setComentario] = useState("");
  const decidir = (decision: "aceptada" | "rechazada") => async (datos: FormData) => {
    await revisar(datos);
    return { ok: true as const, mensaje: decision === "aceptada" ? "Justificación aceptada. Avisamos a la familia." : "Justificación rechazada. Avisamos a la familia." };
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Comentario para la familia (opcional)</span>
        <Input name="comentario" maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <BotonConfirmar
          variante="default"
          etiqueta={<><CheckCircle2 strokeWidth={2} aria-hidden /> Aceptar</>}
          titulo="¿Aceptar esta justificación?"
          descripcion={`La falta de ${alumno} quedará justificada y le avisaremos a la familia por correo.`}
          confirmar="Aceptar justificación"
          accion={decidir("aceptada")}
          campos={{ decision: "aceptada", comentario }}
        />
        <BotonConfirmar
          etiqueta={<><XCircle strokeWidth={2} aria-hidden /> Rechazar</>}
          titulo="¿Rechazar esta justificación?"
          descripcion={`La falta de ${alumno} seguirá sin justificar y le avisaremos a la familia por correo.`}
          confirmar="Rechazar justificación"
          peligro
          accion={decidir("rechazada")}
          campos={{ decision: "rechazada", comentario }}
        />
      </div>
    </div>
  );
}
