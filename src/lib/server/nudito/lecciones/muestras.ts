import type { EnvioRespuesta, EjercicioConSolucion, Tema } from "@/lib/nudito/contratos";
import { ejercicioPara } from "@/lib/nudito/generadores/registro";
import { evaluar } from "@/lib/nudito/evaluadores";
import { esquemaLeccion, type Leccion } from "@/lib/nudito/leccion";

function respuestaDe(e: EjercicioConSolucion): EnvioRespuesta["respuesta"] {
  const s = e.solucion;
  switch (s.tipo) {
    case "opcion_multiple": return { tipo: "opcion", opcionId: s.correcta };
    case "numerico": return { tipo: "numero", valor: String(s.valor) };
    case "fraccion": return { tipo: "fraccion", num: String(s.num), den: String(s.den) };
    case "texto_corto": return { tipo: "texto", texto: s.aceptadas[0] };
    case "lectura": return { tipo: "lectura", respuestas: Object.fromEntries(Object.entries(s.respuestas).map(([k,v]) => [k, typeof v === "string" ? v : v.aceptadas[0]])) };
    case "relacionar": return { tipo: "relacionar", pares: s.pares };
    case "verdadero_falso": return { tipo: "vf", valores: s.valores };
    case "escritura_rubrica": return { tipo: "texto", texto: "Primero observo la consigna. Luego explico mi idea con un ejemplo y reviso si se entiende." };
  }
}

/** Muestras reproducibles. Los ítems cerrados se comprueban con el evaluador del tutor. */
export function muestrasDelTema(tema: Tema): Leccion["ejerciciosMuestra"] {
  const muestras: Leccion["ejerciciosMuestra"] = [];
  for (const semilla of [104729, 130363, 155921]) {
    try {
      const ejercicio = ejercicioPara(tema, tema.dificultad.min, semilla);
      const respuesta = respuestaDe(ejercicio);
      if (ejercicio.publico.tipo !== "escritura_rubrica" && evaluar(ejercicio, { respuesta }).resultado !== "correcto") continue;
      const texto = JSON.stringify(respuesta);
      const enunciado = ejercicio.publico.enunciado.slice(0, 1000);
      if (!muestras.some(m => m.enunciado === enunciado)) muestras.push({ enunciado, respuesta: texto.slice(0, 1000), pistas: ejercicio.pistas.filter(p => !texto.includes(p)).slice(0, 3) });
    } catch {
      // Un tema del colegio puede apuntar a un banco aún no disponible: se revisa manualmente.
    }
  }
  return muestras;
}

/** Lección `catalogo`: se arma sin IA desde el repaso del catálogo y muestras verificadas. Pura (la usa también el seed). */
export function armarLeccionCatalogo(tema: Tema): Leccion {
  return esquemaLeccion.parse({
    titulo: tema.nombre, idea: tema.repaso.idea.slice(0, 400),
    explicacion: tema.repaso.idea.slice(0, 1500),
    ejemplos: [{ enunciado: tema.nombre, desarrollo: tema.repaso.ejemplo }],
    ...(tema.repaso.errorFrecuente ? { errorFrecuente: tema.repaso.errorFrecuente } : {}),
    recursos: tema.recursos.map(r => ({ tipo: "enlace", titulo: r.titulo, valor: r.url })),
    ejerciciosMuestra: muestrasDelTema(tema),
  });
}
