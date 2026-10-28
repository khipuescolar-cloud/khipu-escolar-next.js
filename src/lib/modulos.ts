// Módulos del producto, roles que los soportan y resolución pura de qué módulos tiene un colegio
// (specs/19-planes-modulos-y-roles.md). Archivo compartido cliente/servidor: solo datos y funciones puras.
// La fuente de verdad de planes y roles es la BD (PlanModulo, RolModulo, TenantModulo); aquí queda el
// respaldo en código y los límites que el código impone (qué rol puede usar qué módulo).
import type { Plan, Rol } from "@/generated/prisma/enums";
import { MOSAICOS, type IconoMosaico } from "@/lib/navegacion";
import { FEATURES, NOMBRE_PLAN, planIncluye, type Feature } from "@/lib/planes";

export const MODULOS = Object.keys(FEATURES) as Feature[];

/** Módulo esencial: ningún plan, colegio ni rol puede quedarse sin él (sin gestión no se administra el colegio). */
export const MODULO_ESENCIAL: Feature = "gestion";

export const ROLES: Rol[] = ["direccion", "profesor", "administrativo", "porteria", "apoderado", "alumno"];

export function esModulo(valor: string): valor is Feature {
  return Object.hasOwn(FEATURES, valor);
}

export const INFO_MODULO: Record<Feature, { nombre: string; descripcion: string; icono: IconoMosaico }> = {
  asistencia: { nombre: "Asistencia", descripcion: "Pasar lista por salón y por curso, y el calendario de asistencia de la familia.", icono: "ClipboardCheck" },
  avisos: { nombre: "Avisos a las familias", descripcion: "Pantalla «Avisos enviados» para dar seguimiento a los correos y notificaciones de falta o tardanza. Los avisos automáticos se siguen enviando aunque se quite este módulo.", icono: "MailCheck" },
  porteria: { nombre: "Portería", descripcion: "Registro de entrada con el carnet QR.", icono: "ScanLine" },
  justificaciones: { nombre: "Justificaciones", descripcion: "La familia justifica faltas y el colegio las revisa.", icono: "FileText" },
  mensajes: { nombre: "Mensajes", descripcion: "Chat entre la familia y el profesor, sin compartir teléfonos.", icono: "MessagesSquare" },
  comunicados: { nombre: "Comunicados", descripcion: "Anuncios del colegio y de cada salón.", icono: "Megaphone" },
  gestion: { nombre: "Gestión del colegio", descripcion: "Profesores, personal, salones, alumnos, familias y configuración. Esencial.", icono: "Users" },
  notas: { nombre: "Notas", descripcion: "Evaluaciones y calificaciones por competencia.", icono: "GraduationCap" },
  libreta: { nombre: "Libreta", descripcion: "Libreta de notas por periodo, en pantalla y en PDF.", icono: "BookOpen" },
  tareas: { nombre: "Tareas", descripcion: "Tareas con fecha de entrega y adjuntos.", icono: "ListTodo" },
  agenda: { nombre: "Agenda", descripcion: "Eventos, exámenes y reuniones del colegio y de cada salón.", icono: "CalendarDays" },
  nudito: { nombre: "Nudito", descripcion: "Asistente para las familias en el día a día del colegio.", icono: "Sparkles" },
  soporte: { nombre: "Soporte Khipu", descripcion: "Chat del colegio con el equipo de Khipu Escolar (mesa de ayuda): dudas, problemas y sugerencias.", icono: "LifeBuoy" },
};

export const INFO_ROL: Record<Rol, { nombre: string; descripcion: string }> = {
  direccion: { nombre: "Dirección", descripcion: "Administra el colegio: personal, salones, alumnos, configuración, y ve todos los módulos." },
  profesor: { nombre: "Profesor", descripcion: "Pasa lista, registra notas, publica tareas y conversa con las familias de sus salones." },
  administrativo: { nombre: "Administrativo", descripcion: "Personal no docente: comunicados, agenda, alumnos y familias, y avisos enviados (solo lectura)." },
  porteria: { nombre: "Portería", descripcion: "Registra la entrada de los alumnos escaneando su carnet QR." },
  apoderado: { nombre: "Familia (apoderado)", descripcion: "Sigue la asistencia, las notas y las tareas de sus hijos, justifica faltas y conversa con el profesor." },
  alumno: { nombre: "Alumno", descripcion: "Ve solo lo suyo: asistencia, notas, libreta, tareas, agenda y comunicados. Sin mensajes ni Nudito." },
};

/**
 * Usos de un módulo por un rol que no salen en la navegación pero sí en el código
 * (p. ej. la familia guarda sus preferencias de avisos y su suscripción push).
 */
const USOS_FUERA_DE_NAVEGACION: Partial<Record<Feature, Rol[]>> = {
  avisos: ["apoderado"],
};

/** Roles que el código soporta para cada módulo (mosaicos de navegación + usos fuera de ella). */
export const ROLES_SOPORTADOS: Record<Feature, ReadonlySet<Rol>> = Object.fromEntries(
  MODULOS.map((m) => [
    m,
    new Set<Rol>([...MOSAICOS.filter((x) => x.feature === m).flatMap((x) => x.roles), ...(USOS_FUERA_DE_NAVEGACION[m] ?? [])]),
  ]),
) as unknown as Record<Feature, ReadonlySet<Rol>>;

/** El código del módulo tiene pantallas o acciones para este rol (si no, la celda es «No disponible para este rol»). */
export function rolSoporta(rol: Rol, modulo: Feature): boolean {
  return ROLES_SOPORTADOS[modulo].has(rol);
}

/**
 * El rol puede ver el módulo: el código lo soporta y no fue desactivado para ese rol en todos los colegios (RolModulo).
 * `gestion` nunca se desactiva.
 */
export function rolPuedeVer(rol: Rol, modulo: Feature, desactivadosDelRol: ReadonlySet<Feature> = new Set()): boolean {
  if (!rolSoporta(rol, modulo)) return false;
  return modulo === MODULO_ESENCIAL || !desactivadosDelRol.has(modulo);
}

export type AjusteModulo = { modulo: string; habilitado: boolean };

export type ModulosResueltos = {
  /** Módulos activos en el colegio: los del plan ± ajustes del colegio. */
  activos: Set<Feature>;
  /** Del plan (o del respaldo en código si el plan no tiene filas en la BD). */
  delPlan: Set<Feature>;
  /** Agregados al colegio aunque su plan no los incluya. */
  extras: Set<Feature>;
  /** Incluidos en el plan pero quitados a este colegio. */
  quitados: Set<Feature>;
};

/** Módulos de un plan según el código (respaldo cuando la BD no tiene filas para ese plan). */
export function modulosDeCodigo(plan: Plan): Set<Feature> {
  return new Set(MODULOS.filter((m) => planIncluye(plan, m)));
}

/**
 * Resolución central: módulos del plan (BD o respaldo) ± ajustes del colegio. Ignora claves desconocidas
 * y garantiza `gestion`.
 */
export function resolverModulos(plan: Plan, modulosDelPlan: readonly string[] | null, ajustes: readonly AjusteModulo[] = []): ModulosResueltos {
  const delPlan = modulosDelPlan && modulosDelPlan.length > 0 ? new Set(modulosDelPlan.filter(esModulo)) : modulosDeCodigo(plan);
  delPlan.add(MODULO_ESENCIAL);
  const activos = new Set(delPlan);
  const extras = new Set<Feature>();
  const quitados = new Set<Feature>();
  for (const a of ajustes) {
    if (!esModulo(a.modulo) || a.modulo === MODULO_ESENCIAL) continue;
    if (a.habilitado && !delPlan.has(a.modulo)) {
      activos.add(a.modulo);
      extras.add(a.modulo);
    } else if (!a.habilitado && delPlan.has(a.modulo)) {
      activos.delete(a.modulo);
      quitados.add(a.modulo);
    }
  }
  return { activos, delPlan, extras, quitados };
}

/** Lo que el contexto del colegio necesita para decidir candados y bloqueos (además de `modulos`). */
export type AccesoModulos = {
  /** Del plan pero quitados a este colegio: no se muestran. */
  quitadosColegio: ReadonlySet<Feature>;
  /** Desactivados para el rol actual en todos los colegios: no se muestran. */
  quitadosRol: ReadonlySet<Feature>;
  /** Nombre comercial del plan del colegio. */
  nombrePlan: string;
  /** Nombre del plan mínimo que incluye cada módulo que el colegio no tiene (para el candado); null = ningún plan. */
  planMinimo: Partial<Record<Feature, string | null>>;
};

/** Contexto de módulos solo con el respaldo en código (sin BD): para tests y contextos sintéticos. */
export function accesoModulosDeCodigo(plan: Plan): { modulos: ReadonlySet<Feature>; accesoModulos: AccesoModulos } {
  const modulos = modulosDeCodigo(plan);
  const planMinimo: Partial<Record<Feature, string | null>> = {};
  for (const m of MODULOS) if (!modulos.has(m)) planMinimo[m] = NOMBRE_PLAN[FEATURES[m]];
  return { modulos, accesoModulos: { quitadosColegio: new Set(), quitadosRol: new Set(), nombrePlan: NOMBRE_PLAN[plan], planMinimo } };
}
