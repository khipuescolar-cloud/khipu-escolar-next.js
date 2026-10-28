// Planes que se muestran en la landing pública (specs/25-landing-publica.md). Puro: lo usa
// src/lib/server/landing.ts con las filas de PlanCatalogo + PlanModulo y las pruebas unitarias.
import type { Plan } from "@/generated/prisma/enums";
import { INFO_MODULO, MODULOS, modulosDeCodigo, resolverModulos } from "@/lib/modulos";
import { NOMBRE_PLAN, ORDEN_PLANES, type Feature } from "@/lib/planes";

/** Lo mínimo que la landing lee de cada fila del catálogo. */
export type FilaCatalogoPublico = {
  plan: Plan;
  nombre: string;
  descripcion: string | null;
  precioPorAlumno: number | null;
  precioMinimoMensual: number | null;
  activo: boolean;
  orden: number;
  modulos: string[];
};

export type ModuloPublico = { clave: Feature; nombre: string };

export type PlanPublico = {
  plan: Plan;
  nombre: string;
  descripcion: string | null;
  /** Todos los módulos del plan, en el orden del producto. */
  modulos: ModuloPublico[];
  /** Plan anterior (por orden) cuyo contenido incluye entero: «Todo lo de Básico, más…». */
  incluyeA: string | null;
  /** Módulos que agrega respecto del plan anterior (o todos, si no incluye a otro). */
  nuevos: ModuloPublico[];
  /** Texto del precio en soles, o «Precio según tamaño del colegio» si el catálogo no tiene precio. */
  precio: string;
  /** Línea opcional con el mínimo mensual. */
  minimo: string | null;
};

export const SIN_PRECIO = "Precio según tamaño del colegio";

/**
 * Módulos que la landing no lista como función del plan: la mesa de ayuda va en todos los planes y se
 * presenta aparte; «avisos» es la pantalla de seguimiento de dirección (los avisos van dentro de asistencia).
 */
const OCULTOS: ReadonlySet<Feature> = new Set<Feature>(["soporte", "avisos"]);

/** Nombre del módulo para la landing (más claro para quien no conoce el producto). */
const NOMBRE_PUBLICO: Partial<Record<Feature, string>> = {
  asistencia: "Asistencia con aviso a la familia",
  porteria: "Portería con carnet QR",
  justificaciones: "Justificación de faltas",
  mensajes: "Chat familia–profesor",
  comunicados: "Comunicados con adjuntos",
  gestion: "Panel de dirección",
  notas: "Notas por competencias",
  libreta: "Libreta en PDF",
  tareas: "Tareas",
  agenda: "Agenda",
  nudito: "Nudito, el asistente para las familias",
};

const soles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

function modulosPublicos(claves: Iterable<Feature>): ModuloPublico[] {
  const set = new Set(claves);
  return MODULOS.filter((m) => set.has(m) && !OCULTOS.has(m)).map((clave) => ({ clave, nombre: NOMBRE_PUBLICO[clave] ?? INFO_MODULO[clave].nombre }));
}

/** Filas por defecto (código) cuando el catálogo de la BD está vacío o no se puede leer. */
export function catalogoDeCodigo(): FilaCatalogoPublico[] {
  return (Object.keys(NOMBRE_PLAN) as Plan[])
    .sort((a, b) => ORDEN_PLANES[a] - ORDEN_PLANES[b])
    .map((plan) => ({
      plan,
      nombre: NOMBRE_PLAN[plan],
      descripcion: null,
      precioPorAlumno: null,
      precioMinimoMensual: null,
      activo: true,
      orden: ORDEN_PLANES[plan],
      modulos: [...modulosDeCodigo(plan)],
    }));
}

/** Solo planes activos, por orden, con módulos legibles, «todo lo de X, más…» y precio en soles. */
export function armarPlanesPublicos(filas: readonly FilaCatalogoPublico[]): PlanPublico[] {
  const activos = filas.filter((f) => f.activo).sort((a, b) => a.orden - b.orden);
  const resultado: PlanPublico[] = [];
  let anterior: { nombre: string; modulos: Set<Feature> } | null = null;
  for (const f of activos) {
    // Se compara solo lo que la landing lista (sin los módulos ocultos).
    const delPlan = new Set([...resolverModulos(f.plan, f.modulos).delPlan].filter((m) => !OCULTOS.has(m)));
    const incluyeAnterior = anterior !== null && [...anterior.modulos].every((m) => delPlan.has(m));
    const nuevos = incluyeAnterior && anterior ? [...delPlan].filter((m) => !anterior!.modulos.has(m)) : [...delPlan];
    resultado.push({
      plan: f.plan,
      nombre: f.nombre.trim() || NOMBRE_PLAN[f.plan],
      descripcion: f.descripcion?.trim() || null,
      modulos: modulosPublicos(delPlan),
      incluyeA: incluyeAnterior && anterior ? anterior.nombre : null,
      nuevos: modulosPublicos(nuevos),
      precio: f.precioPorAlumno !== null && f.precioPorAlumno > 0 ? `${soles.format(f.precioPorAlumno)} por alumno al mes` : SIN_PRECIO,
      minimo: f.precioMinimoMensual !== null && f.precioMinimoMensual > 0 ? `Mínimo ${soles.format(f.precioMinimoMensual)} al mes` : null,
    });
    anterior = { nombre: f.nombre.trim() || NOMBRE_PLAN[f.plan], modulos: delPlan };
  }
  return resultado;
}
