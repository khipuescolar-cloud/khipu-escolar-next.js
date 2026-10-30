// Datos demo de reuniones de padres (specs/32) en Nuevo Horizonte. Ficticios. Se llama desde prisma/seed.ts (al final).
// Idempotente en una BD recién reseteada: busca todo por slug/correo y no duplica reuniones del mismo título.
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../src/generated/prisma/client";

/** Fecha relativa a hoy (hora Lima) en días, a las HH:mm. */
function enDias(dias: number, hora: string) {
  const hoyLima = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  const d = new Date(`${hoyLima}T${hora}:00.000-05:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

export async function sembrarReuniones(prisma: PrismaClient, ids: Record<string, string> = {}) {
  const nh = await prisma.tenant.findUnique({ where: { slug: ids.slug ?? "nuevohorizonte" } });
  if (!nh) return;
  const tenantId = nh.id;
  const miembro = async (email: string, rol: "direccion" | "profesor" | "apoderado") =>
    prisma.membership.findFirst({ where: { tenantId, rol, user: { email } } });
  const direccion = await miembro("direccion@nuevohorizonte.demo", "direccion");
  const lucia = await miembro("lucia.garcia@nuevohorizonte.demo", "profesor");
  const rosa = await miembro("rosa.quispe@gmail.com", "apoderado");
  const rios = await miembro("familia.rios@familia.demo", "apoderado");
  const salon3b = await prisma.salon.findFirst({ where: { tenantId, nombre: "3.° B" } });
  if (!direccion || !lucia || !rosa || !rios || !salon3b) return;
  const alumnos = await prisma.alumno.findMany({ where: { tenantId, salonId: salon3b.id }, orderBy: { nombres: "asc" } });
  const alumno = (nombre: string) => alumnos.find((a) => a.nombres === nombre)!;

  // Dos familias más de 3.° B (sin cuenta de ingreso: solo para que las confirmaciones se vean variadas).
  async function familiaExtra(correo: string, nombres: string, apellidos: string, hijo: string) {
    let m = await miembro(correo, "apoderado");
    if (!m) {
      const id = randomUUID();
      await prisma.profile.create({ data: { id, email: correo, nombres, apellidos } });
      m = await prisma.membership.create({ data: { tenantId, userId: id, rol: "apoderado" } });
      const consentimiento = await prisma.consentimiento.create({ data: { tenantId, apoderadoId: m.id, versionTexto: "v1-2026-10 (borrador pendiente de revisión legal)" } });
      await prisma.apoderadoAlumno.create({ data: { tenantId, apoderadoId: m.id, alumnoId: alumno(hijo).id, parentesco: "madre", consentimientoId: consentimiento.id } });
    }
    return m;
  }
  const flores = await familiaExtra("familia.flores@familia.demo", "Patricia", "Díaz Ramos", "Camila");
  const mendoza = await familiaExtra("familia.mendoza@familia.demo", "Julio", "Mendoza Paz", "Diego");

  async function crear(
    datos: { titulo: string; descripcion?: string; inicio: Date; fin?: Date; lugar?: string; enlace?: string; alcance: "colegio" | "salon" | "individual"; salonId?: string; convocadaPorId: string; estado?: "programada" | "realizada"; acta?: string; actaPublicadaAt?: Date },
    invitados: { membershipId: string; alumnoId?: string; respuesta?: "pendiente" | "asistire" | "no_asistire"; comentario?: string; asistio?: boolean }[],
  ) {
    if (await prisma.reunion.findFirst({ where: { tenantId, titulo: datos.titulo } })) return;
    const r = await prisma.reunion.create({ data: { tenantId, ...datos, salonId: datos.salonId ?? null } });
    for (const i of invitados) {
      await prisma.reunionInvitado.create({
        data: {
          tenantId, reunionId: r.id, membershipId: i.membershipId, alumnoId: i.alumnoId ?? null,
          respuesta: i.respuesta ?? "pendiente", respondidaAt: i.respuesta && i.respuesta !== "pendiente" ? enDias(-6, "10:00") : null,
          comentario: i.comentario ?? null, asistio: i.asistio ?? null,
        },
      });
    }
  }

  // 1. Pasada, con asistencia y acta publicada.
  await crear(
    {
      titulo: "Reunión de inicio de año — 3.° B", descripcion: "Presentación del plan anual, normas de convivencia y calendario de evaluaciones.",
      inicio: enDias(-14, "18:00"), fin: enDias(-14, "19:00"), lugar: "Aula 3.° B", alcance: "salon", salonId: salon3b.id, convocadaPorId: lucia.id, estado: "realizada",
      acta:
        "Asistentes: 4 de 4 familias convocadas.\n\nAcuerdos:\n1. La agenda escolar se firma todos los días.\n2. Las evaluaciones del I bimestre empiezan el 10 de noviembre.\n3. Se forma el comité de aula: Rosa Quispe (presidenta) y Patricia Díaz (tesorera).\n\nPróxima reunión: al cierre del bimestre.",
      actaPublicadaAt: enDias(-13, "09:00"),
    },
    [
      { membershipId: rosa.id, alumnoId: alumno("Mateo").id, respuesta: "asistire", asistio: true },
      { membershipId: rios.id, alumnoId: alumno("Valentina").id, respuesta: "asistire", asistio: true },
      { membershipId: flores.id, alumnoId: alumno("Camila").id, respuesta: "asistire", asistio: true },
      { membershipId: mendoza.id, alumnoId: alumno("Diego").id, respuesta: "no_asistire", comentario: "Estaré de viaje por trabajo.", asistio: false },
    ],
  );

  // 2. Próxima del salón 3.° B, con respuestas mixtas (Rosa sin responder para probar).
  await crear(
    {
      titulo: "Reunión de padres — entrega de avances I bimestre", descripcion: "Revisaremos el avance de cada alumno y los compromisos para el segundo bimestre.",
      inicio: enDias(5, "18:00"), fin: enDias(5, "19:00"), lugar: "Aula 3.° B", enlace: "https://meet.google.com/abc-defg-hij", alcance: "salon", salonId: salon3b.id, convocadaPorId: lucia.id,
    },
    [
      { membershipId: rosa.id, alumnoId: alumno("Mateo").id },
      { membershipId: rios.id, alumnoId: alumno("Valentina").id, respuesta: "asistire" },
      { membershipId: flores.id, alumnoId: alumno("Camila").id, respuesta: "asistire", comentario: "Llegaré unos minutos tarde." },
      { membershipId: mendoza.id, alumnoId: alumno("Diego").id, respuesta: "no_asistire", comentario: "Tengo turno en el trabajo." },
    ],
  );

  // 3. Individual: Lucía con la familia de Mateo.
  await crear(
    {
      titulo: "Reunión individual — avance de Mateo", descripcion: "Conversaremos sobre su lectura y cómo apoyarlo en casa.",
      inicio: enDias(2, "17:00"), fin: enDias(2, "17:30"), lugar: "Sala de tutoría", alcance: "individual", salonId: salon3b.id, convocadaPorId: lucia.id,
    },
    [{ membershipId: rosa.id, alumnoId: alumno("Mateo").id }],
  );

  // 4. De todo el colegio, convocada por dirección (sin alumno por fila).
  await crear(
    {
      titulo: "Asamblea general de padres de familia", descripcion: "Informe de gestión y elección del comité de padres.",
      inicio: enDias(12, "19:00"), fin: enDias(12, "20:30"), lugar: "Auditorio del colegio", alcance: "colegio", convocadaPorId: direccion.id,
    },
    [rosa, rios, flores, mendoza].map((m) => ({ membershipId: m.id })),
  );
}
