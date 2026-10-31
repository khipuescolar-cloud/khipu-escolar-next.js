// Crea dos colegios de prueba aislados (no depende del seed) y los borra al terminar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, dbTenant } from "@/lib/server/db";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("dbTenant: aislamiento entre colegios", () => {
  let a: ColegioPrueba;
  let b: ColegioPrueba;
  beforeAll(async () => {
    a = await crearColegioPrueba({ plan: "pro", prefijo: "test-aisla" });
    b = await crearColegioPrueba({ plan: "base", prefijo: "test-aisla" });
  });
  afterAll(async () => {
    await a?.limpiar();
    await b?.limpiar();
    await db.$disconnect();
  });

  it("solo devuelve filas del colegio indicado", async () => {
    const alumnosA = await dbTenant(a.tenant.id).alumno.findMany();
    expect(alumnosA.length).toBeGreaterThan(0);
    expect(alumnosA.every((x) => x.tenantId === a.tenant.id)).toBe(true);

    const alumnoB = await db.alumno.findFirstOrThrow({ where: { tenantId: b.tenant.id } });
    expect(await dbTenant(a.tenant.id).alumno.findUnique({ where: { id: alumnoB.id } })).toBeNull();
    expect(await dbTenant(a.tenant.id).alumno.count({ where: { id: alumnoB.id } })).toBe(0);
  });

  it("no permite editar ni mover filas de otro colegio", async () => {
    const alumnoB = await db.alumno.findFirstOrThrow({ where: { tenantId: b.tenant.id } });
    const r = await dbTenant(a.tenant.id).alumno.updateMany({ where: { id: alumnoB.id }, data: { nombres: "X" } });
    expect(r.count).toBe(0);

    const alumnoA = await db.alumno.findFirstOrThrow({ where: { tenantId: a.tenant.id } });
    await dbTenant(a.tenant.id).alumno.update({ where: { id: alumnoA.id }, data: { tenantId: b.tenant.id } as never });
    expect((await db.alumno.findUniqueOrThrow({ where: { id: alumnoA.id } })).tenantId).toBe(a.tenant.id);
  });

  it("crea filas con el tenantId del contexto", async () => {
    const x = await dbTenant(a.tenant.id).auditoria.create({ data: { tenantId: b.tenant.id, accion: "ver", entidad: "test" } });
    expect(x.tenantId).toBe(a.tenant.id);
    await db.auditoria.delete({ where: { id: x.id } });
  });
});
