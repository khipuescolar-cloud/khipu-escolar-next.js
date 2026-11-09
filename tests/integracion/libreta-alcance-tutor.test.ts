// Alcance de la libreta (specs/11): el profesor solo ve la libreta de los salones de los que es tutor, aunque dicte
// cursos en otras secciones del mismo grado; dirección ve todas. Requiere la BD local (crea su propio colegio).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Rol } from "@/generated/prisma/enums";
import { db } from "@/lib/server/db";
import { datosLibreta, requireLibretaVisible, resumenLibretasSalon, salonIdsLibreta } from "@/lib/server/libreta";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let periodoId: string;
const perfiles: string[] = [];
// 3.° B (del ayudante, tutora Lucía) y 3.° A (tutor Jorge, que además dicta en 3.° B).
let salonA: { id: string };
let alumnoA: { id: string };
let tutorA: TenantContext;
let profesorSinTutoria: TenantContext;

async function profesorExtra(nombre: string): Promise<TenantContext> {
  const id = randomUUID();
  perfiles.push(id);
  const user = await db.profile.create({ data: { id, email: `alcance-${nombre}-${id.slice(0, 8)}@test-basico.local`, nombres: nombre, apellidos: "Prueba" } });
  const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: id, rol: "profesor" satisfies Rol } });
  const base = c.ctxDe("tutora");
  return { ...base, user, membership, rol: "profesor", roles: ["profesor"] };
}

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-libreta-alcance" });
  periodoId = (await c.db.periodo.create({
    data: { tenantId: c.tenant.id, anio: 2026, tipo: "bimestre", numero: 3, nombre: "III Bimestre", inicio: new Date("2026-08-01"), fin: new Date("2026-10-10"), cerrado: true },
  })).id;
  tutorA = await profesorExtra("Jorge");
  profesorSinTutoria = await profesorExtra("Pamela");
  salonA = await db.salon.create({ data: { tenantId: c.tenant.id, nombre: "3.° A", nivel: "primaria", anio: 2026, tutorId: tutorA.membership.id } });
  alumnoA = await db.alumno.create({ data: { tenantId: c.tenant.id, salonId: salonA.id, nombres: "Rafaela", apellidos: "Núñez" } });
  // Ambos dictan en 3.° B: dictar un curso no da acceso a la libreta del salón.
  await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Inglés", profesorId: profesorSinTutoria.membership.id } });
  await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Arte", profesorId: tutorA.membership.id } });
}, 30_000);

afterAll(async () => {
  await c?.limpiar();
  await db.profile.deleteMany({ where: { id: { in: perfiles } } });
}, 30_000);

describe("libreta: alcance del tutor", () => {
  it("el tutor de 3.° A solo tiene su salón y ve su libreta", async () => {
    expect(await salonIdsLibreta(tutorA)).toEqual([salonA.id]);
    await expect(resumenLibretasSalon(tutorA, salonA.id, periodoId)).resolves.toMatchObject({ salon: { id: salonA.id } });
    expect((await datosLibreta(tutorA, alumnoA.id, periodoId)).alumno.nombres).toBe("Rafaela");
  });

  it("el tutor de 3.° A no ve la libreta de 3.° B aunque dicte un curso ahí", async () => {
    await esperarProhibido(resumenLibretasSalon(tutorA, c.salon.id, periodoId));
    await esperarProhibido(datosLibreta(tutorA, c.alumnos.mateo.id, periodoId));
    await esperarProhibido(datosLibreta(tutorA, c.alumnos.mateo.id, periodoId, "exportar"));
    await esperarProhibido(requireLibretaVisible(tutorA, c.alumnos.mateo.id));
  });

  it("un profesor que dicta en 3.° B sin ser tutor no ve ninguna libreta", async () => {
    expect(await salonIdsLibreta(profesorSinTutoria)).toEqual([]);
    await esperarProhibido(resumenLibretasSalon(profesorSinTutoria, c.salon.id, periodoId));
    await esperarProhibido(datosLibreta(profesorSinTutoria, c.alumnos.mateo.id, periodoId));
  });

  it("la tutora de 3.° B ve su salón y no el 3.° A", async () => {
    const tutora = c.ctxDe("tutora");
    expect(await salonIdsLibreta(tutora)).toEqual([c.salon.id]);
    expect((await datosLibreta(tutora, c.alumnos.mateo.id, periodoId)).alumno.nombres).toBe("Mateo");
    await esperarProhibido(resumenLibretasSalon(tutora, salonA.id, periodoId));
    await esperarProhibido(datosLibreta(tutora, alumnoA.id, periodoId));
  });

  it("dirección ve todos los salones", async () => {
    const direccion = c.ctxDe("direccion");
    expect(new Set(await salonIdsLibreta(direccion))).toEqual(new Set([c.salon.id, c.otroSalon.id, salonA.id]));
    await expect(resumenLibretasSalon(direccion, salonA.id, periodoId)).resolves.toMatchObject({ salon: { id: salonA.id } });
    await expect(resumenLibretasSalon(direccion, c.salon.id, periodoId)).resolves.toMatchObject({ salon: { id: c.salon.id } });
    expect((await datosLibreta(direccion, alumnoA.id, periodoId)).alumno.nombres).toBe("Rafaela");
  });

  it("otros roles no listan salones de libreta", async () => {
    await esperarProhibido(salonIdsLibreta(c.ctxDe("madre")));
    await esperarProhibido(salonIdsLibreta(c.ctxDe("porteria")));
  });
});
