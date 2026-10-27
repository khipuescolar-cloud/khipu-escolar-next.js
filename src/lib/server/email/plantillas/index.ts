// Registro de plantillas de aviso (specs/06-avisos-notificaciones.md, sección «Contrato de plantillas»).
// El worker renderiza cada fila de `avisos` por su `plantilla` usando su `payload`.
// Otros módulos insertan filas en `avisos` confiando en estos nombres y payloads: no los cambies sin actualizar la spec.
import { z } from "zod";
import { fechaCorta, hora12 } from "@/lib/fechas";
import { armarMensaje, type Mensaje } from "./base";

export type { Mensaje } from "./base";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const url = z.string().min(1);
const comun = { colegio: z.string().min(1), urlPreferencias: url.optional() };

const ESQUEMAS = {
  asistencia_llego: z.object({ ...comun, alumno: z.string().min(1), hora: hhmm }),
  asistencia_tarde: z.object({ ...comun, alumno: z.string().min(1), hora: hhmm }),
  asistencia_falta: z.object({
    ...comun,
    alumno: z.string().min(1),
    /** «a la 1.ª hora» (asistencia del día) o «a Matemática». */
    momento: z.string().default("a la 1.ª hora"),
    /** La arma el worker a partir de `justificacionTokenId`; nunca se guarda el token en la BD. */
    urlJustificar: url.optional(),
    justificacionTokenId: z.string().optional(),
  }),
  asistencia_problema: z.object({
    ...comun,
    alumno: z.string().min(1),
    hora: hhmm,
    nota: z.string().max(500).optional(),
    urlMensajes: url.optional(),
  }),
  resumen_llegadas: z.object({
    ...comun,
    llegadas: z.array(z.object({ alumno: z.string().min(1), hora: hhmm })).min(1),
    /** AAAA-MM-DD; evita enviar dos resúmenes el mismo día. */
    fecha: fechaIso.optional(),
  }),
  mensaje_nuevo: z.object({ ...comun, remitente: z.string().min(1), alumno: z.string().min(1), url }),
  comunicado: z.object({ ...comun, titulo: z.string().min(1), url }),
  invitacion: z.object({ ...comun, nombre: z.string().min(1), rol: z.string().min(1), url }),
  justificacion_revisada: z.object({
    ...comun,
    alumno: z.string().min(1),
    /** AAAA-MM-DD de la falta. */
    fecha: fechaIso,
    estado: z.enum(["aceptada", "rechazada"]),
    comentario: z.string().max(500).optional(),
  }),
  justificacion_recibida: z.object({ ...comun, alumno: z.string().min(1), fecha: fechaIso, url }),
  tarea_nueva: z.object({
    ...comun,
    /** Nombre(s) de los hijos de esa familia en el salón; si falta, el texto no nombra al alumno. */
    alumno: z.string().min(1).optional(),
    curso: z.string().min(1),
    titulo: z.string().min(1),
    /** AAAA-MM-DD (fecha de entrega en Lima). */
    fechaEntrega: fechaIso,
    url,
  }),
  alerta_rebote: z.object({
    ...comun,
    apoderado: z.string().min(1),
    alumnos: z.array(z.string().min(1)).default([]),
    /** Texto para personas, p. ej. «el correo rebotó». */
    motivo: z.string().min(1),
    url,
  }),
} as const;

export type NombrePlantilla = keyof typeof ESQUEMAS;
export type PayloadDe<N extends NombrePlantilla> = z.input<(typeof ESQUEMAS)[N]>;

export const NOMBRES_PLANTILLA = Object.keys(ESQUEMAS) as NombrePlantilla[];

const RENDERIZADORES: { [N in NombrePlantilla]: (p: z.output<(typeof ESQUEMAS)[N]>) => Mensaje } = {
  asistencia_llego: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `${p.alumno} llegó al colegio`,
      insignia: "llego",
      parrafos: [`${p.alumno} llegó al colegio a las ${hora12(p.hora)}`],
      urlPreferencias: p.urlPreferencias,
    }),

  asistencia_tarde: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `${p.alumno} llegó tarde hoy`,
      insignia: "tarde",
      parrafos: [`${p.alumno} llegó tarde hoy (${hora12(p.hora)}). Si tienes dudas, escríbele a su tutora.`],
      urlPreferencias: p.urlPreferencias,
    }),

  asistencia_falta: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `${p.alumno} no llegó hoy`,
      insignia: "falta",
      parrafos: [`${p.alumno} no llegó hoy ${p.momento}. Si ya lo sabías, puedes justificar la falta.`],
      boton: p.urlJustificar ? { texto: "Justificar falta", url: p.urlJustificar } : undefined,
      urlPreferencias: p.urlPreferencias,
    }),

  asistencia_problema: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `Aviso del colegio sobre ${p.alumno}`,
      insignia: "problema",
      parrafos: [
        `Hoy, a las ${hora12(p.hora)}, el colegio registró una situación con ${p.alumno} que necesita tu atención.`,
        ...(p.nota ? [`Detalle: ${p.nota}`] : []),
        "Por favor, escríbele a su tutora para conversarlo.",
      ],
      boton: p.urlMensajes ? { texto: "Escribir a la tutora", url: p.urlMensajes } : undefined,
      urlPreferencias: p.urlPreferencias,
    }),

  resumen_llegadas: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: "Llegadas de hoy",
      insignia: "llego",
      parrafos: p.llegadas.map((l) => `${l.alumno} llegó al colegio a las ${hora12(l.hora)}`),
      urlPreferencias: p.urlPreferencias,
    }),

  mensaje_nuevo: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `Nuevo mensaje de ${p.remitente}`,
      insignia: "info",
      palabraInsignia: "Mensaje",
      parrafos: [`${p.remitente} te escribió sobre ${p.alumno}.`],
      boton: { texto: "Leer mensaje", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  comunicado: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `Comunicado: ${p.titulo}`,
      insignia: "info",
      palabraInsignia: "Comunicado",
      parrafos: [`${p.colegio} publicó un comunicado: «${p.titulo}».`],
      boton: { texto: "Leer comunicado", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  invitacion: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `${p.colegio} te invita a Khipu Escolar`,
      parrafos: [`Hola, ${p.nombre}.`, `${p.colegio} te invitó a Khipu Escolar como ${p.rol}.`],
      boton: { texto: "Aceptar invitación", url: p.url },
    }),

  justificacion_revisada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `Justificación de ${p.alumno} revisada`,
      insignia: "info",
      palabraInsignia: p.estado === "aceptada" ? "Aceptada" : "No aceptada",
      parrafos: [
        `El colegio revisó la justificación de la falta de ${p.alumno} del ${fechaCorta(p.fecha)}.`,
        p.estado === "aceptada"
          ? "La falta quedó justificada."
          : "La justificación no fue aceptada. Si tienes dudas, escríbele a su tutora.",
        ...(p.comentario ? [`Comentario: ${p.comentario}`] : []),
      ],
      urlPreferencias: p.urlPreferencias,
    }),

  justificacion_recibida: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `Nueva justificación de ${p.alumno}`,
      insignia: "info",
      palabraInsignia: "Justificación",
      parrafos: [`La familia de ${p.alumno} justificó la falta del ${fechaCorta(p.fecha)}.`, "Revísala para aceptarla o rechazarla."],
      boton: { texto: "Revisar justificación", url: p.url },
    }),

  tarea_nueva: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `Nueva tarea de ${p.curso}`,
      insignia: "info",
      palabraInsignia: "Tarea",
      parrafos: [
        `${p.alumno ? `${p.alumno} tiene` : "Hay"} una tarea nueva de ${p.curso}: «${p.titulo}».`,
        `Se entrega el ${fechaCorta(p.fechaEntrega)}.`,
      ],
      boton: { texto: "Ver tareas", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  alerta_rebote: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `Correo desactivado: ${p.apoderado}`,
      insignia: "problema",
      palabraInsignia: "Correo desactivado",
      parrafos: [
        `Dejamos de enviar avisos por correo a ${p.apoderado}${p.alumnos.length ? ` (familia de ${p.alumnos.join(", ")})` : ""} porque ${p.motivo}.`,
        "Revisa su correo con la familia y actualízalo para que vuelva a recibir avisos.",
      ],
      boton: { texto: "Ver avisos", url: p.url },
    }),
};

export class PlantillaInvalidaError extends Error {}

export function esPlantilla(nombre: string): nombre is NombrePlantilla {
  return Object.hasOwn(ESQUEMAS, nombre);
}

/** Valida el payload y renderiza el mensaje. Lanza PlantillaInvalidaError si la plantilla o el payload no sirven. */
export function renderizarPlantilla(nombre: string, payload: unknown): Mensaje {
  if (!esPlantilla(nombre)) throw new PlantillaInvalidaError(`Plantilla desconocida: ${nombre}`);
  const datos = ESQUEMAS[nombre].safeParse(payload);
  if (!datos.success) throw new PlantillaInvalidaError(`Payload inválido para ${nombre}: ${datos.error.issues[0]?.message}`);
  const renderizar = RENDERIZADORES[nombre] as (p: unknown) => Mensaje;
  return renderizar(datos.data);
}
