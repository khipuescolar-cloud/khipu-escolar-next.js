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
  /** Plan anterior (por orden) cuyo contenido incluye entero: «Todo lo de Khipu Base, más…». */
  incluyeA: string | null;
  /** Módulos que agrega respecto del plan anterior (o todos, si no incluye a otro). */
  nuevos: ModuloPublico[];
  /** Texto del precio: en soles solo si `PUBLICAR_PRECIOS`; si no (o sin precio en el catálogo), `SIN_PRECIO`. */
  precio: string;
  /** Línea bajo el precio: el mínimo mensual (si se publican precios) o `DETALLE_SIN_PRECIO`. */
  minimo: string | null;
};

/**
 * Publicar tarifas en la landing. Apagado: no hay precios aprobados (modelo comercial 2026-11-03), así que la
 * landing muestra siempre el texto sin montos aunque el catálogo (`planes_catalogo`) tenga precios cargados.
 */
export const PUBLICAR_PRECIOS = false;

export const SIN_PRECIO = "Precio por alumno activo, según rango de tamaño del colegio";
export const DETALLE_SIN_PRECIO = "Implementación incluida. Cotización a medida para más de 1.000 alumnos o varias sedes.";

/**
 * Módulos que la landing no lista como función del plan: la mesa de ayuda va en todos los planes y se
 * presenta aparte; «avisos» es la pantalla de seguimiento de dirección (los avisos van dentro de asistencia);
 * Nudito+ no está incluido en ningún plan ni se publica (producto futuro en estudio, desactivado; specs/28–29).
 */
const OCULTOS: ReadonlySet<Feature> = new Set<Feature>(["soporte", "avisos", "nudito_plus"]);

/** Nombre del módulo para la landing (más claro para quien no conoce el producto). */
const NOMBRE_PUBLICO: Partial<Record<Feature, string>> = {
  asistencia: "Asistencia de ingreso y por clase, con tardanzas, aviso a la familia y reportes en PDF y Excel",
  porteria: "Portería con carnet QR",
  justificaciones: "Justificación de faltas",
  mensajes: "Mensajería familia–profesor",
  comunicados: "Comunicados con adjuntos",
  gestion: "Gestión institucional: personal, salones, alumnos y familias",
  horario: "Horario semanal por salón",
  notas: "Evaluaciones por competencias, capacidades, desempeños y criterios (CNEB)",
  libreta: "Libretas por periodo en PDF",
  tareas: "Tareas",
  agenda: "Agenda",
  tablero: "Tablero de dirección y reportes académicos",
  documentos: "Documentos del colegio",
  reuniones: "Reuniones con confirmación y acta",
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

/** Precio público de un plan: sin montos mientras `PUBLICAR_PRECIOS` esté apagado (o si el catálogo no tiene precio). */
function textoPrecio(f: FilaCatalogoPublico, publicar: boolean = PUBLICAR_PRECIOS): { precio: string; minimo: string | null } {
  if (!publicar || f.precioPorAlumno === null || f.precioPorAlumno <= 0) return { precio: SIN_PRECIO, minimo: DETALLE_SIN_PRECIO };
  return {
    precio: `${soles.format(f.precioPorAlumno)} por alumno al mes`,
    minimo: f.precioMinimoMensual !== null && f.precioMinimoMensual > 0 ? `Mínimo ${soles.format(f.precioMinimoMensual)} al mes` : null,
  };
}

/** Solo planes activos, por orden, con módulos legibles, «todo lo de X, más…» y precio (sin montos si no se publican). */
export function armarPlanesPublicos(filas: readonly FilaCatalogoPublico[], publicarPrecios: boolean = PUBLICAR_PRECIOS): PlanPublico[] {
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
      ...textoPrecio(f, publicarPrecios),
    });
    anterior = { nombre: f.nombre.trim() || NOMBRE_PLAN[f.plan], modulos: delPlan };
  }
  return resultado;
}
