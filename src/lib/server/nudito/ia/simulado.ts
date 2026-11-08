import "server-only";
import type { ConsumoIA, EvaluacionRubricaIA, Explicacion, LecturaImagen, MensajeTutorIA, PistaIA, ProveedorTutorIA, Rubrica, SalidaIA, Tema } from "@/lib/nudito/contratos";
import { estimarTokens, responderFalso } from "../../nudito-plus/proveedor-falso";
import { normalizar } from "../../nudito-plus/seguridad";
import { muestrasDelTema } from "../lecciones/muestras";
import type { Leccion } from "@/lib/nudito/leccion";

// Proveedor de IA SIMULADO del tutor (specs/41): local, determinista, sin red ni claves. Amplía el proveedor falso de
// Nudito+ (`responder`) con las operaciones estructuradas. Todo lo que devuelve sale de textos REVISADOS (repaso y
// pistas del catálogo/generador) o de heurísticas simples; por eso cada consumo queda con `simulado = true`.

export type OpcionesSimulado = {
  /** Solo pruebas: transcripción fija para `interpretarImagen` (si no, siempre «no se lee»). */
  transcripcionFija?: string;
};

function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h >>> 0;
}

const INTROS = [
  "Te lo explico de otra forma.",
  "Vamos paso a paso.",
  "Miremos la idea con calma.",
  "Piensa en esto:",
] as const;

const consumo = (entrada: string, salida: string): ConsumoIA => ({
  proveedor: "simulado", modelo: null, tokensEntrada: estimarTokens(entrada), tokensSalida: estimarTokens(salida), latenciaMs: 0, cache: false, simulado: true,
});

function recortar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1).trimEnd()}…`;
}

/** Explicación determinista: el repaso revisado con una entrada distinta según el tema y la duda. */
export function explicarSimulado(tema: Pick<Tema, "nombre" | "repaso">, duda?: string): Explicacion {
  const intro = INTROS[hash(`${tema.nombre}|${duda ?? ""}`) % INTROS.length];
  const foco = duda ? ` Sobre lo que preguntas: empecemos por la idea principal de «${tema.nombre}».` : "";
  const error = tema.repaso.errorFrecuente ? ` Ojo con un error común: ${tema.repaso.errorFrecuente}` : "";
  return { texto: recortar(`${intro}${foco} ${tema.repaso.idea}${error}`, 900), ejemplo: recortar(tema.repaso.ejemplo, 400) };
}

/** Rúbrica simulada mínima (confianza baja): B la reemplaza con `evaluarRubricaSimulada`. */
export function rubricaSimuladaIA(texto: string, rubrica: Rubrica): EvaluacionRubricaIA {
  const t = normalizar(texto);
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  const conectores = (t.match(/ (porque|ademas|por eso|sin embargo|tambien|entonces|finalmente|por ejemplo) /g) ?? []).length;
  const base = palabras >= 60 ? 2 : palabras >= 25 ? 1 : 0;
  const criterios = rubrica.criterios.map((c, i) => {
    const nivel = Math.max(0, Math.min(3, base + (i === rubrica.criterios.length - 1 ? Math.min(1, conectores) : conectores > 0 ? 1 : 0))) as 0 | 1 | 2 | 3;
    return { id: c.id, nivel, comentario: recortar(c.niveles[nivel], 300) };
  });
  return {
    criterios,
    retroGeneral: palabras < 25 ? "Buen comienzo. Escribe un poco más y explica tus razones." : "Tu texto se entiende. Revisa que cada idea tenga su razón y únelas con conectores.",
    confianza: 0.4,
  };
}

export class ProveedorTutorSimulado implements ProveedorTutorIA {
  readonly nombre = "simulado";
  readonly simulado = true;
  constructor(private readonly opciones: OpcionesSimulado = {}) {}

  async responder({ sistema, mensajes }: { sistema: string; mensajes: MensajeTutorIA[] }) {
    const texto = responderFalso(sistema, mensajes);
    const entrada = sistema.length + mensajes.reduce((n, m) => n + m.texto.length, 0);
    return { texto, tokensEntrada: Math.ceil(entrada / 4), tokensSalida: estimarTokens(texto) };
  }

  async explicar(entrada: { tema: Pick<Tema, "nombre" | "repaso" | "grado" | "nivel">; duda?: string }): Promise<SalidaIA<Explicacion>> {
    const datos = explicarSimulado(entrada.tema, entrada.duda);
    return { datos, consumo: consumo(JSON.stringify(entrada), datos.texto) };
  }

  /** Devuelve la pista REVISADA del nivel pedido (nunca inventa: no puede revelar más que ella). */
  async pista(entrada: { nivel: 1 | 2 | 3; pistaBase: string }): Promise<SalidaIA<PistaIA>> {
    const prefijo = entrada.nivel === 1 ? "Una ayudita:" : entrada.nivel === 2 ? "Otra pista:" : "Última pista:";
    const datos = { texto: recortar(`${prefijo} ${entrada.pistaBase}`, 400), revelaRespuesta: false };
    return { datos, consumo: consumo(entrada.pistaBase, datos.texto) };
  }

  async retroalimentarAbierta(entrada: { consigna: string; texto: string; rubrica: Rubrica }): Promise<SalidaIA<EvaluacionRubricaIA>> {
    const datos = rubricaSimuladaIA(entrada.texto, entrada.rubrica);
    return { datos, consumo: consumo(entrada.consigna + entrada.texto, datos.retroGeneral) };
  }

  async interpretarImagen(entrada: { mime: string; bytes: Uint8Array }): Promise<SalidaIA<LecturaImagen>> {
    const fija = this.opciones.transcripcionFija;
    const datos: LecturaImagen = fija
      ? { transcripcion: fija, contieneRostro: false, legible: true, confianza: 0.9 }
      : { transcripcion: "", contieneRostro: false, legible: false, confianza: 0 };
    return { datos, consumo: { ...consumo("", datos.transcripcion), tokensEntrada: Math.ceil(entrada.bytes.length / 1000) } };
  }

  async generarLeccion(entrada: { tema: Tema; grado: number; nivel: Tema["nivel"] }): Promise<SalidaIA<Leccion>> {
    const t = entrada.tema;
    const datos: Leccion = {
      titulo: t.nombre, idea: recortar(t.repaso.idea, 400), explicacion: recortar(t.repaso.idea, 1500),
      ejemplos: [{ enunciado: t.nombre, desarrollo: t.repaso.ejemplo }],
      recursos: [], ejerciciosMuestra: muestrasDelTema(t),
    };
    return { datos, consumo: consumo(JSON.stringify({ tema: t.clave, grado: entrada.grado, nivel: entrada.nivel }), JSON.stringify(datos)) };
  }

  async sugerirTemas(entrada: { texto: string; candidatos: { clave: string; nombre: string }[] }): Promise<SalidaIA<{ claves: string[] }>> {
    const t = normalizar(entrada.texto);
    const claves = entrada.candidatos.filter((c) => normalizar(c.nombre).trim().split(" ").some((p) => p.length > 3 && t.includes(` ${p} `))).slice(0, 3).map((c) => c.clave);
    return { datos: { claves }, consumo: consumo(entrada.texto, claves.join(",")) };
  }
}
