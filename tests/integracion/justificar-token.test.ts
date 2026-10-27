import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { venceJustificacion } from "@/lib/dias-habiles";
import { db } from "@/lib/server/db";
import {
  buscarTokenJustificacion, consultarTokenJustificacion, faltaParaJustificar, justificarConSesion, justificarConToken, listarJustificaciones, mensajePlazoVencido, MENSAJE_TOKEN_INVALIDO, revisarJustificacion,
} from "@/lib/server/justificaciones";
import { guardarLista } from "@/lib/server/asistencia";
import { tokenDerivado } from "@/lib/server/tokens";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const PDF = Buffer.from("%PDF-1.4\n%prueba\n");

describe("justificar falta con token", () => {
  let c: ColegioPrueba;
  let otro: ColegioPrueba;
  let token: string;

  beforeAll(async () => {
    [c, otro] = await Promise.all([crearColegioPrueba(), crearColegioPrueba()]);
    await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] });
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_falta" } });
    token = tokenDerivado("justificar", (aviso.payload as { justificacionTokenId: string }).justificacionTokenId);
  });
  afterAll(async () => {
    await Promise.all([c?.limpiar(), otro?.limpiar()]);
  });

  it("muestra alumno, fecha y colegio sin pedir sesión", async () => {
    const datos = await buscarTokenJustificacion(token);
    expect(datos).toMatchObject({ alumno: "Mateo", tenant: { id: c.tenant.id } });
  });

  it("un token vencido no sirve", async () => {
    // Plazo por defecto del reglamento: 15 días hábiles desde la falta (fin del día en Lima).
    const fila = await c.db.justificacionToken.findFirstOrThrow();
    const antes = new Date(fila.expiraAt.getTime() - 1);
    const despues = new Date(fila.expiraAt.getTime() + 1);
    expect(await buscarTokenJustificacion(token, { ahora: antes })).not.toBeNull();
    expect(await buscarTokenJustificacion(token, { ahora: despues })).toBeNull();
    expect(await consultarTokenJustificacion(token, { ahora: despues })).toEqual({ ok: false, motivo: "vencido", plazoDias: 15 });
    expect(await justificarConToken(token, { motivo: "Fiebre", archivo: null }, { ahora: despues })).toEqual({ ok: false, error: mensajePlazoVencido(15) });
    expect(mensajePlazoVencido(15)).toBe("El plazo para justificar venció (15 días hábiles). Escribe a la tutora.");
  });

  it("un token de otro colegio no sirve", async () => {
    expect(await buscarTokenJustificacion(token, { tenantId: otro.tenant.id })).toBeNull();
    expect(await justificarConToken(token, { motivo: "Fiebre", archivo: null }, { tenantId: otro.tenant.id })).toMatchObject({ ok: false });
  });

  it("rechaza adjuntos que no son imagen ni PDF sin gastar el token", async () => {
    const r = await justificarConToken(token, { motivo: "Fiebre", archivo: Buffer.from("MZ ejecutable") });
    expect(r).toEqual({ ok: false, error: "Solo se aceptan fotos (JPG, PNG, WEBP) o PDF." });
    expect(await buscarTokenJustificacion(token)).not.toBeNull();
  });

  it("se usa una sola vez y avisa a la tutora", async () => {
    const r = await justificarConToken(token, { motivo: "  Tuvo fiebre.  ", archivo: PDF });
    expect(r).toMatchObject({ ok: true });
    const j = await c.db.justificacion.findFirstOrThrow({ include: { adjunto: true } });
    expect(j).toMatchObject({ estado: "pendiente", motivo: "Tuvo fiebre.", apoderadoId: c.miembros.madre.membership.id });
    expect(j.adjunto).toMatchObject({ mimeType: "application/pdf", privado: true, proveedor: "local" });
    const aTutora = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "justificacion_recibida" } });
    expect(aTutora).toMatchObject({ destinatario: c.miembros.tutora.user.email, tipo: "justificacion", referenciaId: j.id });

    expect(await justificarConToken(token, { motivo: "Otra vez", archivo: null })).toEqual({ ok: false, error: MENSAJE_TOKEN_INVALIDO });
    expect(await c.db.justificacion.count()).toBe(1);
  });

  it("la tutora la ve y la acepta; la familia recibe un aviso neutral", async () => {
    const lista = await listarJustificaciones(c.ctxDe("tutora"));
    expect(lista).toHaveLength(1);
    expect(lista[0].adjuntoUrl).toMatch(/^\/archivos\/[0-9a-f-]{36}\?exp=\d+&sig=/);
    expect(await listarJustificaciones(c.ctxDe("otroProfesor"))).toHaveLength(0);

    await esperarProhibido(revisarJustificacion(c.ctxDe("otroProfesor"), { id: lista[0].id, decision: "aceptada" }));
    await revisarJustificacion(c.ctxDe("tutora"), { id: lista[0].id, decision: "aceptada", comentario: "Gracias por avisar." });
    expect((await c.db.justificacion.findUniqueOrThrow({ where: { id: lista[0].id } })).estado).toBe("aceptada");
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "justificacion_revisada" } });
    expect(aviso).toMatchObject({ tipo: "justificacion", referenciaId: lista[0].id });
    expect(aviso.payload).toMatchObject({ estado: "aceptada", alumno: "Mateo", comentario: "Gracias por avisar." });
    expect((await c.db.justificacion.findUniqueOrThrow({ where: { id: lista[0].id } })).comentarioRevision).toBe("Gracias por avisar.");
    const deLaFamilia = await listarJustificaciones(c.ctxDe("madre"));
    expect(deLaFamilia[0]).toMatchObject({ estado: "aceptada", comentarioRevision: "Gracias por avisar." });
  });

  it("el apoderado con sesión no puede justificar dos veces ni faltas ajenas", async () => {
    const asistencia = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id } });
    expect(await justificarConSesion(c.ctxDe("madre"), asistencia.id, { motivo: "x", archivo: null })).toEqual({
      ok: false, error: "Esta falta ya tiene una justificación.",
    });
    await esperarProhibido(justificarConSesion(c.ctxDe("padreSinConsentimiento"), asistencia.id, { motivo: "x", archivo: null }));
  });

  it("limpia el adjunto de prueba", async () => {
    // Los archivos locales viven en .uploads/<tenantId>/: se borran al limpiar el colegio de prueba.
    const { rm } = await import("node:fs/promises");
    for (const t of [c.tenant.id, otro.tenant.id]) await rm(`.uploads/${t}`, { recursive: true, force: true });
    expect(await db.archivo.count({ where: { tenantId: c.tenant.id } })).toBe(1);
  });
});

describe("justificar con sesión: plazo de días hábiles", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba();
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("fuera de plazo el servidor la rechaza; dentro la acepta", async () => {
    await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] });
    const asistencia = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id } });
    const fecha = asistencia.fecha.toISOString().slice(0, 10);
    const vence = venceJustificacion(fecha, 15);

    const falta = await faltaParaJustificar(c.ctxDe("madre"), asistencia.id);
    expect(falta).toMatchObject({ disponible: true, plazoVencido: false });
    expect(falta.venceAt.toISOString()).toBe(vence.toISOString());
    expect(falta.textoPlazo).toMatch(/^Puedes justificar hasta el /);

    const tarde = new Date(vence.getTime() + 1);
    expect(await faltaParaJustificar(c.ctxDe("madre"), asistencia.id, tarde)).toMatchObject({ plazoVencido: true });
    expect(await justificarConSesion(c.ctxDe("madre"), asistencia.id, { motivo: "Fiebre", archivo: null }, tarde)).toEqual({
      ok: false, error: "El plazo para justificar venció (15 días hábiles). Escribe a la tutora.",
    });
    expect(await c.db.justificacion.count()).toBe(0);

    const r = await justificarConSesion(c.ctxDe("madre"), asistencia.id, { motivo: "Fiebre", archivo: null }, new Date(vence.getTime() - 1));
    expect(r).toMatchObject({ ok: true });
    expect(await c.db.justificacion.count()).toBe(1);
  });
});
