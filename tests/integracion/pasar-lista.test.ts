import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardarLista, obtenerLista } from "@/lib/server/asistencia";
import { db } from "@/lib/server/db";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("pasar lista", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba();
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  const lista = (estadoMateo: "llego" | "tarde" | "falta" | "problema", nota?: string) => ({
    salonId: c.salon.id,
    ambito: "dia",
    registros: [
      { alumnoId: c.alumnos.mateo.id, estado: estadoMateo, ...(nota ? { nota } : {}) },
      { alumnoId: c.alumnos.valentina.id, estado: "llego" },
    ],
  });

  it("guarda con upsert idempotente: repetir la misma lista no crea filas ni avisos nuevos", async () => {
    const primera = await guardarLista(c.ctxDe("tutora"), lista("llego"));
    expect(primera).toEqual({ guardados: 2, cambios: 2, familiasAvisadas: 1, omitidos: 0 });
    const segunda = await guardarLista(c.ctxDe("tutora"), lista("llego"));
    expect(segunda).toEqual({ guardados: 2, cambios: 0, familiasAvisadas: 0, omitidos: 0 });
    expect(await c.db.asistencia.count()).toBe(2);
    expect(await c.db.aviso.count()).toBe(1);
  });

  it("solo avisa a familias con consentimiento vigente", async () => {
    const avisos = await c.db.aviso.findMany();
    expect(avisos.every((a) => a.apoderadoId === c.miembros.madre.membership.id)).toBe(true);
  });

  it("al corregir el estado envía un aviso nuevo; la falta lleva token de justificar (solo hash)", async () => {
    const r = await guardarLista(c.ctxDe("tutora"), lista("falta"));
    expect(r.cambios).toBe(1);
    expect(r.familiasAvisadas).toBe(1);
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_falta" } });
    expect(aviso.canal).toBe("correo");
    const payload = aviso.payload as { justificacionTokenId: string; urlJustificar?: string };
    expect(payload.urlJustificar).toBeUndefined();
    const token = await c.db.justificacionToken.findUniqueOrThrow({ where: { id: payload.justificacionTokenId } });
    expect(token.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(token.expiraAt.getTime() - Date.now()).toBeGreaterThan(1.9 * 86_400_000);
  });

  it("registra la auditoría de cada cambio", async () => {
    const n = await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "asistencia", accion: { in: ["crear", "editar"] } } });
    expect(n).toBe(3);
  });

  it("respeta la preferencia de no recibir correos", async () => {
    await c.db.preferenciaAviso.create({ data: { tenantId: c.tenant.id, apoderadoId: c.miembros.madre.membership.id, correo: false, push: true } });
    const r = await guardarLista(c.ctxDe("tutora"), lista("tarde"));
    expect(r.familiasAvisadas).toBe(0);
    await c.db.preferenciaAviso.deleteMany({});
  });

  it("en la lista de un curso no vuelve a avisar la llegada ya avisada hoy", async () => {
    await guardarLista(c.ctxDe("tutora"), lista("llego"));
    const r = await guardarLista(c.ctxDe("tutora"), { ...lista("llego"), ambito: c.cursoTutora.id });
    expect(r.cambios).toBe(2);
    expect(r.familiasAvisadas).toBe(0);
  });

  it("el profesor no puede pasar lista en un curso ajeno ni la del día de otro salón", async () => {
    await esperarProhibido(
      guardarLista(c.ctxDe("tutora"), { salonId: c.otroSalon.id, ambito: c.cursoAjeno.id, registros: [{ alumnoId: c.alumnos.thiago.id, estado: "llego" }] }),
    );
    await esperarProhibido(obtenerLista(c.ctxDe("tutora"), c.otroSalon.id, "dia"));
    await esperarProhibido(obtenerLista(c.ctxDe("otroProfesor"), c.salon.id, c.cursoTutora.id));
  });

  it("no acepta alumnos de otro salón en la lista", async () => {
    await esperarProhibido(
      guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.thiago.id, estado: "falta" }] }),
    );
  });

  it("el apoderado no puede pasar lista", async () => {
    await esperarProhibido(guardarLista(c.ctxDe("madre"), lista("llego")));
  });
});

describe("modo solo excepciones", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba({ modoAvisos: "solo_excepciones" });
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("las llegadas no se avisan al instante, las faltas sí", async () => {
    const base = { salonId: c.salon.id, ambito: "dia" };
    const r1 = await guardarLista(c.ctxDe("direccion"), { ...base, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
    expect(r1.familiasAvisadas).toBe(0);
    const r2 = await guardarLista(c.ctxDe("direccion"), { ...base, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] });
    expect(r2.familiasAvisadas).toBe(1);
  });
});
