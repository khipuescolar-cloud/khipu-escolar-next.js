// Colegio de prueba aislado para tests de integración: slug único (test-basico-<azar>) y limpieza al final.
// La BD local es compartida: nunca se tocan los colegios demo ni se re-ejecuta el seed.
import { randomUUID } from "node:crypto";
import type { Plan, Rol } from "@/generated/prisma/enums";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import type { TenantContext } from "@/lib/server/tenant";

// forbidden() exige el flag que Next activa con experimental.authInterrupts.
process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";

export type ColegioPrueba = Awaited<ReturnType<typeof crearColegioPrueba>>;

export async function crearColegioPrueba(
  opciones: { horaLimiteTardanza?: string; plan?: Plan; prefijo?: string } = {},
) {
  const sufijo = randomUUID().slice(0, 8);
  const tenant = await db.tenant.create({
    data: {
      slug: `${opciones.prefijo ?? "test-basico"}-${sufijo}`,
      nombre: `Colegio Prueba ${sufijo}`,
      plan: opciones.plan ?? "basico",
      horaLimiteTardanza: opciones.horaLimiteTardanza ?? "08:00",
    },
  });
  const perfiles: string[] = [];

  async function miembro(rol: Rol, nombre: string) {
    const id = randomUUID();
    perfiles.push(id);
    const user = await db.profile.create({
      data: { id, email: `${rol}-${nombre.toLowerCase()}-${sufijo}@test-basico.local`, nombres: nombre, apellidos: "Prueba" },
    });
    const membership = await db.membership.create({ data: { tenantId: tenant.id, userId: id, rol } });
    return { user, membership };
  }

  const direccion = await miembro("direccion", "Carmen");
  const tutora = await miembro("profesor", "Lucia");
  const otroProfesor = await miembro("profesor", "Pedro");
  const porteria = await miembro("porteria", "Julio");
  const madre = await miembro("apoderado", "Rosa");
  const padreSinConsentimiento = await miembro("apoderado", "Martin");

  const salon = await db.salon.create({ data: { tenantId: tenant.id, nombre: "3.° B", nivel: "primaria", anio: 2026, tutorId: tutora.membership.id } });
  const cursoTutora = await db.curso.create({ data: { tenantId: tenant.id, salonId: salon.id, nombre: "Matemática", profesorId: tutora.membership.id } });
  const otroSalon = await db.salon.create({ data: { tenantId: tenant.id, nombre: "5.° A", nivel: "primaria", anio: 2026, tutorId: otroProfesor.membership.id } });
  const cursoAjeno = await db.curso.create({ data: { tenantId: tenant.id, salonId: otroSalon.id, nombre: "Ciencia", profesorId: otroProfesor.membership.id } });

  const mateo = await db.alumno.create({ data: { tenantId: tenant.id, salonId: salon.id, nombres: "Mateo", apellidos: "Quispe", codigo: `M-${sufijo}` } });
  const valentina = await db.alumno.create({ data: { tenantId: tenant.id, salonId: salon.id, nombres: "Valentina", apellidos: "Ríos" } });
  const thiago = await db.alumno.create({ data: { tenantId: tenant.id, salonId: otroSalon.id, nombres: "Thiago", apellidos: "Paredes" } });

  const consentimiento = await db.consentimiento.create({ data: { tenantId: tenant.id, apoderadoId: madre.membership.id, versionTexto: "test" } });
  await db.apoderadoAlumno.create({ data: { tenantId: tenant.id, apoderadoId: madre.membership.id, alumnoId: mateo.id, consentimientoId: consentimiento.id } });
  // Consentimiento revocado: no debe recibir avisos.
  const revocado = await db.consentimiento.create({
    data: { tenantId: tenant.id, apoderadoId: padreSinConsentimiento.membership.id, versionTexto: "test", revocadoAt: new Date() },
  });
  await db.apoderadoAlumno.create({ data: { tenantId: tenant.id, apoderadoId: padreSinConsentimiento.membership.id, alumnoId: valentina.id, consentimientoId: revocado.id } });

  const miembros = { direccion, tutora, otroProfesor, porteria, madre, padreSinConsentimiento };

  function ctxDe(quien: keyof typeof miembros): TenantContext {
    const m = miembros[quien];
    return { tenant, user: m.user, membership: m.membership, rol: m.membership.rol, roles: [m.membership.rol], db: dbTenant(tenant.id), ...accesoModulosDeCodigo(tenant.plan) };
  }

  async function limpiar() {
    await db.tenant.delete({ where: { id: tenant.id } });
    await db.profile.deleteMany({ where: { id: { in: perfiles } } });
  }

  return { tenant, salon, otroSalon, cursoTutora, cursoAjeno, alumnos: { mateo, valentina, thiago }, miembros, ctxDe, limpiar, db: dbTenant(tenant.id), ...accesoModulosDeCodigo(tenant.plan) };
}

/** Espera a que una promesa que debe cortar con forbidden() lo haga (403). */
export async function esperarProhibido(promesa: Promise<unknown>) {
  await promesa.then(
    () => {
      throw new Error("Se esperaba 403 y la operación se permitió");
    },
    (error: unknown) => {
      if (!(error instanceof Error) || !String((error as { digest?: string }).digest ?? error.message).includes("403")) throw error;
    },
  );
}

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export type CorreoMailpit = { ID: string; Subject: string; From: { Name: string; Address: string }; To: { Address: string }[]; Created: string };

/** Busca correos en Mailpit para un destinatario; reintenta hasta `ms`. */
export async function correosPara(email: string, ms = 10_000): Promise<CorreoMailpit[]> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const json = (await res.json()) as { messages: CorreoMailpit[] };
    if (json.messages.length > 0) return json.messages;
    await new Promise((r) => setTimeout(r, 250));
  }
  return [];
}

export async function cuerpoCorreo(id: string): Promise<{ HTML: string; Text: string; Headers?: unknown }> {
  const res = await fetch(`${MAILPIT}/api/v1/message/${id}`);
  return res.json() as Promise<{ HTML: string; Text: string }>;
}
