// Datos demo (ficticios) para desarrollo. Idempotente: borra y recrea los colegios demo.
// Uso: pnpm db:seed   — Contraseña de todas las cuentas: demo123
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Nivel, Plan, Rol, EscalaCalificacion } from "../src/generated/prisma/enums";

const PASSWORD = "demo123";
const ANIO = 2026;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

if (process.env.NODE_ENV === "production") throw new Error("El seed demo no se ejecuta en producción.");

async function usuario(email: string, nombres: string, apellidos: string): Promise<string> {
  const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let id = lista.users.find((u) => u.email === email)?.id;
  if (!id) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error || !data.user) throw error ?? new Error(`No se creó ${email}`);
    id = data.user.id;
  } else {
    await supabase.auth.admin.updateUserById(id, { password: PASSWORD });
  }
  await prisma.profile.upsert({
    where: { id },
    update: { email, nombres, apellidos },
    create: { id, email, nombres, apellidos },
  });
  return id;
}

async function membresia(tenantId: string, userId: string, rol: Rol) {
  return prisma.membership.create({ data: { tenantId, userId, rol } });
}

function fecha(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Fecha relativa a hoy (hora Lima) en días, a las HH:mm. */
function enDias(dias: number, hora = "08:00") {
  const hoyLima = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  const d = new Date(`${hoyLima}T${hora}:00.000-05:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

type ColegioDemo = {
  slug: string;
  nombre: string;
  ciudad: string;
  plan: Plan;
  escala: EscalaCalificacion;
};

async function crearColegio(c: ColegioDemo) {
  await prisma.tenant.deleteMany({ where: { slug: c.slug } });
  return prisma.tenant.create({
    data: {
      slug: c.slug,
      nombre: c.nombre,
      ciudad: c.ciudad,
      plan: c.plan,
      escalaCalificacion: c.escala,
      emailDomains: [`${c.slug}.demo`],
      estado: "piloto",
    },
  });
}

async function crearSalon(tenantId: string, nombre: string, nivel: Nivel, tutorId?: string) {
  return prisma.salon.create({ data: { tenantId, nombre, nivel, anio: ANIO, tutorId } });
}

async function crearAlumnos(tenantId: string, salonId: string, nombres: [string, string][]) {
  const alumnos = [];
  for (const [i, [n, a]] of nombres.entries()) {
    alumnos.push(
      await prisma.alumno.create({
        data: { tenantId, salonId, nombres: n, apellidos: a, codigo: `${ANIO}-${String(i + 1).padStart(3, "0")}` },
      }),
    );
  }
  return alumnos;
}

async function vincularApoderado(tenantId: string, apoderadoId: string, alumnoId: string, parentesco: string) {
  const consentimiento = await prisma.consentimiento.create({
    data: { tenantId, apoderadoId, versionTexto: "v1-2026-10 (borrador pendiente de revisión legal)" },
  });
  await prisma.apoderadoAlumno.create({
    data: { tenantId, apoderadoId, alumnoId, parentesco, consentimientoId: consentimiento.id },
  });
  await prisma.preferenciaAviso.upsert({
    where: { apoderadoId },
    update: {},
    create: { tenantId, apoderadoId },
  });
}

async function periodosBimestrales(tenantId: string) {
  const rangos: [string, string][] = [
    ["2026-03-09", "2026-05-08"],
    ["2026-05-18", "2026-07-17"],
    ["2026-08-03", "2026-10-02"],
    ["2026-10-12", "2026-12-18"],
  ];
  const nombres = ["I Bimestre", "II Bimestre", "III Bimestre", "IV Bimestre"];
  const periodos = [];
  for (const [i, [inicio, fin]] of rangos.entries()) {
    periodos.push(
      await prisma.periodo.create({
        data: { tenantId, anio: ANIO, tipo: "bimestre", numero: i + 1, nombre: nombres[i], inicio: fecha(inicio), fin: fecha(fin), cerrado: i < 3 },
      }),
    );
  }
  return periodos;
}

async function main() {
  // ───────── I.E.P. Nuevo Horizonte — Pro Max, escala literal (CNEB) ─────────
  const nh = await crearColegio({ slug: "nuevohorizonte", nombre: "I.E.P. Nuevo Horizonte", ciudad: "Lima", plan: "promax", escala: "literal" });
  const nhDireccion = await membresia(nh.id, await usuario("direccion@nuevohorizonte.demo", "Carmen", "Torres Vega"), "direccion");
  const lucia = await membresia(nh.id, await usuario("lucia.garcia@nuevohorizonte.demo", "Lucía", "García Paz"), "profesor");
  const pedro = await membresia(nh.id, await usuario("pedro.salas@nuevohorizonte.demo", "Pedro", "Salas Ríos"), "profesor");
  await membresia(nh.id, await usuario("porteria@nuevohorizonte.demo", "Julio", "Cáceres"), "porteria");

  const nh3b = await crearSalon(nh.id, "3.° B", "primaria", lucia.id);
  const nh5a = await crearSalon(nh.id, "5.° A", "primaria", pedro.id);
  const mate = await prisma.curso.create({ data: { tenantId: nh.id, salonId: nh3b.id, nombre: "Matemática", profesorId: lucia.id } });
  const comu = await prisma.curso.create({ data: { tenantId: nh.id, salonId: nh3b.id, nombre: "Comunicación", profesorId: lucia.id } });
  const ciencia = await prisma.curso.create({ data: { tenantId: nh.id, salonId: nh3b.id, nombre: "Ciencia y Tecnología", profesorId: pedro.id } });
  await prisma.curso.create({ data: { tenantId: nh.id, salonId: nh5a.id, nombre: "Matemática", profesorId: pedro.id } });

  const alumnos3b = await crearAlumnos(nh.id, nh3b.id, [
    ["Mateo", "Quispe Huamán"], ["Valentina", "Ríos Soto"], ["Sebastián", "Huamán Lara"],
    ["Camila", "Flores Díaz"], ["Diego", "Mendoza Cruz"], ["Luana", "Castillo Rojas"],
  ]);
  await crearAlumnos(nh.id, nh5a.id, [["Thiago", "Paredes León"], ["Ximena", "Vargas Núñez"], ["Gael", "Chávez Ortiz"], ["Renata", "Silva Campos"]]);

  const rosaId = await usuario("rosa.quispe@gmail.com", "Rosa", "Quispe Mamani");
  const rosaNh = await membresia(nh.id, rosaId, "apoderado");
  await vincularApoderado(nh.id, rosaNh.id, alumnos3b[0].id, "madre");
  const familiaRios = await membresia(nh.id, await usuario("familia.rios@familia.demo", "Martín", "Ríos"), "apoderado");
  await vincularApoderado(nh.id, familiaRios.id, alumnos3b[1].id, "padre");

  // Asistencia de ayer (historial).
  const ayer = new Date(enDias(-1).toISOString().slice(0, 10) + "T00:00:00.000Z");
  for (const [i, a] of alumnos3b.entries()) {
    const estado = i === 2 ? "tarde" : i === 4 ? "falta" : "llego";
    await prisma.asistencia.create({
      data: {
        tenantId: nh.id, alumnoId: a.id, fecha: ayer, ambito: "dia", estado,
        hora: estado === "tarde" ? "08:15" : "07:52", registradoPorId: lucia.id,
      },
    });
  }

  // Fase 2: periodos, competencias CNEB, evaluaciones, notas, tareas y agenda.
  const periodosNh = await periodosBimestrales(nh.id);
  const competencias = await Promise.all(
    [
      [mate.id, "Resuelve problemas de cantidad"],
      [mate.id, "Resuelve problemas de regularidad, equivalencia y cambio"],
      [mate.id, "Resuelve problemas de forma, movimiento y localización"],
      [comu.id, "Se comunica oralmente en su lengua materna"],
      [comu.id, "Lee diversos tipos de textos escritos"],
      [comu.id, "Escribe diversos tipos de textos"],
      [ciencia.id, "Indaga mediante métodos científicos"],
    ].map(([cursoId, nombre], orden) =>
      prisma.competencia.create({ data: { tenantId: nh.id, cursoId, nombre, orden } }),
    ),
  );
  const periodoActual = periodosNh[3];
  const evalMate = await prisma.evaluacion.create({
    data: { tenantId: nh.id, cursoId: mate.id, periodoId: periodoActual.id, competenciaId: competencias[0].id, titulo: "Práctica: fracciones", fecha: fecha("2026-10-20") },
  });
  const literales = ["A", "AD", "B", "A", "C", "A"] as const;
  for (const [i, a] of alumnos3b.entries()) {
    await prisma.nota.create({
      data: { tenantId: nh.id, evaluacionId: evalMate.id, alumnoId: a.id, valorLiteral: literales[i], registradoPorId: lucia.id },
    });
  }
  for (const [i, a] of alumnos3b.entries()) {
    for (const comp of competencias.slice(0, 6)) {
      await prisma.calificacionPeriodo.create({
        data: {
          tenantId: nh.id, alumnoId: a.id, competenciaId: comp.id, periodoId: periodosNh[2].id,
          valorLiteral: literales[(i + comp.orden) % literales.length],
          conclusion: "Avanza en la competencia y participa en clase.",
        },
      });
    }
  }
  await prisma.tarea.createMany({
    data: [
      { tenantId: nh.id, cursoId: mate.id, titulo: "Fichas de fracciones (pág. 42–43)", fechaEntrega: enDias(2, "08:00"), creadoPorId: lucia.id },
      { tenantId: nh.id, cursoId: comu.id, titulo: "Leer «El zorro y el cóndor» y resumirlo", fechaEntrega: enDias(4, "08:00"), creadoPorId: lucia.id },
      { tenantId: nh.id, cursoId: ciencia.id, titulo: "Maqueta del ciclo del agua", descripcion: "Materiales reciclados.", fechaEntrega: enDias(9, "08:00"), creadoPorId: pedro.id },
    ],
  });
  await prisma.eventoAgenda.createMany({
    data: [
      { tenantId: nh.id, titulo: "Reunión de padres de familia", tipo: "reunion", inicio: enDias(5, "18:30"), creadoPorId: nhDireccion.id },
      { tenantId: nh.id, salonId: nh3b.id, titulo: "Examen bimestral de Matemática", tipo: "examen", inicio: enDias(7, "08:00"), creadoPorId: lucia.id },
      { tenantId: nh.id, titulo: "Feriado: Día de Todos los Santos", tipo: "feriado", inicio: fecha("2026-11-01"), creadoPorId: nhDireccion.id },
    ],
  });
  await prisma.comunicado.create({
    data: { tenantId: nh.id, autorId: nhDireccion.id, titulo: "Bienvenidos a Khipu Escolar", cuerpo: "Desde hoy recibirás los avisos de asistencia por correo. Si tienes dudas, escribe a la tutora desde Mensajes." },
  });
  await prisma.documentoColegio.createMany({
    data: [
      { tenantId: nh.id, tipo: "horario", titulo: "Horario de ingreso", contenido: "El ingreso es de 7:30 a. m. a 7:55 a. m. Desde las 8:00 a. m. se registra tardanza. La salida de primaria es a la 1:30 p. m." },
      { tenantId: nh.id, tipo: "reglamento", titulo: "Uniforme", contenido: "Los lunes se usa uniforme de gala. Martes a viernes, buzo del colegio." },
      { tenantId: nh.id, tipo: "reglamento", titulo: "Justificación de faltas", contenido: "Las faltas se justifican hasta 48 horas después, desde el enlace del aviso o escribiendo a la tutora." },
    ],
  });

  // ───────── Academia Euler — Fase 2, escala vigesimal ─────────
  const eu = await crearColegio({ slug: "academiaeuler", nombre: "Academia Euler", ciudad: "Arequipa", plan: "fase2", escala: "vigesimal" });
  await membresia(eu.id, await usuario("direccion@academiaeuler.demo", "Raúl", "Medina"), "direccion");
  const jorge = await membresia(eu.id, await usuario("jorge.ramos@academiaeuler.demo", "Jorge", "Ramos Calle"), "profesor");
  const preu = await crearSalon(eu.id, "Ciclo Pre-U A", "academia", jorge.id);
  const algebra = await prisma.curso.create({ data: { tenantId: eu.id, salonId: preu.id, nombre: "Álgebra", profesorId: jorge.id } });
  const alumnosEu = await crearAlumnos(eu.id, preu.id, [["Andrea", "Quispe Mamani"], ["Bruno", "Zapata Gil"], ["Daniela", "Arias Luna"], ["Franco", "Herrera Poma"]]);
  const rosaEu = await membresia(eu.id, rosaId, "apoderado");
  await vincularApoderado(eu.id, rosaEu.id, alumnosEu[0].id, "madre");
  const periodosEu = await periodosBimestrales(eu.id);
  const compAlg = await prisma.competencia.create({ data: { tenantId: eu.id, cursoId: algebra.id, nombre: "Resuelve problemas algebraicos" } });
  const evalAlg = await prisma.evaluacion.create({
    data: { tenantId: eu.id, cursoId: algebra.id, periodoId: periodosEu[3].id, competenciaId: compAlg.id, titulo: "Simulacro 1", fecha: fecha("2026-10-19") },
  });
  for (const [i, a] of alumnosEu.entries()) {
    await prisma.nota.create({
      data: { tenantId: eu.id, evaluacionId: evalAlg.id, alumnoId: a.id, valorNumerico: [16, 12, 18, 9][i], registradoPorId: jorge.id },
    });
  }
  await prisma.tarea.create({
    data: { tenantId: eu.id, cursoId: algebra.id, titulo: "Banco de problemas: ecuaciones cuadráticas", fechaEntrega: enDias(3), creadoPorId: jorge.id },
  });

  // ───────── Colegio Los Olivos — Básico ─────────
  const lo = await crearColegio({ slug: "losolivos", nombre: "Colegio Los Olivos", ciudad: "Lima", plan: "basico", escala: "literal" });
  await membresia(lo.id, await usuario("direccion@losolivos.demo", "Elena", "Paredes Rosas"), "direccion");
  const ana = await membresia(lo.id, await usuario("ana.paredes@losolivos.demo", "Ana", "Paredes"), "profesor");
  const lo1a = await crearSalon(lo.id, "1.° A", "secundaria", ana.id);
  await prisma.curso.create({ data: { tenantId: lo.id, salonId: lo1a.id, nombre: "Tutoría", profesorId: ana.id } });
  const alumnosLo = await crearAlumnos(lo.id, lo1a.id, [["Joaquín", "Benites Sosa"], ["Mía", "Gonzales Tello"], ["Nicolás", "Ramos Díaz"]]);
  const familiaBenites = await membresia(lo.id, await usuario("familia.benites@familia.demo", "Lucía", "Sosa"), "apoderado");
  await vincularApoderado(lo.id, familiaBenites.id, alumnosLo[0].id, "madre");

  console.log("Seed listo. Cuentas (contraseña demo123):");
  console.log("  lucia.garcia@nuevohorizonte.demo  profesora · Pro Max");
  console.log("  direccion@nuevohorizonte.demo     dirección · Pro Max");
  console.log("  porteria@nuevohorizonte.demo      portería  · Pro Max");
  console.log("  jorge.ramos@academiaeuler.demo    profesor  · Fase 2");
  console.log("  direccion@losolivos.demo          dirección · Básico");
  console.log("  rosa.quispe@gmail.com             apoderada · 2 colegios");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
