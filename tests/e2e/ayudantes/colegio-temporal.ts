// Colegios temporales para los e2e que necesitan algo que el seed ya no trae (el seed solo tiene Nuevo Horizonte, Pro y
// escala literal): un colegio Khipu Base, una academia con escala vigesimal o una apoderada con hijos en dos colegios.
// Se crean en `beforeAll` (BD + usuarios de Auth con contraseña demo123) y se borran en `afterAll` con `limpiar()`.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const CLAVE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const cabeceras = { apikey: CLAVE, Authorization: `Bearer ${CLAVE}`, "Content-Type": "application/json" };

export async function sql<T extends Record<string, unknown> = Record<string, unknown>>(texto: string, valores: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query<T>(texto, valores)).rows;
  } finally {
    await c.end();
  }
}

async function crearUsuarioAuth(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE}/auth/v1/admin/users`, { method: "POST", headers: cabeceras, body: JSON.stringify({ email, password: "demo123", email_confirm: true }) });
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error(`No se creó el usuario ${email}`);
  return json.id;
}

export type ColegioTemporal = Awaited<ReturnType<typeof crearColegioTemporal>>;

/**
 * - `plan: "base"`: dirección y un profesor con un salón de secundaria y un alumno.
 * - `vigesimal: true`: academia Pro con escala 0–20, profesor «Jorge Ramos», salón «Ciclo Pre-U A», curso «Álgebra»,
 *   4 alumnos y la evaluación «Simulacro 1» del bimestre abierto con notas 16, 12, 18 y 9 (Franco Herrera Poma = 9).
 * - `apoderadaExistente`: correo de una cuenta que ya existe (p. ej. Rosa) que queda como apoderada de un alumno aquí.
 */
export async function crearColegioTemporal(opciones: { plan: "base" | "pro"; vigesimal?: boolean; apoderadaExistente?: string; prefijo?: string }) {
  const sufijo = randomUUID().slice(0, 8);
  const slug = `${opciones.prefijo ?? "e2e"}-${sufijo}`;
  const nombre = opciones.vigesimal ? `Academia Prueba ${sufijo}` : `Colegio Prueba ${sufijo}`;
  const dominio = `${slug}.test`;
  const usuarios: string[] = [];
  const [{ id: tenantId }] = await sql<{ id: string }>(
    `insert into tenants (id, slug, nombre, plan, escala_calificacion, email_domains, asistencia_por_curso_niveles)
     values (gen_random_uuid(), $1, $2, $3, $4, $5, $6) returning id`,
    [slug, nombre, opciones.plan, opciones.vigesimal ? "vigesimal" : "literal", [dominio], opciones.vigesimal ? ["academia"] : []],
  );

  async function miembro(rol: string, email: string, nombres: string, apellidos: string, userId?: string) {
    const id = userId ?? (await crearUsuarioAuth(email));
    if (!userId) {
      usuarios.push(id);
      await sql("insert into profiles (id, email, nombres, apellidos) values ($1, $2, $3, $4)", [id, email, nombres, apellidos]);
    }
    const [{ id: membershipId }] = await sql<{ id: string }>("insert into memberships (id, tenant_id, user_id, rol) values (gen_random_uuid(), $1, $2, $3) returning id", [tenantId, id, rol]);
    return membershipId;
  }

  const correos = { direccion: `direccion@${dominio}`, profesor: `profesor@${dominio}` };
  await miembro("direccion", correos.direccion, "Elena", "Prueba");
  const profesor = await miembro("profesor", correos.profesor, opciones.vigesimal ? "Jorge" : "Ana", opciones.vigesimal ? "Ramos Calle" : "Paredes");
  const [{ id: salonId }] = await sql<{ id: string }>(
    "insert into salones (id, tenant_id, nombre, nivel, grado, anio, tutor_id) values (gen_random_uuid(), $1, $2, $3, $4, 2026, $5) returning id",
    [tenantId, opciones.vigesimal ? "Ciclo Pre-U A" : "1.° A", opciones.vigesimal ? "academia" : "secundaria", opciones.vigesimal ? null : 1, profesor],
  );
  const [{ id: cursoId }] = await sql<{ id: string }>("insert into cursos (id, tenant_id, salon_id, nombre, profesor_id) values (gen_random_uuid(), $1, $2, $3, $4) returning id", [tenantId, salonId, opciones.vigesimal ? "Álgebra" : "Tutoría", profesor]);
  const nombresAlumnos: [string, string][] = opciones.vigesimal
    ? [["Andrea", "Quispe Mamani"], ["Bruno", "Zapata Gil"], ["Daniela", "Arias Luna"], ["Franco", "Herrera Poma"]]
    : [["Joaquín", "Benites Sosa"]];
  const alumnos: string[] = [];
  for (const [i, [n, a]] of nombresAlumnos.entries()) {
    alumnos.push((await sql<{ id: string }>("insert into alumnos (id, tenant_id, salon_id, nombres, apellidos, codigo) values (gen_random_uuid(), $1, $2, $3, $4, $5) returning id", [tenantId, salonId, n, a, `P-${i + 1}`]))[0].id);
  }

  if (opciones.vigesimal) {
    const anio = 2026;
    const rangos = [["03-09", "05-08"], ["05-18", "07-17"], ["08-03", "10-02"], ["10-12", "12-18"]];
    const periodos: string[] = [];
    for (const [i, [ini, fin]] of rangos.entries()) {
      periodos.push((await sql<{ id: string }>(
        "insert into periodos (id, tenant_id, anio, tipo, numero, nombre, inicio, fin, cerrado) values (gen_random_uuid(), $1, $2, 'bimestre', $3, $4, $5, $6, $7) returning id",
        [tenantId, anio, i + 1, `${["I", "II", "III", "IV"][i]} Bimestre`, `${anio}-${ini}`, `${anio}-${fin}`, i < 3],
      ))[0].id);
    }
    const [{ id: competenciaId }] = await sql<{ id: string }>("insert into competencias (id, tenant_id, curso_id, nombre) values (gen_random_uuid(), $1, $2, 'Resuelve problemas algebraicos') returning id", [tenantId, cursoId]);
    const [{ id: evaluacionId }] = await sql<{ id: string }>(
      "insert into evaluaciones (id, tenant_id, curso_id, periodo_id, competencia_id, titulo, fecha) values (gen_random_uuid(), $1, $2, $3, $4, 'Simulacro 1', '2026-10-19') returning id",
      [tenantId, cursoId, periodos[3], competenciaId],
    );
    for (const [i, alumnoId] of alumnos.entries()) {
      await sql("insert into notas (id, tenant_id, evaluacion_id, alumno_id, valor_numerico, registrado_por, updated_at) values (gen_random_uuid(), $1, $2, $3, $4, $5, now())", [tenantId, evaluacionId, alumnoId, [16, 12, 18, 9][i], profesor]);
    }
  }

  if (opciones.apoderadaExistente) {
    const [perfil] = await sql<{ id: string }>("select id from profiles where email = $1", [opciones.apoderadaExistente]);
    const apoderado = await miembro("apoderado", opciones.apoderadaExistente, "", "", perfil.id);
    const [{ id: consentimiento }] = await sql<{ id: string }>("insert into consentimientos (id, tenant_id, apoderado_id, version_texto) values (gen_random_uuid(), $1, $2, 'e2e') returning id", [tenantId, apoderado]);
    await sql("insert into apoderados_alumnos (id, tenant_id, apoderado_id, alumno_id, parentesco, consentimiento_id) values (gen_random_uuid(), $1, $2, $3, 'madre', $4)", [tenantId, apoderado, alumnos[0], consentimiento]);
  }

  async function limpiar() {
    await sql("delete from tenants where id = $1", [tenantId]);
    await sql("delete from login_intentos where email like $1", [`%@${dominio}`]);
    await sql("delete from profiles where id = any($1::uuid[])", [usuarios]);
    for (const id of usuarios) await fetch(`${SUPABASE}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: cabeceras });
  }

  return { tenantId, slug, nombre, correos, cursoId, limpiar };
}
