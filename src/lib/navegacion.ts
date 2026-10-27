// Mosaicos del panel por rol (specs/10-panel-direccion-gestion.md). Cada módulo agrega aquí su entrada.
import type { Rol } from "@/generated/prisma/enums";
import type { Feature } from "@/lib/planes";

export type IconoMosaico =
  | "ClipboardCheck" | "ScanLine" | "MailCheck" | "FileText" | "MessagesSquare" | "Megaphone"
  | "Users" | "Settings" | "GraduationCap" | "BookOpen" | "ListTodo" | "CalendarDays" | "Sparkles" | "School";

export type Mosaico = {
  href: string;
  titulo: string;
  descripcion: string;
  icono: IconoMosaico;
  feature: Feature;
  roles: Rol[];
  /** Contador que se muestra sobre el mosaico (hoy: mensajes sin leer). */
  contador?: "mensajes";
};

export const MOSAICOS: Mosaico[] = [
  { href: "/asistencia", titulo: "Pasar lista", descripcion: "Marca la asistencia y avisa a las familias.", icono: "ClipboardCheck", feature: "asistencia", roles: ["profesor", "direccion"] },
  { href: "/asistencia", titulo: "Asistencia", descripcion: "Mira si tus hijos llegaron al colegio.", icono: "ClipboardCheck", feature: "asistencia", roles: ["apoderado"] },
  { href: "/porteria", titulo: "Portería", descripcion: "Escanea el carnet QR en la entrada.", icono: "ScanLine", feature: "porteria", roles: ["porteria", "direccion"] },
  { href: "/avisos", titulo: "Avisos enviados", descripcion: "Correos y notificaciones a las familias.", icono: "MailCheck", feature: "avisos", roles: ["direccion"] },
  { href: "/justificaciones", titulo: "Justificaciones", descripcion: "Faltas justificadas por las familias.", icono: "FileText", feature: "justificaciones", roles: ["profesor", "direccion", "apoderado"] },
  { href: "/mensajes", titulo: "Mensajes", descripcion: "Chat entre familia y profesor, sin teléfonos.", icono: "MessagesSquare", feature: "mensajes", roles: ["profesor", "apoderado", "direccion"], contador: "mensajes" },
  { href: "/comunicados", titulo: "Comunicados", descripcion: "Anuncios del colegio.", icono: "Megaphone", feature: "comunicados", roles: ["direccion", "profesor", "apoderado", "administrativo"] },
  { href: "/notas", titulo: "Notas", descripcion: "Evaluaciones y calificaciones por competencia.", icono: "GraduationCap", feature: "notas", roles: ["profesor", "direccion", "apoderado"] },
  { href: "/libreta", titulo: "Libreta", descripcion: "Libreta de notas por periodo.", icono: "BookOpen", feature: "libreta", roles: ["direccion", "apoderado", "profesor"] },
  { href: "/tareas", titulo: "Tareas", descripcion: "Tareas y fechas de entrega.", icono: "ListTodo", feature: "tareas", roles: ["profesor", "direccion", "apoderado"] },
  { href: "/agenda", titulo: "Agenda", descripcion: "Eventos, exámenes y reuniones.", icono: "CalendarDays", feature: "agenda", roles: ["profesor", "direccion", "apoderado"] },
  { href: "/nudito", titulo: "Nudito", descripcion: "Tu asistente para el día a día del colegio.", icono: "Sparkles", feature: "nudito", roles: ["apoderado"] },
  { href: "/gestion", titulo: "Gestión", descripcion: "Profesores, personal, grados, alumnos y familias.", icono: "Users", feature: "gestion", roles: ["direccion"] },
  { href: "/configuracion", titulo: "Configuración", descripcion: "Avisos, logo, dominio y escala de notas.", icono: "Settings", feature: "gestion", roles: ["direccion"] },
];

export function mosaicosParaRol(rol: Rol): Mosaico[] {
  return MOSAICOS.filter((m) => m.roles.includes(rol));
}
