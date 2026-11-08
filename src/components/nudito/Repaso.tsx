"use client";

import Image from "next/image";
import { Lightbulb, MessageCircleQuestion, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENTRADA_PASO, TituloPaso, VozNudito } from "./piezas";

/** Repaso breve revisado (idea + ejemplo) y, si se pidió, la explicación ampliada. */
export function Repaso({
  tema,
  idea,
  ejemplo,
  explicacion,
  recursos,
  explicacionIa,
  ocupado,
  onOtraVez,
  onPracticar,
}: {
  tema: string;
  idea: string;
  ejemplo: string;
  explicacion: string;
  recursos: { tipo: "svg" | "diagrama" | "enlace"; titulo: string; valor: string }[];
  explicacionIa?: string;
  ocupado: boolean;
  onOtraVez: () => void;
  onPracticar: () => void;
}) {
  return (
    <section aria-labelledby="paso-repaso" className={`flex flex-col gap-4 ${ENTRADA_PASO}`}>
      <TituloPaso id="paso-repaso">Repasemos: {tema}</TituloPaso>
      <VozNudito estado="saludo">{idea}</VozNudito>
      <div className="rounded-[var(--radio-lg)] border border-maiz/50 bg-maiz/10 p-4">
        <p className="mb-1 flex items-center gap-2 text-etiqueta text-tinta">
          <Lightbulb className="size-4" strokeWidth={2} aria-hidden />
          Ejemplo
        </p>
        <p className="text-cuerpo">{ejemplo}</p>
      </div>
      <p className="whitespace-pre-line font-nudito text-cuerpo">{explicacion}</p>
      {recursos.length > 0 && <ul className="space-y-2">{recursos.map((r, i) => <li key={i} className="rounded-[var(--radio-md)] bg-superficie-2 p-3"><strong>{r.titulo}</strong>{r.tipo === "enlace" ? <a href={r.valor} target="_blank" rel="noopener noreferrer" className="ml-2 underline">Abrir recurso</a> : r.tipo === "svg" ? <Image unoptimized src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(r.valor)} alt={r.titulo} width={500} height={300} className="mt-2 h-auto max-w-full" /> : <pre className="overflow-x-auto whitespace-pre-wrap text-cuerpo-sm">{r.valor}</pre>}</li>)}</ul>}
      {explicacionIa && <VozNudito>{explicacionIa}</VozNudito>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="min-h-11" onClick={onPracticar} disabled={ocupado}>
          <Play strokeWidth={2} aria-hidden />
          ¡A practicar!
        </Button>
        <Button size="lg" variant="outline" className="min-h-11" onClick={onOtraVez} disabled={ocupado}>
          <MessageCircleQuestion strokeWidth={2} aria-hidden />
          Explícame otra vez
        </Button>
      </div>
    </section>
  );
}
