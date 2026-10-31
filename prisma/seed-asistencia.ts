// Asistencia de Nuevo Horizonte (specs/04, 05, 06, 07, 27, 33): ~6 semanas de ingreso al colegio (días hábiles de clases,
// sin feriados ni vacaciones entre bimestres), listas de curso de las últimas 2 semanas que siguen el horario (specs/34:
// solo los días y horas en que el curso tiene bloque, con la hora de inicio del periodo; con casos «ingresó pero faltó»),
// las llegadas de hoy por portería en secundaria, justificaciones en todos los estados y el historial de avisos.
// Fechas relativas a hoy (Lima). Deterministas (azar con semilla).
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import type { EstadoAsistencia, EstadoAviso, EstadoJustificacion } from "../src/generated/prisma/enums";
import { esDiaHabil } from "../src/lib/dias-habiles";
import { enClases } from "./seed-colegio";
import { clasesDelDia, type BloqueCurso } from "./seed-horario";
import { NOMBRE_COLEGIO, SLUG_COLEGIO, crearAzar, diaHabil, diasHabilesAntes, fechaDb, hoyLima, instante } from "./seed-utilidades";

const DIAS_HISTORIAL = 30;
const DIAS_CURSOS = 10;
const MOTIVOS = ["Cita médica", "Tuvo fiebre y se quedó en casa.", "Malestar estomacal", "Viaje familiar por un velorio", "Control dental", "Se le pasó la movilidad", "Trámite del DNI con la familia"];
const COMENTARIOS_ACEPTADA = ["Gracias por avisar. Que se mejore.", "Recibido. Por favor, que se ponga al día con las tareas.", "Aceptada."];
const COMENTARIOS_RECHAZADA = ["Para faltas de más de un día se requiere constancia médica.", "El motivo no corresponde a una falta justificada según el reglamento."];
const NOTAS_AVISO = ["Llegó sin uniforme; se comunicó a la familia.", "Llegó con dolor de cabeza; descansó en tópico.", "Olvidó su lonchera; la familia la trajo a las 10."];

/** «12:50» + 12 → «13:02». */
const sumarMinutos = (hhmm: string, min: number) => {
  const t = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) + min;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export async function sembrarAsistencia(prisma: PrismaClient) {
  const nh = await prisma.tenant.findUnique({ where: { slug: SLUG_COLEGIO } });
  if (!nh) return;
  const tenantId = nh.id;
  const azar = crearAzar(4040);
  const hoy = hoyLima();
  const dias = diasHabilesAntes(hoy, DIAS_HISTORIAL, enClases);
  const porteria = await prisma.membership.findFirstOrThrow({ where: { tenantId, rol: "porteria" } });
  const salones = await prisma.salon.findMany({
    where: { tenantId },
    orderBy: { nombre: "asc" },
    include: {
      cursos: true,
      alumnos: {
        where: { estado: "activo" }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
        include: { apoderados: { include: { consentimiento: true, apoderado: { include: { user: { select: { email: true } } } } } } },
      },
    },
  });

  type Registro = Prisma.AsistenciaCreateManyInput & { id: string; estado: EstadoAsistencia };
  const asistencias: Registro[] = [];
  const hora = (min: number, max: number) => { const m = azar.entero(min, max); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

  // Faltas forzadas (las usan la documentación y las pruebas sugeridas): Mateo y Valentina, una reciente y una antigua.
  const forzadas: Record<string, number[]> = { "Mateo Quispe Huamán": [dias.length - 3, dias.length - 14], "Valentina Ríos Soto": [dias.length - 2, dias.length - 9] };

  const diaPorAlumno = new Map<string, Map<string, Registro>>();
  for (const s of salones) {
    const secundaria = s.nivel === "secundaria";
    // Perfiles: un alumno por salón falta seguido y otro llega tarde seguido.
    const cronico = s.nombre === "3.° B" ? s.alumnos.findIndex((a) => a.nombres === "Diego") : azar.entero(0, s.alumnos.length - 1);
    const tardon = s.nombre === "3.° B" ? s.alumnos.findIndex((a) => a.nombres === "Sebastián") : (cronico + 3) % s.alumnos.length;
    for (const [i, a] of s.alumnos.entries()) {
      const mapa = new Map<string, Registro>();
      diaPorAlumno.set(a.id, mapa);
      const pFalta = i === cronico ? 0.18 : 0.025;
      const pTarde = i === tardon ? 0.22 : 0.04;
      for (const [d, f] of dias.entries()) {
        const forzada = forzadas[`${a.nombres} ${a.apellidos}`];
        let estado: EstadoAsistencia;
        if (forzada?.includes(d)) estado = "falta";
        else if (forzada) estado = azar.prob(0.04) ? "tarde" : "llego";
        else { const r = azar.num(); estado = r < pFalta ? "falta" : r < pFalta + pTarde ? "tarde" : r < pFalta + pTarde + 0.008 ? "problema" : "llego"; }
        const porPorteria = secundaria && (estado === "llego" || estado === "tarde");
        const r: Registro = {
          id: randomUUID(), tenantId, alumnoId: a.id, fecha: fechaDb(f), ambito: "dia", estado,
          hora: estado === "llego" ? hora(450, 478) : estado === "tarde" ? hora(481, 505) : estado === "falta" ? "08:05" : hora(460, 478),
          nota: estado === "problema" ? azar.elegir(NOTAS_AVISO) : null, origen: porPorteria ? "porteria" : "lista",
          registradoPorId: porPorteria ? porteria.id : s.tutorId!, createdAt: instante(f, "08:05"),
        };
        asistencias.push(r);
        mapa.set(f, r);
      }
    }
  }

  // Hoy: la portería ya registró las llegadas de secundaria (menos 5.° A Sec., que sale «Sin registrar»).
  if (esDiaHabil(hoy) && enClases(hoy)) {
    for (const s of salones.filter((x) => x.nivel === "secundaria" && x.nombre !== "5.° A Sec.")) {
      for (const a of s.alumnos) {
        if (azar.prob(0.07)) continue; // aún no llega
        const tarde = azar.prob(0.06);
        asistencias.push({ id: randomUUID(), tenantId, alumnoId: a.id, fecha: fechaDb(hoy), ambito: "dia", estado: tarde ? "tarde" : "llego", hora: tarde ? hora(481, 500) : hora(445, 478), origen: "porteria", registradoPorId: porteria.id, createdAt: instante(hoy, "07:45") });
      }
    }
  }

  // Listas de curso de los últimos días, según el horario (specs/34): en los niveles con asistencia por curso, cada curso que
  // tiene bloque ese día de la semana, a la hora de inicio de su primer periodo. Requiere que el horario se siembre antes.
  const bloques: BloqueCurso[] = (
    await prisma.bloqueHorario.findMany({ where: { tenantId, cursoId: { not: null } }, select: { salonId: true, dia: true, cursoId: true, periodo: { select: { horaInicio: true } } } })
  ).map((b) => ({ salonId: b.salonId, dia: b.dia, cursoId: b.cursoId, horaInicio: b.periodo.horaInicio }));
  const faltasCurso: { registro: Registro; curso: string; ingreso: string }[] = [];
  for (const f of dias.slice(-DIAS_CURSOS)) {
    for (const s of salones.filter((x) => nh.asistenciaPorCursoNiveles.includes(x.nivel))) {
      const cursos = new Map(s.cursos.map((c) => [c.id, c]));
      for (const clase of clasesDelDia(bloques, s.id, f)) {
        const c = cursos.get(clase.cursoId)!;
        for (const a of s.alumnos) {
          const delDia = diaPorAlumno.get(a.id)!.get(f)!;
          // Faltó al colegio → falta en cada clase. Llegó después del inicio de la clase → tarde, a su hora de ingreso.
          // Si ya estaba en el colegio, a veces no llega a la clase («ingresó pero faltó») o llega unos minutos tarde.
          let estado: EstadoAsistencia;
          let horaReg = clase.hora;
          if (delDia.estado === "falta") estado = "falta";
          else if (delDia.hora > clase.hora) { estado = "tarde"; horaReg = delDia.hora; }
          else {
            const r = azar.num();
            estado = r < 0.012 ? "falta" : r < 0.03 ? "tarde" : "llego";
            if (estado === "tarde") horaReg = sumarMinutos(clase.hora, azar.entero(5, 12));
          }
          const reg: Registro = {
            id: randomUUID(), tenantId, alumnoId: a.id, cursoId: c.id, ambito: c.id, fecha: fechaDb(f), estado,
            hora: horaReg, origen: "lista", registradoPorId: c.profesorId!, createdAt: instante(f, clase.hora),
          };
          asistencias.push(reg);
          if (estado === "falta" && delDia.estado !== "falta") faltasCurso.push({ registro: reg, curso: c.nombre, ingreso: delDia.hora });
        }
      }
    }
  }
  for (let i = 0; i < asistencias.length; i += 5000) await prisma.asistencia.createMany({ data: asistencias.slice(i, i + 5000) });

  // ───────── Justificaciones de faltas al colegio ─────────
  const alumnos = new Map(salones.flatMap((s) => s.alumnos.map((a) => [a.id, { ...a, salon: s }] as const)));
  const vigentes = (alumnoId: string) => alumnos.get(alumnoId)!.apoderados.filter((x) => x.consentimiento && !x.consentimiento.revocadoAt && x.recibeAvisos);
  const justificaciones: Prisma.JustificacionCreateManyInput[] = [];
  const faltasDia = asistencias.filter((r) => r.ambito === "dia" && r.estado === "falta" && (r.fecha as Date).toISOString().slice(0, 10) < hoy);
  const recientes = new Set(dias.slice(-5));
  for (const r of faltasDia) {
    const fam = vigentes(r.alumnoId)[0];
    if (!fam) continue;
    const f = (r.fecha as Date).toISOString().slice(0, 10);
    const a = alumnos.get(r.alumnoId)!;
    const nombre = `${a.nombres} ${a.apellidos}`;
    const forzada = forzadas[nombre];
    let estado: EstadoJustificacion | null;
    if (forzada) estado = f === dias[forzada[0]] ? "pendiente" : nombre.startsWith("Mateo") ? "aceptada" : "rechazada";
    else if (recientes.has(f)) estado = azar.prob(0.55) ? "pendiente" : null;
    else estado = azar.prob(0.65) ? (azar.prob(0.75) ? "aceptada" : "rechazada") : null;
    if (!estado) continue;
    const comentario = estado === "aceptada" ? (forzada || azar.prob(0.5) ? azar.elegir(COMENTARIOS_ACEPTADA) : null) : estado === "rechazada" ? (forzada || azar.prob(0.6) ? azar.elegir(COMENTARIOS_RECHAZADA) : null) : null;
    justificaciones.push({
      tenantId, asistenciaId: r.id, apoderadoId: fam.apoderadoId, motivo: forzada && nombre.startsWith("Mateo") ? "Tuvo control médico en la mañana." : azar.elegir(MOTIVOS),
      estado, createdAt: instante(f, "19:20"),
      ...(estado === "pendiente" ? {} : { revisadoPorId: a.salon.tutorId, revisadoAt: instante(diaHabil(f, 1), "10:15"), comentarioRevision: comentario }),
    });
  }
  await prisma.justificacion.createMany({ data: justificaciones });

  // ───────── Avisos enviados a las familias ─────────
  const estadoAviso = (): EstadoAviso => { const r = azar.num(); return r < 0.5 ? "abierto" : r < 0.78 ? "entregado" : r < 0.93 ? "enviado" : r < 0.97 ? "rebotado" : "error"; };
  const avisos: Prisma.AvisoCreateManyInput[] = [];
  const ultimos3 = new Set(dias.slice(-3));
  // Envíos (specs/06): cada lista cerrada (del día o de un curso) agrupa sus avisos; el escaneo de portería es individual.
  const envios = new Map<string, Prisma.EnvioAvisoCreateManyInput & { id: string; alumnos: Set<string> }>();
  const envioDe = (r: Registro, titulo: string, createdAt: Date): string | null => {
    if (r.origen === "porteria") return null;
    const clave = `${(r.fecha as Date).toISOString().slice(0, 10)}|${r.ambito}|${alumnos.get(r.alumnoId)!.salon.id}`;
    let e = envios.get(clave);
    if (!e) {
      e = { id: randomUUID(), tenantId, tipo: "asistencia", titulo, creadoPorId: r.registradoPorId ?? null, createdAt, alumnos: new Set() };
      envios.set(clave, e);
    }
    e.alumnos.add(r.alumnoId);
    return e.id;
  };
  const aviso = (r: Registro, plantilla: string, asunto: string, payload: Record<string, string>, horaEnvio: string, curso?: string) => {
    const f = (r.fecha as Date).toISOString().slice(0, 10);
    const salonNombre = alumnos.get(r.alumnoId)!.salon.nombre;
    const familias = vigentes(r.alumnoId);
    const envioId = familias.length ? envioDe(r, curso ? `${curso} · ${salonNombre}` : `Lista del día · ${salonNombre}`, instante(f, horaEnvio)) : null;
    for (const fam of familias) {
      const estado = estadoAviso();
      const enviado = instante(f, horaEnvio);
      avisos.push({
        tenantId, tipo: "asistencia", canal: "correo", asistenciaId: r.id, apoderadoId: fam.apoderadoId, destinatario: fam.apoderado.user.email, envioId,
        plantilla, asunto, payload: { colegio: NOMBRE_COLEGIO, ...payload }, estado, intentos: estado === "error" ? 3 : 1,
        error: estado === "error" ? "No se pudo entregar el mensaje." : null, programadoPara: enviado, createdAt: enviado,
        enviadoAt: estado === "error" ? null : new Date(enviado.getTime() + 60_000),
        entregadoAt: ["entregado", "abierto"].includes(estado) ? new Date(enviado.getTime() + 90_000) : null,
        abiertoAt: estado === "abierto" ? new Date(enviado.getTime() + azar.entero(5, 240) * 60_000) : null,
      });
    }
  };
  for (const r of asistencias) {
    if (r.ambito !== "dia") continue;
    const a = alumnos.get(r.alumnoId)!;
    const f = (r.fecha as Date).toISOString().slice(0, 10);
    if (f >= hoy) continue;
    if (r.estado === "falta") aviso(r, "asistencia_falta", `${a.nombres} no llegó hoy`, { alumno: a.nombres, momento: "a la 1.ª hora" }, "08:10");
    else if (r.estado === "tarde") aviso(r, "asistencia_tarde", `${a.nombres} llegó tarde`, { alumno: a.nombres, hora: r.hora }, r.hora);
    else if (r.estado === "problema") aviso(r, "asistencia_problema", `Aviso sobre ${a.nombres}`, { alumno: a.nombres, hora: r.hora, nota: r.nota ?? "" }, "08:20");
    else if (ultimos3.has(f)) aviso(r, "asistencia_llego", `${a.nombres} llegó al colegio`, { alumno: a.nombres, hora: r.hora }, r.hora);
  }
  for (const { registro, curso, ingreso } of faltasCurso) {
    const a = alumnos.get(registro.alumnoId)!;
    aviso(registro, "asistencia_falta", `${a.nombres} no llegó a ${curso}`, { alumno: a.nombres, momento: `a ${curso}`, curso, ingreso, horaClase: registro.hora }, registro.hora, curso);
  }
  await prisma.envioAviso.createMany({
    data: [...envios.values()].map(({ alumnos: avisados, ...e }) => ({ ...e, familias: avisados.size, masivo: avisados.size > 1 })),
  });
  for (let i = 0; i < avisos.length; i += 5000) await prisma.aviso.createMany({ data: avisos.slice(i, i + 5000) });
}
