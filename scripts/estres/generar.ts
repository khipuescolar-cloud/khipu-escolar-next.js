// Genera el colegio sintético «estres-1000» (≈1 000 alumnos) para la prueba de estrés local.
// Uso: pnpm exec tsx --conditions=react-server scripts/estres/generar.ts
// Datos 100 % ficticios. Solo se crean usuarios de Supabase Auth para las cuentas que la prueba usa para entrar
// (dirección, portería, 40 profesores y 200 apoderados); el resto son perfiles sin login (Profile.id no tiene FK a auth.users).
// Escribe las credenciales y los ids que usa la prueba de carga en scripts/estres/.salida/datos.json (ignorado por git).
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { CalificacionLiteral, EstadoAsistencia, Nivel, Rol } from "../../src/generated/prisma/enums";
import { hashToken, tokenDerivado } from "../../src/lib/server/tokens";
import { DOMINIO, PASSWORD, SLUG, crearPrisma, crearSupabaseAdmin, enParalelo } from "./comun";

const prisma = crearPrisma();
const supabase = crearSupabaseAdmin();
const ANIO = 2026;

// Generador pseudoaleatorio con semilla: los datos salen iguales en cada corrida.
let semilla = 20261101;
function azar() {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
}
const elegir = <T,>(xs: readonly T[]) => xs[Math.floor(azar() * xs.length)];

const NOMBRES_F = ["María", "Valentina", "Camila", "Luana", "Ximena", "Renata", "Sofía", "Isabella", "Mía", "Antonella", "Fernanda", "Daniela", "Alessia", "Kiara", "Abigail", "Nicole", "Fátima", "Rosa", "Andrea", "Lucía", "Milagros", "Yuliana", "Allison", "Brianna"];
const NOMBRES_M = ["Mateo", "Sebastián", "Thiago", "Diego", "Gael", "Santiago", "Leonardo", "Joaquín", "Adrián", "Bruno", "Franco", "Nicolás", "Dylan", "Jhon", "Luis", "Carlos", "Piero", "Rodrigo", "Fabricio", "Alonso", "Jesús", "Ángel", "Jairo", "Kevin"];
const APELLIDOS = ["Quispe", "Huamán", "Mamani", "Flores", "Rojas", "Sánchez", "García", "Torres", "Ramírez", "Chávez", "Vargas", "Castillo", "Mendoza", "Ríos", "Díaz", "Cruz", "Paredes", "Gutiérrez", "Condori", "Ccahuana", "Apaza", "Ticona", "Salazar", "Espinoza", "Silva", "Campos", "León", "Núñez", "Poma", "Yupanqui", "Cárdenas", "Benites", "Villanueva", "Zapata", "Chuquimango"];

const nombrePersona = (f: boolean) => (f ? elegir(NOMBRES_F) : elegir(NOMBRES_M));
const apellidos = () => `${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

const CURSOS: Record<Nivel, string[]> = {
  inicial: ["Personal Social", "Comunicación", "Matemática"],
  primaria: ["Matemática", "Comunicación", "Personal Social", "Ciencia y Tecnología", "Arte y Cultura", "Educación Física", "Educación Religiosa", "Inglés"],
  secundaria: ["Matemática", "Comunicación", "Inglés", "Ciencias Sociales", "Ciencia y Tecnología", "Desarrollo Personal, Ciudadanía y Cívica", "Educación para el Trabajo", "Arte y Cultura", "Educación Física", "Educación Religiosa"],
  academia: [],
};

type SalonPlan = { nivel: Nivel; grado: number; seccion: string; alumnos: number };
function planSalones(): SalonPlan[] {
  const s: SalonPlan[] = [];
  for (const grado of [3, 4, 5]) for (const seccion of ["A", "B"]) s.push({ nivel: "inicial", grado, seccion, alumnos: 20 });
  for (let grado = 1; grado <= 6; grado++) for (const seccion of ["A", "B", "C"]) s.push({ nivel: "primaria", grado, seccion, alumnos: 25 });
  for (let grado = 1; grado <= 5; grado++) for (const seccion of ["A", "B", "C"]) s.push({ nivel: "secundaria", grado, seccion, alumnos: grado === 5 && seccion === "A" ? 35 : 29 });
  return s;
}
const nombreSalon = (p: SalonPlan) => (p.nivel === "inicial" ? `${p.grado} años ${p.seccion}` : `${p.grado}.° ${p.seccion} ${p.nivel === "primaria" ? "Prim." : "Sec."}`);

/** Días hábiles (lunes a viernes, sin feriados) entre dos fechas ISO, ambas incluidas. */
function diasHabiles(desde: string, hasta: string): string[] {
  const feriados = new Set(["2026-08-30", "2026-10-08"]);
  const dias: string[] = [];
  for (let d = new Date(`${desde}T00:00:00Z`); d <= new Date(`${hasta}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !feriados.has(iso)) dias.push(iso);
  }
  return dias;
}
const fechaDb = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
function hoyLima() {
  return new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
}
function sumarDiasIso(iso: string, n: number) {
  const d = fechaDb(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function crearEnLotes<T>(nombre: string, filas: T[], crear: (lote: T[]) => Promise<unknown>, tam = 5000) {
  for (let i = 0; i < filas.length; i += tam) await crear(filas.slice(i, i + tam));
  console.log(`  ${nombre}: ${filas.length}`);
}

type Persona = { id: string; email: string; nombres: string; apellidos: string; genero: "femenino" | "masculino" | null; login: boolean };

async function main() {
  const t0 = Date.now();
  if (await prisma.tenant.findUnique({ where: { slug: SLUG } })) {
    console.error(`Ya existe «${SLUG}». Corre primero scripts/estres/limpiar.ts.`);
    process.exit(1);
  }
  const tenant = await prisma.tenant.create({
    data: { slug: SLUG, nombre: "I.E.P. Estrés Mil (sintético)", ciudad: "Lima", plan: "pro", escalaCalificacion: "literal", emailDomains: [DOMINIO], estado: "activo" },
  });
  const tenantId = tenant.id;
  console.log(`Colegio ${SLUG} creado (${tenantId}).`);

  // ───── Personas ─────
  const personas: Persona[] = [];
  const usados = new Set<string>();
  function persona(prefijo: string, login: boolean): Persona {
    const f = azar() < 0.55;
    const nombres = nombrePersona(f);
    const ap = apellidos();
    let base = `${prefijo}.${sinTildes(nombres)}.${sinTildes(ap.split(" ")[0])}`;
    let n = 1;
    while (usados.has(base)) base = `${prefijo}.${sinTildes(nombres)}.${sinTildes(ap.split(" ")[0])}${++n}`;
    usados.add(base);
    const p: Persona = { id: randomUUID(), email: `${base}@${DOMINIO}`, nombres, apellidos: ap, genero: f ? "femenino" : "masculino", login };
    personas.push(p);
    return p;
  }

  const direccion = persona("direccion", true);
  const subdireccion = persona("subdireccion", false);
  const porteria = persona("porteria", true);
  const administrativos = Array.from({ length: 3 }, () => persona("admin", false));
  const profesores = Array.from({ length: 55 }, (_, i) => persona("prof", i < 40));

  const salonesPlan = planSalones();
  // Alumnos y familias: ~15 % de familias con dos hijos; ~53 % con dos apoderados.
  type AlumnoPlan = { id: string; salon: number; nombres: string; apellidos: string; familia: number; cuenta: boolean };
  const alumnosPlan: AlumnoPlan[] = [];
  type Familia = { apellidos: string; apoderados: Persona[] };
  const familias: Familia[] = [];
  const pendientesHermano: number[] = [];
  salonesPlan.forEach((s, si) => {
    for (let k = 0; k < s.alumnos; k++) {
      let familia: number;
      if (pendientesHermano.length > 0 && azar() < 0.35) familia = pendientesHermano.shift()!;
      else {
        familia = familias.length;
        familias.push({ apellidos: apellidos(), apoderados: [] });
        if (azar() < 0.18) pendientesHermano.push(familia);
      }
      const conCuenta = s.nivel === "secundaria" || (s.nivel === "primaria" && s.grado >= 5);
      alumnosPlan.push({ id: randomUUID(), salon: si, nombres: nombrePersona(azar() < 0.5), apellidos: familias[familia].apellidos, familia, cuenta: conCuenta });
    }
  });
  let apoderadosConLogin = 0;
  for (const f of familias) {
    const n = azar() < 0.53 ? 2 : 1;
    for (let k = 0; k < n; k++) f.apoderados.push(persona("familia", apoderadosConLogin++ < 200));
  }
  const cuentasAlumno = new Map<string, Persona>();
  for (const a of alumnosPlan) {
    if (!a.cuenta) continue;
    const p: Persona = { id: randomUUID(), email: `alumno.${a.id.slice(0, 8)}@${DOMINIO}`, nombres: a.nombres, apellidos: a.apellidos, genero: null, login: false };
    personas.push(p);
    cuentasAlumno.set(a.id, p);
  }

  // ───── Supabase Auth (solo cuentas con login) ─────
  const conLogin = personas.filter((p) => p.login);
  const tAuth = Date.now();
  await enParalelo(conLogin, 8, async (p) => {
    const { data, error } = await supabase.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true });
    if (error || !data.user) throw error ?? new Error(`No se creó ${p.email}`);
    p.id = data.user.id;
  });
  console.log(`  usuarios de Auth: ${conLogin.length} en ${((Date.now() - tAuth) / 1000).toFixed(1)} s`);

  await crearEnLotes("perfiles", personas, (lote) =>
    prisma.profile.createMany({ data: lote.map((p) => ({ id: p.id, email: p.email, nombres: p.nombres, apellidos: p.apellidos, genero: p.genero })) }),
  );

  // ───── Membresías ─────
  type M = { id: string; userId: string; rol: Rol; cargo?: string };
  const membresias: M[] = [];
  const mem = (p: Persona, rol: Rol, cargo?: string) => {
    const m = { id: randomUUID(), userId: p.id, rol, cargo };
    membresias.push(m);
    return m;
  };
  const mDireccion = mem(direccion, "direccion", "Director(a) general");
  mem(subdireccion, "direccion", "Subdirección");
  mem(porteria, "porteria", "Portería");
  administrativos.forEach((p) => mem(p, "administrativo", "Secretaría"));
  const mProfes = profesores.map((p) => mem(p, "profesor", "Docente"));
  const mApoderado = new Map<Persona, M>();
  for (const f of familias) for (const p of f.apoderados) mApoderado.set(p, mem(p, "apoderado"));
  const mCuentaAlumno = new Map<string, M>();
  for (const [alumnoId, p] of cuentasAlumno) mCuentaAlumno.set(alumnoId, mem(p, "alumno"));
  await crearEnLotes("membresías", membresias, (lote) => prisma.membership.createMany({ data: lote.map((m) => ({ ...m, tenantId })) }));

  // ───── Salones (tutor = profesor i, los 39 primeros con login) y cursos ─────
  const salones = salonesPlan.map((s, i) => ({
    id: randomUUID(), tenantId, nombre: nombreSalon(s), nivel: s.nivel, grado: s.grado, seccion: s.seccion, anio: ANIO, tutorId: mProfes[i].id,
  }));
  await crearEnLotes("salones", salones, (lote) => prisma.salon.createMany({ data: lote }));
  const cursos: { id: string; tenantId: string; salonId: string; nombre: string; profesorId: string; nivel: Nivel }[] = [];
  let rr = 0;
  salonesPlan.forEach((s, i) => {
    for (const nombre of CURSOS[s.nivel]) {
      // Inicial y primaria: casi todo lo dicta el tutor; secundaria: docentes por área.
      const tutorDicta = s.nivel !== "secundaria" && !["Educación Física", "Inglés", "Educación Religiosa"].includes(nombre);
      cursos.push({ id: randomUUID(), tenantId, salonId: salones[i].id, nombre, profesorId: tutorDicta ? mProfes[i].id : mProfes[39 + (rr++ % 16)].id, nivel: s.nivel });
    }
  });
  await crearEnLotes("cursos", cursos, (lote) => prisma.curso.createMany({ data: lote.map((c) => ({ id: c.id, tenantId: c.tenantId, salonId: c.salonId, nombre: c.nombre, profesorId: c.profesorId })) }));

  // ───── Alumnos, apoderados, consentimientos y preferencias ─────
  const alumnos = alumnosPlan.map((a, i) => ({
    id: a.id, tenantId, salonId: salones[a.salon].id, nombres: a.nombres, apellidos: a.apellidos, codigo: `${ANIO}-${String(i + 1).padStart(4, "0")}`,
    cuentaId: mCuentaAlumno.get(a.id)?.id ?? null,
  }));
  await crearEnLotes("alumnos", alumnos, (lote) => prisma.alumno.createMany({ data: lote }));
  const consentimientos = [...mApoderado.values()].map((m) => ({ id: randomUUID(), tenantId, apoderadoId: m.id, versionTexto: "v1-2026-10 (sintético)" }));
  await crearEnLotes("consentimientos", consentimientos, (lote) => prisma.consentimiento.createMany({ data: lote }));
  const consPorApoderado = new Map(consentimientos.map((c) => [c.apoderadoId, c.id]));
  await crearEnLotes("preferencias de aviso", consentimientos, (lote) =>
    prisma.preferenciaAviso.createMany({ data: lote.map((c) => ({ tenantId, apoderadoId: c.apoderadoId, correo: true, push: false })) }),
  );
  const vinculos = alumnosPlan.flatMap((a) =>
    familias[a.familia].apoderados.map((p, k) => {
      const m = mApoderado.get(p)!;
      return { tenantId, apoderadoId: m.id, alumnoId: a.id, parentesco: k === 0 ? "madre" : "padre", consentimientoId: consPorApoderado.get(m.id)! };
    }),
  );
  await crearEnLotes("vínculos apoderado-alumno", vinculos, (lote) => prisma.apoderadoAlumno.createMany({ data: lote }));

  // ───── Carnets QR ─────
  const carnets = alumnos.map((a) => {
    const id = randomUUID();
    return { id, tenantId, alumnoId: a.id, tokenHash: hashToken(tokenDerivado("carnet", id)) };
  });
  await crearEnLotes("carnets QR", carnets, (lote) => prisma.carnetQr.createMany({ data: lote }));

  // ───── Asistencia: ~2 meses de días hábiles hasta ayer (día + 2 cursos diarios en secundaria) ─────
  const hoy = hoyLima();
  const dias = diasHabiles(sumarDiasIso(hoy, -60), sumarDiasIso(hoy, -1));
  const estadoAzar = (): EstadoAsistencia => {
    const r = azar();
    return r < 0.9 ? "llego" : r < 0.95 ? "tarde" : r < 0.995 ? "falta" : "problema";
  };
  const asistencias: object[] = [];
  const avisosHist: object[] = [];
  const faltas: { id: string; alumnoId: string; dia: string }[] = [];
  const cursosPorSalon = new Map<string, typeof cursos>();
  for (const c of cursos) cursosPorSalon.set(c.salonId, [...(cursosPorSalon.get(c.salonId) ?? []), c]);
  const apoderadosDe = (a: AlumnoPlan) => familias[a.familia].apoderados;
  for (const [di, dia] of dias.entries()) {
    for (const a of alumnosPlan) {
      const s = salones[a.salon];
      const estado = estadoAzar();
      const id = randomUUID();
      const hora = estado === "tarde" ? "08:1" + Math.floor(azar() * 10) : "07:" + String(30 + Math.floor(azar() * 29)).padStart(2, "0");
      asistencias.push({ id, tenantId, alumnoId: a.id, cursoId: null, ambito: "dia", fecha: fechaDb(dia), hora, estado, origen: azar() < 0.6 ? "porteria" : "lista", registradoPorId: s.tutorId });
      if (estado === "falta") faltas.push({ id, alumnoId: a.id, dia });
      const enviado = new Date(`${dia}T${hora}:30.000-05:00`);
      for (const p of apoderadosDe(a)) {
        avisosHist.push({
          tenantId, tipo: "asistencia", canal: "correo", asistenciaId: id, apoderadoId: mApoderado.get(p)!.id, destinatario: p.email,
          plantilla: `asistencia_${estado}`, asunto: "Aviso de asistencia", payload: {}, estado: azar() < 0.4 ? "abierto" : "entregado",
          intentos: 1, programadoPara: enviado, enviadoAt: enviado, entregadoAt: enviado, createdAt: enviado,
        });
      }
      if (s.nivel === "secundaria") {
        const cs = cursosPorSalon.get(s.id)!;
        for (const c of [cs[di % cs.length], cs[(di + 3) % cs.length]]) {
          asistencias.push({ tenantId, alumnoId: a.id, cursoId: c.id, ambito: c.id, fecha: fechaDb(dia), hora: "09:00", estado: estado === "falta" ? "falta" : "llego", origen: "lista", registradoPorId: c.profesorId });
        }
      }
    }
  }
  await crearEnLotes("asistencias (historial)", asistencias, (lote) => prisma.asistencia.createMany({ data: lote as never }));
  await crearEnLotes("avisos (historial, ya enviados)", avisosHist, (lote) => prisma.aviso.createMany({ data: lote as never }));
  // Justificaciones de ~30 % de las faltas (la mitad pendientes).
  const justificaciones = faltas.filter(() => azar() < 0.3).map((f) => {
    const a = alumnosPlan.find((x) => x.id === f.alumnoId)!;
    return { tenantId, asistenciaId: f.id, apoderadoId: mApoderado.get(apoderadosDe(a)[0])!.id, motivo: "Cita médica", estado: azar() < 0.5 ? "pendiente" : "aceptada" };
  });
  await crearEnLotes("justificaciones", justificaciones, (lote) => prisma.justificacion.createMany({ data: lote as never }));

  // ───── Notas (Khipu Pro): 4 bimestres, 3 competencias por curso, 2 evaluaciones por competencia en el IV ─────
  const rangos: [string, string][] = [["2026-03-09", "2026-05-08"], ["2026-05-18", "2026-07-17"], ["2026-08-03", "2026-10-02"], ["2026-10-12", "2026-12-18"]];
  const periodos = rangos.map(([inicio, fin], i) => ({
    id: randomUUID(), tenantId, anio: ANIO, tipo: "bimestre" as const, numero: i + 1, nombre: `${["I", "II", "III", "IV"][i]} Bimestre`,
    inicio: fechaDb(inicio), fin: fechaDb(fin), cerrado: i < 3,
  }));
  await crearEnLotes("periodos", periodos, (lote) => prisma.periodo.createMany({ data: lote }));
  const competencias = cursos.filter((c) => c.nivel !== "inicial").flatMap((c) =>
    [1, 2, 3].map((n) => ({ id: randomUUID(), tenantId, cursoId: c.id, nombre: `${c.nombre}: competencia ${n}`, orden: n, salonId: c.salonId, profesorId: c.profesorId })),
  );
  await crearEnLotes("competencias", competencias, (lote) => prisma.competencia.createMany({ data: lote.map((c) => ({ id: c.id, tenantId: c.tenantId, cursoId: c.cursoId, nombre: c.nombre, orden: c.orden })) }));
  const alumnosPorSalon = new Map<string, string[]>();
  for (const a of alumnos) alumnosPorSalon.set(a.salonId, [...(alumnosPorSalon.get(a.salonId) ?? []), a.id]);
  const literal = (): CalificacionLiteral => { const r = azar(); return r < 0.15 ? "AD" : r < 0.65 ? "A" : r < 0.92 ? "B" : "C"; };
  const evaluaciones: { id: string; tenantId: string; cursoId: string; periodoId: string; competenciaId: string; titulo: string; fecha: Date; salonId: string; profesorId: string }[] = [];
  for (const comp of competencias) {
    for (const k of [1, 2]) {
      evaluaciones.push({ id: randomUUID(), tenantId, cursoId: comp.cursoId, periodoId: periodos[3].id, competenciaId: comp.id, titulo: `Evaluación ${k}`, fecha: fechaDb(k === 1 ? "2026-10-16" : "2026-10-23"), salonId: comp.salonId, profesorId: comp.profesorId });
    }
  }
  await crearEnLotes("evaluaciones", evaluaciones, (lote) => prisma.evaluacion.createMany({ data: lote.map((e) => ({ id: e.id, tenantId: e.tenantId, cursoId: e.cursoId, periodoId: e.periodoId, competenciaId: e.competenciaId, titulo: e.titulo, fecha: e.fecha })) }));
  const notas = evaluaciones.flatMap((e) => (alumnosPorSalon.get(e.salonId) ?? []).map((alumnoId) => ({ tenantId, evaluacionId: e.id, alumnoId, valorLiteral: literal(), registradoPorId: e.profesorId })));
  await crearEnLotes("notas", notas, (lote) => prisma.nota.createMany({ data: lote }));
  const calificaciones = competencias.flatMap((comp) =>
    (alumnosPorSalon.get(comp.salonId) ?? []).map((alumnoId) => ({ tenantId, alumnoId, competenciaId: comp.id, periodoId: periodos[2].id, valorLiteral: literal(), conclusion: "Avanza en la competencia." })),
  );
  await crearEnLotes("calificaciones del periodo III", calificaciones, (lote) => prisma.calificacionPeriodo.createMany({ data: lote }));

  // ───── Salida para la prueba de carga (credenciales sintéticas, sin datos reales) ─────
  const salida = path.join(import.meta.dirname, ".salida");
  mkdirSync(salida, { recursive: true });
  const mayor = salonesPlan.reduce((m, s, i) => (s.alumnos > salonesPlan[m].alumnos ? i : m), 0);
  const datos = {
    tenantId, slug: SLUG, password: PASSWORD,
    direccion: direccion.email, porteria: porteria.email,
    profesores: profesores.slice(0, 40).map((p, i) => ({
      email: p.email, membershipId: mProfes[i].id,
      // Lista que pasa en la mañana: los 39 tutores la del día de su salón; el 40.° un curso de secundaria.
      lista: i < salones.length ? { salonId: salones[i].id, ambito: "dia" } : { salonId: cursos.find((c) => c.profesorId === mProfes[i].id)!.salonId, ambito: cursos.find((c) => c.profesorId === mProfes[i].id)!.id },
    })),
    apoderados: personas.filter((p) => p.login && p.email.startsWith("familia.")).map((p) => p.email),
    carnets: carnets.map((c) => ({ carnetId: c.id, alumnoId: c.alumnoId })),
    salonMayor: { id: salones[mayor].id, nombre: salones[mayor].nombre, alumnos: salonesPlan[mayor].alumnos },
    periodos: periodos.map((p) => ({ id: p.id, nombre: p.nombre })),
    alumnosPorSalon: Object.fromEntries([...alumnosPorSalon.entries()]),
    desdeHistorial: dias[0], hastaHistorial: dias.at(-1),
    direccionMembershipId: mDireccion.id,
  };
  writeFileSync(path.join(salida, "datos.json"), JSON.stringify(datos, null, 2));
  console.log(
    `Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s: ${salones.length} salones, ${alumnos.length} alumnos, ${mApoderado.size} apoderados, ` +
      `${cuentasAlumno.size} cuentas de alumno, ${2 + 1 + 3 + profesores.length} de personal, ${dias.length} días de historial.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
