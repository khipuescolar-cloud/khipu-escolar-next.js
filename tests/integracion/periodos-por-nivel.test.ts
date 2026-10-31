// Organización del año por nivel (specs/11): primaria por trimestres y secundaria por bimestres, aislados. Requiere la BD local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cerrarCursoPeriodo, crearEvaluacion, crearPeriodo, listarPeriodos, organizarNivel } from "@/lib/server/notas";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let cursoSec: { id: string };

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-periodos-nivel" });
  const sec = await c.db.salon.create({ data: { tenantId: c.tenant.id, nombre: "1.° Sec", nivel: "secundaria", anio: 2027 } });
  cursoSec = await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: sec.id, nombre: "Física", profesorId: c.miembros.tutora.membership.id } });
}, 30_000);
afterAll(async () => {
  await c?.limpiar();
}, 30_000);

describe("organización del año por nivel", () => {
  it("primaria por trimestres y secundaria por bimestres: cada nivel ve solo sus periodos", async () => {
    const ctx = c.ctxDe("direccion");
    expect(await organizarNivel(ctx, { anio: 2027, nivel: "primaria", tipo: "trimestre" })).toMatchObject({ ok: true, mensaje: expect.stringContaining("Primaria trabajará por trimestres en 2027 (3 periodos)") });
    expect((await organizarNivel(ctx, { anio: 2027, nivel: "secundaria", tipo: "bimestre" })).ok).toBe(true);
    expect((await listarPeriodos(ctx, "primaria")).filter((p) => p.anio === 2027).map((p) => p.nombre)).toEqual(["I Trimestre", "II Trimestre", "III Trimestre"]);
    expect((await listarPeriodos(ctx, "secundaria")).filter((p) => p.anio === 2027).map((p) => p.nombre)).toEqual(["I Bimestre", "II Bimestre", "III Bimestre", "IV Bimestre"]);
    expect(await organizarNivel(ctx, { anio: 2027, nivel: "primaria", tipo: "trimestre" })).toEqual({ ok: false, error: "Primaria ya trabaja por trimestres en 2027." });
  });

  it("un nivel que elige el mismo tipo que otro comparte sus periodos", async () => {
    const ctx = c.ctxDe("direccion");
    expect((await organizarNivel(ctx, { anio: 2027, nivel: "inicial", tipo: "trimestre" })).ok).toBe(true);
    const tri = (await listarPeriodos(ctx, "inicial")).filter((p) => p.anio === 2027);
    expect(tri).toHaveLength(3);
    expect(tri.every((p) => p.niveles.includes("primaria") && p.niveles.includes("inicial"))).toBe(true);
  });

  it("no se registran notas ni se cierran cursos en un periodo de otro nivel", async () => {
    const ctx = c.ctxDe("tutora");
    const [iTrimestre] = (await listarPeriodos(ctx, "primaria")).filter((p) => p.anio === 2027);
    const [iBimestre] = (await listarPeriodos(ctx, "secundaria")).filter((p) => p.anio === 2027);
    const evaluacion = { cursoId: cursoSec.id, periodoId: iTrimestre.id, titulo: "Práctica 1", fecha: "2027-04-10", peso: 1 };
    expect(await crearEvaluacion(ctx, evaluacion)).toEqual({ ok: false, error: "Este periodo no es del nivel de este curso." });
    expect(await cerrarCursoPeriodo(ctx, cursoSec.id, iTrimestre.id)).toEqual({ ok: false, error: "Este periodo no es del nivel de este curso." });
    expect((await crearEvaluacion(ctx, { ...evaluacion, periodoId: iBimestre.id })).ok).toBe(true);
  });

  it("con notas registradas, el nivel no cambia de organización; sin notas, sí (y se borran los periodos vacíos)", async () => {
    const ctx = c.ctxDe("direccion");
    expect(await organizarNivel(ctx, { anio: 2027, nivel: "secundaria", tipo: "trimestre" })).toEqual({ ok: false, error: "Secundaria ya tiene notas registradas en sus periodos de 2027. No se puede cambiar su organización." });
    expect((await organizarNivel(ctx, { anio: 2027, nivel: "inicial", tipo: "semestre" })).ok).toBe(true);
    const de2027 = (await listarPeriodos(ctx)).filter((p) => p.anio === 2027);
    expect(de2027.filter((p) => p.tipo === "trimestre").every((p) => !p.niveles.includes("inicial"))).toBe(true);
    expect(de2027.filter((p) => p.tipo === "semestre").map((p) => p.niveles)).toEqual([["inicial"], ["inicial"]]);
  });

  it("al crear un periodo a mano no se mezclan tipos en un mismo nivel; solo dirección organiza", async () => {
    const ctx = c.ctxDe("direccion");
    const r = await crearPeriodo(ctx, { anio: 2027, tipo: "bimestre", numero: 5, nombre: "V Bimestre", inicio: "2027-12-01", fin: "2027-12-20", niveles: ["primaria"] });
    expect(r).toEqual({ ok: false, error: "Primaria ya trabaja con otro tipo de periodo en 2027. Cámbialo en «Organización del año»." });
    await esperarProhibido(organizarNivel(c.ctxDe("tutora"), { anio: 2027, nivel: "primaria", tipo: "bimestre" }));
  });
});
