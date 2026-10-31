// Destino de un comunicado (specs/09): todo el colegio, uno o más niveles, un grado de un nivel (todas sus secciones) o un salón.
// Lógica pura (sin BD): la usan el servidor, la UI y los tests.
import type { Nivel } from "@/generated/prisma/enums";
import { ETIQUETA_NIVEL, GRADOS_POR_NIVEL } from "@/lib/cneb/catalogo";

export type AudienciaComunicado =
  | { tipo: "colegio" }
  | { tipo: "niveles"; niveles: Nivel[] }
  | { tipo: "grado"; nivel: Nivel; grado: number }
  | { tipo: "salon"; salonId: string };

export const ORDEN_NIVELES: readonly Nivel[] = ["inicial", "primaria", "secundaria", "academia"];

const esNivel = (v: string): v is Nivel => (ORDEN_NIVELES as readonly string[]).includes(v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ordena y quita repetidos (inicial → primaria → secundaria → academia). */
export function ordenarNiveles(niveles: Iterable<Nivel>): Nivel[] {
  const set = new Set(niveles);
  return ORDEN_NIVELES.filter((n) => set.has(n));
}

/** «3.° grado de primaria» · en inicial, «Inicial de 4 años». */
export function textoGradoComunicado(nivel: Nivel, grado: number): string {
  return nivel === "inicial" ? `Inicial de ${grado} años` : `${grado}.° grado de ${ETIQUETA_NIVEL[nivel].toLowerCase()}`;
}

/** Etiqueta del destino para la lista: «Todo el colegio», «Primaria», «Inicial y primaria», «3.° grado de primaria» o el nombre del salón. */
export function etiquetaAudiencia(c: { salon: string | null; niveles: Nivel[]; grado: number | null }): string {
  if (c.salon) return c.salon;
  const niveles = ordenarNiveles(c.niveles);
  if (niveles.length === 0) return "Todo el colegio";
  if (c.grado !== null && niveles.length === 1) return textoGradoComunicado(niveles[0], c.grado);
  const nombres = niveles.map((n, i) => (i === 0 ? ETIQUETA_NIVEL[n] : ETIQUETA_NIVEL[n].toLowerCase()));
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** Columnas de la BD (`salon_id`, `niveles`, `grado`) para cada destino. */
export function columnasAudiencia(a: AudienciaComunicado): { salonId: string | null; niveles: Nivel[]; grado: number | null } {
  switch (a.tipo) {
    case "colegio":
      return { salonId: null, niveles: [], grado: null };
    case "niveles":
      return { salonId: null, niveles: ordenarNiveles(a.niveles), grado: null };
    case "grado":
      return { salonId: null, niveles: [a.nivel], grado: a.grado };
    case "salon":
      return { salonId: a.salonId, niveles: [], grado: null };
  }
}

/** Valores del formulario («Para quién»). `destino`: colegio | niveles | grado | salon. */
export type EntradaAudiencia = { destino: string | null; niveles?: string[]; grado?: string | null; salonId?: string | null };

/**
 * Valida la forma del destino (sin BD). Devuelve el destino o un mensaje de error para la persona.
 * El grado llega como «primaria:3». Que existan salones activos de ese nivel o grado lo revisa el servidor.
 */
export function leerAudiencia(e: EntradaAudiencia): { ok: true; audiencia: AudienciaComunicado } | { ok: false; error: string } {
  const destino = e.destino || (e.salonId ? "salon" : "colegio");
  if (destino === "colegio") return { ok: true, audiencia: { tipo: "colegio" } };
  if (destino === "salon") {
    if (!e.salonId || !UUID.test(e.salonId)) return { ok: false, error: "Elige un salón." };
    return { ok: true, audiencia: { tipo: "salon", salonId: e.salonId } };
  }
  if (destino === "niveles") {
    const valores = e.niveles ?? [];
    if (valores.length === 0) return { ok: false, error: "Elige al menos un nivel." };
    if (!valores.every(esNivel)) return { ok: false, error: "Ese nivel no existe." };
    return { ok: true, audiencia: { tipo: "niveles", niveles: ordenarNiveles(valores as Nivel[]) } };
  }
  if (destino === "grado") {
    const [nivel, gradoTexto] = (e.grado ?? "").split(":");
    const grado = Number(gradoTexto);
    if (!nivel || !gradoTexto) return { ok: false, error: "Elige un grado." };
    if (!esNivel(nivel) || !Number.isInteger(grado) || !GRADOS_POR_NIVEL[nivel].includes(grado)) return { ok: false, error: "Ese grado no existe." };
    return { ok: true, audiencia: { tipo: "grado", nivel, grado } };
  }
  return { ok: false, error: "Elige para quién es el comunicado." };
}

/** Valor del selector de grado: «primaria:3». */
export const valorGrado = (nivel: Nivel, grado: number) => `${nivel}:${grado}`;
