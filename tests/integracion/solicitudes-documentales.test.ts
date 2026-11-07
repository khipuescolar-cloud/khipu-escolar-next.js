import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";
import { crearSolicitud, publicarSolicitud, presentarVersion, comenzarRevision, observarVersion, aprobarVersion, detalleSolicitud, listarSolicitudes, reporteCumplimiento } from "@/lib/server/solicitudes/index";
import { resolverAccesoSolicitud } from "@/lib/server/archivos-acceso/solicitud";
import { db } from "@/lib/server/db";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";

const pdf = (n: number) => [{ nombre: `programacion-${n}.pdf`, buffer: Buffer.from(`%PDF-1.4\n% versión ${n}\n`) }];
describe("solicitudes documentales", () => {
  let c: ColegioPrueba, otra: ColegioPrueba, base: ColegioPrueba, id: string, destinatarioId: string;
  beforeAll(async () => { c = await crearColegioPrueba({ plan: "pro", prefijo: "test-w3" }); otra = await crearColegioPrueba({ plan: "pro", prefijo: "test-w3" }); base = await crearColegioPrueba({ plan: "base", prefijo: "test-w3" }); });
  afterAll(async () => { await c?.limpiar(); await otra?.limpiar(); await base?.limpiar(); });
  it("11 dirección solicita planificación y valida destinatarios del colegio", async () => {
    const r = await crearSolicitud(c.ctxDe("direccion"), { titulo: "Programación curricular", anioAcademico: 2026, destinatarios: { membershipIds: [c.miembros.tutora.membership.id] } });
    id = r.id;
    destinatarioId = (await detalleSolicitud(c.ctxDe("direccion"), id)).destinatarios[0].id;
    await publicarSolicitud(c.ctxDe("direccion"), id);
    expect((await detalleSolicitud(c.ctxDe("tutora"), id)).resumen.pendientes).toBe(1);
    await expect(crearSolicitud(c.ctxDe("direccion"), { titulo: "Ajena", anioAcademico: 2026, destinatarios: { membershipIds: [otra.miembros.tutora.membership.id] } })).rejects.toBeInstanceOf(ErrorDeNegocio);
    expect(await listarSolicitudes(c.ctxDe("otroProfesor"))).toHaveLength(0);
    await expect(detalleSolicitud(otra.ctxDe("direccion"), id)).rejects.toBeInstanceOf(ErrorDeNegocio);
    await esperarProhibido(crearSolicitud(base.ctxDe("direccion"), { titulo: "Plan Base", anioAcademico: 2026, destinatarios: { membershipIds: [base.miembros.tutora.membership.id] } }));
  });
  it("rechaza aprobar sin entrega y dos presentaciones simultáneas solo crean una versión", async () => {
    const r = await crearSolicitud(c.ctxDe("direccion"), { titulo: "Plan de área", anioAcademico: 2026, destinatarios: { membershipIds: [c.miembros.otroProfesor.membership.id] } });
    await publicarSolicitud(c.ctxDe("direccion"), r.id);
    const d = (await detalleSolicitud(c.ctxDe("direccion"), r.id)).destinatarios[0];
    await expect(aprobarVersion(c.ctxDe("direccion"), d.id)).rejects.toBeInstanceOf(ErrorDeNegocio);
    const resultados = await Promise.allSettled([presentarVersion(c.ctxDe("otroProfesor"), d.id, { archivos: pdf(3) }), presentarVersion(c.ctxDe("otroProfesor"), d.id, { archivos: pdf(4) })]);
    expect(resultados.filter(x => x.status === "fulfilled")).toHaveLength(1);
    expect((await detalleSolicitud(c.ctxDe("direccion"), r.id)).destinatarios[0].versiones).toHaveLength(1);
  });
  it("12–16 entrega, observación, nueva versión, aprobación e historial", async () => {
    const ctx = c.ctxDe("tutora"), dir = c.ctxDe("direccion");
    expect((await presentarVersion(ctx, destinatarioId, { archivos: pdf(1) })).numero).toBe(1);
    await expect(presentarVersion(ctx, destinatarioId, { archivos: pdf(9) })).rejects.toBeInstanceOf(ErrorDeNegocio);
    await comenzarRevision(dir, destinatarioId);
    await observarVersion(dir, destinatarioId, { observaciones: "Corrige el cronograma" });
    expect((await presentarVersion(ctx, destinatarioId, { archivos: pdf(2) })).numero).toBe(2);
    await aprobarVersion(dir, destinatarioId);
    const detalle = await detalleSolicitud(dir, id);
    expect(detalle.destinatarios[0].versiones.map(v => v.resultado)).toEqual(["observada", "aprobada"]);
    expect(detalle.destinatarios[0].versiones[0].observaciones).toBe("Corrige el cronograma");
    expect(detalle.resumen.aprobadas).toBe(1);
    const reporte = await reporteCumplimiento(dir, { agrupar: "docente" });
    expect(reporte.find(r => r.clave === ctx.membership.id)).toMatchObject({ entregadas: 1, aprobadas: 1, cumplimiento: 100 });
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { id: detalle.destinatarios[0].versiones[0].archivos[0].id } });
    expect(await resolverAccesoSolicitud(ctx, archivo)).toBe("permitir");
    expect(await resolverAccesoSolicitud(c.ctxDe("otroProfesor"), archivo)).toBe("denegar");
    await expect(db.solicitudVersion.update({ where: { id: detalle.destinatarios[0].versiones[0].id }, data: { comentario: "alterado" } })).rejects.toThrow();
    await expect(db.solicitudEvento.deleteMany({ where: { solicitudId: id } })).rejects.toThrow();
  });
});
