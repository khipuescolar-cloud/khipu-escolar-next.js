// Responsable: B (specs/43). Comunicación: lecturas ORIGINALES con preguntas literales, inferenciales y críticas e ítems de
// lectura breves (`com.lecturas`), y consignas de escritura con rúbrica formativa más ítems de ortografía, puntuación y
// conectores (`com.escritura`). Primaria 1.°–6.° y secundaria 1.°–2.°. Revisión docente pendiente (`revisadoPor: null`).
// Las dos colecciones comparten un solo conjunto de ítems: la selección es por `temaClave` (y los tipos del tema), y el
// `fuenteId` lleva la colección pedida.
import { cargarItems, seleccionarItem, type CriterioSeleccion, type ItemRevisado } from "../../banco/items";
import escritura from "./escritura.json";
import lengua from "./lengua.json";
import lp1 from "./lecturas-p1.json";
import lp2 from "./lecturas-p2.json";
import lp3 from "./lecturas-p3.json";
import lp4 from "./lecturas-p4.json";
import lp5 from "./lecturas-p5.json";
import lp6 from "./lecturas-p6.json";
import ls1 from "./lecturas-s1.json";
import ls2 from "./lecturas-s2.json";

export const COLECCION_LECTURAS_ID = "com.lecturas";
export const COLECCION_ESCRITURA_ID = "com.escritura";
export const COLECCIONES_COMUNICACION = [COLECCION_LECTURAS_ID, COLECCION_ESCRITURA_ID] as const;

let cache: readonly ItemRevisado[] | null = null;

export function itemsComunicacion(): readonly ItemRevisado[] {
  return (cache ??= cargarItems("com", lp1, lp2, lp3, lp4, lp5, lp6, ls1, ls2, lengua, escritura));
}

export function seleccionarItemComunicacion(coleccionId: string, c: CriterioSeleccion): ItemRevisado | null {
  if (!(COLECCIONES_COMUNICACION as readonly string[]).includes(coleccionId)) return null;
  return seleccionarItem(itemsComunicacion(), c);
}
