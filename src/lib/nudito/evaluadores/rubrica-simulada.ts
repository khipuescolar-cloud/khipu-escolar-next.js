// Responsable: B (specs/43). Escritura con rúbrica.
//
// ⚠ SIMULADA: `evaluarRubricaSimulada` es una HEURÍSTICA, no una corrección. Solo mira señales superficiales y por eso
// SIEMPRE devuelve `incierto` (confianza baja) con `evaluadoPor: "rubrica_simulada"`: orienta al alumno, pero NO cuenta
// para el dominio. Señales por criterio de la rúbrica formativa (src/lib/nudito/rubricas/escritura.ts):
// - adecuación: extensión dentro de [minPalabras, maxPalabras] y palabras clave de la consigna que aparecen en el texto;
// - coherencia: número de oraciones y de párrafos;
// - conectores: conectores distintos de una lista cerrada («porque», «además», «sin embargo»…);
// - ortografía: mayúscula inicial en las oraciones y punto final (no revisa la ortografía de las palabras).
// Con un proveedor real, `evaluadorAbierto()` usa `ia.retroalimentarAbierta`, valida la salida con zod (un reintento) y
// también devuelve `incierto` si la confianza es menor que `CONFIANZA_MINIMA_IA`.
import {
  esquemaEvaluacionRubrica,
  type ConsumoIA,
  type EjercicioConSolucion,
  type EnvioRespuesta,
  type Evaluacion,
  type EvaluacionRubricaIA,
  type EvaluadorAbierto,
  type ProveedorTutorIA,
} from "../contratos";
import { evaluacion, normalizarFlexible, palabrasDeContenido, tipoEquivocado } from "./comun";

export const CONFIANZA_SIMULADA = 0.3;
export const CONFIANZA_MINIMA_IA = 0.6;

export const CONECTORES = [
  "y", "luego", "despues", "tambien", "ademas", "porque", "pero", "entonces", "finalmente", "primero", "por eso", "por ultimo",
  "sin embargo", "en cambio", "por lo tanto", "en conclusion", "por ejemplo", "asi que", "aunque", "mientras", "es decir",
  "en primer lugar", "en segundo lugar", "por otro lado", "ya que", "puesto que", "en resumen", "por consiguiente",
];

type Nivel = 0 | 1 | 2 | 3;
const nivel = (x: number): Nivel => Math.max(0, Math.min(3, Math.round(x))) as Nivel;

export type SenalesEscritura = {
  palabras: number;
  oraciones: number;
  parrafos: number;
  conectores: string[];
  mayusculaInicial: boolean;
  puntoFinal: boolean;
  oracionesConMayuscula: number;
  palabrasConsigna: number;
  palabrasConsignaUsadas: number;
};

export function senalesEscritura(texto: string, consigna: string): SenalesEscritura {
  const limpio = texto.trim();
  const palabras = limpio.split(/\s+/).filter(Boolean).length;
  const oraciones = limpio.split(/[.!?…]+/).map((s) => s.trim()).filter((s) => s.length > 1);
  const parrafos = limpio.split(/\n\s*\n|\n/).filter((p) => p.trim().length > 0).length;
  const norm = ` ${normalizarFlexible(limpio)} `;
  const conectores = CONECTORES.filter((c) => c !== "y" && norm.includes(` ${c} `));
  const claves = [...new Set(palabrasDeContenido(consigna).filter((p) => p.length >= 5))];
  const propias = new Set(palabrasDeContenido(limpio).map((p) => p.slice(0, 5)));
  return {
    palabras,
    oraciones: oraciones.length,
    parrafos,
    conectores,
    mayusculaInicial: /^[¡¿«"]?\p{Lu}/u.test(limpio),
    puntoFinal: /[.!?…»"]$/.test(limpio),
    oracionesConMayuscula: oraciones.filter((o) => /^[¡¿«"]?\p{Lu}/u.test(o)).length,
    palabrasConsigna: claves.length,
    // Comparación por raíz de 5 letras para aceptar plurales y conjugaciones («razones» ~ «razón»).
    palabrasConsignaUsadas: claves.filter((c) => propias.has(c.slice(0, 5))).length,
  };
}

/** Rúbrica SIMULADA (ver encabezado). Siempre `incierto`. */
export function evaluarRubricaSimulada(ej: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  const otro = tipoEquivocado(ej, envio);
  if (otro) return otro;
  if (ej.publico.tipo !== "escritura_rubrica" || ej.solucion.tipo !== "escritura_rubrica" || envio.respuesta.tipo !== "texto") throw new Error("evaluarRubricaSimulada: tipo");
  const { minPalabras, maxPalabras, consigna } = ej.publico;
  const s = senalesEscritura(envio.respuesta.texto, consigna);
  const enRango = s.palabras >= minPalabras && s.palabras <= maxPalabras;
  const usoConsigna = s.palabrasConsigna ? s.palabrasConsignaUsadas / s.palabrasConsigna : 0;
  const niveles: Record<string, Nivel> = {
    adecuacion: nivel((usoConsigna >= 0.3 ? 3 : usoConsigna >= 0.15 ? 2 : usoConsigna > 0 ? 1 : 0) - (s.palabras < minPalabras ? 1 : 0)),
    coherencia: nivel((s.oraciones >= 4 ? 3 : s.oraciones >= 2 ? 2 : s.oraciones) - (s.palabras < minPalabras / 2 ? 1 : 0)),
    conectores: nivel(s.conectores.length),
    ortografia: nivel((s.mayusculaInicial ? 1 : 0) + (s.puntoFinal ? 1 : 0) + (s.oraciones && s.oracionesConMayuscula / s.oraciones >= 0.8 ? 1 : 0)),
  };
  const comentarios: Record<string, string> = {
    adecuacion: s.palabras < minPalabras
      ? `Tu texto tiene ${s.palabras} palabras; intenta llegar a ${minPalabras} desarrollando más lo que pide la consigna.`
      : s.palabras > maxPalabras ? `Tu texto pasa de ${maxPalabras} palabras: intenta decirlo de forma más breve.` : "La extensión es adecuada; revisa que respondas todo lo que pide la consigna.",
    coherencia: s.oraciones >= 3 ? "Tus ideas están en varias oraciones; revisa que sigan un orden." : "Escribe más oraciones: inicio, desarrollo y cierre.",
    conectores: s.conectores.length ? `Usaste conectores como «${s.conectores.slice(0, 3).join("», «")}».` : "Une tus ideas con conectores como «porque», «además» o «finalmente».",
    ortografia: s.mayusculaInicial && s.puntoFinal ? "Empiezas con mayúscula y terminas con punto." : "Recuerda empezar con mayúscula y terminar cada oración con punto.",
  };
  // Rúbricas con otros criterios: se asocian a la señal más parecida por su id o descripción.
  const senal = (c: { id: string; descripcion: string }) => {
    if (c.id in niveles) return c.id;
    const t = normalizarFlexible(`${c.id} ${c.descripcion}`);
    if (/conector/.test(t)) return "conectores";
    if (/ortograf|puntua|mayuscul|tilde/.test(t)) return "ortografia";
    if (/orden|coheren|organiz|razon|argument|parrafo/.test(t)) return "coherencia";
    return "adecuacion";
  };
  const criterios = ej.solucion.rubrica.criterios.map((c) => ({ id: c.id, nivel: niveles[senal(c)], comentario: comentarios[senal(c)].slice(0, 300) }));
  const puntaje = criterios.reduce((a, c) => a + c.nivel, 0) / (criterios.length * 3);
  const fuertes = criterios.filter((c) => c.nivel >= 2).map((c) => c.id);
  const mejorar = criterios.filter((c) => c.nivel < 2).sort((a, b) => a.nivel - b.nivel)[0];
  const retro = [
    "Revisión automática orientativa (no es una nota).",
    // Si lo que hay que mejorar ya es la extensión, no se repite el conteo de palabras.
    s.palabras < minPalabras && mejorar?.id !== "adecuacion" ? `Tu texto tiene ${s.palabras} palabras; se piden al menos ${minPalabras}.` : "",
    fuertes.length ? `Lo que va bien: ${fuertes.map((f) => NOMBRES_CRITERIO[f] ?? f).join(", ")}.` : "",
    mejorar ? `Para mejorar: ${mejorar.comentario}` : enRango ? "¡Buen trabajo! Pide a tu profesor que lo lea." : "",
  ].filter(Boolean).join(" ");
  return { ...evaluacion("incierto", puntaje, retro, mejorar ? `escritura_${mejorar.id}` : undefined, "rubrica_simulada"), criterios };
}

const NOMBRES_CRITERIO: Record<string, string> = { adecuacion: "responder a la consigna", coherencia: "orden de las ideas", conectores: "uso de conectores", ortografia: "mayúsculas y puntos" };

const consumoNulo = (ia: ProveedorTutorIA): ConsumoIA => ({ proveedor: ia.nombre, modelo: null, tokensEntrada: 0, tokensSalida: 0, latenciaMs: 0, cache: false, simulado: true });

function desdeIa(ej: EjercicioConSolucion, datos: EvaluacionRubricaIA): Evaluacion {
  if (ej.solucion.tipo !== "escritura_rubrica") throw new Error("desdeIa: tipo");
  const ids = new Set(ej.solucion.rubrica.criterios.map((c) => c.id));
  const criterios = datos.criterios.filter((c) => ids.has(c.id));
  const puntaje = criterios.length ? criterios.reduce((a, c) => a + c.nivel, 0) / (criterios.length * 3) : 0;
  if (datos.confianza < CONFIANZA_MINIMA_IA || criterios.length !== ids.size) {
    return { ...evaluacion("incierto", puntaje, `${datos.retroGeneral} (Revisión orientativa: tu profesor puede revisarla.)`, undefined, "rubrica_ia"), criterios };
  }
  const resultado = puntaje >= 0.75 ? "correcto" : puntaje >= 0.25 ? "parcial" : "incorrecto";
  return { ...evaluacion(resultado, puntaje, datos.retroGeneral, undefined, "rubrica_ia"), criterios };
}

/** IA real si el proveedor no es simulado; si no, la rúbrica simulada. Salida inválida dos veces o confianza baja → `incierto`. */
export const evaluadorAbiertoRubrica: EvaluadorAbierto = {
  async evaluar(ej, envio, ia) {
    const otro = tipoEquivocado(ej, envio);
    if (otro) return { evaluacion: otro, consumo: consumoNulo(ia) };
    if (ia.simulado || ej.publico.tipo !== "escritura_rubrica" || ej.solucion.tipo !== "escritura_rubrica" || envio.respuesta.tipo !== "texto") {
      return { evaluacion: evaluarRubricaSimulada(ej, envio), consumo: consumoNulo(ia) };
    }
    const entrada = { consigna: ej.publico.consigna, texto: envio.respuesta.texto, rubrica: ej.solucion.rubrica };
    let consumo: ConsumoIA | null = null;
    for (let intento = 0; intento < 2; intento++) {
      try {
        const salida = await ia.retroalimentarAbierta(entrada);
        consumo = consumo
          ? { ...salida.consumo, tokensEntrada: consumo.tokensEntrada + salida.consumo.tokensEntrada, tokensSalida: consumo.tokensSalida + salida.consumo.tokensSalida, latenciaMs: consumo.latenciaMs + salida.consumo.latenciaMs }
          : salida.consumo;
        const r = esquemaEvaluacionRubrica.safeParse(salida.datos);
        if (r.success) return { evaluacion: desdeIa(ej, r.data), consumo };
      } catch {
        // Se reintenta una vez; luego, `incierto` con la heurística.
      }
    }
    const simulada = evaluarRubricaSimulada(ej, envio);
    return { evaluacion: simulada, consumo: consumo ?? consumoNulo(ia) };
  },
};
