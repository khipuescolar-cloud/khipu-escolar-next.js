"use client";

import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { guardarInformeAction } from "./actions";
import { ListaNotas, type NotaDelPeriodo } from "./ListaNotas";

type Informe = { logros: string; mejorar: string; recomendaciones: string };

const PARTES = [
  { clave: "logros", etiqueta: "Qué ha logrado", ayuda: "Lo que ya hace bien en esta competencia." },
  { clave: "mejorar", etiqueta: "Qué necesita mejorar", ayuda: "Dónde todavía tiene dificultades." },
  { clave: "recomendaciones", etiqueta: "Qué recomendamos reforzar", ayuda: "Qué puede hacer la familia en casa." },
] as const;

/** Informe de progreso de un alumno en una competencia (mitad del periodo, specs/11). */
export function FilaInforme({
  slug, editable, alumno, competenciaId, periodoId, informe, notas,
}: {
  slug: string;
  editable: boolean;
  alumno: { id: string; nombres: string; apellidos: string };
  competenciaId: string;
  periodoId: string;
  informe: Informe | null;
  notas: NotaDelPeriodo[];
}) {
  const [textos, setTextos] = useState<Informe>(informe ?? { logros: "", mejorar: "", recomendaciones: "" });
  const [guardado, setGuardado] = useState(informe !== null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    iniciar(async () => {
      const r = await guardarInformeAction(slug, { alumnoId: alumno.id, competenciaId, periodoId, ...textos });
      if (!r.ok) return setError(r.error);
      setError(null);
      setGuardado(Boolean(textos.logros.trim() || textos.mejorar.trim() || textos.recomendaciones.trim()));
      toast.success(r.mensaje ?? "Informe guardado.");
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{alumno.apellidos}, {alumno.nombres}</p>
          {guardado ? (
            <span className="inline-flex items-center gap-1.5 rounded-pildora bg-llego-fondo px-2.5 py-1 text-etiqueta text-llego"><CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden />Escrito</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-pildora bg-muted px-2.5 py-1 text-etiqueta text-muted-foreground"><CircleDashed className="size-3.5" strokeWidth={2} aria-hidden />Sin escribir</span>
          )}
        </div>
        <ListaNotas notas={notas} />
        {!editable ? (
          informe ? (
            <dl className="flex flex-col gap-2 text-sm">
              {PARTES.filter((p) => informe[p.clave]).map((p) => (
                <div key={p.clave}><dt className="font-medium">{p.etiqueta}</dt><dd className="text-muted-foreground">{informe[p.clave]}</dd></div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Sin informe.</p>
          )
        ) : (
          <>
            {PARTES.map((p) => (
              <label key={p.clave} className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">{p.etiqueta} <span className="font-normal text-muted-foreground">· {p.ayuda}</span></span>
                <Textarea
                  rows={2} maxLength={600} value={textos[p.clave]}
                  onChange={(e) => setTextos((t) => ({ ...t, [p.clave]: e.target.value }))}
                />
              </label>
            ))}
            <Boton type="button" onClick={guardar} disabled={pendiente} className="self-start">
              {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
              Guardar informe
            </Boton>
            {error && <Alerta tipo="error">{error}</Alerta>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
