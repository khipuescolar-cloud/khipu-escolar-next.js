// Responsable: B (specs/43). Banco revisado de Ciencia y Tecnología (`cyt.banco`): primaria 1.°–6.° y secundaria 1.°–2.°.
// Ítems escritos por personas, con fuente y revisión docente pendiente (`revisadoPor: null`).
import { cargarItems, seleccionarItem, type CriterioSeleccion, type ItemRevisado } from "../items";
import p1 from "./p1.json";
import p2 from "./p2.json";
import p3 from "./p3.json";
import p4 from "./p4.json";
import p5 from "./p5.json";
import p6 from "./p6.json";
import s1 from "./s1.json";
import s2 from "./s2.json";

export const BANCO_CIENCIA_ID = "cyt.banco";

let cache: readonly ItemRevisado[] | null = null;
export function itemsCiencia(): readonly ItemRevisado[] {
  return (cache ??= cargarItems(BANCO_CIENCIA_ID, p1, p2, p3, p4, p5, p6, s1, s2));
}

export function seleccionarItemCiencia(c: CriterioSeleccion): ItemRevisado | null {
  return seleccionarItem(itemsCiencia(), c);
}
