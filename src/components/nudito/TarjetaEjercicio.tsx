"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, ShieldCheck, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EjercicioPublico } from "@/lib/nudito/contratos";
import { ENTRADA_PASO, TituloPaso } from "./piezas";
import { TextoAnimado } from "./TextoAnimado";

function preguntaDelEjercicioVerdaderoFalso(ejercicio: Extract<EjercicioPublico, { tipo: "verdadero_falso" }>): string {
  return ejercicio.enunciado.trim();
}

function textoParaEscuchar(ejercicio: EjercicioPublico): string {
  const lectura = ejercicio.lectura ? `Escucha primero este texto. ${ejercicio.lectura}` : "";
  switch (ejercicio.tipo) {
    case "opcion_multiple":
      return `${lectura} Ahora escucha la pregunta. ${ejercicio.enunciado} Elige una alternativa. ${ejercicio.opciones.map((opcion, posicion) => `Opción ${posicion + 1}. ${opcion.texto}`).join(" ")}`;
    case "verdadero_falso":
      return `${lectura} ${preguntaDelEjercicioVerdaderoFalso(ejercicio)} ${ejercicio.afirmaciones.map((afirmacion, posicion) => `Afirmación ${posicion + 1}. ${afirmacion.texto}`).join(" ")} Para cada afirmación, elige Verdadero o Falso.`;
    case "lectura":
      return `${lectura} ${ejercicio.enunciado} ${ejercicio.preguntas.map((pregunta, posicion) => `Pregunta ${posicion + 1}. ${pregunta.enunciado}${pregunta.opciones ? ` ${pregunta.opciones.map((opcion, indice) => `Opción ${indice + 1}. ${opcion.texto}`).join(" ")}` : " Escribe tu respuesta."}`).join(" ")}`;
    case "relacionar":
      return `${lectura} ${ejercicio.enunciado} Relaciona cada elemento con una opción. ${ejercicio.izquierda.map((izquierda, posicion) => `Elemento ${posicion + 1}. ${izquierda.texto}`).join(" ")} Las opciones para relacionar son ${ejercicio.derecha.map((derecha, posicion) => `opción ${posicion + 1}. ${derecha.texto}`).join(" ")}`;
    case "escritura_rubrica":
      return `${lectura} ${ejercicio.enunciado} ${ejercicio.consigna} Escribe entre ${ejercicio.minPalabras} y ${ejercicio.maxPalabras} palabras.`;
    default:
      return `${lectura} ${ejercicio.enunciado} Escribe tu respuesta y luego presiona Comprobar.`;
  }
}

/** Tarjeta del ejercicio: progreso (3/5), comprobación y enunciado. El contenido (entrada, pista, retro) va dentro. */
export function TarjetaEjercicio({ ejercicio, numero, total, comprobacion, children }: { ejercicio: EjercicioPublico; numero: number; total: number; comprobacion: boolean; children: ReactNode }) {
  const [leyendo, setLeyendo] = useState(false);
  const mensajeActual = useRef<SpeechSynthesisUtterance | null>(null);
  const pct = Math.min(100, Math.round((numero / Math.max(1, total)) * 100));
  const textoPrincipal = ejercicio.tipo === "verdadero_falso"
    ? preguntaDelEjercicioVerdaderoFalso(ejercicio)
    : ejercicio.enunciado;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function detenerAudio() {
    window.speechSynthesis?.cancel();
    mensajeActual.current = null;
    setLeyendo(false);
  }

  function escucharEjercicio() {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    detenerAudio();
    const texto = textoParaEscuchar(ejercicio);
    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-PE";
    mensaje.rate = 0.9;
    mensaje.onend = () => setLeyendo(false);
    mensaje.onerror = () => setLeyendo(false);
    mensajeActual.current = mensaje;
    setLeyendo(true);
    window.speechSynthesis.speak(mensaje);
  }

  return (
    <section aria-labelledby="paso-ejercicio" className={`flex flex-col gap-4 rounded-[var(--radio-lg)] border border-borde-sutil bg-superficie p-4 sm:p-5 ${ENTRADA_PASO}`}>
      <div className="rounded-[var(--radio-md)] bg-superficie-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-etiqueta font-semibold text-muted-foreground">
            Ejercicio {numero} de {total}
          </span>
          {comprobacion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-turquesa/10 px-2 py-0.5 text-etiqueta text-turquesa">
              <ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />
              Comprobación
            </span>
          )}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-superficie" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={numero} aria-label={`Ejercicio ${numero} de ${total}`}>
          <div className="h-full rounded-full bg-turquesa transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {ejercicio.lectura && <div className="max-h-80 overflow-y-auto rounded-[var(--radio-md)] border border-borde-sutil bg-superficie-2 p-4 text-cuerpo-sm leading-6 whitespace-pre-line" aria-label="Texto de lectura">{ejercicio.lectura}</div>}
      <div className="rounded-[var(--radio-md)] border border-turquesa/35 bg-turquesa/10 p-4">
        <TituloPaso id="paso-ejercicio">
          <TextoAnimado texto={textoPrincipal} className="whitespace-pre-line" />
        </TituloPaso>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={escucharEjercicio}>
            {leyendo ? <Pause className="size-4" strokeWidth={2} aria-hidden /> : <Volume2 className="size-4" strokeWidth={2} aria-hidden />}
            {leyendo ? "Volver a escuchar" : "Escuchar ejercicio"}
          </Button>
          {leyendo && <Button type="button" variant="ghost" className="min-h-11" onClick={detenerAudio}><Square className="size-4" strokeWidth={2} aria-hidden />Detener</Button>}
        </div>
      </div>
      {ejercicio.imagenAlt && <p className="text-cuerpo-sm text-muted-foreground">Imagen: {ejercicio.imagenAlt}</p>}
      {children}
    </section>
  );
}
