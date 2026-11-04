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
const comun = { colegio: z.string().min(1), urlPreferencias: url.optional(), logoColegioUrl: url.optional() };
/** Avisos de asistencia: «Buenos días, Rosa.» (nombre del apoderado y momento del día, armado al encolar). */
const saludo = { saludo: z.string().max(80).optional() };

const reunionBase = {
  titulo: z.string().min(1),
  fecha: fechaIso,
  hora: hhmm,
  lugar: z.string().optional(),
  enlace: z.string().optional(),
  /** Hijo(s) por los que se cita; si falta, el texto no los nombra. */
  alumno: z.string().min(1).optional(),
  /** specs/40: duración en minutos, organizador y modalidad (opcionales: las filas antiguas no los traen). */
  duracion: z.number().int().positive().optional(),
  organizador: z.string().min(1).optional(),
  modalidad: z.string().min(1).optional(),
  url,
};

/** «Es el lunes 17 de noviembre a las 10:00 a. m. (45 min). Organiza: … Modalidad: … Lugar: … Enlace: …» */
function detalleReunion(p: { fecha: string; hora: string; duracion?: number; organizador?: string; modalidad?: string; lugar?: string; enlace?: string }): string {
  return [
    `Es el ${fechaCorta(p.fecha)} a las ${hora12(p.hora)}${p.duracion ? ` (${p.duracion} min)` : ""}.`,
    p.organizador ? ` Organiza: ${p.organizador}.` : "",
    p.modalidad ? ` Modalidad: ${p.modalidad}.` : "",
    p.lugar ? ` Lugar: ${p.lugar}.` : "",
    p.enlace ? ` Enlace: ${p.enlace}` : "",
  ].join("");
}

const ESQUEMAS = {
  asistencia_llego: z.object({ ...comun, ...saludo, alumno: z.string().min(1), hora: hhmm }),
  /** Control de ingreso (specs/05): a la hora de tardanza el alumno aún no registra ingreso al colegio. */
  asistencia_no_llega: z.object({ ...comun, ...saludo, alumno: z.string().min(1), horaTardanza: hhmm, horaFalta: hhmm }),
  asistencia_tarde: z.object({
    ...comun,
    ...saludo,
    alumno: z.string().min(1),
    hora: hhmm,
    /** Lista de un curso (specs/04): «llegó tarde a Matemática (10:12 a. m.)». Sin curso, es la llegada al colegio. */
    curso: z.string().min(1).optional(),
  }),
  asistencia_falta: z.object({
    ...comun,
    ...saludo,
    /** Falta puesta por el control de ingreso: no ingresó al colegio hasta esta hora (specs/05). */
    horaLimite: hhmm.optional(),
    alumno: z.string().min(1),
    /** «a la 1.ª hora» (asistencia del día) o «a Matemática». */
    momento: z.string().default("a la 1.ª hora"),
    /** Falta a una clase (lista de un curso) de un alumno que sí ingresó al colegio (specs/04). */
    curso: z.string().min(1).optional(),
    /** Hora de ingreso al colegio ese día (portería o lista del día). */
    ingreso: hhmm.optional(),
    /** Hora en que se pasó la lista del curso. */
    horaClase: hhmm.optional(),
    /** La arma el worker a partir de `justificacionTokenId`; nunca se guarda el token en la BD. */
    urlJustificar: url.optional(),
    justificacionTokenId: z.string().optional(),
  }),
  asistencia_problema: z.object({
    ...comun,
    ...saludo,
    alumno: z.string().min(1),
    hora: hhmm,
    nota: z.string().max(500).optional(),
    urlMensajes: url.optional(),
  }),
  mensaje_nuevo: z.object({ ...comun, remitente: z.string().min(1), alumno: z.string().min(1), url }),
  comunicado: z.object({ ...comun, titulo: z.string().min(1), url, adjuntos: z.number().int().min(0).optional() }),
  invitacion: z.object({ ...comun, nombre: z.string().min(1), rol: z.string().min(1), url }),
  /** Bienvenida con credenciales: el usuario es el correo y la contraseña inicial es su documento (no se envía el número). */
  bienvenida: z.object({
    ...comun,
    nombre: z.string().min(1),
    rol: z.string().min(1),
    email: z.string().min(1),
    /** «DNI», «carné de extranjería» o «pasaporte». */
    documento: z.string().min(1),
    /** false si la persona ya tenía cuenta en Khipu (conserva su contraseña). */
    cuentaNueva: z.boolean().default(true),
    /** true tras «Restablecer contraseña al documento»: el correo avisa del restablecimiento en vez de dar la bienvenida. */
    restablecida: z.boolean().optional(),
    url,
    /** Dirección del colegio para mostrar, p. ej. «nuevohorizonte.<APP_BASE_DOMAIN>». */
    dominio: z.string().min(1),
  }),
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
  /** Documento nuevo en la biblioteca (specs/31). */
  documento_nuevo: z.object({ ...comun, titulo: z.string().min(1), carpeta: z.string().min(1).optional(), url }),
  /** Reuniones (specs/32). `fecha` AAAA-MM-DD y `hora` HH:mm en hora del colegio. */
  reunion_convocada: z.object({ ...comun, ...reunionBase }),
  reunion_recordatorio: z.object({ ...comun, ...reunionBase }),
  reunion_cancelada: z.object({ ...comun, ...reunionBase }),
  reunion_acta: z.object({ ...comun, ...reunionBase }),
  reunion_reprogramada: z.object({ ...comun, ...reunionBase }),
  /** Una familia pide una reunión al docente (al docente). */
  reunion_solicitada: z.object({ ...comun, ...reunionBase, solicitante: z.string().min(1) }),
  /** Respuesta de un participante o acuerdo asignado (solo bandeja y push al organizador o responsable). */
  reunion_respuesta: z.object({ colegio: z.string().min(1), titulo: z.string().min(1), texto: z.string().min(1), url }),
  libreta_publicada: z.object({
    ...comun,
    /** Nombre(s) de los hijos de esa familia; si falta, el texto no nombra al alumno. */
    alumno: z.string().min(1).optional(),
    /** «I Bimestre 2026». */
    periodo: z.string().min(1),
    url,
  }),
  /** Evaluación programada por el profesor (specs/11). `fecha` AAAA-MM-DD. */
  evaluacion_programada: z.object({
    ...comun,
    alumno: z.string().min(1).optional(),
    curso: z.string().min(1),
    titulo: z.string().min(1),
    fecha: fechaIso,
    descripcion: z.string().min(1).optional(),
    url,
  }),
  /**
   * Push de la bandeja interna (specs/38): título y cuerpo ya armados SIN notas (se ven en la pantalla bloqueada).
   * `tag` agrupa en el dispositivo las notificaciones del mismo alumno.
   */
  notificacion_academica: z.object({ ...comun, titulo: z.string().min(1).max(80), cuerpo: z.string().min(1).max(200), url, tag: z.string().max(80).optional() }),
  /** Calificación publicada que cambió (specs/37). Sin valores en el correo: el detalle está en Khipu. */
  nota_corregida: z.object({
    ...comun,
    alumno: z.string().min(1),
    curso: z.string().min(1),
    titulo: z.string().min(1),
    motivo: z.enum(["correccion_digitacion", "cambio_asistencia", "consecuencia_vencimiento", "otra"]),
    url,
  }),
  /** Recuperación académica registrada en la actividad original (specs/37). */
  recuperacion_registrada: z.object({ ...comun, alumno: z.string().min(1), curso: z.string().min(1), titulo: z.string().min(1), url }),
  /** Al profesor: el colegio aprobó la justificación de una falta con actividades de su curso (specs/37). */
  justificacion_aprobada_docente: z.object({
    ...comun,
    alumno: z.string().min(1),
    fecha: fechaIso,
    curso: z.string().min(1),
    actividades: z.array(z.string().min(1)).min(1).max(20),
    url,
  }),
  /** Al profesor: un alumno no estará en su clase por una incidencia o retiro anticipado (specs/37). Sin diagnóstico. */
  incidencia_docente: z.object({
    ...comun,
    alumno: z.string().min(1),
    fecha: fechaIso,
    hora: hhmm.optional(),
    curso: z.string().min(1),
    url,
  }),
  /** Informe de progreso a mitad del periodo de un curso (specs/11). */
  informe_progreso: z.object({
    ...comun,
    alumno: z.string().min(1).optional(),
    curso: z.string().min(1),
    /** «I Trimestre 2027». */
    periodo: z.string().min(1),
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
  /** A dirección cuando el equipo Khipu entra en modo soporte (specs/16). `hasta` en HH:mm (Lima). */
  soporte_inicio: z.object({ ...comun, hasta: hhmm, motivo: z.string().min(1).max(300), url }),
  /** Mesa de ayuda (specs/23): el equipo Khipu respondió. Sin el texto del mensaje (puede tener datos sensibles). */
  soporte_respuesta: z.object({ ...comun, asunto: z.string().min(1).max(200), url }),
  /** Mesa de ayuda (specs/23): al buzón del equipo Khipu cuando un colegio abre o escribe en una conversación. */
  soporte_nuevo: z.object({
    ...comun,
    asunto: z.string().min(1).max(200),
    /** «Normal», «Urgente»… */
    prioridad: z.string().min(1),
    /** true: conversación nueva; false: mensaje nuevo en una existente. */
    nueva: z.boolean().default(true),
    url,
  }),
  /** Nudito+ (specs/28): licencia activada, pago no confirmado o licencia por vencer. Lo firma el equipo Khipu. */
  nudito_plus: z.object({
    ...comun,
    alumno: z.string().min(1),
    /** Asunto y primera línea, p. ej. «Nudito+ está activo para Mateo». */
    titulo: z.string().min(1).max(160),
    parrafos: z.array(z.string().min(1).max(600)).min(1).max(4),
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
      logoColegioUrl: p.logoColegioUrl,
      asunto: `${p.alumno} llegó al colegio`,
      insignia: "llego",
      saludo: p.saludo,
      parrafos: [`${p.alumno} llegó al colegio a las ${hora12(p.hora)}`],
      urlPreferencias: p.urlPreferencias,
    }),

  asistencia_no_llega: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `${p.alumno} aún no llega al colegio`,
      insignia: "tarde",
      palabraInsignia: "Aún no llega",
      saludo: p.saludo,
      parrafos: [
        `${p.alumno} aún no se presenta en el colegio. La hora de ingreso fue a las ${hora12(p.horaTardanza)}.`,
        `Si llega antes de las ${hora12(p.horaFalta)}, te avisaremos a qué hora ingresó y tendrá tardanza. Si no llega, tendrá falta hoy y podrás justificarla.`,
      ],
      urlPreferencias: p.urlPreferencias,
    }),

  asistencia_tarde: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: p.curso ? `${p.alumno} llegó tarde a ${p.curso}` : `${p.alumno} llegó tarde hoy`,
      insignia: "tarde",
      saludo: p.saludo,
      parrafos: p.curso
        ? [`${p.alumno} llegó tarde a ${p.curso} (${hora12(p.hora)}). Si tienes dudas, escríbele a su tutora.`]
        : [
            `${p.alumno} acaba de ingresar al colegio a las ${hora12(p.hora)}, así que hoy tiene tardanza.`,
            "Si tienes dudas, escríbele a su tutora.",
          ],
      urlPreferencias: p.urlPreferencias,
    }),

  asistencia_falta: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: p.curso && p.ingreso ? `${p.alumno} no estuvo en ${p.curso}` : `${p.alumno} no llegó hoy`,
      insignia: "falta",
      saludo: p.saludo,
      parrafos: p.horaLimite
        ? [
            `${p.alumno} no se presentó en el colegio hasta las ${hora12(p.horaLimite)}, así que hoy tiene falta.`,
            "Por favor, justifícala con el botón de abajo. Si llega más tarde, el colegio registrará su ingreso.",
          ]
        : p.curso && p.ingreso
          ? [
              `${p.alumno} ingresó al colegio a las ${hora12(p.ingreso)}, pero no estuvo en ${p.curso}${p.horaClase ? ` (${hora12(p.horaClase)})` : ""}.`,
              "Si ya lo sabías, puedes justificar la falta. Si tienes dudas, escríbele a su tutora.",
            ]
          : [`${p.alumno} no llegó hoy ${p.momento}. Si ya lo sabías, puedes justificar la falta.`],
      boton: p.urlJustificar ? { texto: "Justificar falta", url: p.urlJustificar } : undefined,
      urlPreferencias: p.urlPreferencias,
    }),

  asistencia_problema: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Aviso del colegio sobre ${p.alumno}`,
      insignia: "problema",
      saludo: p.saludo,
      parrafos: [
        `Hoy, a las ${hora12(p.hora)}, el colegio registró una situación con ${p.alumno} que necesita tu atención.`,
        ...(p.nota ? [`Detalle: ${p.nota}`] : []),
        "Por favor, escríbele a su tutora para conversarlo.",
      ],
      boton: p.urlMensajes ? { texto: "Escribir a la tutora", url: p.urlMensajes } : undefined,
      urlPreferencias: p.urlPreferencias,
    }),

  mensaje_nuevo: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
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
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Comunicado: ${p.titulo}`,
      insignia: "info",
      palabraInsignia: "Comunicado",
      parrafos: [
        `${p.colegio} publicó un comunicado: «${p.titulo}».`,
        ...(p.adjuntos ? [p.adjuntos === 1 ? "Incluye 1 archivo adjunto." : `Incluye ${p.adjuntos} archivos adjuntos.`] : []),
      ],
      boton: { texto: "Leer comunicado", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  invitacion: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `${p.colegio} te invita a Khipu Escolar`,
      parrafos: [`Hola, ${p.nombre}.`, `${p.colegio} te invitó a Khipu Escolar como ${p.rol}.`],
      boton: { texto: "Aceptar invitación", url: p.url },
    }),

  bienvenida: (p) =>
    p.restablecida
      ? armarMensaje({
          colegio: p.colegio,
          logoColegioUrl: p.logoColegioUrl,
          asunto: `Restablecimos tu contraseña · ${p.colegio}`,
          parrafos: [
            `Hola, ${p.nombre}.`,
            "Restablecimos tu contraseña: ahora es tu número de documento. Al entrar te pediremos cambiarla.",
            `Tu usuario es: ${p.email}`,
            `La dirección de tu colegio es ${p.dominio}`,
          ],
          boton: { texto: "Ingresar a Khipu Escolar", url: p.url },
        })
      : armarMensaje({
          colegio: p.colegio,
          logoColegioUrl: p.logoColegioUrl,
          asunto: `Bienvenido(a) a Khipu Escolar · ${p.colegio}`,
          parrafos: [
            `Hola, ${p.nombre}.`,
            `${p.colegio} ya tiene Khipu Escolar y tienes acceso como ${p.rol}.`,
            `Tu usuario es: ${p.email}`,
            p.cuentaNueva
              ? `Tu contraseña inicial es tu número de ${p.documento}. Al entrar te pediremos cambiarla.`
              : "Entra con la contraseña que ya usas en Khipu Escolar.",
            `La dirección de tu colegio es ${p.dominio}`,
          ],
          boton: { texto: "Ingresar a Khipu Escolar", url: p.url },
        }),

  justificacion_revisada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
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
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Nueva justificación de ${p.alumno}`,
      insignia: "info",
      palabraInsignia: "Justificación",
      parrafos: [`La familia de ${p.alumno} justificó la falta del ${fechaCorta(p.fecha)}.`, "Revísala para aceptarla o rechazarla."],
      boton: { texto: "Revisar justificación", url: p.url },
    }),

  tarea_nueva: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Nueva tarea de ${p.curso}`,
      insignia: "info",
      palabraInsignia: "Tarea",
      nudito: true,
      parrafos: [
        `${p.alumno ? `${p.alumno} tiene` : "Hay"} una tarea nueva de ${p.curso}: «${p.titulo}».`,
        `Se entrega el ${fechaCorta(p.fechaEntrega)}.`,
      ],
      boton: { texto: "Ver tareas", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  documento_nuevo: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Nuevo documento: ${p.titulo}`,
      insignia: "info",
      palabraInsignia: "Documento",
      parrafos: [`El colegio publicó un documento nuevo: «${p.titulo}»${p.carpeta ? ` (carpeta ${p.carpeta})` : ""}.`, "Puedes verlo y descargarlo en la biblioteca de documentos."],
      boton: { texto: "Ver documentos", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  reunion_convocada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: "Khipu — Invitación a reunión",
      insignia: "info",
      palabraInsignia: "Reunión",
      parrafos: [
        `${p.colegio} te invita a la reunión «${p.titulo}»${p.alumno ? ` (por ${p.alumno})` : ""}.`,
        detalleReunion(p),
        "Cuéntanos si podrás asistir.",
      ],
      boton: { texto: "Responder", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  reunion_recordatorio: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Recordatorio: ${p.titulo}`,
      insignia: "info",
      palabraInsignia: "Reunión",
      nudito: true,
      parrafos: [
        `Aún no nos respondes si asistirás a la reunión «${p.titulo}»${p.alumno ? ` (por ${p.alumno})` : ""}.`,
        `Es el ${fechaCorta(p.fecha)} a las ${hora12(p.hora)}.${p.lugar ? ` Lugar: ${p.lugar}.` : ""}${p.enlace ? ` Enlace: ${p.enlace}` : ""}`,
      ],
      boton: { texto: "Responder", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  reunion_cancelada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Reunión cancelada: ${p.titulo}`,
      insignia: "info",
      palabraInsignia: "Cancelada",
      parrafos: [
        `La reunión «${p.titulo}» del ${fechaCorta(p.fecha)} a las ${hora12(p.hora)} se canceló.`,
        "Si el colegio fija una nueva fecha, te avisaremos.",
      ],
      boton: { texto: "Ver reuniones", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  reunion_reprogramada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Reunión reprogramada: ${p.titulo}`,
      insignia: "info",
      palabraInsignia: "Reprogramada",
      parrafos: [`La reunión «${p.titulo}»${p.alumno ? ` (por ${p.alumno})` : ""} cambió de fecha u hora.`, detalleReunion(p), "Cuéntanos si podrás asistir en el nuevo horario."],
      boton: { texto: "Responder", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  reunion_solicitada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Solicitud de reunión: ${p.titulo}`,
      insignia: "info",
      palabraInsignia: "Solicitud",
      parrafos: [`${p.solicitante} pide una reunión contigo${p.alumno ? ` sobre ${p.alumno}` : ""}.`, detalleReunion(p), "Confírmala, propón otra hora o recházala en Khipu."],
      boton: { texto: "Ver solicitud", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  reunion_respuesta: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: p.titulo,
      insignia: "info",
      palabraInsignia: "Reunión",
      parrafos: [p.texto],
      boton: { texto: "Ver reunión", url: p.url },
    }),

  reunion_acta: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Acta de la reunión: ${p.titulo}`,
      insignia: "info",
      palabraInsignia: "Acta",
      parrafos: [`Ya está disponible el acta de la reunión «${p.titulo}» del ${fechaCorta(p.fecha)}.`],
      boton: { texto: "Leer acta", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  libreta_publicada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `La libreta de ${p.periodo} ya está disponible`,
      insignia: "info",
      palabraInsignia: "Libreta",
      nudito: true,
      parrafos: [`${p.alumno ? `La libreta de ${p.alumno}` : "La libreta"} de ${p.periodo} ya está disponible.`, "Puedes verla y descargarla en PDF."],
      boton: { texto: "Ver libreta", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  evaluacion_programada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Evaluación de ${p.curso}: ${p.titulo} el ${fechaCorta(p.fecha)}`,
      insignia: "info",
      palabraInsignia: "Evaluación",
      parrafos: [
        `${p.alumno ? `${p.alumno} tendrá` : "Habrá"} la evaluación «${p.titulo}» de ${p.curso} el ${fechaCorta(p.fecha)}.`,
        ...(p.descripcion ? [p.descripcion] : []),
      ],
      boton: { texto: "Ver notas", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  notificacion_academica: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: p.titulo,
      insignia: "info",
      palabraInsignia: "Notas",
      parrafos: [p.cuerpo],
      boton: { texto: "Ver en Khipu", url: p.url },
      push: { cuerpo: p.cuerpo, url: p.url, tag: p.tag },
    }),

  nota_corregida: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Calificación actualizada: ${p.curso}`,
      insignia: "info",
      palabraInsignia: "Calificación",
      parrafos: [
        `Se actualizó la calificación de ${p.alumno} en «${p.titulo}» de ${p.curso}.`,
        {
          correccion_digitacion: "Motivo: corrección de un error al registrarla.",
          cambio_asistencia: "Motivo: se corrigió la asistencia de ese día.",
          consecuencia_vencimiento: "Motivo: venció el plazo para justificar la falta y se aplicó la regla del colegio.",
          otra: "Motivo: modificación autorizada por el profesor.",
        }[p.motivo],
      ],
      boton: { texto: "Ver la calificación", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  recuperacion_registrada: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Recuperación registrada: ${p.curso}`,
      insignia: "info",
      palabraInsignia: "Recuperación",
      parrafos: [`Se registró la recuperación de ${p.alumno} en «${p.titulo}» de ${p.curso}.`, "La nota está en Khipu."],
      boton: { texto: "Ver la nota", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  justificacion_aprobada_docente: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Falta justificada: ${p.alumno} (${fechaCorta(p.fecha)})`,
      insignia: "info",
      palabraInsignia: "Justificación",
      parrafos: [
        `La inasistencia de ${p.alumno} del ${fechaCorta(p.fecha)} fue justificada por su apoderado y aprobada por el colegio.`,
        `En ${p.curso} ese día tenía: ${p.actividades.join(", ")}.`,
        "Revisa esas actividades y, si corresponde según las normas y criterios del curso, considera una recuperación académica.",
        "La justificación no implica la obligación de realizar una nueva evaluación.",
      ],
      boton: { texto: "Abrir el registro auxiliar", url: p.url },
    }),

  incidencia_docente: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `${p.alumno} no estará en ${p.curso}`,
      insignia: "info",
      palabraInsignia: "Incidencia",
      parrafos: [
        `${p.alumno} tuvo una incidencia el ${fechaCorta(p.fecha)}${p.hora ? ` y se retiró a las ${hora12(p.hora)}` : ""}: no estará en ${p.curso}.`,
        "Su inasistencia a tu clase quedó registrada. Esto no autoriza por sí solo una recuperación académica.",
      ],
      boton: { texto: "Ver en Khipu", url: p.url },
    }),

  informe_progreso: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Informe de progreso de ${p.curso}`,
      insignia: "info",
      palabraInsignia: "Progreso",
      nudito: true,
      parrafos: [
        `${p.alumno ? `El informe de progreso de ${p.alumno}` : "El informe de progreso"} en ${p.curso} (${p.periodo}) ya está disponible.`,
        "Cuenta qué ha logrado, qué necesita mejorar y qué te recomendamos reforzar en casa.",
      ],
      boton: { texto: "Ver el informe", url: p.url },
      urlPreferencias: p.urlPreferencias,
    }),

  alerta_rebote: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `Correo desactivado: ${p.apoderado}`,
      insignia: "problema",
      palabraInsignia: "Correo desactivado",
      parrafos: [
        `Dejamos de enviar avisos por correo a ${p.apoderado}${p.alumnos.length ? ` (familia de ${p.alumnos.join(", ")})` : ""} porque ${p.motivo}.`,
        "Revisa su correo con la familia y actualízalo para que vuelva a recibir avisos.",
      ],
      boton: { texto: "Ver avisos", url: p.url },
    }),

  soporte_inicio: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: "El equipo de Khipu Escolar entró a tu colegio en modo soporte",
      insignia: "info",
      palabraInsignia: "Soporte",
      parrafos: [
        `El equipo de Khipu Escolar entró a tu colegio en modo soporte (solo lectura) hasta las ${p.hasta}.`,
        `Motivo: ${p.motivo}`,
        "No puede ver chats, notas ni libretas. Cada ingreso queda en la auditoría.",
      ],
      boton: { texto: "Ver auditoría", url: p.url },
    }),

  soporte_respuesta: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: `El equipo de Khipu respondió a tu consulta "${p.asunto}"`,
      insignia: "info",
      palabraInsignia: "Soporte",
      parrafos: [`El equipo de Khipu respondió a tu consulta "${p.asunto}".`, "Entra para leer la respuesta y seguir la conversación."],
      boton: { texto: "Ver conversación", url: p.url },
    }),

  soporte_nuevo: (p) =>
    armarMensaje({
      colegio: p.colegio,
      asunto: `${p.nueva ? "Nueva consulta" : "Nuevo mensaje"} de ${p.colegio}: ${p.asunto}`,
      insignia: "info",
      palabraInsignia: p.prioridad,
      parrafos: [
        p.nueva ? `${p.colegio} abrió una conversación en la mesa de ayuda.` : `${p.colegio} escribió en una conversación de la mesa de ayuda.`,
        `Asunto: ${p.asunto}`,
        `Prioridad: ${p.prioridad}`,
      ],
      boton: { texto: "Abrir en la mesa de ayuda", url: p.url },
    }),

  nudito_plus: (p) =>
    armarMensaje({
      colegio: p.colegio,
      logoColegioUrl: p.logoColegioUrl,
      asunto: p.titulo,
      insignia: "info",
      palabraInsignia: "Nudito+",
      parrafos: [p.titulo, ...p.parrafos],
      boton: { texto: "Ver Nudito+", url: p.url },
      urlPreferencias: p.urlPreferencias,
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
