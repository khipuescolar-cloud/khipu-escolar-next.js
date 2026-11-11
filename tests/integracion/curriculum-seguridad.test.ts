import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, dbTenant } from "@/lib/server/db";
import { filtrarVisibles } from "@/lib/server/curriculum/autorizacion";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("seguridad del currículo en dos colegios", () => {
  let a: ColegioPrueba;
  let b: ColegioPrueba;
  beforeAll(async () => {
    a = await crearColegioPrueba({ plan: "pro", prefijo: "test-curriculum" });
    b = await crearColegioPrueba({ plan: "base", prefijo: "test-curriculum" });
  });
  afterAll(async () => {
    await a?.limpiar();
    await b?.limpiar();
    await db.$disconnect();
  });

  it("el cliente tenant no devuelve datos del otro colegio", async () => {
    const alumnoB = await db.alumno.findFirstOrThrow({ where: { tenantId: b.tenant.id }, select: { id: true } });
    expect(await dbTenant(a.tenant.id).alumno.findFirst({ where: { id: alumnoB.id }, select: { id: true } })).toBeNull();
    expect(await dbTenant(b.tenant.id).alumno.findFirst({ where: { id: alumnoB.id }, select: { id: true } })).not.toBeNull();
  });

  it("una foto publicada no concede permiso para leer un borrador", () => {
    const temas = [{ clave: "tema-publicado", estado: "borrador" as const, huellaContenidoRevisado: null, huellaActual: "nueva" }];
    expect(filtrarVisibles("alumno", temas)).toEqual([]);
    expect(filtrarVisibles("profesor", temas)[0]?.marcaEditorial).toBe("Borrador");
  });
});
