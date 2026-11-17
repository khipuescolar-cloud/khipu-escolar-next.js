"use client";

import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, CircleHelp, ImageIcon, Lightbulb, MessageCircleQuestion, Pause, Play, Square, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ENTRADA_PASO, TituloPaso, VozNudito } from "./piezas";
import { TextoAnimado } from "./TextoAnimado";
import { narracionAccesibleDeComprobacion, narracionAccesibleDeMomento, partirEnFrases, sinAperturaRedundante, type ClaseGuiadaPublica } from "@/lib/nudito/conocimiento/clase-guiada";

type RecursoRepaso = { tipo: "svg" | "diagrama" | "enlace"; titulo: string; valor: string; descripcion?: string };
type Comprobacion = ClaseGuiadaPublica["comprobacion"];
type Pantalla = {
  id: string; etiqueta: string; titulo: string; narracion: string; tipo: "idea" | "recurso" | "ejemplo" | "paso" | "comprobacion";
  recurso?: RecursoRepaso; texto?: string; ejemplo?: { seccion: "situacion" | "desarrollo" | "clave"; texto: string };
  ilustracion?: { src: string; alt: string; descripcion?: string };
};

function FiguraExplicativa({ id, ilustracion }: { id: string; ilustracion: NonNullable<Pantalla["ilustracion"]> }) {
  const descripcionId = `${id}-descripcion-imagen`;
  return <figure className="overflow-hidden rounded-[var(--radio-md)] border border-borde-sutil bg-superficie-2">
    <Image src={ilustracion.src} alt="" aria-describedby={descripcionId} width={1024} height={768} className="h-auto w-full bg-superficie object-contain" />
    <figcaption id={descripcionId} className="border-t border-borde-sutil p-3 text-cuerpo">
      <p className="flex items-center gap-2 font-semibold"><ImageIcon className="size-5 shrink-0" strokeWidth={2} aria-hidden />Lo que muestra la imagen</p>
      <p className="mt-1 leading-relaxed">{ilustracion.descripcion ?? ilustracion.alt}</p>
    </figcaption>
  </figure>;
}

function quitarPrefijo(texto: string, prefijo: string) { return texto.replace(new RegExp(`^${prefijo}:\\s*`), ""); }

/** Una lección breve, controlada por el alumno y narrada con la voz disponible en su navegador. */
export function Repaso({ tema, idea, ejemplo, explicacion, recursos, explicacionIa, ocupado, onOtraVez, onPracticar, comprobacion, claseGuiada, onComprobar }: {
  tema: string; idea: string; ejemplo: string; explicacion: string; recursos: RecursoRepaso[]; explicacionIa?: string; ocupado: boolean;
  onOtraVez: () => void; onPracticar: () => void; comprobacion?: Comprobacion; claseGuiada?: ClaseGuiadaPublica | null; onComprobar?: (opcionId: string) => Promise<{ correcto: boolean; mensaje: string } | null>;
}) {
  const [indice, setIndice] = useState(0);
  const [opcionElegida, setOpcionElegida] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ correcto: boolean; mensaje: string } | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [reproduccionActiva, setReproduccionActiva] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [palabrasMostradas, setPalabrasMostradas] = useState(0);
  const [narracionNoDisponible, setNarracionNoDisponible] = useState(false);
  const lecturaActual = useRef<SpeechSynthesisUtterance | null>(null);
  const cicloLectura = useRef(0);
  const indiceActual = useRef(0);
  const reproduccionActual = useRef(false);
  const pausaActual = useRef(false);
  const pantallas = useMemo<Pantalla[]>(() => {
    if (claseGuiada) {
      const recursos = new Map(claseGuiada.recursos.map(r => [r.id, r]));
      const momentos: Pantalla[] = claseGuiada.momentos.map((momento, i) => {
        const recurso = momento.recursoRef ? recursos.get(momento.recursoRef) : undefined;
        return { id: momento.id, etiqueta: `Momento ${i + 1}`, titulo: momento.titulo, narracion: narracionAccesibleDeMomento(momento, recurso?.descripcion), tipo: momento.tipo, texto: momento.narracion,
          ...(momento.tipo === "ejemplo" ? { ejemplo: { seccion: "desarrollo" as const, texto: momento.narracion } } : {}),
          ...(recurso ? { ilustracion: { src: recurso.src, alt: recurso.alt, descripcion: recurso.descripcion } } : {}) };
      });
      momentos.push({ id: "comprobacion", etiqueta: "Comprobemos lo aprendido", titulo: "Comprobemos lo aprendido", narracion: narracionAccesibleDeComprobacion(claseGuiada.comprobacion), tipo: "comprobacion" });
      return momentos;
    }
    const ejemplos = ejemplo.split(/\n\s*\n/).map(bloque => bloque.split("\n").filter(Boolean));
    const resultado: Pantalla[] = [{ id: "idea", etiqueta: "Idea central", titulo: "La idea principal", narracion: idea, tipo: "idea", texto: idea }];
    recursos.forEach((recurso, i) => {
      const descripcion = recurso.descripcion ?? `Observa ${recurso.titulo}.`;
      resultado.push({ id: `recurso-${i}`, etiqueta: "Miremos el diagrama", titulo: recurso.titulo, narracion: descripcion, tipo: "recurso", recurso });
    });
    ejemplos.forEach((lineas, numero) => {
      const partes: { seccion: "situacion" | "desarrollo" | "clave"; titulo: string; texto: string }[] = [
        { seccion: "situacion", titulo: "Observa esta situación", texto: quitarPrefijo(lineas[0] ?? "", "Situación") },
        { seccion: "desarrollo", titulo: "¿Qué ocurre?", texto: lineas.slice(1).find(linea => !linea.startsWith("Idea clave:")) ?? "" },
        { seccion: "clave", titulo: "La idea que debemos recordar", texto: quitarPrefijo(lineas.find(linea => linea.startsWith("Idea clave:")) ?? "", "Idea clave") },
      ];
      partes.filter(parte => parte.texto).forEach((parte) => resultado.push({
        id: `ejemplo-${numero}-${parte.seccion}`,
        etiqueta: `Ejemplo ${numero + 1} de ${ejemplos.length}`,
        titulo: parte.titulo,
        narracion: parte.texto,
        tipo: "ejemplo",
        ejemplo: { seccion: parte.seccion, texto: parte.texto },
      }));
    });
    explicacion.split("\n").filter(Boolean).forEach((paso, numero, pasos) => resultado.push({ id: `paso-${numero}`, etiqueta: `Paso ${numero + 1} de ${pasos.length}`, titulo: "Probemos esta forma de pensar", narracion: paso, tipo: "paso", texto: paso }));
    if (comprobacion) {
      const alternativas = comprobacion.opciones.map((opcion, posicion) => `Opción ${posicion + 1}. ${opcion.texto}`).join(" ");
      resultado.push({ id: "comprobacion", etiqueta: "Comprobemos lo aprendido", titulo: "Comprobemos lo aprendido", narracion: `Ahora comprobemos lo aprendido. ${comprobacion.pregunta} ${alternativas}`, tipo: "comprobacion" });
    }
    return resultado;
  }, [claseGuiada, comprobacion, ejemplo, explicacion, idea, recursos]);
  const pantalla = pantallas[indice] ?? pantallas[0];
  const ultimoMomento = indice === pantallas.length - 1;
  const comprobacionCorrecta = resultado?.correcto === true;
  const totalMomentos = pantallas.length;
  const textoVisibleCompleto = pantalla.texto ?? pantalla.narracion;
  const palabras = textoVisibleCompleto.match(/\S+\s*/gu) ?? [textoVisibleCompleto];
  const textoEnPantalla = reproduccionActiva ? palabras.slice(0, palabrasMostradas).join("") : textoVisibleCompleto;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => { indiceActual.current = indice; }, [indice]);
  useEffect(() => { reproduccionActual.current = reproduccionActiva; }, [reproduccionActiva]);
  useEffect(() => { pausaActual.current = pausado; }, [pausado]);
  useEffect(() => {
    if (!reproduccionActiva || pausado || palabrasMostradas >= palabras.length) return;
    const temporizador = window.setTimeout(() => setPalabrasMostradas(actual => actual + 1), 360);
    return () => window.clearTimeout(temporizador);
  }, [palabras.length, palabrasMostradas, pausado, reproduccionActiva]);

  function detenerLectura() {
    cicloLectura.current += 1;
    window.speechSynthesis?.cancel();
    lecturaActual.current = null;
    setLeyendo(false);
  }

  function detenerClase() {
    detenerLectura();
    setReproduccionActiva(false);
    setPausado(false);
  }

  function irA(siguiente: number, reproducir = reproduccionActual.current && !pausaActual.current) {
    detenerLectura();
    setIndice(siguiente);
    setPalabrasMostradas(0);
    const pantallaSiguiente = pantallas[siguiente];
    if (reproducir && pantallaSiguiente?.narracion) leer(pantallaSiguiente.narracion, siguiente);
  }

  function iniciarClase() {
    setReproduccionActiva(true);
    setPausado(false);
    setPalabrasMostradas(0);
    leer(pantalla.narracion, indice);
  }

  function alternarPausa() {
    if (!reproduccionActual.current) { iniciarClase(); return; }
    if (pausaActual.current) {
      window.speechSynthesis.resume();
      setPausado(false);
      return;
    }
    window.speechSynthesis.pause();
    setPausado(true);
  }

  function leerFragmento(fragmentos: string[], posicion: number, ciclo: number, pantallaNarrada: number) {
    if (ciclo !== cicloLectura.current) return;
    const texto = fragmentos[posicion]?.trim();
    if (!texto) { setLeyendo(false); return; }
    const mensaje = new SpeechSynthesisUtterance(texto);
    const esPregunta = /[?¿]$/.test(texto);
    const esCierre = /[.!]$/.test(texto) && !esPregunta;
    mensaje.lang = "es-PE";
    mensaje.rate = esPregunta ? 0.95 : 0.88;
    mensaje.pitch = esPregunta ? 1.14 : esCierre ? 0.98 : 1.05;
    mensaje.onend = () => {
      if (ciclo !== cicloLectura.current) return;
      if (posicion + 1 < fragmentos.length) {
        leerFragmento(fragmentos, posicion + 1, ciclo, pantallaNarrada);
        return;
      }
      setLeyendo(false);
      const pantallaTerminada = pantallas[pantallaNarrada];
      setPalabrasMostradas(((pantallaTerminada?.texto ?? pantallaTerminada?.narracion ?? "").match(/\S+\s*/gu) ?? []).length);
      if (pantallaNarrada < pantallas.length - 1 && reproduccionActual.current && !pausaActual.current) {
        window.setTimeout(() => {
          if (ciclo === cicloLectura.current && indiceActual.current === pantallaNarrada) irA(pantallaNarrada + 1);
        }, 650);
      } else if (pantallaNarrada === pantallas.length - 1) {
        setReproduccionActiva(false);
      }
    };
    mensaje.onerror = () => { if (ciclo === cicloLectura.current) setLeyendo(false); };
    lecturaActual.current = mensaje;
    window.speechSynthesis.speak(mensaje);
  }

  function leer(texto = pantalla.narracion, pantallaNarrada = indiceActual.current) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setNarracionNoDisponible(true);
      return;
    }
    setNarracionNoDisponible(false);
    detenerLectura();
    const ciclo = cicloLectura.current;
    const fragmentos = partirEnFrases(texto);
    setReproduccionActiva(true);
    setPausado(false);
    setLeyendo(true);
    leerFragmento(fragmentos, 0, ciclo, pantallaNarrada);
  }

  return <section aria-labelledby="paso-repaso" className={`flex flex-col gap-4 ${ENTRADA_PASO}`}>
    <TituloPaso id="paso-repaso">Repasemos: {tema}</TituloPaso>
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-cuerpo-sm text-muted-foreground">Lección guiada · momento {indice + 1} de {totalMomentos}</p>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {indice > 0 && <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => irA(indice - 1)} disabled={ocupado}><ChevronLeft className="size-4" strokeWidth={2} aria-hidden />Anterior</Button>}
        {!ultimoMomento && <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => irA(indice + 1)} disabled={ocupado}>Siguiente<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Button>}
        <Button type="button" variant="outline" size="sm" className="min-h-11" aria-pressed={pausado} onClick={alternarPausa} disabled={ocupado}>
          {!reproduccionActiva || pausado ? <Play className="size-4" strokeWidth={2} aria-hidden /> : <Pause className="size-4" strokeWidth={2} aria-hidden />}
          {!reproduccionActiva ? "Iniciar clase" : pausado ? "Reanudar" : "Pausar"}
        </Button>
      </div>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuemin={1} aria-valuemax={totalMomentos} aria-valuenow={indice + 1} aria-label={`Avance: momento ${indice + 1} de ${totalMomentos}`}><div className="h-full rounded-full bg-maiz transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((indice + 1) / totalMomentos) * 100}%` }} /></div>
    {pantalla.tipo !== "comprobacion" && <article className="rounded-[var(--radio-lg)] border border-borde-sutil bg-superficie p-4 sm:p-5">
      <p className="mb-2 text-etiqueta font-semibold text-muted-foreground">{pantalla.etiqueta}</p>
      <h3 className="font-titulo text-xl font-semibold">{pantalla.titulo}</h3>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{`${pantalla.titulo}. ${textoVisibleCompleto}`}</p>
      {pantalla.tipo === "idea" && <div className="mt-3 grid gap-4"><VozNudito estado="saludo"><TextoAnimado texto={textoEnPantalla} delay={65} duration={0.55} distancia={3} animar incremental /></VozNudito>{pantalla.ilustracion && <FiguraExplicativa id={pantalla.id} ilustracion={pantalla.ilustracion} />}</div>}
      {pantalla.tipo === "recurso" && <div className="mt-3 grid gap-4">
        <div className="rounded-[var(--radio-md)] bg-superficie-2 p-4 font-nudito text-cuerpo leading-relaxed"><TextoAnimado texto={textoEnPantalla} delay={65} duration={0.55} distancia={3} animar incremental /></div>
        {pantalla.ilustracion ? <FiguraExplicativa id={pantalla.id} ilustracion={pantalla.ilustracion} /> : pantalla.recurso?.tipo === "enlace" ? <a href={pantalla.recurso.valor} target="_blank" rel="noopener noreferrer" className="underline">Abrir recurso</a> : pantalla.recurso?.tipo === "svg" ? <Image unoptimized src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(pantalla.recurso.valor)}`} alt={pantalla.recurso.descripcion ?? pantalla.recurso.titulo} width={500} height={300} className="h-auto w-full rounded-[var(--radio-md)] bg-superficie-2" /> : pantalla.recurso ? <pre className="overflow-x-auto whitespace-pre-wrap text-cuerpo-sm">{pantalla.recurso.valor}</pre> : null}
      </div>}
      {pantalla.tipo === "ejemplo" && pantalla.ejemplo && <div className="mt-3 grid gap-3">
        {pantalla.ilustracion && <FiguraExplicativa id={pantalla.id} ilustracion={pantalla.ilustracion} />}
        <div className="rounded-[var(--radio-md)] border border-maiz/40 bg-maiz/10 p-4 font-nudito text-cuerpo leading-relaxed">{pantalla.ejemplo.seccion === "situacion" && <Lightbulb className="mb-2 size-5" strokeWidth={2} aria-hidden />}{pantalla.ejemplo.seccion === "clave" && <Check className="mb-2 size-5" strokeWidth={2} aria-hidden />}<TextoAnimado texto={textoEnPantalla} delay={65} duration={0.55} distancia={3} animar incremental /></div>
      </div>}
      {pantalla.tipo === "paso" && <div className="mt-3 grid gap-4"><div className="flex gap-3 rounded-[var(--radio-md)] bg-superficie-2 p-4 font-nudito text-cuerpo leading-relaxed"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-maiz/25 font-semibold">{indice + 1 - pantallas.findIndex(p => p.tipo === "paso")}</span><p><TextoAnimado texto={textoEnPantalla} delay={65} duration={0.55} distancia={3} animar incremental /></p></div>{pantalla.ilustracion && <FiguraExplicativa id={pantalla.id} ilustracion={pantalla.ilustracion} />}</div>}
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Controles de narración">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => { setPalabrasMostradas(0); leer(); }} disabled={ocupado}><Volume2 className="size-4" strokeWidth={2} aria-hidden />{leyendo ? "Repetir desde el inicio" : "Escuchar esta parte"}</Button>
        {leyendo && <Button type="button" variant="ghost" className="min-h-11" onClick={detenerClase}><Square className="size-4" strokeWidth={2} aria-hidden />Detener audio</Button>}
        {narracionNoDisponible && <p role="status" className="self-center text-cuerpo-sm text-muted-foreground">Tu navegador no tiene narración por voz disponible.</p>}
      </div>
    </article>}
    {ultimoMomento && comprobacion && <fieldset className="grid gap-3 rounded-[var(--radio-lg)] border border-borde-sutil p-4"><legend className="px-1 font-semibold">Comprobemos lo aprendido</legend><p className="flex items-start gap-2 text-cuerpo"><CircleHelp className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden />{comprobacion.pregunta}</p><div className="grid gap-2">{comprobacion.opciones.map(opcion => <Button key={opcion.id} type="button" variant={opcionElegida === opcion.id ? "default" : "outline"} aria-pressed={opcionElegida === opcion.id} className="h-auto min-h-11 justify-start py-3 text-left leading-relaxed whitespace-normal" onClick={async () => { setOpcionElegida(opcion.id); setResultado(null); setResultado((onComprobar ? await onComprobar(opcion.id) : null) ?? { correcto: false, mensaje: "No pudimos comprobar tu respuesta. Inténtalo de nuevo." }); }}>{opcionElegida === opcion.id && <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden />}{opcion.texto}</Button>)}</div><Button type="button" variant="outline" className="min-h-11 justify-self-start" onClick={() => { setPalabrasMostradas(0); leer(pantalla.narracion, indice); }} disabled={ocupado}><Volume2 className="size-4" strokeWidth={2} aria-hidden />Escuchar pregunta y alternativas</Button>{opcionElegida && <p role="status" aria-live="polite" className="text-cuerpo-sm">{resultado ? <><span className="font-semibold">{resultado.correcto ? "¡Correcto!" : "Pista:"}</span> {resultado.correcto ? sinAperturaRedundante(resultado.mensaje) : resultado.mensaje}</> : "Comprobando…"}</p>}</fieldset>}
    {ultimoMomento && explicacionIa && <VozNudito>{explicacionIa}</VozNudito>}
    {ultimoMomento && <div className="flex flex-col gap-2 sm:flex-row"><Button size="lg" className="min-h-11" onClick={onPracticar} disabled={ocupado || (comprobacion !== undefined && !comprobacionCorrecta)}><Play strokeWidth={2} aria-hidden />¡A practicar!</Button><Button size="lg" variant="outline" className="min-h-11" onClick={onOtraVez} disabled={ocupado}><MessageCircleQuestion strokeWidth={2} aria-hidden />Explícame otra vez</Button></div>}
  </section>;
}
