import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { temasDe } from "@/lib/nudito/catalogo";
import type { AccesoNudito, AreaNudito } from "@/lib/nudito/contratos";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import { temasPublicadosDelAlumno, progresoDelPlan } from "@/lib/server/nudito/plan-publicado";
import { prepararMateriales, procesarLote } from "@/lib/server/nudito/lecciones/preparacion";
import * as sesiones from "@/lib/server/nudito/sesiones";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

vi.stubEnv("KHIPU_TEST_NUDITO_PLUS", "1");
let c: ColegioPrueba;
let ctx: TenantContext;
let acceso: AccesoNudito;
let segundo: AccesoNudito;
let cursoMat: string, cursoCom: string, cursoCyt: string;
const planes = new Map<AreaNudito,string>();
const publicados = new Map<AreaNudito,string[]>();

function contenido(t: ReturnType<typeof temasDe>[number]) {
  return { titulo: t.nombre, idea: t.repaso.idea.slice(0,400), explicacion: t.repaso.idea,
    ejemplos: [{ enunciado: t.nombre, desarrollo: t.repaso.ejemplo }], recursos: [],
    ejerciciosMuestra: [{ enunciado: t.nombre, respuesta: "respuesta verificada en el banco", pistas: ["Busca la idea principal."] }] };
}
async function nuevaSesion(cursoId: string, clave: string) {
  await ctx.db.nuditoSesion.updateMany({ where: { alumnoId: acceso.alumno.id, estado: "activa" }, data: { estado: "abandonada" } });
  const ini = await sesiones.iniciarSesion(ctx, acceso, { alumnoId: acceso.alumno.id });
  const seleccion = await sesiones.elegirCurso(ctx, acceso, { sesionId: ini.sesionId, cursoId });
  expect(seleccion.temas.map(t => t.clave)).toContain(clave);
  expect((await sesiones.elegirTema(ctx, acceso, { sesionId: ini.sesionId, temaClave: clave })).tipo).toBe("permitido");
  return ini.sesionId;
}
beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-plan-anual" });
  await db.salon.update({ where: { id: c.otroSalon.id }, data: { grado: 5 } });
  await db.curso.update({ where: { id: c.cursoAjeno.id }, data: { areaCneb: "ciencia-tecnologia" } });
  cursoCyt = c.cursoAjeno.id;
  cursoMat = (await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombre: "Matemática", areaCneb: "matematica" } })).id;
  cursoCom = (await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombre: "Comunicación", areaCneb: "comunicacion" } })).id;
  await db.nuditoConfigColegio.create({ data: { tenantId: c.tenant.id, activo: true, sesionesPorDia: 50 } });
  const user = await db.profile.create({ data: { id: randomUUID(), email: "alumna-" + randomUUID() + "@test.local", nombres: "Ana", apellidos: "Ficticia" } });
  const member = await db.membership.create({ data: { tenantId: c.tenant.id, userId: user.id, rol: "alumno" } });
  await db.alumno.update({ where: { id: c.alumnos.thiago.id }, data: { cuentaId: member.id } });
  ctx = { tenant: c.tenant, user, membership: member, rol: "alumno", roles: ["alumno"], db: dbTenant(c.tenant.id), ...accesoModulosDeCodigo("pro") };
  acceso = { alumno: { id: c.alumnos.thiago.id, nombres: "Ana", apellidos: "Ficticia", salonId: c.otroSalon.id }, modo: "alumno" };
  const otro = await db.alumno.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombres: "Luis", apellidos: "Prueba" } });
  segundo = { alumno: { id: otro.id, nombres: otro.nombres, apellidos: otro.apellidos, salonId: otro.salonId }, modo: "alumno" };
  for (const [area, cantidad] of [["matematica", 7], ["comunicacion", 6], ["ciencia-tecnologia", 1]] as const) {
    const temas = temasDe(area, "primaria", 5).slice(0,cantidad);
    const plan = await db.planAnual.create({ data: { tenantId: c.tenant.id, anio: 2026, nivel: "primaria", grado: 5, area, nombreCurso: area,
      estado: "publicado", versionPublicada: 1, coordinadorId: c.miembros.otroProfesor.membership.id, creadoPorId: c.miembros.direccion.membership.id } });
    planes.set(area,plan.id);
    await db.planAnualParticipante.create({ data: { tenantId: c.tenant.id, planId: plan.id, membershipId: c.miembros.otroProfesor.membership.id, rol: "coordinador" } });
    await db.planAnualVersion.create({ data: { tenantId: c.tenant.id, planId: plan.id, numero: 1, temas: temas.map((t,i) => ({ temaClave: t.clave, orden: i, semana: i+1 })), unidades: [], conformidades: [], publicadoPorId: c.miembros.otroProfesor.membership.id } });
    const visibles = area === "matematica" ? temas.slice(0,6) : temas;
    publicados.set(area, visibles.map(t => t.clave));
    for (const t of visibles) await db.nuditoLeccion.create({ data: { tenantId: c.tenant.id, temaClave: t.clave, area, version: 1, estado: "publicada", origen: "catalogo", contenido: contenido(t), contenidoHash: "test" } });
  }
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await c.limpiar();
  await db.profile.deleteMany({ where: { id: ctx.user.id } });
  await db.$disconnect();
});

describe("Nudito lee el plan anual publicado", () => {
  it("13: hay trece temas aprobados entre las tres áreas desde el inicio", async () => {
    const listas = await Promise.all((["matematica","comunicacion","ciencia-tecnologia"] as const).map(a => temasPublicadosDelAlumno(ctx, acceso, a)));
    expect(listas.flat()).toHaveLength(13);
  });
  it("14: cambiar semanas y fechas no bloquea ningún tema", async () => {
    const antes = (await temasPublicadosDelAlumno(ctx, acceso, "matematica")).map(t => t.clave);
    const planId = planes.get("matematica")!;
    const version = await ctx.db.planAnualVersion.findFirstOrThrow({ where: { planId, numero: 1 } });
    await ctx.db.planAnualVersion.update({ where: { id: version.id }, data: { temas: (version.temas as {temaClave:string;orden:number}[]).map((t,i) => ({...t, semana: i+30, fecha: "2027-12-31"})) } });
    expect((await temasPublicadosDelAlumno(ctx, acceso, "matematica")).map(t => t.clave)).toEqual(antes);
  });
  it("16: grado, curso y lección publicada limitan la lista", async () => {
    const mat = await temasPublicadosDelAlumno(ctx, acceso, "matematica");
    expect(mat.map(t => t.clave)).toEqual(publicados.get("matematica"));
    expect(mat.every(t => t.grado === 5 && t.area === "matematica")).toBe(true);
    expect(await temasPublicadosDelAlumno(c.ctxDe("direccion"), { ...acceso, alumno: { ...acceso.alumno, id: c.alumnos.mateo.id } }, "matematica")).toEqual([]);
  });
  it("17: texto libre se rechaza y una clave ajena recibe sugerencias", async () => {
    const ini = await sesiones.iniciarSesion(ctx, acceso, { alumnoId: acceso.alumno.id });
    await sesiones.elegirCurso(ctx, acceso, { sesionId: ini.sesionId, cursoId: cursoMat });
    expect((await sesiones.elegirTema(ctx, acceso, { sesionId: ini.sesionId, textoLibre: "fracciones" } as never)).tipo).toBe("no_reconocido");
    expect(await sesiones.elegirTema(ctx, acceso, { sesionId: ini.sesionId, temaClave: "mat.p4.fracciones-equivalentes" })).toMatchObject({ tipo: "no_reconocido", sugerencias: expect.any(Array) });
  });
  it.each([["matematica",() => cursoMat],["comunicacion",() => cursoCom],["ciencia-tecnologia",() => cursoCyt]] as const)("18/19/20: %s ofrece repaso y ejercicio", async (area, curso) => {
    const clave = publicados.get(area)![0];
    const id = await nuevaSesion(curso(), clave);
    const repaso = await sesiones.pedirRepaso(ctx, acceso, { sesionId: id });
    expect(repaso.explicacion.length).toBeGreaterThan(10);
    const e = await sesiones.siguienteEjercicio(ctx, acceso, { sesionId: id });
    expect("fin" in e).toBe(false);
  });
  it("21/22: respuesta incorrecta da retro y la primera pista no revela la solución", async () => {
    const id = await nuevaSesion(cursoMat, publicados.get("matematica")![0]);
    const e = await sesiones.siguienteEjercicio(ctx, acceso, { sesionId: id });
    if ("fin" in e) throw new Error("sin ejercicio");
    const pista = await sesiones.pedirPista(ctx, acceso, { ejercicioId: e.ejercicioId });
    const guardada = await ctx.db.nuditoEjercicio.findFirstOrThrow({ where: { id: e.ejercicioId } });
    const solucion = JSON.stringify((guardada.solucion as {solucion:unknown}).solucion);
    expect(solucion.includes(pista.texto)).toBe(false);
    const respuesta = e.ejercicio.tipo === "opcion_multiple" ? { tipo: "opcion" as const, opcionId: "zz" } : { tipo: "numero" as const, valor: "999999" };
    const r = await sesiones.responder(ctx, acceso, { ejercicioId: e.ejercicioId, respuesta });
    expect(r.evaluacion.retro.length).toBeGreaterThan(5);
  });
  it("23/24/25/26: progreso persiste, otro alumno no entra, no hay notas y se reutiliza la lección", async () => {
    const antes = await Promise.all([ctx.db.nota.count(), ctx.db.evaluacion.count(), ctx.db.calificacionPeriodo.count()]);
    const leccionesAntes = await ctx.db.nuditoLeccion.count();
    const consumosAntes = await ctx.db.nuditoConsumoIa.count({ where: { operacion: "generar_leccion" } });
    const id = await nuevaSesion(cursoMat, publicados.get("matematica")![0]);
    const e = await sesiones.siguienteEjercicio(ctx, acceso, { sesionId: id });
    if ("fin" in e) throw new Error("sin ejercicio");
    await expect(sesiones.siguienteEjercicio(ctx, segundo, { sesionId: id })).rejects.toThrow();
    for (let intento = 0; intento < 3; intento++) await sesiones.responder(ctx, acceso, { ejercicioId: e.ejercicioId, respuesta: e.ejercicio.tipo === "opcion_multiple" ? { tipo: "opcion", opcionId: "zz" } : { tipo: "numero", valor: "999999" } });
    expect(await ctx.db.nuditoDominio.count({ where: { alumnoId: acceso.alumno.id } })).toBeGreaterThan(0);
    expect(await Promise.all([ctx.db.nota.count(), ctx.db.evaluacion.count(), ctx.db.calificacionPeriodo.count()])).toEqual(antes);
    expect((await temasPublicadosDelAlumno(c.ctxDe("direccion"), segundo, "matematica")).map(t => t.clave)).toContain(publicados.get("matematica")![0]);
    expect(await ctx.db.nuditoLeccion.count()).toBe(leccionesAntes);
    expect(await ctx.db.nuditoConsumoIa.count({ where: { operacion: "generar_leccion" } })).toBe(consumosAntes);
  });
  it("15/27: dominio completo a mitad de año; la versión 2 conserva el historial retirado", async () => {
    const claves = publicados.get("matematica")!;
    for (const clave of claves) await ctx.db.nuditoDominio.upsert({ where: { alumnoId_temaClave: { alumnoId: acceso.alumno.id, temaClave: clave } },
      create: { tenantId: c.tenant.id, alumnoId: acceso.alumno.id, temaClave: clave, area: "matematica", gradoTema: 5, estado: "dominado", politicaVersion: "test", dominadoAt: new Date() },
      update: { estado: "dominado", dominadoAt: new Date() } });
    expect((await progresoDelPlan(ctx, acceso.alumno.id, "matematica")).completo).toBe(true);
    const sesionesDelTema = await ctx.db.nuditoSesion.count({ where: { alumnoId: acceso.alumno.id, temaClave: claves[0] } });
    const planId = planes.get("matematica")!;
    await ctx.db.planAnualVersion.create({ data: { tenantId: c.tenant.id, planId, numero: 2, temas: claves.slice(1).map((temaClave,orden) => ({ temaClave,orden })), unidades: [], conformidades: [], publicadoPorId: c.miembros.otroProfesor.membership.id } });
    await ctx.db.planAnual.update({ where: { id: planId }, data: { versionPublicada: 2 } });
    expect((await temasPublicadosDelAlumno(ctx, acceso, "matematica")).map(t => t.clave)).not.toContain(claves[0]);
    expect(await ctx.db.nuditoDominio.findFirst({ where: { alumnoId: acceso.alumno.id, temaClave: claves[0] } })).not.toBeNull();
    expect(await ctx.db.nuditoSesion.count({ where: { alumnoId: acceso.alumno.id, temaClave: claves[0] } })).toBe(sesionesDelTema);
  });
  it("28: preparación idempotente y presupuesto cero deja pendiente el tema propio", async () => {
    const planId = planes.get("comunicacion")!;
    const version = await ctx.db.planAnualVersion.findFirstOrThrow({ where: { planId, numero: 1 } });
    const propio = "col:" + randomUUID();
    await ctx.db.planAnualVersion.update({ where: { id: version.id }, data: { temas: [...(version.temas as {temaClave:string;orden:number}[]), { temaClave: propio, orden: 99 }] } });
    const direccion = c.ctxDe("direccion");
    const a = await prepararMateriales(direccion, planId);
    const b = await prepararMateriales(direccion, planId);
    expect(a.id).toBe(b.id);
    await ctx.db.nuditoTrabajoContenido.update({ where: { id: a.id }, data: { presupuestoUsd: 0 } });
    await procesarLote(direccion, a.id);
    expect(await ctx.db.nuditoTrabajoItem.findFirst({ where: { trabajoId: a.id, temaClave: propio } })).toMatchObject({ estado: "pendiente", intentos: 0 });
    await ctx.db.nuditoTrabajoContenido.update({ where: { id: a.id }, data: { presupuestoUsd: 10 } });
    await ctx.db.nuditoConfigColegio.update({ where: { tenantId: c.tenant.id }, data: { topeCostoUsdMes: 0 } });
    await procesarLote(direccion, a.id);
    expect(await ctx.db.nuditoTrabajoItem.findFirst({ where: { trabajoId: a.id, temaClave: propio } })).toMatchObject({ estado: "pendiente", intentos: 0 });
  });
});
