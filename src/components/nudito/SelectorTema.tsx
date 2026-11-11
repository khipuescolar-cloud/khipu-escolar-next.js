"use client";

import { ArrowLeft, ChevronDown, Clock3, Star } from "lucide-react";
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

/** Temas del curso (recomendados primero) del plan publicado. */
export function SelectorTema({
  curso,
  temas,
  nivel,
  aviso,
  ocupado,
  onElegir,
  onVolver,
}: {
  curso: string;
  temas: TemaVista[];
  nivel: NivelVista;
  aviso: Aviso | null;
  ocupado: boolean;
  onElegir: (clave: string) => void;
  onVolver: () => void;
}) {
  const ordenados = temas;
  // Primero los de su grado (recomendados) y los que ya practica; el resto (grados anteriores) va plegado para no
  // abrumar con decenas de tarjetas, sobre todo en el celular.
  const principales = ordenados.filter((t) => t.recomendado || t.estado !== "no_iniciado");
  const otros = ordenados.filter((t) => !principales.includes(t));
  const primaria = nivel === "primaria";
  const lista = `grid gap-3 ${primaria ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`;
  const tarjeta = (t: TemaVista) => {
    const pronto = (t as TemaVista & { pronto?: boolean }).pronto === true;
    return (
    <li key={t.clave}>
      <button
        type="button"
        disabled={ocupado || pronto}
        onClick={() => onElegir(t.clave)}
        className={`flex w-full flex-col gap-2 rounded-[var(--radio-lg)] border bg-superficie text-left outline-none transition-[transform,border-color] duration-200 hover:border-sec-trazo focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 motion-safe:hover:-translate-y-0.5 ${t.recomendado ? "border-maiz" : "border-borde-sutil"} ${primaria ? "min-h-20 p-4" : "min-h-14 p-3"}`}
      >
        <span className="flex flex-wrap items-center gap-2">
          {t.recomendado && (
            <span className="inline-flex items-center gap-1 rounded-full bg-maiz/25 px-2 py-0.5 text-etiqueta text-tinta">
              <Star className="size-3.5" strokeWidth={2} aria-hidden />
              Recomendado
            </span>
          )}
          {pronto ? <span className="inline-flex items-center gap-1 rounded-full bg-superficie-2 px-2 py-0.5 text-etiqueta"><Clock3 className="size-3.5" strokeWidth={2} aria-hidden />Pronto</span> : <EtiquetaEstado estado={t.estado} />}
        </span>
        <span className={`font-titulo font-semibold ${primaria ? "text-lg" : "text-cuerpo"}`}>{t.nombre}</span>
        {t.subtema && <span className="text-cuerpo-sm text-muted-foreground">{t.subtema}</span>}
      </button>
    </li>
  );
  };

  return (
    <section aria-labelledby="paso-tema" className={`flex flex-col gap-4 ${ENTRADA_PASO}`}>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onVolver} aria-label="Volver a los cursos" disabled={ocupado}>
          <ArrowLeft strokeWidth={2} aria-hidden />
        </Button>
        <TituloPaso id="paso-tema">¿Qué tema de {curso}?</TituloPaso>
      </div>

      {ordenados.length === 0 && <VozNudito>Tu colegio está preparando los temas de este curso.</VozNudito>}

      <ul className={lista}>
        {principales.map(tarjeta)}
      </ul>

      {otros.length > 0 && (
        <details className="group flex flex-col gap-3 rounded-[var(--radio-lg)] border border-borde-sutil bg-superficie-2 p-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-[var(--radio-md)] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Más temas del plan ({otros.length})
            <ChevronDown className="size-5 transition-transform group-open:rotate-180 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
          </summary>
          <ul className={`${lista} mt-3`}>{otros.map(tarjeta)}</ul>
        </details>
      )}

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
