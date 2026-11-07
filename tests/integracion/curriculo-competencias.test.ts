import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { competenciasOficiales, detectarArea } from "@/lib/cneb/catalogo";
import { db } from "@/lib/server/db";
import { crearCurso } from "@/lib/server/gestion";
import { fijarPermisoCompetencias } from "@/lib/server/personal";
import { crearCompetencia as crearCompetenciaAnterior, eliminarCompetencia as eliminarCompetenciaAnterior } from "@/lib/server/notas";
import {
  competenciasDelCurso, crearCompetencia, desactivarCompetencia, editarCompetencia, eliminarCompetenciaSinUso,
  puedeGestionarCompetencias, reactivarCompetencia, restaurarPlantillaOficial,
} from "@/lib/server/curriculo";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let a: ColegioPrueba;
let b: ColegioPrueba;
const ctxAutorizada = () => ({ ...a.ctxDe("tutora"), membership: a.miembros.tutora.membership });

beforeAll(async () => {
  [a, b] = await Promise.all([crearColegioPrueba({ plan: "pro", prefijo: "test-curriculo" }), crearColegioPrueba({ plan: "pro", prefijo: "test-curriculo" })]);
  await db.salon.update({ where: { id: a.salon.id }, data: { grado: 3 } });
  await db.salon.update({ where: { id: a.otroSalon.id }, data: { grado: 5 } });
});
afterAll(async () => { await a?.limpiar(); await b?.limpiar(); });

describe("plantillas CNEB", () => {
  it("expone código, área, nivel, grados, capacidades y versión para Inicial, Primaria y Secundaria", () => {
    for (const nivel of ["inicial", "primaria", "secundaria"] as const) {
      const area = detectarArea("Matemática", nivel)!;
      const lista = competenciasOficiales(area, nivel);
      expect(lista.length).toBeGreaterThan(0);
      expect(lista.every((c) => c.area === "matematica" && c.nivel === nivel && c.codigoOficial.startsWith("CNEB-") && c.capacidades.length > 0 && c.grados.length > 0 && c.versionCurricular.includes("MINEDU"))).toBe(true);
    }
    expect(competenciasOficiales(detectarArea("Matemática", "primaria")!, "primaria").map((c) => c.codigoOficial)).toEqual(["CNEB-23", "CNEB-24", "CNEB-26", "CNEB-25"]);
  });

  it("siembra al crear curso y reutiliza los mismos códigos en grados distintos sin compartir filas", async () => {
    const tercero = await crearCurso(a.ctxDe("direccion"), { salonId: a.salon.id, nombre: "Matemática", profesorId: a.miembros.tutora.membership.id });
    const quinto = await crearCurso(a.ctxDe("direccion"), { salonId: a.otroSalon.id, nombre: "Matemática", profesorId: a.miembros.otroProfesor.membership.id });
    const c3 = await competenciasDelCurso(a.ctxDe("direccion"), tercero);
    const c5 = await competenciasDelCurso(a.ctxDe("direccion"), quinto);
    expect(c3.map((c) => c.codigoOficial)).toEqual(c5.map((c) => c.codigoOficial));
    expect(c3.map((c) => c.id)).not.toEqual(c5.map((c) => c.id));
    expect(await db.capacidad.count({ where: { competenciaId: c3[0].id } })).toBe(4);
    expect(c3.every((c) => c.origen === "oficial")).toBe(true);
  });
});

describe("personalización e historial", () => {
  let cursoId: string;
  beforeAll(async () => { cursoId = await crearCurso(a.ctxDe("direccion"), { salonId: a.salon.id, nombre: "Comunicación", profesorId: a.miembros.tutora.membership.id }); });

  it("aísla la competencia por colegio y marca la personalizada como no oficial", async () => {
    const creada = await crearCompetencia(a.ctxDe("direccion"), { cursoId, nombre: "Expresión oral del colegio" });
    expect(creada).toMatchObject({ origen: "personalizada", codigoOficial: null });
    expect(await db.competencia.count({ where: { tenantId: b.tenant.id, id: creada.id } })).toBe(0);
    await esperarProhibido(competenciasDelCurso(b.ctxDe("direccion"), cursoId));
    await esperarProhibido(crearCompetencia(b.ctxDe("direccion"), { cursoId, nombre: "Otra competencia" }));
  });

  it("restaura sin duplicar, reactiva la oficial y conserva la personalizada", async () => {
    const antes = await competenciasDelCurso(a.ctxDe("direccion"), cursoId);
    const oficial = antes.find((c) => c.origen === "oficial")!;
    await desactivarCompetencia(a.ctxDe("direccion"), oficial.id);
    expect((await competenciasDelCurso(a.ctxDe("direccion"), cursoId)).some((c) => c.id === oficial.id)).toBe(false);
    await restaurarPlantillaOficial(a.ctxDe("direccion"), cursoId);
    await restaurarPlantillaOficial(a.ctxDe("direccion"), cursoId);
    const despues = await competenciasDelCurso(a.ctxDe("direccion"), cursoId);
    expect(despues.find((c) => c.id === oficial.id)?.desactivadaAt).toBeNull();
    expect(despues.filter((c) => c.codigoOficial === oficial.codigoOficial)).toHaveLength(1);
    expect(despues.some((c) => c.origen === "personalizada")).toBe(true);
  });

  it("desactiva una competencia con nota sin perder su historial ni permitir renombrarla o borrarla", async () => {
    const c = await db.competencia.findFirstOrThrow({ where: { cursoId, origen: "oficial" } });
    const periodo = await db.periodo.create({ data: { tenantId: a.tenant.id, anio: 2026, tipo: "bimestre", numero: 2, nombre: "II Bimestre", inicio: new Date("2026-04-01"), fin: new Date("2026-06-30") } });
    const evaluacion = await db.evaluacion.create({ data: { tenantId: a.tenant.id, cursoId, periodoId: periodo.id, competenciaId: c.id, titulo: "Lectura", fecha: new Date("2026-05-10") } });
    await db.nota.create({ data: { tenantId: a.tenant.id, evaluacionId: evaluacion.id, alumnoId: a.alumnos.mateo.id, valorLiteral: "A" } });
    await expect(editarCompetencia(a.ctxDe("direccion"), c.id, { nombre: "Nombre nuevo" })).rejects.toThrow(/historial/);
    await expect(eliminarCompetenciaSinUso(a.ctxDe("direccion"), c.id)).rejects.toThrow(/registros/);
    await desactivarCompetencia(a.ctxDe("direccion"), c.id);
    const guardada = await db.competencia.findUniqueOrThrow({ where: { id: c.id } });
    expect(guardada.nombre).toBe(c.nombre);
    expect(guardada.desactivadaAt).not.toBeNull();
    expect(await db.nota.count({ where: { evaluacionId: evaluacion.id } })).toBe(1);
    await reactivarCompetencia(a.ctxDe("direccion"), c.id);
  });

  it("puede borrar solo la competencia sin referencias", async () => {
    const c = await crearCompetencia(a.ctxDe("direccion"), { cursoId, nombre: "Competencia descartable" });
    await eliminarCompetenciaSinUso(a.ctxDe("direccion"), c.id);
    expect(await db.competencia.findUnique({ where: { id: c.id } })).toBeNull();
  });
});

describe("permisos", () => {
  it("dirección sí; docente sin permiso y otros roles no", async () => {
    expect(puedeGestionarCompetencias(a.ctxDe("direccion"))).toBe(true);
    expect(puedeGestionarCompetencias(a.ctxDe("tutora"))).toBe(false);
    expect(puedeGestionarCompetencias(a.ctxDe("porteria"))).toBe(false);
    await esperarProhibido(crearCompetencia(a.ctxDe("tutora"), { cursoId: a.cursoTutora.id, nombre: "Bloqueada" }));
    await esperarProhibido(crearCompetenciaAnterior(a.ctxDe("tutora"), { cursoId: a.cursoTutora.id, nombre: "Bloqueada en pantalla anterior" }));
  });

  it("dirección concede y retira, el docente solo gestiona el curso que dicta", async () => {
    await fijarPermisoCompetencias(a.ctxDe("direccion"), a.miembros.tutora.membership.id, true);
    a.miembros.tutora.membership = await db.membership.findUniqueOrThrow({ where: { id: a.miembros.tutora.membership.id } });
    expect(puedeGestionarCompetencias(ctxAutorizada())).toBe(true);
    const c = await crearCompetencia(ctxAutorizada(), { cursoId: a.cursoTutora.id, nombre: "Competencia de Lucía" });
    expect(c.origen).toBe("personalizada");
    expect(await eliminarCompetenciaAnterior(ctxAutorizada(), c.id)).toMatchObject({ ok: true });
    expect((await db.competencia.findUniqueOrThrow({ where: { id: c.id } })).desactivadaAt).not.toBeNull();
    await esperarProhibido(crearCompetencia(ctxAutorizada(), { cursoId: a.cursoAjeno.id, nombre: "Competencia ajena" }));
    await esperarProhibido(fijarPermisoCompetencias(b.ctxDe("direccion"), a.miembros.tutora.membership.id, false));
    await fijarPermisoCompetencias(a.ctxDe("direccion"), a.miembros.tutora.membership.id, false);
    a.miembros.tutora.membership = await db.membership.findUniqueOrThrow({ where: { id: a.miembros.tutora.membership.id } });
    await esperarProhibido(desactivarCompetencia(ctxAutorizada(), c.id));
  });
});
