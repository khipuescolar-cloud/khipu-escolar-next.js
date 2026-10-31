// Estructura y personas de I.E.P. Nuevo Horizonte (Khipu Pro): colegio, personal, profesores, salones, cursos,
// alumnos, familias (con consentimientos), cuentas de alumno, carnets QR y periodos. Datos 100 % ficticios.
// Lo llama prisma/seed.ts después de borrar el colegio (cascade). Las cuentas de Auth se reutilizan si ya existen.
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Genero, Nivel, Rol } from "../src/generated/prisma/enums";
import {
  DOMINIO_COLEGIO, DOMINIO_FAMILIAS, NOMBRE_COLEGIO, SLUG_COLEGIO, VERSION_CONSENTIMIENTO, anioEscolar, asegurarUsuariosAuth,
  crearAzar, enParalelo, fechaDb, hashToken, hoyLima, instante, sinTildes, sumarDias, tokenCarnet, type Azar,
} from "./seed-utilidades";

// ───────────── Personal y profesores ─────────────

type PersonaFija = { clave: string; email: string; nombres: string; apellidos: string; genero: Genero; cargo?: string };

const PERSONAL: (PersonaFija & { rol: Rol })[] = [
  { clave: "direccion", rol: "direccion", email: `direccion@${DOMINIO_COLEGIO}`, nombres: "Carmen", apellidos: "Torres Vega", genero: "femenino", cargo: "Directora general" },
  { clave: "secretaria", rol: "administrativo", email: `secretaria@${DOMINIO_COLEGIO}`, nombres: "Gloria", apellidos: "Ramírez Soto", genero: "femenino", cargo: "Secretaria académica" },
  { clave: "psicologa", rol: "administrativo", email: `psicologia@${DOMINIO_COLEGIO}`, nombres: "Diana", apellidos: "Paredes Huerta", genero: "femenino", cargo: "Psicóloga" },
  { clave: "porteria", rol: "porteria", email: `porteria@${DOMINIO_COLEGIO}`, nombres: "Julio", apellidos: "Cáceres", genero: "masculino", cargo: "Portería" },
];

const p = (clave: string, email: string, nombres: string, apellidos: string, genero: Genero, cargo: string): PersonaFija => ({ clave, email: `${email}@${DOMINIO_COLEGIO}`, nombres, apellidos, genero, cargo });

/** 26 profesores. Las claves se usan en la asignación de salones y cursos. */
const PROFESORES: PersonaFija[] = [
  // Inicial (cada tutora dicta todas las áreas de su aula).
  p("milagros", "milagros.cardenas", "Milagros", "Cárdenas Ríos", "femenino", "Docente de inicial"),
  p("yesenia", "yesenia.poma", "Yesenia", "Poma Gutiérrez", "femenino", "Docente de inicial"),
  p("karina", "karina.salazar", "Karina", "Salazar Apaza", "femenino", "Docente de inicial"),
  // Primaria: tutores de aula.
  p("rocio", "rocio.benites", "Rocío", "Benites Lozano", "femenino", "Docente de primaria"),
  p("silvia", "silvia.ccahuana", "Silvia", "Ccahuana Ramos", "femenino", "Docente de primaria"),
  p("jorge", "jorge.villanueva", "Jorge", "Villanueva Tello", "masculino", "Docente de primaria"),
  p("lucia", "lucia.garcia", "Lucía", "García Paz", "femenino", "Docente de primaria"),
  p("norma", "norma.espinoza", "Norma", "Espinoza Carbajal", "femenino", "Docente de primaria"),
  p("pedro", "pedro.salas", "Pedro", "Salas Ríos", "masculino", "Docente de primaria · Ciencia y Tecnología"),
  p("hugo", "hugo.zapata", "Hugo", "Zapata Meléndez", "masculino", "Docente de primaria"),
  p("elizabeth", "elizabeth.condori", "Elizabeth", "Condori Ticona", "femenino", "Docente de primaria"),
  // Primaria: especialistas.
  p("raul", "raul.medina", "Raúl", "Medina Herrera", "masculino", "Docente de Educación Física"),
  p("pamela", "pamela.gonzales", "Pamela", "Gonzales Tello", "femenino", "Docente de Inglés"),
  // Secundaria: por área.
  p("alberto", "alberto.yupanqui", "Alberto", "Yupanqui Flores", "masculino", "Docente de Matemática"),
  p("ricardo", "ricardo.nunez", "Ricardo", "Núñez Salinas", "masculino", "Docente de Matemática"),
  p("monica", "monica.vargas", "Mónica", "Vargas Pinto", "femenino", "Docente de Comunicación"),
  p("teresa", "teresa.huanca", "Teresa", "Huanca Quiroz", "femenino", "Docente de Comunicación"),
  p("daniel", "daniel.arias", "Daniel", "Arias Montoya", "masculino", "Docente de Inglés"),
  p("fernando", "fernando.ortiz", "Fernando", "Ortiz Valdivia", "masculino", "Docente de Ciencias Sociales"),
  p("carla", "carla.mendoza", "Carla", "Mendoza Rivera", "femenino", "Docente de DPCC"),
  p("oscar", "oscar.lazo", "Óscar", "Lazo Pérez", "masculino", "Docente de Ciencia y Tecnología"),
  p("veronica", "veronica.campos", "Verónica", "Campos Aguilar", "femenino", "Docente de Ciencia y Tecnología"),
  p("gustavo", "gustavo.rojas", "Gustavo", "Rojas Sifuentes", "masculino", "Docente de Educación para el Trabajo"),
  p("lourdes", "lourdes.paz", "Lourdes", "Paz Ugarte", "femenino", "Docente de Arte y Cultura"),
  p("cesar", "cesar.torres", "César", "Torres Cueva", "masculino", "Docente de Educación Física"),
  p("juancarlos", "juancarlos.vilca", "Juan Carlos", "Vilca Chambi", "masculino", "Docente de Educación Religiosa"),
];

// ───────────── Salones y cursos ─────────────

export type SalonPlan = { clave: string; nombre: string; nivel: Nivel; grado: number; seccion: string; tutor: string; alumnos: number };

export const SALONES: SalonPlan[] = [
  { clave: "I3", nombre: "Inicial 3 años", nivel: "inicial", grado: 3, seccion: "A", tutor: "milagros", alumnos: 8 },
  { clave: "I4", nombre: "Inicial 4 años", nivel: "inicial", grado: 4, seccion: "A", tutor: "yesenia", alumnos: 9 },
  { clave: "I5", nombre: "Inicial 5 años", nivel: "inicial", grado: 5, seccion: "A", tutor: "karina", alumnos: 10 },
  { clave: "P1A", nombre: "1.° A", nivel: "primaria", grado: 1, seccion: "A", tutor: "rocio", alumnos: 10 },
  { clave: "P2A", nombre: "2.° A", nivel: "primaria", grado: 2, seccion: "A", tutor: "silvia", alumnos: 10 },
  { clave: "P3A", nombre: "3.° A", nivel: "primaria", grado: 3, seccion: "A", tutor: "jorge", alumnos: 10 },
  { clave: "P3B", nombre: "3.° B", nivel: "primaria", grado: 3, seccion: "B", tutor: "lucia", alumnos: 10 },
  { clave: "P4A", nombre: "4.° A", nivel: "primaria", grado: 4, seccion: "A", tutor: "norma", alumnos: 11 },
  { clave: "P5A", nombre: "5.° A", nivel: "primaria", grado: 5, seccion: "A", tutor: "pedro", alumnos: 10 },
  { clave: "P5B", nombre: "5.° B", nivel: "primaria", grado: 5, seccion: "B", tutor: "hugo", alumnos: 9 },
  { clave: "P6A", nombre: "6.° A", nivel: "primaria", grado: 6, seccion: "A", tutor: "elizabeth", alumnos: 11 },
  { clave: "S1A", nombre: "1.° A Sec.", nivel: "secundaria", grado: 1, seccion: "A", tutor: "alberto", alumnos: 12 },
  { clave: "S1B", nombre: "1.° B Sec.", nivel: "secundaria", grado: 1, seccion: "B", tutor: "monica", alumnos: 11 },
  { clave: "S2A", nombre: "2.° A Sec.", nivel: "secundaria", grado: 2, seccion: "A", tutor: "carla", alumnos: 11 },
  { clave: "S3A", nombre: "3.° A Sec.", nivel: "secundaria", grado: 3, seccion: "A", tutor: "teresa", alumnos: 10 },
  { clave: "S4A", nombre: "4.° A Sec.", nivel: "secundaria", grado: 4, seccion: "A", tutor: "veronica", alumnos: 10 },
  { clave: "S5A", nombre: "5.° A Sec.", nivel: "secundaria", grado: 5, seccion: "A", tutor: "ricardo", alumnos: 9 },
];

/** Áreas del CNEB por nivel. «tutor» = la dicta el tutor del salón. */
function cursosDe(s: SalonPlan): [string, string][] {
  if (s.nivel === "inicial") {
    return ["Personal Social", "Psicomotriz", "Comunicación", "Matemática", "Ciencia y Tecnología"].map((c) => [c, s.tutor]);
  }
  if (s.nivel === "primaria") {
    // Pedro dicta Ciencia y Tecnología en 3.° B, 5.° A, 5.° B y 6.° A; en los demás la dicta el tutor.
    const ciencia = ["P3B", "P5A", "P5B", "P6A"].includes(s.clave) ? "pedro" : s.tutor;
    return [
      ["Matemática", s.tutor], ["Comunicación", s.tutor], ["Personal Social", s.tutor], ["Ciencia y Tecnología", ciencia],
      ["Arte y Cultura", s.tutor], ["Educación Física", "raul"], ["Educación Religiosa", s.tutor], ["Inglés", "pamela"],
    ];
  }
  const primeros = ["S1A", "S1B", "S2A"].includes(s.clave);
  return [
    ["Matemática", primeros ? "alberto" : "ricardo"], ["Comunicación", primeros ? "monica" : "teresa"], ["Inglés", "daniel"],
    ["Ciencias Sociales", "fernando"], ["Desarrollo Personal, Ciudadanía y Cívica", "carla"], ["Ciencia y Tecnología", primeros ? "oscar" : "veronica"],
    ["Educación para el Trabajo", "gustavo"], ["Arte y Cultura", "lourdes"], ["Educación Física", "cesar"], ["Educación Religiosa", "juancarlos"],
  ];
}

// ───────────── Nombres (ficticios) ─────────────

const NOMBRES_F = ["María", "Valentina", "Camila", "Luana", "Ximena", "Renata", "Sofía", "Isabella", "Mía", "Antonella", "Fernanda", "Daniela", "Alessia", "Kiara", "Abigail", "Nicole", "Fátima", "Andrea", "Lucía", "Milagros", "Allison", "Brianna", "Zoe", "Ariana", "Emilia", "Mariana", "Gabriela", "Adriana", "Jimena", "Paula", "Rafaela", "Victoria", "Ana Lucía", "Danna", "Thaís", "Ainhoa", "Micaela", "Romina", "Valeria", "Yamila"];
const NOMBRES_M = ["Sebastián", "Thiago", "Gael", "Santiago", "Leonardo", "Joaquín", "Adrián", "Bruno", "Franco", "Nicolás", "Dylan", "Luis", "Carlos", "Piero", "Rodrigo", "Fabricio", "Alonso", "Ángel", "Jairo", "Kevin", "Matías", "Emiliano", "Benjamín", "Gabriel", "Daniel", "Samuel", "Hugo", "Iker", "Ian", "Lucas", "Martín", "Renzo", "Aarón", "Josué", "Valentino", "Maximiliano", "Thiago Andrés", "Jesús", "Paolo", "Elías"];
const ADULTOS_F = ["Rosa", "Patricia", "Julia", "Carmen", "Elena", "Mariela", "Roxana", "Silvia", "Karina", "Lorena", "Verónica", "Janet", "Maribel", "Sandra", "Yolanda", "Gladys", "Liliana", "Marisol", "Pilar", "Edith", "Ruth", "Susana", "Flor", "Nelly", "Ivonne", "Cecilia", "Giovanna", "Jessica", "Angélica", "Doris"];
const ADULTOS_M = ["Martín", "Julio", "Jorge", "Luis", "Carlos", "Miguel", "José", "Víctor", "Raúl", "Alberto", "Edwin", "César", "Fernando", "Walter", "Manuel", "Ricardo", "Juan", "Óscar", "Wilmer", "Henry", "Freddy", "Javier", "Percy", "Marco", "Roberto", "Hernán", "Elmer", "Iván", "Rubén", "Germán"];
const APELLIDOS = ["Quispe", "Huamán", "Mamani", "Flores", "Rojas", "Sánchez", "García", "Torres", "Ramírez", "Chávez", "Vargas", "Castillo", "Mendoza", "Ríos", "Díaz", "Cruz", "Paredes", "Gutiérrez", "Condori", "Ccahuana", "Apaza", "Ticona", "Salazar", "Espinoza", "Silva", "Campos", "León", "Núñez", "Poma", "Yupanqui", "Cárdenas", "Benites", "Villanueva", "Zapata", "Chuquimango", "Ortiz", "Lozano", "Medina", "Aguilar", "Huanca", "Rivera", "Soto", "Lara", "Herrera", "Valdivia", "Ugarte", "Palomino", "Cueva", "Alarcón", "Inga", "Ccori", "Tapia", "Morales", "Navarro", "Salinas", "Pacheco", "Gamarra", "Linares"];

// ───────────── Familias ─────────────

type Adulto = { nombres: string; apellidos: string; genero: Genero; email: string; parentesco: string };
type AlumnoPlan = {
  id: string; salon: string; nombres: string; apellidos: string; genero: Genero; codigo: string;
  familia: number; cuentaEmail?: string;
};
type Familia = { apellidoPaterno: string; apellidoMaterno: string; apoderados: Adulto[]; consentimiento: "vigente" | "pendiente" | "revocado"; hijos: AlumnoPlan[] };

/** Alumnos y familias que la documentación y los e2e usan por nombre. */
const FIJOS: { salon: string; nombres: string; apellidos: string; genero: Genero; familia: string }[] = [
  { salon: "P3B", nombres: "Mateo", apellidos: "Quispe Huamán", genero: "masculino", familia: "quispe" },
  { salon: "P3B", nombres: "Valentina", apellidos: "Ríos Soto", genero: "femenino", familia: "rios" },
  { salon: "P3B", nombres: "Sebastián", apellidos: "Huamán Lara", genero: "masculino", familia: "" },
  { salon: "P3B", nombres: "Camila", apellidos: "Flores Díaz", genero: "femenino", familia: "flores" },
  { salon: "P3B", nombres: "Diego", apellidos: "Mendoza Cruz", genero: "masculino", familia: "mendoza" },
  { salon: "P3B", nombres: "Luana", apellidos: "Castillo Rojas", genero: "femenino", familia: "" },
  { salon: "P5A", nombres: "Thiago", apellidos: "Paredes León", genero: "masculino", familia: "" },
  { salon: "P5A", nombres: "Ximena", apellidos: "Vargas Núñez", genero: "femenino", familia: "" },
  { salon: "P5A", nombres: "Gael", apellidos: "Chávez Ortiz", genero: "masculino", familia: "" },
  { salon: "P5A", nombres: "Renata", apellidos: "Silva Campos", genero: "femenino", familia: "" },
  { salon: "P5A", nombres: "Lucas", apellidos: "Huamán Soto", genero: "masculino", familia: "huaman" },
  // Segundo hijo de Rosa (otro nivel): para probar una familia con varios hijos.
  { salon: "S1A", nombres: "Sofía", apellidos: "Quispe Huamán", genero: "femenino", familia: "quispe" },
];

const FAMILIAS_FIJAS: Record<string, Adulto[]> = {
  quispe: [{ nombres: "Rosa", apellidos: "Quispe Mamani", genero: "femenino", email: "rosa.quispe@gmail.com", parentesco: "madre" }],
  rios: [{ nombres: "Martín", apellidos: "Ríos Calderón", genero: "masculino", email: `familia.rios@${DOMINIO_FAMILIAS}`, parentesco: "padre" }],
  flores: [{ nombres: "Patricia", apellidos: "Díaz Ramos", genero: "femenino", email: `familia.flores@${DOMINIO_FAMILIAS}`, parentesco: "madre" }],
  mendoza: [{ nombres: "Julio", apellidos: "Mendoza Paz", genero: "masculino", email: `familia.mendoza@${DOMINIO_FAMILIAS}`, parentesco: "padre" }],
  huaman: [{ nombres: "Julia", apellidos: "Soto Rivas", genero: "femenino", email: `familia.huaman@${DOMINIO_FAMILIAS}`, parentesco: "madre" }],
};

/** Correos de cuentas de alumno que la documentación usa. */
const CUENTAS_FIJAS: Record<string, string> = { "Lucas Huamán Soto": `lucas.huaman@${DOMINIO_COLEGIO}`, "Sofía Quispe Huamán": `sofia.quispe@${DOMINIO_COLEGIO}` };

function planFamilias(azar: Azar) {
  const familias: Familia[] = [];
  const alumnos: AlumnoPlan[] = [];
  const nombresUsados = new Set<string>();
  const correosUsados = new Set<string>(Object.values(FAMILIAS_FIJAS).flat().map((a) => a.email));
  const correo = (nombres: string, apellido: string, dominio: string) => {
    const base = `${sinTildes(nombres.split(" ")[0])}.${sinTildes(apellido)}`;
    let e = `${base}@${dominio}`;
    for (let n = 2; correosUsados.has(e); n++) e = `${base}${n}@${dominio}`;
    correosUsados.add(e);
    return e;
  };
  const porSalon = new Map<string, number>();
  const codigo = () => `${anioEscolar()}-${String(alumnos.length + 1).padStart(3, "0")}`;

  const indiceFijas = new Map<string, number>();
  const familiaFija = (clave: string, apellidos: string) => {
    if (!indiceFijas.has(clave)) {
      const [ap, am] = apellidos.split(" ");
      familias.push({ apellidoPaterno: ap, apellidoMaterno: am, apoderados: FAMILIAS_FIJAS[clave], consentimiento: "vigente", hijos: [] });
      indiceFijas.set(clave, familias.length - 1);
    }
    return indiceFijas.get(clave)!;
  };

  const nuevaFamilia = (apellidos?: string): number => {
    const [ap, am] = apellidos ? apellidos.split(" ") : [azar.elegir(APELLIDOS), azar.elegir(APELLIDOS)];
    const n = familias.length;
    const tipo = azar.num();
    const apoderados: Adulto[] = [];
    const madre = () => { const nom = azar.elegir(ADULTOS_F); const ape = `${am} ${azar.elegir(APELLIDOS)}`; apoderados.push({ nombres: nom, apellidos: ape, genero: "femenino", email: correo(nom, am, DOMINIO_FAMILIAS), parentesco: "madre" }); };
    const padre = () => { const nom = azar.elegir(ADULTOS_M); const ape = `${ap} ${azar.elegir(APELLIDOS)}`; apoderados.push({ nombres: nom, apellidos: ape, genero: "masculino", email: correo(nom, ap, DOMINIO_FAMILIAS), parentesco: "padre" }); };
    if (tipo < 0.5) { madre(); padre(); } else if (tipo < 0.85) madre(); else if (tipo < 0.95) padre();
    else { const nom = azar.elegir(ADULTOS_F); apoderados.push({ nombres: nom, apellidos: `${am} ${azar.elegir(APELLIDOS)}`, genero: "femenino", email: correo(nom, am, DOMINIO_FAMILIAS), parentesco: "abuela" }); }
    // Cada 12.ª familia no aceptó aún el consentimiento; cada 29.ª lo retiró.
    const consentimiento = n % 12 === 7 ? "pendiente" : n % 29 === 13 ? "revocado" : "vigente";
    familias.push({ apellidoPaterno: ap, apellidoMaterno: am, apoderados, consentimiento, hijos: [] });
    return n;
  };

  const agregar = (salon: SalonPlan, nombres: string, apellidos: string, genero: Genero, familia: number) => {
    nombresUsados.add(`${nombres} ${apellidos}`);
    const a: AlumnoPlan = { id: randomUUID(), salon: salon.clave, nombres, apellidos, genero, codigo: codigo(), familia };
    alumnos.push(a);
    familias[familia].hijos.push(a);
    porSalon.set(salon.clave, (porSalon.get(salon.clave) ?? 0) + 1);
  };

  for (const salon of SALONES) {
    for (const f of FIJOS.filter((x) => x.salon === salon.clave)) {
      const fam = f.familia ? familiaFija(f.familia, f.apellidos) : nuevaFamilia(f.apellidos);
      agregar(salon, f.nombres, f.apellidos, f.genero, fam);
    }
    while ((porSalon.get(salon.clave) ?? 0) < salon.alumnos) {
      // ~15 %: hermano de un alumno de otro grado (misma familia, mismos apellidos).
      const candidatas = familias.map((f, i) => [f, i] as const).filter(([f, i]) => f.hijos.length === 1 && ![...indiceFijas.values()].includes(i) &&f.hijos[0].salon !== salon.clave && SALONES.find((s) => s.clave === f.hijos[0].salon)!.grado !== salon.grado);
      const genero: Genero = azar.prob(0.5) ? "femenino" : "masculino";
      const nombre = genero === "femenino" ? azar.elegir(NOMBRES_F) : azar.elegir(NOMBRES_M);
      if (candidatas.length > 0 && azar.prob(0.15)) {
        const [f, i] = azar.elegir(candidatas);
        const apellidos = `${f.apellidoPaterno} ${f.apellidoMaterno}`;
        if (!nombresUsados.has(`${nombre} ${apellidos}`)) agregar(salon, nombre, apellidos, genero, i);
        continue;
      }
      const apellidos = `${azar.elegir(APELLIDOS)} ${azar.elegir(APELLIDOS)}`;
      if (nombresUsados.has(`${nombre} ${apellidos}`) || apellidos.split(" ")[0] === apellidos.split(" ")[1]) continue;
      agregar(salon, nombre, apellidos, genero, nuevaFamilia(apellidos));
    }
  }

  // Cuentas propias: 5.° y 6.° de primaria y toda la secundaria (grado mínimo del colegio = 5).
  for (const a of alumnos) {
    const s = SALONES.find((x) => x.clave === a.salon)!;
    if (s.nivel === "secundaria" || (s.nivel === "primaria" && s.grado >= 5)) {
      const completo = `${a.nombres} ${a.apellidos}`;
      a.cuentaEmail = CUENTAS_FIJAS[completo] ?? correo(a.nombres, a.apellidos.split(" ")[0], DOMINIO_COLEGIO);
    }
  }
  return { familias, alumnos };
}

// ───────────── Periodos (bimestres del año escolar en curso) ─────────────

export function rangosBimestres(anio: number): { nombre: string; inicio: string; fin: string }[] {
  return [
    { nombre: "I Bimestre", inicio: `${anio}-03-09`, fin: `${anio}-05-08` },
    { nombre: "II Bimestre", inicio: `${anio}-05-18`, fin: `${anio}-07-17` },
    { nombre: "III Bimestre", inicio: `${anio}-08-03`, fin: `${anio}-10-02` },
    { nombre: "IV Bimestre", inicio: `${anio}-10-12`, fin: `${anio}-12-18` },
  ];
}

/** true si el día cae dentro de algún bimestre (fuera de ellos son vacaciones). */
export function enClases(iso: string): boolean {
  return rangosBimestres(Number(iso.slice(0, 4))).some((r) => iso >= r.inicio && iso <= r.fin);
}

// ───────────── Siembra ─────────────

export async function sembrarColegio(prisma: PrismaClient) {
  const azar = crearAzar(20261030);
  const anio = anioEscolar();
  const hoy = hoyLima();
  const tenant = await prisma.tenant.create({
    data: {
      slug: SLUG_COLEGIO, nombre: NOMBRE_COLEGIO, ciudad: "Lima", eslogan: "Aprendemos juntos, crecemos juntos", plan: "pro", escalaCalificacion: "literal",
      emailDomains: [DOMINIO_COLEGIO], estado: "piloto", asistenciaPorCursoNiveles: ["primaria", "secundaria"], gradoMinimoCuentaAlumno: 5,
      controlIngresoAutomatico: true, horaLimiteFalta: "09:00",
    },
  });
  const tenantId = tenant.id;
  const { familias, alumnos } = planFamilias(azar);

  // 1. Cuentas de Auth (contraseña demo123) para todo el personal, las familias y los alumnos con cuenta.
  const adultos = familias.flatMap((f) => f.apoderados);
  const correos = [...PERSONAL, ...PROFESORES].map((x) => x.email).concat(adultos.map((a) => a.email), alumnos.flatMap((a) => (a.cuentaEmail ? [a.cuentaEmail] : [])));
  const ids = await asegurarUsuariosAuth(correos);
  const idDe = (email: string) => ids.get(email.toLowerCase())!;

  // 2. Perfiles (upsert: sobreviven al borrado del colegio).
  const dni = () => String(azar.entero(40_000_000, 79_999_999));
  const celular = () => `9${azar.entero(10_000_000, 99_999_999)}`;
  const perfiles = [
    ...[...PERSONAL, ...PROFESORES].map((x) => ({ id: idDe(x.email), email: x.email, nombres: x.nombres, apellidos: x.apellidos, genero: x.genero, telefono: celular(), tipoDocumento: "dni" as const, numeroDocumento: dni() })),
    ...adultos.map((a) => ({ id: idDe(a.email), email: a.email, nombres: a.nombres, apellidos: a.apellidos, genero: a.genero, telefono: celular(), tipoDocumento: "dni" as const, numeroDocumento: dni() })),
    ...alumnos.filter((a) => a.cuentaEmail).map((a) => ({ id: idDe(a.cuentaEmail!), email: a.cuentaEmail!, nombres: a.nombres, apellidos: a.apellidos, genero: a.genero, tipoDocumento: "dni" as const, numeroDocumento: dni() })),
  ];
  await enParalelo(perfiles, 10, async (pf) => {
    const { id, ...datos } = pf;
    await prisma.profile.upsert({ where: { id }, update: { ...datos, debeCambiarPassword: false }, create: pf });
  });

  // 3. Membresías.
  const membresia = new Map<string, string>(); // clave o correo → membership id
  const filasMembresia: { id: string; tenantId: string; userId: string; rol: Rol; cargo?: string }[] = [];
  const nuevaMembresia = (clave: string, email: string, rol: Rol, cargo?: string) => {
    const id = randomUUID();
    membresia.set(clave, id);
    filasMembresia.push({ id, tenantId, userId: idDe(email), rol, cargo });
    return id;
  };
  for (const x of PERSONAL) nuevaMembresia(x.clave, x.email, x.rol, x.cargo);
  for (const x of PROFESORES) nuevaMembresia(x.clave, x.email, "profesor", x.cargo);
  for (const a of adultos) nuevaMembresia(a.email, a.email, "apoderado");
  for (const a of alumnos) if (a.cuentaEmail) nuevaMembresia(a.cuentaEmail, a.cuentaEmail, "alumno");
  await prisma.membership.createMany({ data: filasMembresia });

  // 4. Salones y cursos.
  const salonId = new Map<string, string>();
  const salones = SALONES.map((s) => {
    const id = randomUUID();
    salonId.set(s.clave, id);
    return { id, tenantId, nombre: s.nombre, nivel: s.nivel, grado: s.grado, seccion: s.seccion, anio, tutorId: membresia.get(s.tutor)! };
  });
  await prisma.salon.createMany({ data: salones });
  await prisma.curso.createMany({
    data: SALONES.flatMap((s) => cursosDe(s).map(([nombre, profe]) => ({ tenantId, salonId: salonId.get(s.clave)!, nombre, profesorId: membresia.get(profe)! }))),
  });

  // 5. Alumnos, cuentas propias y carnets QR.
  await prisma.alumno.createMany({
    data: alumnos.map((a) => ({
      id: a.id, tenantId, salonId: salonId.get(a.salon)!, nombres: a.nombres, apellidos: a.apellidos, codigo: a.codigo,
      cuentaId: a.cuentaEmail ? membresia.get(a.cuentaEmail)! : null, createdAt: instante(sumarDias(`${anio}-03-01`, 0), "09:00"),
    })),
  });
  const carnets = alumnos.map((a) => {
    const id = randomUUID();
    return { id, tenantId, alumnoId: a.id, tokenHash: hashToken(tokenCarnet(id)), createdAt: instante(`${anio}-03-02`, "10:00") };
  });
  await prisma.carnetQr.createMany({ data: carnets });

  // 6. Vínculos familia ↔ alumno con consentimiento (pendiente = sin fila; revocado = fila con revocadoAt).
  const consentimientos: { id: string; tenantId: string; apoderadoId: string; versionTexto: string; aceptadoAt: Date; revocadoAt: Date | null; ip: string }[] = [];
  const vinculos: { tenantId: string; apoderadoId: string; alumnoId: string; parentesco: string; consentimientoId: string | null }[] = [];
  for (const f of familias) {
    for (const ap of f.apoderados) {
      const apoderadoId = membresia.get(ap.email)!;
      let consentimientoId: string | null = null;
      if (f.consentimiento !== "pendiente") {
        consentimientoId = randomUUID();
        consentimientos.push({
          id: consentimientoId, tenantId, apoderadoId, versionTexto: VERSION_CONSENTIMIENTO, ip: "127.0.0.1",
          aceptadoAt: instante(`${anio}-03-0${azar.entero(2, 9)}`, "19:30"),
          revocadoAt: f.consentimiento === "revocado" ? instante(sumarDias(hoy, -20), "21:00") : null,
        });
      }
      for (const h of f.hijos) vinculos.push({ tenantId, apoderadoId, alumnoId: h.id, parentesco: ap.parentesco, consentimientoId });
    }
  }
  await prisma.consentimiento.createMany({ data: consentimientos });
  await prisma.apoderadoAlumno.createMany({ data: vinculos });
  await prisma.preferenciaAviso.createMany({ data: adultos.map((a) => ({ tenantId, apoderadoId: membresia.get(a.email)! })), skipDuplicates: true });

  // 7. Periodos: los bimestres que ya terminaron quedan cerrados; las libretas del I y II ya se publicaron.
  await prisma.periodo.createMany({
    data: rangosBimestres(anio).map((r, i) => ({
      tenantId, anio, tipo: "bimestre" as const, numero: i + 1, nombre: r.nombre, inicio: fechaDb(r.inicio), fin: fechaDb(r.fin), cerrado: r.fin < hoy,
      libretaPublicadaAt: i < 2 && r.fin < hoy ? instante(sumarDias(r.fin, 7), "18:00") : null,
    })),
  });

  return { tenantId, familias: familias.length, alumnos: alumnos.length };
}
