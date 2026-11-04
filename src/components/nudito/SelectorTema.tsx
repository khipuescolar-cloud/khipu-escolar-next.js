"use client";

import { useState } from "react";
import { ArrowLeft, PencilLine, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tema, TemaVista, ValidacionTema } from "@/lib/nudito/contratos";
import { ENTRADA_PASO, EtiquetaEstado, TituloPaso, VozNudito, type NivelVista } from "./piezas";

type Aviso = Exclude<ValidacionTema, { tipo: "permitido" }>;

function opcionesDe(v: Aviso): Tema[] {
  if (v.tipo === "demasiado_avanzado") return v.alternativas;
  if (v.tipo === "ambiguo") return v.opciones;
  if (v.tipo === "no_reconocido") return v.sugerencias;
  return [];
}

function textoDe(v: Aviso): string {
  return v.tipo === "ambiguo" ? v.pregunta : v.mensaje;
}

/** Temas del curso (recomendados primero) y «Otro tema» con validación en el servidor. */
export function SelectorTema({
  curso,
  temas,
  nivel,
  aviso,
  ocupado,
  onElegir,
  onOtroTema,
  onVolver,
}: {
  curso: string;
  temas: TemaVista[];
  nivel: NivelVista;
  aviso: Aviso | null;
  ocupado: boolean;
  onElegir: (clave: string) => void;
  onOtroTema: (texto: string) => void;
  onVolver: () => void;
}) {
  const [otro, setOtro] = useState(false);
  const [texto, setTexto] = useState("");
  const ordenados = [...temas].sort((a, b) => Number(b.recomendado) - Number(a.recomendado));
  const primaria = nivel === "primaria";

  return (
    <section aria-labelledby="paso-tema" className={`flex flex-col gap-4 ${ENTRADA_PASO}`}>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onVolver} aria-label="Volver a los cursos" disabled={ocupado}>
          <ArrowLeft strokeWidth={2} aria-hidden />
        </Button>
        <TituloPaso id="paso-tema">¿Qué tema de {curso}?</TituloPaso>
      </div>

      {ordenados.length === 0 && <VozNudito>Aún no tengo temas listos para este curso. Prueba con «Otro tema».</VozNudito>}

      <ul className={`grid gap-3 ${primaria ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {ordenados.map((t) => (
          <li key={t.clave}>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => onElegir(t.clave)}
              className={`flex w-full flex-col gap-2 rounded-[var(--radio-lg)] border bg-superficie text-left shadow-sm outline-none transition-[transform,box-shadow] duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 motion-safe:hover:-translate-y-0.5 ${t.recomendado ? "border-maiz" : "border-border"} ${primaria ? "min-h-20 p-4" : "min-h-14 p-3"}`}
            >
              <span className="flex flex-wrap items-center gap-2">
                {t.recomendado && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-maiz/25 px-2 py-0.5 text-etiqueta text-tinta">
                    <Star className="size-3.5" strokeWidth={2} aria-hidden />
                    Recomendado
                  </span>
                )}
                <EtiquetaEstado estado={t.estado} />
              </span>
              <span className={`font-titulo font-semibold ${primaria ? "text-lg" : "text-cuerpo"}`}>{t.nombre}</span>
              {t.subtema && <span className="text-cuerpo-sm text-muted-foreground">{t.subtema}</span>}
            </button>
          </li>
        ))}
        <li>
          {otro ? (
            <form
              className="flex flex-col gap-2 rounded-[var(--radio-lg)] border border-dashed border-input bg-superficie p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (texto.trim().length >= 2) onOtroTema(texto.trim());
              }}
            >
              <label htmlFor="otro-tema" className="text-etiqueta">
                ¿Qué tema quieres practicar?
              </label>
              <div className="flex gap-2">
                <input
                  id="otro-tema"
                  autoFocus
                  value={texto}
                  maxLength={200}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Por ejemplo: fracciones"
                  className="h-11 min-w-0 flex-1 rounded-[var(--radio-md)] border border-input bg-background px-3 text-cuerpo outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="icon-lg" disabled={ocupado || texto.trim().length < 2} aria-label="Buscar tema">
                  <Send strokeWidth={2} aria-hidden />
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setOtro(true)}
              disabled={ocupado}
              className="flex min-h-14 w-full items-center gap-2 rounded-[var(--radio-lg)] border border-dashed border-input bg-transparent p-3 text-left font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PencilLine className="size-5" strokeWidth={2} aria-hidden />
              Otro tema
            </button>
          )}
        </li>
      </ul>

      {aviso && (
        <div className={`flex flex-col gap-3 ${ENTRADA_PASO}`}>
          <VozNudito>{textoDe(aviso)}</VozNudito>
          {opcionesDe(aviso).length > 0 && (
            <div className="flex flex-wrap gap-2 pl-14">
              {opcionesDe(aviso).map((t) => (
                <Button key={t.clave} variant="outline" className="min-h-11" disabled={ocupado} onClick={() => onElegir(t.clave)}>
                  {t.nombre}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
