import { z } from "zod";

const texto = z.string().trim().min(1);
const identificador = z.string().regex(/^[a-z0-9-]+$/);
export const esquemaClaseGuiada = z.object({
  version: z.literal(1),
  momentos: z.array(z.object({
    id: identificador,
    tipo: z.enum(["idea", "recurso", "ejemplo", "paso"]),
    titulo: texto.max(120),
    narracion: texto.max(3000),
    recursoRef: identificador.optional(),
  })).min(3).max(24),
  recursos: z.array(z.object({
    id: identificador,
    src: z.string().regex(/^\/nudito\/[a-z0-9/_-]+\.(?:svg|png|webp)$/),
    alt: texto.max(200),
    descripcion: texto.max(500),
  })).max(8),
  comprobacion: z.object({
    pregunta: texto.max(500),
    opciones: z.array(z.object({ id: identificador, texto: texto.max(300) })).min(2).max(4),
    respuesta: identificador,
    mensajeCorrecto: texto.max(500),
    pista: texto.max(500),
  }),
}).superRefine((clase, ctx) => {
  const ids = clase.momentos.map(m => m.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["momentos"], message: "Los momentos deben tener ID único" });
  const recursos = clase.recursos.map(r => r.id);
  if (new Set(recursos).size !== recursos.length) ctx.addIssue({ code: "custom", path: ["recursos"], message: "Los recursos deben tener ID único" });
  for (const [i, momento] of clase.momentos.entries()) if (momento.recursoRef && !recursos.includes(momento.recursoRef)) ctx.addIssue({ code: "custom", path: ["momentos", i, "recursoRef"], message: "Recurso inexistente" });
  const opciones = clase.comprobacion.opciones.map(o => o.id);
  if (new Set(opciones).size !== opciones.length || !opciones.includes(clase.comprobacion.respuesta)) ctx.addIssue({ code: "custom", path: ["comprobacion"], message: "La respuesta debe identificar una opción única" });
});
export type ClaseGuiada = z.infer<typeof esquemaClaseGuiada>;
export type ClaseGuiadaPublica = Omit<ClaseGuiada, "comprobacion"> & { comprobacion: Omit<ClaseGuiada["comprobacion"], "respuesta"> };

/** Añade orientación oral sin obligar a repetirla en el texto visible del contenido. */
export function narracionAccesibleDeMomento(
  momento: Pick<ClaseGuiada["momentos"][number], "titulo" | "narracion">,
  descripcionImagen?: string,
): string {
  const apoyoVisual = descripcionImagen ? ` La imagen relacionada con esta parte muestra lo siguiente: ${descripcionImagen}` : "";
  const titulo = /[?!.]$/.test(momento.titulo.trim()) ? momento.titulo.trim() : `${momento.titulo}.`;
  return `${titulo} ${momento.narracion}${apoyoVisual}`;
}

const FIN_DE_FRASE = /[.!?]+["»”’)\]]*$/u;
// Numeración «1.»: solo al empezar frase o tras comilla de apertura (si no, «S/ 15.» cierra la frase).
const NUMERACION = /^(?:[«"“(]\d{1,2}\.|\d{1,2}\.)$/u;
// Palabras que acaban en punto sin cerrar la frase: numeración «1.», «p.»/«a.» de p. m./a. m., tratamientos y «S/.».
const SIN_CORTE = /^[«"“(]*(?:p|a|sr|sra|srta|dr|dra|lic|ing|prof|av|S\/)\.$/iu;

/** La pantalla ya antepone «¡Correcto!»: quita una apertura repetida («Correcto.», «Muy bien.», «Exacto.») del mensaje de acierto. */
export function sinAperturaRedundante(mensaje: string): string {
  const limpio = mensaje.replace(/^\s*[¡]?(correcto|muy bien|exacto|bien hecho)[!.]\s+/i, "");
  return limpio.length >= 10 ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : mensaje;
}

/** Parte la narración en frases habladas sin dejar utterances huérfanos (numeración, p. m., cierres de comillas, decimales). */
export function partirEnFrases(texto: string): string[] {
  const frases: string[] = [];
  let actual = "";
  const palabras = texto.match(/\S+/gu) ?? [];
  for (const [i, palabra] of palabras.entries()) {
    const numeracion = NUMERACION.test(palabra) && (!actual || /^[«"“(]/u.test(palabra));
    actual = actual ? `${actual} ${palabra}` : palabra;
    // «p. m.»/«a. m.» solo cierran frase si la palabra siguiente empieza en mayúscula.
    const horaSeguida = /^m\.$/i.test(palabra) && /^[ap]\.$/i.test(palabras[i - 1] ?? "") && /^[a-záéíóúñ]/u.test(palabras[i + 1] ?? "");
    if (FIN_DE_FRASE.test(palabra) && !SIN_CORTE.test(palabra) && !numeracion && !horaSeguida) {
      frases.push(actual);
      actual = "";
    }
  }
  if (actual) frases.push(actual);
  // Una frase sin letras (p. ej. «».») no se lee sola: se pega a la anterior.
  return frases.reduce<string[]>((acc, f) => {
    if (acc.length && !/\p{L}/u.test(f)) acc[acc.length - 1] += ` ${f}`;
    else acc.push(f);
    return acc;
  }, []);
}

export function narracionAccesibleDeComprobacion(comprobacion: ClaseGuiadaPublica["comprobacion"]): string {
  const alternativas = comprobacion.opciones.map((opcion, posicion) => `Opción ${posicion + 1}. ${opcion.texto}`).join(" ");
  return `Llegamos a la comprobación final. Escucha la pregunta y luego las alternativas. ${comprobacion.pregunta} ${alternativas}`;
}

export function clasePublica(clase: ClaseGuiada): ClaseGuiadaPublica {
  const { respuesta: _respuesta, ...comprobacion } = clase.comprobacion;
  void _respuesta;
  return { ...clase, comprobacion };
}
