// Capturas reales del producto (colegio demo, datos ficticios) para la landing. Se regeneran con
// `E2E_PORT=<puerto> pnpm exec tsx scripts/capturas-landing.ts` (specs/25). Medidas = las del WebP.

export type Captura = { src: string; width: number; height: number; alt: string };

const escritorio = (nombre: string, alt: string): Captura => ({ src: `/landing/${nombre}.webp`, width: 1366, height: 854, alt });
const celular = (nombre: string, alt: string): Captura => ({ src: `/landing/${nombre}.webp`, width: 780, height: 1688, alt });

export const CAPTURAS = {
  pasarLista: escritorio(
    "pasar-lista",
    "Pantalla «Asistencia del día · 3.° B» de Khipu Escolar: cada alumno con los botones Llegó, Tarde, No llegó y Aviso, y el resumen con el botón «Guardar y avisar a los padres».",
  ),
  familiaAsistencia: celular(
    "familia-asistencia",
    "Celular de una madre con el calendario de asistencia de su hijo: días con «Llegó» en verde y faltas marcadas con ícono, y el botón «Escribir a la tutora».",
  ),
  chat: celular(
    "chat",
    "Chat en el celular entre una madre y la tutora de 3.° B: la madre avisa que su hijo llegará tarde por una cita médica y la tutora le responde.",
  ),
  notas: escritorio(
    "notas",
    "Registro de notas de Matemática · 3.° B en escala literal (AD, A, B, C), con el estado del cierre de notas del curso.",
  ),
  direccionInicio: escritorio("direccion-inicio", "Inicio de la dirección del colegio con los módulos Pasar lista, Portería, Avisos enviados, Justificaciones, Mensajes y Comunicados."),
  nudito: celular(
    "nudito",
    "Nudito, el asistente, responde en el celular qué tareas tiene el hijo esta semana, con el curso y la fecha de entrega de cada una.",
  ),
  porteria: celular("porteria", "Pantalla de portería en el celular: escaneo del carnet QR y búsqueda manual del alumno que no trae su carnet."),
  carnets: escritorio("carnets", "Carnets con código QR de los alumnos de 3.° B, listos para imprimir o descargar en PDF."),
  mesaAyuda: escritorio(
    "mesa-ayuda",
    "Conversación de la dirección con el equipo de Khipu Escolar en la mesa de ayuda: pregunta cómo importar alumnos y recibe la respuesta.",
  ),
} satisfies Record<string, Captura>;
