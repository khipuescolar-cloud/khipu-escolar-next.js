// Comunicación del día a día en Nuevo Horizonte: tareas (vencidas, de esta semana y próximas), agenda, comunicados
// (todo el colegio y por salón, con sus avisos), chats familia ↔ profesor (algunos sin leer), textos del colegio
// y conversaciones con la mesa de ayuda de Khipu. Fechas relativas a hoy (Lima), en días hábiles.
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import type { EstadoAviso } from "../src/generated/prisma/enums";
import { feriadosNacionalesConNombre } from "../src/lib/dias-habiles";
import { NOMBRE_COLEGIO, SLUG_COLEGIO, crearAzar, diaHabil, fechaDb, hoyLima, instante, sumarDias } from "./seed-utilidades";

const TAREAS: Record<string, [string, string | null][]> = {
  Matemática: [["Ficha de fracciones (pág. 42–43)", null], ["Problemas de multiplicación con dos cifras", "Resolver del 1 al 10 en el cuaderno."], ["Tabla de doble entrada con datos del salón", null], ["Practicar las tablas del 6 al 9", "10 minutos diarios con la familia."]],
  Comunicación: [["Leer «El zorro y el cóndor» y resumirlo", null], ["Escribir una carta a un familiar", "Mínimo 10 líneas, con letra clara."], ["Fichas de ortografía: uso de la b y la v", null], ["Preparar la exposición del cuento favorito", null]],
  "Ciencia y Tecnología": [["Maqueta del ciclo del agua", "Con materiales reciclados."], ["Germinar una semilla y registrar su crecimiento", null], ["Cuestionario sobre el sistema digestivo", null]],
  Inglés: [["Vocabulary: family members", "Write 10 sentences."], ["Workbook pages 30–31", null], ["Record a short video introducing yourself", null]],
  "Personal Social": [["Árbol genealógico de la familia", null]],
};
const TAREAS_SEC: Record<string, [string, string | null][]> = {
  Matemática: [["Ejercicios de ecuaciones lineales (pág. 58)", null], ["Problemas de proporcionalidad", "Traer la calculadora para revisar en clase."], ["Práctica de funciones", null]],
  Comunicación: [["Ensayo: el uso responsable de redes sociales", "Entre 300 y 400 palabras."], ["Análisis de «Los ríos profundos» (cap. 1–3)", null], ["Infografía sobre un autor peruano", null]],
  "Ciencia y Tecnología": [["Informe de laboratorio: densidad", null], ["Mapa conceptual de la célula", null], ["Proyecto: filtro de agua casero", "Trabajo en grupos de 4."]],
  Inglés: [["Essay: my favourite place in Peru", null], ["Listening practice: unit 5", null], ["Grammar worksheet: past simple", null]],
};

const COMENTARIO_CHAT: [string, string, string][] = [
  ["Buenos días, ¿podría decirme cómo va en lectura?", "Buenos días. Va mejorando; le recomiendo leer 15 minutos diarios en casa.", "Muchas gracias, lo haremos."],
  ["Profesora, mañana saldrá temprano por una cita médica a las 11.", "Gracias por avisar. Que pase a recogerlo por secretaría.", "Perfecto, así lo haré."],
  ["¿La tarea de ciencias es individual o en grupo?", "Es individual. La fecha de entrega está en Tareas.", "Entendido, gracias."],
  ["Disculpe, no encontramos la ficha de matemática.", "No se preocupe, mañana le envío otra copia en su fólder.", "Gracias por su comprensión."],
  ["Buenas tardes, ¿hay reunión de padres este mes?", "Sí, la fecha está en Reuniones. Allí puede confirmar su asistencia.", "Ya confirmé, gracias."],
];

export async function sembrarComunicacion(prisma: PrismaClient) {
  const nh = await prisma.tenant.findUnique({ where: { slug: SLUG_COLEGIO } });
  if (!nh) return;
  const tenantId = nh.id;
  const azar = crearAzar(707);
  const hoy = hoyLima();
  const direccion = await prisma.membership.findFirstOrThrow({ where: { tenantId, rol: "direccion" } });
  const salones = await prisma.salon.findMany({
    where: { tenantId },
    orderBy: { nombre: "asc" },
    include: {
      cursos: true,
      alumnos: { where: { estado: "activo" }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], include: { apoderados: { include: { consentimiento: true, apoderado: { include: { user: true } } } } } },
    },
  });
  const salon = (nombre: string) => salones.find((s) => s.nombre === nombre)!;

  // ───────── Tareas ─────────
  const tareas: Prisma.TareaCreateManyInput[] = [];
  for (const s of salones) {
    if (s.nivel === "inicial") {
      const c = s.cursos.find((x) => x.nombre === "Comunicación")!;
      tareas.push({ tenantId, cursoId: c.id, titulo: "Traer su cuento favorito para compartir", fechaEntrega: instante(diaHabil(hoy, 2)), creadoPorId: c.profesorId!, createdAt: instante(diaHabil(hoy, -2), "15:00") });
      continue;
    }
    const banco = s.nivel === "secundaria" ? TAREAS_SEC : TAREAS;
    for (const c of s.cursos.filter((x) => banco[x.nombre])) {
      const opciones = banco[c.nombre];
      // Una vencida, una de esta semana y una próxima (desfasadas por salón para que no caigan todas el mismo día).
      [-azar.entero(3, 7), azar.entero(1, 3), azar.entero(6, 10)].forEach((dias, i) => {
        const [titulo, descripcion] = opciones[(i + s.nombre.length) % opciones.length];
        tareas.push({ tenantId, cursoId: c.id, titulo, descripcion, fechaEntrega: instante(diaHabil(hoy, dias)), creadoPorId: c.profesorId!, createdAt: instante(diaHabil(hoy, Math.min(dias, 0) - 3), "16:00") });
      });
    }
  }
  await prisma.tarea.createMany({ data: tareas });

  // ───────── Agenda ─────────
  const anio = Number(hoy.slice(0, 4));
  const feriados = [...feriadosNacionalesConNombre(anio), ...feriadosNacionalesConNombre(anio + 1)].filter((f) => f.fecha >= sumarDias(hoy, -30) && f.fecha <= sumarDias(hoy, 60));
  const eventos: Prisma.EventoAgendaCreateManyInput[] = [
    ...feriados.map((f) => ({ tenantId, titulo: `Feriado: ${f.nombre}`, tipo: "feriado" as const, inicio: fechaDb(f.fecha), creadoPorId: direccion.id })),
    { tenantId, titulo: "Reunión de padres de familia", descripcion: "Entrega de avances del bimestre.", tipo: "reunion", inicio: instante(diaHabil(hoy, 5), "18:30"), creadoPorId: direccion.id },
    { tenantId, titulo: "Simulacro escolar de sismo", descripcion: "A las 10 a. m. Todos participan.", tipo: "actividad", inicio: instante(diaHabil(hoy, 8), "10:00"), creadoPorId: direccion.id },
    { tenantId, titulo: "Día del Logro", descripcion: "Exposición de proyectos para las familias.", tipo: "evento", inicio: instante(diaHabil(hoy, 25), "09:00"), fin: instante(diaHabil(hoy, 25), "12:00"), creadoPorId: direccion.id },
    { tenantId, titulo: "Paseo de integración", tipo: "actividad", inicio: instante(diaHabil(hoy, -9), "08:00"), creadoPorId: direccion.id },
    { tenantId, titulo: "Campaña de vacunación", descripcion: "En coordinación con el centro de salud.", tipo: "evento", inicio: instante(diaHabil(hoy, -4), "09:00"), creadoPorId: direccion.id },
  ];
  for (const s of salones.filter((x) => x.nivel !== "inicial")) {
    eventos.push({ tenantId, salonId: s.id, titulo: `Examen bimestral de Matemática · ${s.nombre}`, tipo: "examen", inicio: instante(diaHabil(hoy, 7 + (s.grado ?? 0) % 3), "08:00"), creadoPorId: s.cursos.find((c) => c.nombre === "Matemática")!.profesorId! });
  }
  eventos.push({ tenantId, salonId: salon("Inicial 4 años").id, titulo: "Día del juego", tipo: "actividad", inicio: instante(diaHabil(hoy, 3), "09:00"), creadoPorId: salon("Inicial 4 años").tutorId! });
  await prisma.eventoAgenda.createMany({ data: eventos });

  // ───────── Comunicados (con sus avisos) ─────────
  const proximoFeriado = feriados.find((f) => f.fecha > hoy);
  const comunicados: { salon?: string; autorId: string; titulo: string; cuerpo: string; dias: number }[] = [
    { autorId: direccion.id, titulo: "Bienvenidos a Khipu Escolar", cuerpo: "Desde hoy recibirás los avisos de asistencia por correo. Si tienes dudas, escribe a la tutora desde Mensajes.", dias: -40 },
    { autorId: direccion.id, titulo: "Entrega de libretas", cuerpo: "Las libretas del bimestre anterior ya están disponibles en Khipu. Puedes descargarlas en PDF desde Libreta.", dias: -15 },
    { autorId: direccion.id, titulo: "Campaña de vacunación en el colegio", cuerpo: "El centro de salud vacunará contra la influenza. Si no deseas que tu hijo o hija participe, avísale a la tutora.", dias: -8 },
    { autorId: direccion.id, titulo: "Simulacro escolar de sismo", cuerpo: "Realizaremos un simulacro. Conversa en casa sobre la mochila de emergencia y las zonas seguras.", dias: -2 },
    ...(proximoFeriado ? [{ autorId: direccion.id, titulo: `No hay clases el ${proximoFeriado.fecha.slice(8)}/${proximoFeriado.fecha.slice(5, 7)}`, cuerpo: `Por el feriado (${proximoFeriado.nombre}) no habrá clases. Retomamos al siguiente día hábil en el horario de siempre.`, dias: -1 }] : []),
    { salon: "3.° B", autorId: salon("3.° B").tutorId!, titulo: "Materiales para el proyecto de ciencias", cuerpo: "Para el viernes: 2 botellas recicladas, tijera punta roma y témperas. Gracias por su apoyo.", dias: -3 },
    { salon: "5.° A", autorId: salon("5.° A").tutorId!, titulo: "Salida pedagógica al Museo de Historia Natural", cuerpo: "Saldremos a las 8:30 a. m. y volveremos a las 12:30 p. m. Enviar la autorización firmada en la agenda.", dias: -5 },
    { salon: "1.° A Sec.", autorId: salon("1.° A Sec.").tutorId!, titulo: "Elección del comité de aula", cuerpo: "En la próxima reunión elegiremos el comité de aula. Si deseas postular, avísame por Mensajes.", dias: -6 },
    { salon: "Inicial 4 años", autorId: salon("Inicial 4 años").tutorId!, titulo: "Día del juego", cuerpo: "Los niños pueden traer su juguete favorito (sin piezas pequeñas). Viene con ropa cómoda.", dias: -1 },
  ];
  const estadoAviso = (): EstadoAviso => { const r = azar.num(); return r < 0.55 ? "abierto" : r < 0.85 ? "entregado" : r < 0.97 ? "enviado" : "rebotado"; };
  const avisos: Prisma.AvisoCreateManyInput[] = [];
  for (const c of comunicados) {
    const publicadoAt = instante(diaHabil(hoy, c.dias), "17:00");
    const s = c.salon ? salon(c.salon) : null;
    const creado = await prisma.comunicado.create({ data: { tenantId, autorId: c.autorId, salonId: s?.id ?? null, titulo: c.titulo, cuerpo: c.cuerpo, publicadoAt } });
    const familias = new Map<string, string>();
    for (const x of (s ? [s] : salones).flatMap((y) => y.alumnos).flatMap((a) => a.apoderados)) {
      if (x.consentimiento && !x.consentimiento.revocadoAt) familias.set(x.apoderadoId, x.apoderado.user.email);
    }
    for (const [apoderadoId, destinatario] of familias) {
      const estado = estadoAviso();
      avisos.push({
        tenantId, tipo: "comunicado", canal: "correo", apoderadoId, destinatario, plantilla: "comunicado", asunto: c.titulo,
        payload: { colegio: NOMBRE_COLEGIO, titulo: c.titulo }, referenciaId: creado.id, estado, intentos: 1, programadoPara: publicadoAt, createdAt: publicadoAt,
        enviadoAt: new Date(publicadoAt.getTime() + 60_000), entregadoAt: estado === "entregado" || estado === "abierto" ? new Date(publicadoAt.getTime() + 90_000) : null,
        abiertoAt: estado === "abierto" ? new Date(publicadoAt.getTime() + azar.entero(10, 600) * 60_000) : null,
      });
    }
  }
  await prisma.aviso.createMany({ data: avisos });

  // ───────── Mensajes familia ↔ profesor ─────────
  // `sinLeer`: «profesor» = el último mensaje de la familia aún no lo lee el profesor; «familia» = al revés.
  // Lucía no tiene mensajes sin leer (los e2e cuentan exactamente el que crean); Pedro y otros tutores sí.
  const chats: { alumno: string; salon: string; profesor?: string; sinLeer: "ninguno" | "profesor" | "familia"; guion: number }[] = [
    { alumno: "Mateo", salon: "3.° B", sinLeer: "ninguno", guion: 0 },
    { alumno: "Valentina", salon: "3.° B", sinLeer: "familia", guion: 1 },
    { alumno: "Camila", salon: "3.° B", sinLeer: "ninguno", guion: 3 },
    { alumno: "Lucas", salon: "5.° A", sinLeer: "profesor", guion: 2 },
    { alumno: "Thiago", salon: "5.° A", sinLeer: "profesor", guion: 4 },
    { alumno: "Ximena", salon: "5.° A", sinLeer: "ninguno", guion: 0 },
    { alumno: "Sofía", salon: "1.° A Sec.", sinLeer: "familia", guion: 4 },
    { alumno: "Sofía", salon: "1.° A Sec.", profesor: "Inglés", sinLeer: "ninguno", guion: 2 },
  ];
  // Más conversaciones en otros salones.
  for (const s of salones.filter((x) => !["3.° B", "5.° A", "1.° A Sec."].includes(x.nombre)).filter((_, i) => i % 3 === 0)) {
    const a = s.alumnos.find((x) => x.apoderados.some((y) => y.consentimiento && !y.consentimiento.revocadoAt));
    if (a) chats.push({ alumno: a.nombres, salon: s.nombre, sinLeer: azar.prob(0.5) ? "profesor" : "familia", guion: azar.entero(0, COMENTARIO_CHAT.length - 1) });
  }
  for (const [i, ch] of chats.entries()) {
    const s = salon(ch.salon);
    const a = s.alumnos.find((x) => x.nombres === ch.alumno)!;
    const fam = a.apoderados.find((x) => x.consentimiento && !x.consentimiento.revocadoAt) ?? a.apoderados[0];
    const profesorId = ch.profesor ? s.cursos.find((c) => c.nombre === ch.profesor)!.profesorId! : s.tutorId!;
    const conv = await prisma.conversacion.create({ data: { tenantId, alumnoId: a.id, profesorId, apoderadoId: fam.apoderadoId, createdAt: instante(diaHabil(hoy, -(i % 6) - 2), "07:10") } });
    const [m1, m2, m3] = COMENTARIO_CHAT[ch.guion];
    const base = instante(diaHabil(hoy, -(i % 5) - 1), "19:05").getTime();
    const filas = [
      { autorId: fam.apoderadoId, cuerpo: m1, t: base },
      { autorId: profesorId, cuerpo: m2, t: base + 13 * 3600_000 },
      ...(ch.sinLeer === "familia" ? [] : [{ autorId: fam.apoderadoId, cuerpo: m3, t: base + 14 * 3600_000 }]),
    ];
    await prisma.mensaje.createMany({
      data: filas.map((m, j) => {
        const ultimo = j === filas.length - 1;
        const leido = !(ultimo && ch.sinLeer !== "ninguno");
        return { tenantId, conversacionId: conv.id, autorId: m.autorId, cuerpo: m.cuerpo, createdAt: new Date(m.t), leidoAt: leido ? new Date(m.t + 30 * 60_000) : null };
      }),
    });
  }

  // ───────── Textos del colegio (para Nudito y la ficha del colegio) ─────────
  await prisma.documentoColegio.createMany({
    data: [
      { tenantId, tipo: "horario", titulo: "Horario de ingreso", contenido: "El ingreso es de 7:30 a. m. a 7:55 a. m. Desde las 8:00 a. m. se registra tardanza. La salida de inicial es a las 12:30 p. m., la de primaria a la 1:30 p. m. y la de secundaria a las 2:45 p. m." },
      { tenantId, tipo: "reglamento", titulo: "Uniforme", contenido: "Los lunes se usa uniforme de gala. Martes a viernes, buzo del colegio." },
      { tenantId, tipo: "reglamento", titulo: "Justificación de faltas", contenido: "Las faltas se justifican hasta 15 días hábiles después, desde el enlace del aviso o desde Justificaciones." },
    ],
  });

  // ───────── Mesa de ayuda de Khipu (specs/23) ─────────
  const admin = await prisma.profile.findUnique({ where: { email: "admin@khipuescolar.demo" } });
  const dirPerfil = await prisma.profile.findUniqueOrThrow({ where: { id: direccion.userId } });
  const t1 = instante(diaHabil(hoy, -6), "10:20");
  await prisma.ticketSoporte.create({
    data: {
      tenantId, asunto: "¿Cómo cambio el correo de un apoderado?", categoria: "cuentas_accesos", prioridad: "normal", estado: "resuelto", creadoPorId: direccion.id,
      asignadoAId: admin?.id ?? null, ultimoMensajeAt: new Date(t1.getTime() + 5 * 3600_000), primeraRespuestaAt: new Date(t1.getTime() + 2 * 3600_000),
      resueltoAt: new Date(t1.getTime() + 5 * 3600_000), leidoColegioHasta: new Date(t1.getTime() + 6 * 3600_000), leidoKhipuHasta: new Date(t1.getTime() + 5 * 3600_000),
      valoracion: 5, comentarioValoracion: "Muy rápidos, gracias.", createdAt: t1,
      mensajes: { create: [
        { tenantId, autor: "colegio", autorId: dirPerfil.id, cuerpo: "Una mamá cambió de correo. ¿Dónde lo actualizo?", createdAt: t1 },
        { tenantId, autor: "khipu", autorId: admin?.id ?? null, cuerpo: "En Gestión → Familias, abre su ficha y usa «Editar datos». Le llegará la invitación al correo nuevo.", createdAt: new Date(t1.getTime() + 2 * 3600_000) },
        { tenantId, autor: "colegio", autorId: dirPerfil.id, cuerpo: "Listo, funcionó. Gracias.", createdAt: new Date(t1.getTime() + 5 * 3600_000) },
      ] },
    },
  });
  const t2 = instante(diaHabil(hoy, -1), "16:40");
  await prisma.ticketSoporte.create({
    data: {
      tenantId, asunto: "Sugerencia: exportar la agenda a Google Calendar", categoria: "sugerencia", prioridad: "baja", estado: "abierto", creadoPorId: direccion.id,
      ultimoMensajeAt: t2, leidoColegioHasta: t2, createdAt: t2,
      mensajes: { create: [{ tenantId, autor: "colegio", autorId: dirPerfil.id, cuerpo: "Sería útil que las familias puedan suscribirse a la agenda desde su celular.", createdAt: t2 }] },
    },
  });
}
