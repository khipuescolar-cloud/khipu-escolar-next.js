// Envíos de avisos (specs/06): una acción que avisa a más de una familia es masiva; a una sola, individual.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardarLista } from "@/lib/server/asistencia";
import { detalleEnvio, panelAvisos } from "@/lib/server/avisos-panel";
import { db } from "@/lib/server/db";
import { avisarReunion } from "@/lib/server/notificaciones/avisos-reuniones";
import { registrarLlegadaManual } from "@/lib/server/porteria";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("envíos masivos e individuales", () => {
  let c: ColegioPrueba;
  let padreMateo: string;
  const perfiles: string[] = [];

  /** Apoderado con consentimiento vigente vinculado a un alumno. */
  async function apoderado(nombre: string, alumnoId: string) {
    const id = randomUUID();
    perfiles.push(id);
    await db.profile.create({ data: { id, email: `${nombre.toLowerCase()}-${id.slice(0, 8)}@test-envios.local`, nombres: nombre, apellidos: "Prueba" } });
    const m = await db.membership.create({ data: { tenantId: c.tenant.id, userId: id, rol: "apoderado" } });
    const consentimiento = await db.consentimiento.create({ data: { tenantId: c.tenant.id, apoderadoId: m.id, versionTexto: "test" } });
    await db.apoderadoAlumno.create({ data: { tenantId: c.tenant.id, apoderadoId: m.id, alumnoId, consentimientoId: consentimiento.id } });
    return m.id;
  }

  beforeAll(async () => {
    c = await crearColegioPrueba({ prefijo: "test-envios" });
    await apoderado("Ana", c.alumnos.valentina.id); // Valentina: otra familia con avisos
    padreMateo = await apoderado("Jorge", c.alumnos.mateo.id); // segundo apoderado de Mateo
  });
  afterAll(async () => {
    await c?.limpiar();
    await db.profile.deleteMany({ where: { id: { in: perfiles } } });
  });

  const listaDelDia = (registros: { alumnoId: string; estado: "llego" | "falta" }[]) => ({ salonId: c.salon.id, ambito: "dia", registros });

  it("cerrar una lista que avisa a varias familias es un envío masivo, con autor y familias contadas por alumno", async () => {
    await guardarLista(c.ctxDe("tutora"), listaDelDia([{ alumnoId: c.alumnos.mateo.id, estado: "falta" }, { alumnoId: c.alumnos.valentina.id, estado: "falta" }]));
    const envios = await c.db.envioAviso.findMany();
    expect(envios).toHaveLength(1);
    // Mateo tiene 2 apoderados y Valentina 1: son 2 familias (3 correos).
    expect(envios[0]).toMatchObject({ titulo: "Lista del día · 3.° B", tipo: "asistencia", familias: 2, masivo: true, creadoPorId: c.miembros.tutora.membership.id });
    expect(await c.db.aviso.count({ where: { envioId: envios[0].id } })).toBe(3);

    const masivos = await panelAvisos(c.ctxDe("direccion"), { vista: "masivos" });
    expect(masivos.envios).toHaveLength(1);
    expect(masivos.envios[0]).toMatchObject({ titulo: "Lista del día · 3.° B", familias: 2, avisos: 3, enCola: 3, autor: "Lucia Prueba" });
    expect(masivos.hoy.generados).toBe(3);
    const individuales = await panelAvisos(c.ctxDe("direccion"), { vista: "individuales" });
    expect(individuales.avisos).toHaveLength(0);

    const detalle = await detalleEnvio(c.ctxDe("direccion"), envios[0].id);
    expect(detalle.avisos).toHaveLength(3);
    expect(detalle.totales).toMatchObject({ avisos: 3, enCola: 3 });
  });

  it("una lista que avisa a una sola familia queda como individual", async () => {
    await c.db.aviso.deleteMany({});
    await c.db.envioAviso.deleteMany({});
    await guardarLista(c.ctxDe("tutora"), listaDelDia([{ alumnoId: c.alumnos.mateo.id, estado: "llego" }, { alumnoId: c.alumnos.valentina.id, estado: "falta" }]));
    // Solo cambió Mateo (falta → llegó): un alumno, aunque le llegue a sus dos apoderados.
    const [envio] = await c.db.envioAviso.findMany();
    expect(envio).toMatchObject({ familias: 1, masivo: false });
    const individuales = await panelAvisos(c.ctxDe("direccion"), { vista: "individuales" });
    expect(individuales.avisos).toHaveLength(2);
    expect((await panelAvisos(c.ctxDe("direccion"), { vista: "masivos" })).envios).toHaveLength(0);
  });

  it("el escaneo de portería es individual (sin envío)", async () => {
    await c.db.asistencia.deleteMany({});
    await c.db.aviso.deleteMany({});
    await registrarLlegadaManual(c.ctxDe("porteria"), c.alumnos.valentina.id);
    const aviso = await c.db.aviso.findFirstOrThrow();
    expect(aviso.envioId).toBeNull();
    expect((await panelAvisos(c.ctxDe("direccion"), { vista: "individuales" })).avisos.map((a) => a.id)).toEqual([aviso.id]);
  });

  it("una reunión con los dos apoderados del mismo alumno es individual; con varias familias, masiva", async () => {
    await c.db.envioAviso.deleteMany({});
    const reunion = { id: randomUUID(), titulo: "Conversación sobre Mateo", inicio: new Date(), lugar: null, enlace: null };
    const madre = c.miembros.madre.membership.id;
    await avisarReunion(c.ctxDe("tutora"), "reunion_convocada", reunion, [
      { membershipId: madre, alumnoId: c.alumnos.mateo.id },
      { membershipId: padreMateo, alumnoId: c.alumnos.mateo.id },
    ]);
    const [individual] = await c.db.envioAviso.findMany();
    expect(individual).toMatchObject({ titulo: "Reunión: Conversación sobre Mateo (convocatoria)", familias: 1, masivo: false });

    const ana = (await c.db.apoderadoAlumno.findFirstOrThrow({ where: { alumnoId: c.alumnos.valentina.id, apoderado: { consentimientos: { some: { revocadoAt: null } } } } })).apoderadoId;
    await avisarReunion(c.ctxDe("tutora"), "reunion_convocada", { ...reunion, id: randomUUID(), titulo: "Reunión de aula" }, [
      { membershipId: madre, alumnoId: c.alumnos.mateo.id },
      { membershipId: ana, alumnoId: c.alumnos.valentina.id },
    ]);
    expect(await c.db.envioAviso.findFirstOrThrow({ where: { titulo: "Reunión: Reunión de aula (convocatoria)" } })).toMatchObject({ familias: 2, masivo: true });
  });

  it("una acción que no avisa a nadie no deja un envío vacío", async () => {
    await c.db.envioAviso.deleteMany({});
    await c.db.asistencia.deleteMany({});
    // Thiago no tiene familia con avisos.
    await guardarLista(c.ctxDe("otroProfesor"), { salonId: c.otroSalon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.thiago.id, estado: "falta" }] });
    expect(await c.db.envioAviso.count()).toBe(0);
  });
});
