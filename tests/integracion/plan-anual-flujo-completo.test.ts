// Escenario completo del pedido (specs/48 §Pruebas y specs/49): encadena los servicios reales, sin inserciones directas
// de planes ni lecciones. Docentes → plan compartido → revisión → publicación → materiales → lecciones publicadas →
// alumno practica → docente consulta el progreso.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { temasDe } from "@/lib/nudito/catalogo";
import type { AccesoNudito } from "@/lib/nudito/contratos";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import { gruposDelDocente, docentesDelGrupo } from "@/lib/server/plan-anual/acceso";
import { crearPlan, designarCoordinador, obtenerPlan } from "@/lib/server/plan-anual/planes";
import { agregarTemas } from "@/lib/server/plan-anual/temas";
import { aprobar, comentar, enviarARevision, publicar, reenviarARevision, registrarConformidad, resolverObservacion, versiones } from "@/lib/server/plan-anual/revision";
import { prepararMateriales, procesarLote } from "@/lib/server/nudito/lecciones/preparacion";
import * as lecciones from "@/lib/server/nudito/lecciones";
import { progresoDelPlan, temasPublicadosDelAlumno } from "@/lib/server/nudito/plan-publicado";
import * as sesiones from "@/lib/server/nudito/sesiones";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

vi.stubEnv("KHIPU_TEST_NUDITO_PLUS", "1");
let c: ColegioPrueba;
let alumnoCtx: TenantContext;
let acceso: AccesoNudito;
let cursoMatAlumno: string;
let planId: string;
const temas = temasDe("matematica", "primaria", 5).slice(0, 4);

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-plan-flujo" });
  // Dos secciones de 5.° primaria: la tutora dicta Matemática en una y el otro profesor en la otra.
  await db.salon.update({ where: { id: c.salon.id }, data: { grado: 5, nivel: "primaria", anio: 2026 } });
  await db.salon.update({ where: { id: c.otroSalon.id }, data: { grado: 5 } });
  await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Matemática", areaCneb: "matematica", profesorId: c.miembros.tutora.membership.id } });
  cursoMatAlumno = (await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombre: "Matemática", areaCneb: "matematica", profesorId: c.miembros.otroProfesor.membership.id } })).id;
  await db.nuditoConfigColegio.create({ data: { tenantId: c.tenant.id, activo: true, sesionesPorDia: 50 } });
  const user = await db.profile.create({ data: { id: randomUUID(), email: "alumno-flujo-" + randomUUID() + "@test.local", nombres: "Thiago", apellidos: "Ficticio" } });
  const member = await db.membership.create({ data: { tenantId: c.tenant.id, userId: user.id, rol: "alumno" } });
  await db.alumno.update({ where: { id: c.alumnos.thiago.id }, data: { cuentaId: member.id } });
  alumnoCtx = { tenant: c.tenant, user, membership: member, rol: "alumno", roles: ["alumno"], db: dbTenant(c.tenant.id), ...accesoModulosDeCodigo("pro") };
  acceso = { alumno: { id: c.alumnos.thiago.id, nombres: "Thiago", apellidos: "Ficticio", salonId: c.otroSalon.id }, modo: "alumno" };
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await c.limpiar();
  await db.profile.deleteMany({ where: { id: alumnoCtx.user.id } });
  await db.$disconnect();
});

describe("Flujo completo: planificación anual → Nudito", () => {
  it("1–4: Khipu detecta a los dos docentes y crea un plan compartido", async () => {
    const grupos = await gruposDelDocente(c.ctxDe("tutora"));
    const grupo = grupos.find(g => g.grado === 5 && g.area === "matematica");
    expect(grupo).toBeDefined();
    expect((await docentesDelGrupo(c.db, grupo!)).map(d => d.membershipId).sort()).toEqual([c.miembros.tutora.membership.id, c.miembros.otroProfesor.membership.id].sort());
    const plan = await crearPlan(c.ctxDe("tutora"), { anio: 2026, nivel: "primaria", grado: 5, area: "matematica" });
    planId = plan.id;
    const visto = await obtenerPlan(c.ctxDe("otroProfesor"), planId);
    expect(visto.participantes.filter(p => p.activo)).toHaveLength(2);
  });
  it("5–6: seleccionan temas, comentan y resuelven observaciones", async () => {
    await designarCoordinador(c.ctxDe("direccion"), planId, c.miembros.tutora.membership.id, "Coordina 5.° de primaria.");
    await agregarTemas(c.ctxDe("tutora"), planId, temas.slice(0, 3).map(t => t.clave));
    await agregarTemas(c.ctxDe("otroProfesor"), planId, [temas[3].clave]);
    await enviarARevision(c.ctxDe("tutora"), planId);
    const obs = await comentar(c.ctxDe("otroProfesor"), planId, { contenido: "Conviene ver este tema después.", esObservacion: true, temaClave: temas[3].clave });
    await expect(publicar(c.ctxDe("tutora"), planId)).rejects.toThrow();
    await resolverObservacion(c.ctxDe("tutora"), obs.id, "Se reordenó según lo conversado.");
    await reenviarARevision(c.ctxDe("tutora"), planId);
  });
  it("7: el coordinador aprueba y publica con la conformidad de todos", async () => {
    await registrarConformidad(c.ctxDe("tutora"), planId, { decision: "conforme" });
    await registrarConformidad(c.ctxDe("otroProfesor"), planId, { decision: "conforme" });
    await aprobar(c.ctxDe("tutora"), planId);
    await publicar(c.ctxDe("tutora"), planId);
    const plan = await obtenerPlan(c.ctxDe("direccion"), planId);
    expect(plan).toMatchObject({ estado: "publicado", versionPublicada: 1, aprobadoPorId: c.miembros.tutora.membership.id });
    expect((await versiones(c.ctxDe("tutora"), planId))[0].numero).toBe(1);
  });
  it("sin lecciones publicadas el alumno aún no ve temas", async () => {
    expect(await temasPublicadosDelAlumno(alumnoCtx, acceso, "matematica")).toEqual([]);
  });
  it("8–10: se preparan, revisan y publican los materiales", async () => {
    const trabajo = await prepararMateriales(c.ctxDe("tutora"), planId);
    for (let i = 0; i < 5; i++) {
      const t = await procesarLote(c.ctxDe("tutora"), trabajo.id);
      if (t.estado === "completado") break;
    }
    const final = await c.db.nuditoTrabajoContenido.findFirstOrThrow({ where: { id: trabajo.id } });
    expect(final).toMatchObject({ estado: "completado", total: 4, fallidos: 0 });
    const lista = await lecciones.listarLeccionesDelPlan(c.ctxDe("tutora"), planId);
    const ids = lista.flatMap(l => (l as { leccion?: { id: string } | null }).leccion?.id ?? (l as { id?: string }).id ?? []);
    expect(ids.length).toBe(4);
    for (const id of ids) {
      await lecciones.enviarARevision(c.ctxDe("tutora"), planId, id);
      await lecciones.aprobarLeccion(c.ctxDe("otroProfesor"), planId, id);
      await lecciones.publicarLeccion(c.ctxDe("tutora"), planId, id);
    }
    expect(await c.db.nuditoLeccion.count({ where: { estado: "publicada", origen: "catalogo" } })).toBe(4);
    expect(await c.db.nuditoConsumoIa.count({ where: { operacion: "generar_leccion" } })).toBe(0);
  });
  it("11–18: el alumno ve los cuatro temas, practica y vuelve a practicar", async () => {
    const ini = await sesiones.iniciarSesion(alumnoCtx, acceso, { alumnoId: acceso.alumno.id });
    const seleccion = await sesiones.elegirCurso(alumnoCtx, acceso, { sesionId: ini.sesionId, cursoId: cursoMatAlumno });
    expect(seleccion.temas.map(t => t.clave).sort()).toEqual(temas.map(t => t.clave).sort());
    expect((await sesiones.elegirTema(alumnoCtx, acceso, { sesionId: ini.sesionId, textoLibre: "derivadas" } as never)).tipo).toBe("no_reconocido");
    expect((await sesiones.elegirTema(alumnoCtx, acceso, { sesionId: ini.sesionId, temaClave: temas[0].clave })).tipo).toBe("permitido");
    const repaso = await sesiones.pedirRepaso(alumnoCtx, acceso, { sesionId: ini.sesionId });
    expect(repaso.explicacion.length).toBeGreaterThan(10);
    const e = await sesiones.siguienteEjercicio(alumnoCtx, acceso, { sesionId: ini.sesionId });
    if ("fin" in e) throw new Error("sin ejercicio");
    const mala = e.ejercicio.tipo === "opcion_multiple" ? { tipo: "opcion" as const, opcionId: "zz" } : { tipo: "numero" as const, valor: "999999" };
    const r = await sesiones.responder(alumnoCtx, acceso, { ejercicioId: e.ejercicioId, respuesta: mala });
    expect(r.evaluacion.retro.length).toBeGreaterThan(5);
    // El ejercicio se cierra tras agotar los intentos: recién ahí cuenta como evidencia de práctica.
    for (let i = 0; i < 2; i++) await sesiones.responder(alumnoCtx, acceso, { ejercicioId: e.ejercicioId, respuesta: mala });
    await sesiones.finalizar(alumnoCtx, acceso, { sesionId: ini.sesionId });
    const otra = await sesiones.iniciarSesion(alumnoCtx, acceso, { alumnoId: acceso.alumno.id });
    await sesiones.elegirCurso(alumnoCtx, acceso, { sesionId: otra.sesionId, cursoId: cursoMatAlumno });
    expect((await sesiones.elegirTema(alumnoCtx, acceso, { sesionId: otra.sesionId, temaClave: temas[0].clave })).tipo).toBe("permitido");
    expect(await c.db.nuditoIntento.count({ where: { alumnoId: acceso.alumno.id } })).toBeGreaterThan(0);
  });
  it("19: el docente autorizado consulta el progreso; otro alumno no lo ve", async () => {
    const progreso = await progresoDelPlan(c.ctxDe("otroProfesor"), acceso.alumno.id, "matematica");
    expect(progreso.total).toBe(4);
    expect(progreso.temas.find(t => t.temaClave === temas[0].clave)?.estado).not.toBe("pendiente");
    await expect(progresoDelPlan(alumnoCtx, c.alumnos.mateo.id, "matematica")).rejects.toThrow();
  });
});
