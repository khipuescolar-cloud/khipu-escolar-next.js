import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { temasDe } from "@/lib/nudito/catalogo";
import {
  abrirRevision, agregarTemas, aprobar, buscarCatalogo, comentar, copiarPlan, crearPlan, designarCoordinador,
  enviarARevision, obtenerPlan, publicar, proponerTemaColegio, reenviarARevision, registrarConformidad, convocarReunionPlan, reunionesDelPlan,
  resolverObservacion, sincronizarParticipantes, versiones,
} from "@/lib/server/plan-anual";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let a: ColegioPrueba;
let b: ColegioPrueba;
let planId: string;
let copiaId: string;
let observacionId: string;
let nuevoPerfilId: string;
let nuevoMembershipId: string;
let terceroPerfilId: string;
let terceroMembershipId: string;
const grupo = { anio: 2027, nivel: "primaria" as const, grado: 3, area: "matematica" };
const temaGlobal = temasDe("matematica", "primaria").find(t => t.grado === 3)!;
beforeAll(async () => {
  a = await crearColegioPrueba({ plan: "pro", prefijo: "plan-anual-a" });
  b = await crearColegioPrueba({ plan: "pro", prefijo: "plan-anual-b" });
  for (const seccion of ["A", "B", "C"]) {
    const salon = await db.salon.create({ data: { tenantId: a.tenant.id, nombre: "3.° " + seccion, nivel: "primaria", grado: 3, seccion, anio: 2027 } });
    await db.curso.create({ data: { tenantId: a.tenant.id, salonId: salon.id, nombre: "Matemática", areaCneb: "matematica", profesorId: seccion === "C" ? a.miembros.otroProfesor.membership.id : a.miembros.tutora.membership.id } });
    if (seccion === "A") {
      terceroPerfilId = randomUUID();
      await db.profile.create({ data: { id: terceroPerfilId, email: "tercero-" + terceroPerfilId + "@prueba.local", nombres: "Tercero" } });
      terceroMembershipId = (await db.membership.create({ data: { tenantId: a.tenant.id, userId: terceroPerfilId, rol: "profesor" } })).id;
      await db.curso.create({ data: { tenantId: a.tenant.id, salonId: salon.id, nombre: "Comunicación", areaCneb: "comunicacion", profesorId: terceroMembershipId } });
    }
  }
  const salon2028 = await db.salon.create({ data: { tenantId: a.tenant.id, nombre: "3.° A 2028", nivel: "primaria", grado: 3, seccion: "A", anio: 2028 } });
  await db.curso.create({ data: { tenantId: a.tenant.id, salonId: salon2028.id, nombre: "Matemática", areaCneb: "matematica", profesorId: a.miembros.tutora.membership.id } });
}, 30_000);
afterAll(async () => {
  await a?.limpiar(); await b?.limpiar();
  await db.profile.deleteMany({ where: { id: { in: [nuevoPerfilId, terceroPerfilId].filter(Boolean) } } });
}, 30_000);

describe("plan anual compartido", () => {
  it("1: dos docentes de secciones distintas comparten un plan único", async () => {
    const plan = await crearPlan(a.ctxDe("tutora"), grupo);
    planId = plan.id;
    const detalle = await obtenerPlan(a.ctxDe("otroProfesor"), planId);
    expect(detalle.participantes).toHaveLength(2);
    expect(new Set(detalle.participantes.map(p => p.membershipId)).size).toBe(2);
    await expect(crearPlan(a.ctxDe("otroProfesor"), grupo)).rejects.toThrow(/Ya existe/);
  });
  it("2: un docente de otro curso no modifica el plan", async () => {
    const ctx = { ...a.ctxDe("tutora"), membership: { ...a.miembros.tutora.membership, id: terceroMembershipId } };
    await expect(agregarTemas(ctx, planId, [temaGlobal.clave])).rejects.toThrow(/404/);
  });
  it("3: un docente propone un tema de su colegio", async () => {
    const t = await proponerTemaColegio(a.ctxDe("tutora"), planId, {
      area: "matematica", nivel: "primaria", grado: 3, competenciaCneb: temaGlobal.competenciaCneb,
      nombre: "Tema propio de prueba", descripcion: "Tema ficticio para el plan de prueba",
      palabrasClave: ["prueba", "matematica"], prerrequisitos: [], dificultadMin: 1, dificultadMax: 3,
      tipos: temaGlobal.tipos, fuente: temaGlobal.fuente,
    });
    expect(t.clave).toMatch(/^col:/);
    expect((await buscarCatalogo(a.ctxDe("tutora"), planId, { texto: "Tema propio" })).temas.some(x => x.clave === t.clave)).toBe(true);
    await agregarTemas(a.ctxDe("tutora"), planId, [temaGlobal.clave, t.clave]);
    await designarCoordinador(a.ctxDe("direccion"), planId, a.miembros.tutora.membership.id, "Coordina el grado.");
  });
  it("4: otro docente deja observación", async () => {
    await enviarARevision(a.ctxDe("tutora"), planId);
    const obs = await comentar(a.ctxDe("otroProfesor"), planId, { contenido: "Revisar el orden de los temas.", esObservacion: true });
    observacionId = obs.id;
    expect((await obtenerPlan(a.ctxDe("tutora"), planId)).estado).toBe("con_observaciones");
  });
  it("4b: no guarda conformidad con observaciones sin comentario", async () => {
    await expect(registrarConformidad(a.ctxDe("otroProfesor"), planId, { decision: "observaciones" })).rejects.toThrow("Explica tus observaciones.");
    expect(await a.db.planAnualConformidad.count({ where: { planId, membershipId: a.miembros.otroProfesor.membership.id } })).toBe(0);
  });
  it("5: el coordinador resuelve la observación", async () => {
    await resolverObservacion(a.ctxDe("tutora"), observacionId, "Orden revisado con el equipo.");
    expect((await a.db.planAnualComentario.findFirst({ where: { id: observacionId } }))?.estado).toBe("resuelta");
  });
  it("6: no aprueba ni publica con objeciones pendientes", async () => {
    const obs = await comentar(a.ctxDe("otroProfesor"), planId, { contenido: "Otra observación pendiente.", esObservacion: true });
    await expect(reenviarARevision(a.ctxDe("tutora"), planId)).rejects.toThrow(/Resuelve/);
    await resolverObservacion(a.ctxDe("tutora"), obs.id, "Se corrigió el punto observado.");
    await reenviarARevision(a.ctxDe("tutora"), planId);
    await expect(aprobar(a.ctxDe("tutora"), planId)).rejects.toThrow(/conformidad/);
  });
  it("no aprueba sin conformidad de todos", async () => {
    await registrarConformidad(a.ctxDe("tutora"), planId, { decision: "conforme" });
    await expect(aprobar(a.ctxDe("tutora"), planId)).rejects.toThrow(/conformidad/);
  });
  it("dirección no aprueba en nombre del coordinador", async () => {
    await expect(aprobar(a.ctxDe("direccion"), planId)).rejects.toThrow(/404/);
  });
  it("7: la aprobación conserva quién aprobó", async () => {
    await registrarConformidad(a.ctxDe("otroProfesor"), planId, { decision: "conforme" });
    await aprobar(a.ctxDe("tutora"), planId);
    expect((await obtenerPlan(a.ctxDe("tutora"), planId)).aprobadoPorId).toBe(a.miembros.tutora.membership.id);
  });
  it("no publica mientras queda una objeción pendiente", async () => {
    const obs = await a.db.planAnualComentario.create({ data: { tenantId: a.tenant.id, planId, autorId: a.miembros.otroProfesor.membership.id, contenido: "Objeción pendiente antes de publicar", esObservacion: true, estado: "abierta" } });
    await expect(publicar(a.ctxDe("tutora"), planId)).rejects.toThrow(/Resuelve/);
    await resolverObservacion(a.ctxDe("tutora"), obs.id, "Se atendió la objeción pendiente.");
  });
  it("8: publicar guarda una foto versionada", async () => {
    await publicar(a.ctxDe("tutora"), planId);
    const v = await versiones(a.ctxDe("tutora"), planId);
    expect(v).toHaveLength(1);
    expect(v[0].numero).toBe(1);
    expect(v[0].temas).toHaveLength(2);
    expect(v[0].conformidades).toHaveLength(2);
  });
  it("9: 2028 copia temas y unidades del plan 2027", async () => {
    const copia = await copiarPlan(a.ctxDe("tutora"), planId, 2028);
    copiaId = copia.id;
    const detalle = await obtenerPlan(a.ctxDe("tutora"), copiaId);
    expect(detalle.estado).toBe("borrador");
    expect(detalle.copiadoDeId).toBe(planId);
    expect(detalle.temas).toHaveLength(2);
    await expect(copiarPlan(a.ctxDe("tutora"), planId, 2028)).rejects.toThrow(/Ya existe/);
  });
  it("abrir revisión conserva la versión publicada", async () => {
    await abrirRevision(a.ctxDe("tutora"), planId, "Actualizar el plan para la nueva asignación.");
    expect((await obtenerPlan(a.ctxDe("tutora"), planId)).versionPublicada).toBe(1);
    expect(await versiones(a.ctxDe("tutora"), planId)).toHaveLength(1);
  });
  it("10: un docente nuevo asignado se sincroniza y continúa", async () => {
    nuevoPerfilId = randomUUID();
    const user = await db.profile.create({ data: { id: nuevoPerfilId, email: "nuevo-" + nuevoPerfilId + "@prueba.local", nombres: "Nuevo" } });
    const member = await db.membership.create({ data: { tenantId: a.tenant.id, userId: user.id, rol: "profesor" } });
    nuevoMembershipId = member.id;
    const salon = await a.db.salon.findFirstOrThrow({ where: { anio: 2027, seccion: "A" } });
    await db.curso.create({ data: { tenantId: a.tenant.id, salonId: salon.id, nombre: "Matemática de apoyo", areaCneb: "matematica", profesorId: member.id } });
    await sincronizarParticipantes(a.ctxDe("tutora"), planId);
    const ctxNuevo = { ...a.ctxDe("tutora"), user, membership: member };
    expect((await obtenerPlan(ctxNuevo, planId)).participantes.some(p => p.membershipId === nuevoMembershipId)).toBe(true);
    await comentar(ctxNuevo, planId, { contenido: "Continuamos con los temas.", esObservacion: false });
  });
  it("vincula una reunión de coordinación con los participantes activos", async () => {
    const reunion = await convocarReunionPlan(a.ctxDe("tutora"), planId, { titulo: "Revisar plan anual", fecha: sumarDias(fechaLima(new Date()), 2), hora: "17:00", duracion: 15, lugar: "Sala docente", fueraDeHorario: true });
    expect(reunion.ok).toBe(true);
    const lista = await reunionesDelPlan(a.ctxDe("otroProfesor"), planId);
    expect(lista.some(r => r.id === reunion.id && r.planAnualId === planId)).toBe(true);
  });
  it("11: el colegio B no ve el catálogo privado del A", async () => {
    const salon = await db.salon.create({ data: { tenantId: b.tenant.id, nombre: "3.° A", anio: 2027, nivel: "primaria", grado: 3, seccion: "A" } });
    await db.curso.create({ data: { tenantId: b.tenant.id, salonId: salon.id, nombre: "Matemática", areaCneb: "matematica", profesorId: b.miembros.tutora.membership.id } });
    const planB = await crearPlan(b.ctxDe("tutora"), grupo);
    const catalogoB = await buscarCatalogo(b.ctxDe("tutora"), planB.id, { texto: "Tema propio de prueba" });
    expect(catalogoB.temas).toHaveLength(0);
  });
  it("12: personalizar no modifica el catálogo global", () => {
    expect(temasDe("matematica", "primaria").find(t => t.clave === temaGlobal.clave)).toEqual(temaGlobal);
  });
});
