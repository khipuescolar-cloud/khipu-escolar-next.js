import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { huellaActualDeTema, filtrarVisibles } from "@/lib/server/curriculum/autorizacion";
import { listarTemasEditoriales, cambiarEstadoEditorial, revisarBloqueEditorial } from "@/lib/server/curriculum/estado-editorial";

const mocks = vi.hoisted(() => ({ requireAdminPlataforma: vi.fn() }));
vi.mock("@/lib/server/plataforma", () => ({ requireAdminPlataforma: mocks.requireAdminPlataforma }));

const claveA = "mat.p3.leer-reloj";
const claveB = "mat.p3.masa-kilogramo";
const adminId = randomUUID();
let originalA: Awaited<ReturnType<typeof db.temaCurricular.findUnique>> = null;
let originalB: Awaited<ReturnType<typeof db.temaCurricular.findUnique>> = null;
const codigoA = `test-${adminId}-A`;
const codigoB = `test-${adminId}-B`;

describe("servicio editorial global", () => {
  beforeAll(async () => {
    process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";
    await db.profile.create({ data: { id: adminId, email: "editorial-test@local.invalid", nombres: "Equipo", apellidos: "Khipu" } });
    originalA = await db.temaCurricular.findUnique({ where: { clave: claveA } });
    originalB = await db.temaCurricular.findUnique({ where: { clave: claveB } });
    for (const [clave, disciplina] of [[claveA, "medicion"], [claveB, "medicion"]] as const) {
      await db.temaCurricular.upsert({
        where: { clave },
        create: { clave, areaCneb: "matematica", disciplinas: [disciplina], nivel: "primaria", grado: 3, procedencia: "test-c2", fuenteId: "fuente-test", fuenteLocator: "CNEB p. 1", estado: "borrador" },
        update: { areaCneb: "matematica", disciplinas: [disciplina], nivel: "primaria", grado: 3, procedencia: "test-c2", fuenteId: "fuente-test", fuenteLocator: "CNEB p. 1", estado: "borrador", huellaContenidoRevisado: null },
      });
      await db.temaDesempenoOficial.createMany({
        data: [{ temaClave: clave, codigoCompetencia: "C1", codigoDesempeno: clave === claveA ? codigoA : codigoB, fuenteId: "fuente-test", fuenteLocator: "p. 1", verificadoAt: new Date() }],
        skipDuplicates: true,
      });
    }
    mocks.requireAdminPlataforma.mockResolvedValue({ user: { id: adminId } });
  });

  afterAll(async () => {
    await db.auditoriaPlataforma.deleteMany({ where: { actorId: adminId } });
    await db.temaDesempenoOficial.deleteMany({ where: { codigoDesempeno: { in: [codigoA, codigoB] } } });
    for (const [clave, original] of [[claveA, originalA], [claveB, originalB]] as const) {
      if (!original) await db.temaCurricular.deleteMany({ where: { clave } });
      else await db.temaCurricular.update({ where: { clave }, data: {
        areaCneb: original.areaCneb, disciplinas: original.disciplinas, nivel: original.nivel, grado: original.grado,
        procedencia: original.procedencia, fuenteId: original.fuenteId, fuenteLocator: original.fuenteLocator, estado: original.estado,
        version: original.version, revisadoPorId: original.revisadoPorId, revisadoAt: original.revisadoAt,
        huellaContenidoRevisado: original.huellaContenidoRevisado,
      } });
    }
    await db.profile.deleteMany({ where: { id: adminId } });
    await db.$disconnect();
  });

  it("solo editor autenticado cambia estado y la auditoría guarda la huella", async () => {
    const huella = await huellaActualDeTema(claveA);
    expect(huella).toMatch(/^[0-9a-f]{64}$/);
    mocks.requireAdminPlataforma.mockRejectedValueOnce(Object.assign(new Error("403"), { digest: "NEXT_HTTP_ERROR_FALLBACK;403" }));
    await expect(cambiarEstadoEditorial(claveA, "revisado", true)).rejects.toThrow();
    expect((await db.temaCurricular.findUniqueOrThrow({ where: { clave: claveA } })).estado).toBe("borrador");
    expect(await db.auditoriaPlataforma.count({ where: { actorId: adminId, accion: "curriculum_estado_editorial" } })).toBe(0);

    mocks.requireAdminPlataforma.mockResolvedValue({ user: { id: adminId } });
    await cambiarEstadoEditorial(claveA, "revisado", true);
    expect(await db.temaCurricular.findUniqueOrThrow({ where: { clave: claveA } })).toMatchObject({ estado: "revisado", huellaContenidoRevisado: huella });
    expect(await db.auditoriaPlataforma.count({ where: { actorId: adminId, accion: "curriculum_estado_editorial" } })).toBe(1);
  });

  it("detecta contenido cambiado y vuelve a ocultar al alumno hasta revisar de nuevo", async () => {
    const actual = await huellaActualDeTema(claveA);
    await db.temaCurricular.update({ where: { clave: claveA }, data: { estado: "publicado", huellaContenidoRevisado: "0".repeat(64) } });
    const listado = await listarTemasEditoriales({ area: "matematica", nivel: "primaria", grado: 3, disciplina: "medicion", estado: "pendiente_revision" });
    const tema = listado.temas.find((fila) => fila.clave === claveA);
    expect(tema?.pendienteRevision).toBe(true);
    expect(filtrarVisibles("alumno", [{ estado: "publicado", huellaContenidoRevisado: "0".repeat(64), huellaActual: actual }])).toEqual([]);
    expect(filtrarVisibles("profesor", [{ estado: "publicado", huellaContenidoRevisado: "0".repeat(64), huellaActual: actual }])[0]?.marcaEditorial).toBe("Revisar de nuevo");
    await cambiarEstadoEditorial(claveA, "publicado", true);
    expect((await db.temaCurricular.findUniqueOrThrow({ where: { clave: claveA } })).huellaContenidoRevisado).toBe(actual);
  });

  it("revisa en lote un bloque y registra una auditoría por tema", async () => {
    mocks.requireAdminPlataforma.mockResolvedValue({ user: { id: adminId } });
    const cantidad = await revisarBloqueEditorial({ area: "matematica", nivel: "primaria", grado: 3, disciplina: "medicion" }, true);
    expect(cantidad).toBeGreaterThanOrEqual(1);
    expect(await db.auditoriaPlataforma.count({ where: { actorId: adminId, accion: "curriculum_estado_editorial", detalle: { path: ["bloque", "disciplina"], equals: "medicion" } } })).toBe(cantidad);
  });
});
