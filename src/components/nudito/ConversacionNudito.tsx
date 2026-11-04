"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Flag, Lightbulb, MessageCircleQuestion, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  elegirCursoAction,
  elegirTemaAction,
  finalizarAction,
  iniciarSesionAction,
  pedirPistaAction,
  pedirRepasoAction,
  preguntarAction,
  responderAction,
  siguienteEjercicioAction,
  type ResultadoNudito,
} from "@/app/colegio/[slug]/nudito/actions";
import type { CursoNuditoVista, Respuesta, ResultadosSesion, SalidaApi, TemaVista, ValidacionTema } from "@/lib/nudito/contratos";
import { Bienvenida } from "./Bienvenida";
import { EntradaRespuesta } from "./EntradaRespuesta";
import { NuditoMascota } from "./NuditoMascota";
import { Pista } from "./Pista";
import { ESTILOS_TUTOR, type NivelVista } from "./piezas";
import { Repaso } from "./Repaso";
import { Resultados } from "./Resultados";
import { Retro } from "./Retro";
import { SelectorCurso } from "./SelectorCurso";
import { SelectorTema } from "./SelectorTema";
import { TarjetaEjercicio } from "./TarjetaEjercicio";

type Paso = "bienvenida" | "curso" | "tema" | "repaso" | "practica" | "resultados";
type EjercicioActual = Exclude<SalidaApi<"siguienteEjercicio">, { fin: true }>;
type AvisoTema = Exclude<ValidacionTema, { tipo: "permitido" }>;
type Mensaje = { autor: "alumno" | "nudito"; texto: string };

/**
 * Flujo conversacional del tutor (specs/41): bienvenida → curso → tema → repaso → práctica → resultados.
 * Solo llama a las server actions; la solución y las pistas viven en el servidor.
 */
export function ConversacionNudito({ alumnoId, nivel, inicial }: { alumnoId: string | null; nivel: NivelVista; inicial: SalidaApi<"iniciarSesion"> }) {
  const [paso, setPaso] = useState<Paso>("bienvenida");
  const [sesionId, setSesionId] = useState(inicial.sesionId);
  const [cursos, setCursos] = useState<CursoNuditoVista[]>(inicial.cursos);
  const [curso, setCurso] = useState<CursoNuditoVista | null>(null);
  const [temas, setTemas] = useState<TemaVista[]>([]);
  const [aviso, setAviso] = useState<AvisoTema | null>(null);
  const [tema, setTema] = useState("");
  const [repaso, setRepaso] = useState<SalidaApi<"pedirRepaso"> | null>(null);
  const [ejercicio, setEjercicio] = useState<EjercicioActual | null>(null);
  const [retro, setRetro] = useState<SalidaApi<"responder"> | null>(null);
  const [pistas, setPistas] = useState<SalidaApi<"pedirPista">[]>([]);
  const [resultados, setResultados] = useState<ResultadosSesion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [chatAbierto, setChatAbierto] = useState(false);
  const [chat, setChat] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState("");
  const inicioEjercicio = useRef(0);
  const ultimoPaso = useRef<string>("");

  // Foco al título del paso nuevo (teclado y lectores de pantalla).
  const clavePaso = paso === "practica" ? `practica-${ejercicio?.ejercicioId ?? ""}` : paso;
  useEffect(() => {
    if (ultimoPaso.current === clavePaso) return;
    const primero = ultimoPaso.current === "";
    ultimoPaso.current = clavePaso;
    if (primero) return;
    const id = paso === "practica" ? "paso-ejercicio" : `paso-${paso}`;
    document.getElementById(id)?.focus();
  }, [clavePaso, paso]);

  async function llamar<T>(fn: () => Promise<ResultadoNudito<T>>): Promise<T | null> {
    setOcupado(true);
    setError("");
    try {
      const r = await fn();
      if (!r.ok) {
        setError(r.error);
        return null;
      }
      return r.datos;
    } catch {
      setError("Algo no salió bien. Inténtalo de nuevo en un momento.");
      return null;
    } finally {
      setOcupado(false);
    }
  }

  function mostrarEjercicio(e: EjercicioActual) {
    setEjercicio(e);
    setRetro(null);
    setPistas([]);
    inicioEjercicio.current = Date.now();
    setPaso("practica");
  }

  async function siguiente(id = sesionId) {
    const r = await llamar(() => siguienteEjercicioAction({ alumnoId, sesionId: id }));
    if (!r) return;
    if ("fin" in r) await terminar(id);
    else mostrarEjercicio(r);
  }

  async function terminar(id = sesionId) {
    const r = await llamar(() => finalizarAction({ alumnoId, sesionId: id }));
    if (r) {
      setResultados(r);
      setChatAbierto(false);
      setPaso("resultados");
    }
  }

  async function reanudar() {
    if (!inicial.reanudable) return;
    setSesionId(inicial.reanudable.sesionId);
    setTema(inicial.reanudable.tema);
    await siguiente(inicial.reanudable.sesionId);
  }

  async function elegirCurso(c: CursoNuditoVista) {
    const r = await llamar(() => elegirCursoAction({ alumnoId, sesionId, cursoId: c.cursoId }));
    if (!r) return;
    setCurso(c);
    setTemas(r.temas);
    setAviso(null);
    setPaso("tema");
  }

  async function validarTema(entrada: { temaClave: string } | { textoLibre: string }) {
    const v = await llamar(() => elegirTemaAction({ alumnoId, sesionId, ...entrada }));
    if (!v) return;
    if (v.tipo !== "permitido") {
      setAviso(v);
      return;
    }
    setTema(v.tema.nombre);
    setAviso(null);
    const r = await llamar(() => pedirRepasoAction({ alumnoId, sesionId }));
    if (r) {
      setRepaso(r);
      setPaso("repaso");
    }
  }

  async function otraVez() {
    const r = await llamar(() => pedirRepasoAction({ alumnoId, sesionId, otraVez: true }));
    if (r) setRepaso(r);
  }

  async function responder(respuesta: Respuesta) {
    if (!ejercicio) return;
    const tiempoMs = Math.min(3_600_000, Math.max(0, Date.now() - inicioEjercicio.current));
    const r = await llamar(() => responderAction({ alumnoId, ejercicioId: ejercicio.ejercicioId, respuesta, tiempoMs }));
    if (r) setRetro(r);
  }

  async function pista() {
    if (!ejercicio) return;
    const r = await llamar(() => pedirPistaAction({ alumnoId, ejercicioId: ejercicio.ejercicioId }));
    if (r) setPistas((p) => [...p, r]);
  }

  async function preguntar(e: FormEvent) {
    e.preventDefault();
    const texto = pregunta.trim();
    if (!texto) return;
    setChat((c) => [...c, { autor: "alumno", texto }]);
    setPregunta("");
    const r = await llamar(() => preguntarAction({ alumnoId, sesionId, texto }));
    if (r) setChat((c) => [...c, { autor: "nudito", texto: r.texto }]);
  }

  async function nuevoTema() {
    const r = await llamar(() => iniciarSesionAction({ alumnoId }));
    if (!r) return;
    setSesionId(r.sesionId);
    setCursos(r.cursos);
    setResultados(null);
    setEjercicio(null);
    setRepaso(null);
    setChat([]);
    setPaso("curso");
  }

  const quedanPistas = pistas.length === 0 ? 3 : pistas[pistas.length - 1].quedan;
  const respondido = retro !== null;
  const mostrarPreguntar = paso === "repaso" || paso === "practica";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-8">
      <style>{ESTILOS_TUTOR}</style>

      {/* Estado y errores: se anuncian a lectores de pantalla. */}
      <div aria-live="polite" role="status" className="min-h-0 empty:hidden">
        {ocupado && (
          <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground">
            <NuditoMascota tamano={28} estado="pensando" variante="avatar" />
            Nudito está pensando…
          </p>
        )}
        {error && !ocupado && <p className="rounded-[var(--radio-md)] bg-tarde-fondo px-3 py-2 text-cuerpo-sm text-tarde">{error}</p>}
      </div>

      {paso === "bienvenida" && (
        <Bienvenida
          nombre={inicial.bienvenida.nombre}
          mensaje={inicial.bienvenida.mensaje}
          nivel={nivel}
          reanudable={inicial.reanudable}
          ocupado={ocupado}
          onEmpezar={() => setPaso("curso")}
          onReanudar={reanudar}
        />
      )}

      {paso === "curso" && <SelectorCurso cursos={cursos} nivel={nivel} ocupado={ocupado} onElegir={elegirCurso} />}

      {paso === "tema" && curso && (
        <SelectorTema
          curso={curso.nombre}
          temas={temas}
          nivel={nivel}
          aviso={aviso}
          ocupado={ocupado}
          onElegir={(temaClave) => validarTema({ temaClave })}
          onOtroTema={(textoLibre) => validarTema({ textoLibre })}
          onVolver={() => setPaso("curso")}
        />
      )}

      {paso === "repaso" && repaso && (
        <Repaso tema={tema} idea={repaso.idea} ejemplo={repaso.ejemplo} explicacionIa={repaso.explicacionIa} ocupado={ocupado} onOtraVez={otraVez} onPracticar={() => siguiente()} />
      )}

      {paso === "practica" && ejercicio && (
        <TarjetaEjercicio ejercicio={ejercicio.ejercicio} numero={ejercicio.numero} total={ejercicio.total} comprobacion={ejercicio.comprobacion}>
          <EntradaRespuesta key={ejercicio.ejercicioId} ejercicio={ejercicio.ejercicio} deshabilitado={respondido} ocupado={ocupado} onEnviar={responder} />
          {pistas.map((p) => (
            <Pista key={p.nivel} nivel={p.nivel} texto={p.texto} quedan={p.quedan} />
          ))}
          {retro && <Retro evaluacion={retro.evaluacion} cambioDominio={retro.cambioDominio} />}
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap">
            {retro?.puedeReintentar && retro.evaluacion.resultado !== "correcto" && (
              <Button size="lg" className="min-h-11" onClick={() => setRetro(null)} disabled={ocupado}>
                <RotateCcw strokeWidth={2} aria-hidden />
                Intentar otra vez
              </Button>
            )}
            {retro && (
              <Button size="lg" variant={retro.puedeReintentar && retro.evaluacion.resultado !== "correcto" ? "outline" : "default"} className="min-h-11" onClick={() => siguiente()} disabled={ocupado}>
                Siguiente
                <ArrowRight strokeWidth={2} aria-hidden />
              </Button>
            )}
            {!respondido && !ejercicio.comprobacion && quedanPistas > 0 && (
              <Button size="lg" variant="outline" className="min-h-11" onClick={pista} disabled={ocupado}>
                <Lightbulb strokeWidth={2} aria-hidden />
                Dame una pista
              </Button>
            )}
            <Button size="lg" variant="ghost" className="min-h-11" onClick={() => terminar()} disabled={ocupado}>
              <Flag strokeWidth={2} aria-hidden />
              Terminar
            </Button>
          </div>
        </TarjetaEjercicio>
      )}

      {paso === "resultados" && resultados && <Resultados resultados={resultados} onOtroTema={nuevoTema} />}

      {mostrarPreguntar && (
        <div className="flex flex-col gap-3">
          {!chatAbierto ? (
            <Button variant="outline" size="lg" className="min-h-11 self-start" onClick={() => setChatAbierto(true)}>
              <MessageCircleQuestion strokeWidth={2} aria-hidden />
              Tengo una pregunta
            </Button>
          ) : (
            <section aria-labelledby="titulo-pregunta" className="flex flex-col gap-3 rounded-[var(--radio-lg)] border border-border bg-superficie-2 p-3 motion-safe:animate-[nd-entra_320ms_ease-out_both]">
              <div className="flex items-center justify-between">
                <h3 id="titulo-pregunta" className="font-titulo font-semibold">
                  Pregúntale a Nudito
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setChatAbierto(false)} aria-label="Cerrar preguntas">
                  <X strokeWidth={2} aria-hidden />
                </Button>
              </div>
              <ul className="flex flex-col gap-2" aria-live="polite">
                {chat.map((m, i) => (
                  <li
                    key={i}
                    className={
                      m.autor === "alumno"
                        ? "max-w-[85%] self-end rounded-2xl rounded-br-sm bg-indigo px-3 py-2 text-cuerpo text-white"
                        : "max-w-[85%] self-start rounded-2xl rounded-bl-sm border border-cochinilla/20 bg-superficie px-3 py-2 font-nudito text-voz-nudito whitespace-pre-line"
                    }
                  >
                    {m.texto}
                  </li>
                ))}
              </ul>
              <form onSubmit={preguntar} className="flex gap-2">
                <label htmlFor="pregunta-nudito" className="sr-only">
                  Tu pregunta
                </label>
                <input
                  id="pregunta-nudito"
                  autoFocus
                  value={pregunta}
                  maxLength={800}
                  onChange={(e) => setPregunta(e.target.value)}
                  placeholder="Escribe tu duda sobre el tema"
                  className="h-11 min-w-0 flex-1 rounded-[var(--radio-md)] border border-input bg-background px-3 text-cuerpo outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="icon-lg" disabled={ocupado || !pregunta.trim()} aria-label="Enviar pregunta">
                  <Send strokeWidth={2} aria-hidden />
                </Button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
