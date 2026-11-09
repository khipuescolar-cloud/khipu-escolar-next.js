import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { db, dbTenant } from "@/lib/server/db";
import { docentesDelGrupo, gruposDelDocente, requireAccesoPlan } from "@/lib/server/plan-anual/acceso";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let a: ColegioPrueba;
let b: ColegioPrueba;
let terceroId: string;
let terceroMembershipId: string;
let planId: string;
const grupo = { anio: 2027, nivel: "primaria" as const, grado: 3, area: "matematica", nombreCurso: "Matemática" };
beforeAll(async () => {
  a = await crearColegioPrueba({ plan: "pro", prefijo: "plan-acceso-a" });
  b = await crearColegioPrueba({ plan: "pro", prefijo: "plan-acceso-b" });
  terceroId = randomUUID();
  await db.profile.create({ data: { id: terceroId, email: "tercero-" + terceroId + "@prueba.local", nombres: "Tercero", apellidos: "Prueba" } });
  const tercero = await db.membership.create({ data: { tenantId: a.tenant.id, userId: terceroId, rol: "profesor" } });
  terceroMembershipId = tercero.id;
  for (const seccion of ["A", "B", "C", "D", "E", "F"]) {
    const salon = await db.salon.create({ data: { tenantId: a.tenant.id, nombre: "3.° " + seccion, nivel: "primaria", grado: 3, seccion, anio: 2027 } });
    await db.curso.create({ data: { tenantId: a.tenant.id, salonId: salon.id, nombre: "Matemática", areaCneb: "matematica", profesorId: seccion <= "C" ? a.miembros.tutora.membership.id : a.miembros.otroProfesor.membership.id } });
    await db.curso.create({ data: { tenantId: a.tenant.id, salonId: salon.id, nombre: "Comunicación", areaCneb: "comunicacion", profesorId: terceroMembershipId } });
  }
  const plan = await db.planAnual.create({ data: { tenantId: a.tenant.id, ...grupo, creadoPorId: a.miembros.direccion.membership.id, participantes: { create: [
    { tenantId: a.tenant.id, membershipId: a.miembros.tutora.membership.id },
    { tenantId: a.tenant.id, membershipId: a.miembros.otroProfesor.membership.id },
  ] } } });
  planId = plan.id;
}, 30_000);
afterAll(async () => {
  await a?.limpiar();
  await b?.limpiar();
  if (terceroId) await db.profile.deleteMany({ where: { id: terceroId } });
}, 30_000);

describe("acceso al plan anual", () => {
  it("agrupa seis secciones en un plan con dos docentes únicos", async () => {
    expect((await gruposDelDocente(a.ctxDe("tutora"))).filter(g => g.area === "matematica")).toEqual([grupo]);
    const docentes = await docentesDelGrupo(dbTenant(a.tenant.id), grupo);
    expect(docentes).toHaveLength(2);
    expect(docentes.map(d => d.secciones)).toEqual(expect.arrayContaining([["A", "B", "C"], ["D", "E", "F"]]));
  });
  it("solo dirección y participantes activos ven el plan", async () => {
    expect((await requireAccesoPlan(a.ctxDe("tutora"), planId)).id).toBe(planId);
    expect((await requireAccesoPlan(a.ctxDe("direccion"), planId)).id).toBe(planId);
    const ctxTercero = { ...a.ctxDe("tutora"), membership: { ...a.ctxDe("tutora").membership, id: terceroMembershipId } };
    await expect(requireAccesoPlan(ctxTercero, planId)).rejects.toThrow(/404/);
    await expect(requireAccesoPlan(b.ctxDe("direccion"), planId)).rejects.toThrow(/404/);
  });
  it("RLS está activada y forzada en las doce tablas", async () => {
    const tablas = ["planes_anuales", "plan_anual_unidades", "plan_anual_temas", "plan_anual_participantes", "plan_anual_comentarios", "plan_anual_conformidades", "plan_anual_versiones", "plan_anual_eventos", "nudito_lecciones", "nudito_leccion_revisiones", "nudito_trabajos_contenido", "nudito_trabajo_items"];
    const filas = await db.$queryRaw<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN (${Prisma.join(tablas)})`;
    expect(filas).toHaveLength(12);
    expect(filas.every(f => f.relrowsecurity && f.relforcerowsecurity)).toBe(true);
  });
});
