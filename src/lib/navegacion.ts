// Mosaicos del panel por rol (specs/10-panel-direccion-gestion.md). Cada módulo agrega aquí su entrada.
import type { Rol } from "@/generated/prisma/enums";
import type { Feature } from "@/lib/planes";

export type IconoMosaico =
  | "ClipboardCheck" | "ScanLine" | "MailCheck" | "FileText" | "MessagesSquare" | "Megaphone"
  | "Users" | "Settings" | "LifeBuoy" | "GraduationCap" | "BookOpen" | "ListTodo" | "CalendarDays" | "Sparkles" | "School" | "BarChart3"
  | "FolderOpen";

/** Grupo de la barra lateral. */
export type GrupoNav = "dia" | "comunicacion" | "academico" | "colegio";

export const NOMBRE_GRUPO: Record<GrupoNav, string> = {
  dia: "Día a día",
  comunicacion: "Comunicación",
  academico: "Académico",
  colegio: "Colegio",
};

export type Mosaico = {
  href: string;
  grupo: GrupoNav;
  titulo: string;
  descripcion: string;
  icono: IconoMosaico;
  feature: Feature;
  roles: Rol[];
  /** Contador que se muestra sobre el mosaico (hoy: mensajes sin leer). */
  contador?: "mensajes";
};

export const MOSAICOS: Mosaico[] = [
  { href: "/asistencia", grupo: "dia", titulo: "Pasar lista", descripcion: "Marca la asistencia y avisa a las familias.", icono: "ClipboardCheck", feature: "asistencia", roles: ["profesor", "direccion"] },
  { href: "/asistencia", grupo: "dia", titulo: "Asistencia", descripcion: "Mira si tus hijos llegaron al colegio.", icono: "ClipboardCheck", feature: "asistencia", roles: ["apoderado"] },
  { href: "/asistencia", grupo: "dia", titulo: "Mi asistencia", descripcion: "Mira tus llegadas al colegio.", icono: "ClipboardCheck", feature: "asistencia", roles: ["alumno"] },
  { href: "/asistencia/reportes", grupo: "dia", titulo: "Reportes de asistencia", descripcion: "Porcentaje por alumno, salón y fechas; descarga en Excel y PDF.", icono: "BarChart3", feature: "asistencia", roles: ["direccion", "administrativo", "profesor"] },
  { href: "/asistencia/reportes", grupo: "dia", titulo: "Reporte de asistencia", descripcion: "Porcentaje de asistencia de tus hijos por fechas.", icono: "BarChart3", feature: "asistencia", roles: ["apoderado", "alumno"] },
  { href: "/porteria", grupo: "dia", titulo: "Portería", descripcion: "Escanea el carnet QR en la entrada.", icono: "ScanLine", feature: "porteria", roles: ["porteria", "direccion"] },
  { href: "/avisos", grupo: "dia", titulo: "Avisos enviados", descripcion: "Correos y notificaciones a las familias.", icono: "MailCheck", feature: "avisos", roles: ["direccion", "administrativo"] },
  { href: "/justificaciones", grupo: "dia", titulo: "Justificaciones", descripcion: "Faltas justificadas por las familias.", icono: "FileText", feature: "justificaciones", roles: ["profesor", "direccion", "apoderado"] },
  { href: "/mensajes", grupo: "comunicacion", titulo: "Mensajes", descripcion: "Chat entre familia y profesor, sin teléfonos.", icono: "MessagesSquare", feature: "mensajes", roles: ["profesor", "apoderado", "direccion"], contador: "mensajes" },
  { href: "/comunicados", grupo: "comunicacion", titulo: "Comunicados", descripcion: "Anuncios del colegio.", icono: "Megaphone", feature: "comunicados", roles: ["direccion", "profesor", "apoderado", "administrativo", "alumno"] },
  { href: "/documentos", grupo: "comunicacion", titulo: "Documentos", descripcion: "Reglamento, calendario y documentos del colegio.", icono: "FolderOpen", feature: "documentos", roles: ["direccion", "administrativo", "profesor", "apoderado", "alumno"] },
  { href: "/notas", grupo: "academico", titulo: "Notas", descripcion: "Evaluaciones y calificaciones por competencia.", icono: "GraduationCap", feature: "notas", roles: ["profesor", "direccion", "apoderado", "alumno"] },
  { href: "/libreta", grupo: "academico", titulo: "Libreta", descripcion: "Libreta de notas por periodo.", icono: "BookOpen", feature: "libreta", roles: ["direccion", "apoderado", "profesor", "alumno"] },
  { href: "/tareas", grupo: "academico", titulo: "Tareas", descripcion: "Tareas y fechas de entrega.", icono: "ListTodo", feature: "tareas", roles: ["profesor", "direccion", "apoderado", "alumno"] },
  { href: "/nudito-plus/chat", grupo: "academico", titulo: "Nudito+", descripcion: "Tu tutor con IA: practica paso a paso.", icono: "Sparkles", feature: "nudito_plus", roles: ["alumno"] },
  { href: "/agenda", grupo: "academico", titulo: "Agenda", descripcion: "Eventos, exámenes y reuniones.", icono: "CalendarDays", feature: "agenda", roles: ["profesor", "direccion", "apoderado", "administrativo", "alumno"] },
  { href: "/tablero", grupo: "colegio", titulo: "Tablero", descripcion: "Asistencia, notas y avisos del colegio; consolidado de notas en Excel y PDF.", icono: "BarChart3", feature: "tablero", roles: ["direccion"] },
  { href: "/reuniones", grupo: "comunicacion", titulo: "Reuniones", descripcion: "Convocatorias, confirmaciones y actas de reuniones.", icono: "Users", feature: "reuniones", roles: ["profesor", "direccion", "apoderado"] },
  { href: "/gestion", grupo: "colegio", titulo: "Gestión", descripcion: "Profesores, personal, grados, alumnos y familias.", icono: "Users", feature: "gestion", roles: ["direccion"] },
  { href: "/gestion", grupo: "colegio", titulo: "Alumnos y familias", descripcion: "Altas, datos e invitaciones de alumnos y familias.", icono: "Users", feature: "gestion", roles: ["administrativo"] },
  { href: "/configuracion", grupo: "colegio", titulo: "Configuración", descripcion: "Avisos, logo, dominio y escala de notas.", icono: "Settings", feature: "gestion", roles: ["direccion"] },
  { href: "/soporte", grupo: "colegio", titulo: "Soporte Khipu", descripcion: "Escríbele al equipo de Khipu Escolar: dudas, problemas o sugerencias.", icono: "LifeBuoy", feature: "soporte", roles: ["direccion", "administrativo"] },
];

export function mosaicosParaRol(rol: Rol): Mosaico[] {
  return MOSAICOS.filter((m) => m.roles.includes(rol));
}
