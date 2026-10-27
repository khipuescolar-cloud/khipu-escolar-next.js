// Requiere la BD local con el seed (pnpm db:start && pnpm db:seed).
import { afterAll, describe, expect, it } from "vitest";
import { db, dbTenant } from "@/lib/server/db";

describe("dbTenant: aislamiento entre colegios", () => {
  afterAll(() => db.$disconnect());

  it("solo devuelve filas del colegio indicado", async () => {
    const [nh, lo] = await Promise.all([
      db.tenant.findUniqueOrThrow({ where: { slug: "nuevohorizonte" } }),
      db.tenant.findUniqueOrThrow({ where: { slug: "losolivos" } }),
    ]);
    const alumnosNh = await dbTenant(nh.id).alumno.findMany();
    expect(alumnosNh.length).toBeGreaterThan(0);
    expect(alumnosNh.every((a) => a.tenantId === nh.id)).toBe(true);

    const alumnoLo = await db.alumno.findFirstOrThrow({ where: { tenantId: lo.id } });
    expect(await dbTenant(nh.id).alumno.findUnique({ where: { id: alumnoLo.id } })).toBeNull();
    expect(await dbTenant(nh.id).alumno.count({ where: { id: alumnoLo.id } })).toBe(0);
  });

  it("no permite editar ni mover filas de otro colegio", async () => {
    const [nh, lo] = await Promise.all([
      db.tenant.findUniqueOrThrow({ where: { slug: "nuevohorizonte" } }),
      db.tenant.findUniqueOrThrow({ where: { slug: "losolivos" } }),
    ]);
    const alumnoLo = await db.alumno.findFirstOrThrow({ where: { tenantId: lo.id } });
    const r = await dbTenant(nh.id).alumno.updateMany({ where: { id: alumnoLo.id }, data: { nombres: "X" } });
    expect(r.count).toBe(0);

    const alumnoNh = await db.alumno.findFirstOrThrow({ where: { tenantId: nh.id } });
    await dbTenant(nh.id).alumno.update({ where: { id: alumnoNh.id }, data: { tenantId: lo.id } as never });
    expect((await db.alumno.findUniqueOrThrow({ where: { id: alumnoNh.id } })).tenantId).toBe(nh.id);
  });

  it("crea filas con el tenantId del contexto", async () => {
    const nh = await db.tenant.findUniqueOrThrow({ where: { slug: "nuevohorizonte" } });
    const lo = await db.tenant.findUniqueOrThrow({ where: { slug: "losolivos" } });
    const a = await dbTenant(nh.id).auditoria.create({
      data: { tenantId: lo.id, accion: "ver", entidad: "test" },
    });
    expect(a.tenantId).toBe(nh.id);
    await db.auditoria.delete({ where: { id: a.id } });
  });
});
