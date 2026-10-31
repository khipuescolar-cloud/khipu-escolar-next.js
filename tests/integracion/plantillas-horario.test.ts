// Plantillas de horario (specs/34) y su efecto en la asistencia (specs/05). Requiere la BD local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaDb } from "@/lib/fechas";
import { controlDelColegio } from "@/lib/server/control-ingreso";
import { db } from "@/lib/server/db";
import { asignarBloque, periodosDeLaPlantilla } from "@/lib/server/horario";
import { eliminarPlantilla, guardarPlantilla, listarPlantillas } from "@/lib/server/plantillas-horario";
import { registrarLlegadaManual } from "@/lib/server/porteria";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
const secretaria = (): TenantContext => ({ ...c.ctxDe("direccion"), rol: "administrativo", roles: ["administrativo"] });
const a = (hora: string, dia = "2026-11-04") => new Date(`${dia}T${hora}:00-05:00`);

const manana = {
  nombre: "Primaria mañana",
  horaEntrada: "07:45",
  horaSalida: "13:15",
  duracionClase: 45,
  horaLimiteFalta: "08:30",
  recreos: [{ horaInicio: "10:00", horaFin: "10:30" }, { horaInicio: "12:00", horaFin: "12:15" }],
};

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-plantillas" });
}, 30_000);
afterAll(async () => {
  await c?.limpiar();
}, 30_000);

const plantillaDelSalon = async (salonId: string) => (await c.db.salon.findFirstOrThrow({ where: { id: salonId }, select: { plantillaId: true } })).plantillaId;

describe("plantillas de horario", () => {
  let id: string;

  it("secretaría crea una plantilla, Khipu calcula las horas y el salón marcado pasa a usarla", async () => {
    const r = await guardarPlantilla(secretaria(), null, { ...manana, salonIds: [c.salon.id] });
    expect(r).toMatchObject({ ok: true, mensaje: "Creamos la plantilla «Primaria mañana». 1 salón pasó a usarla." });
    id = r.id!;
    expect(await plantillaDelSalon(c.salon.id)).toBe(id);
    const periodos = await periodosDeLaPlantilla(c.ctxDe("direccion"), id);
    expect(periodos.map((p) => `${p.horaInicio} ${p.tipo}`)).toEqual([
      "07:45 clase", "08:30 clase", "09:15 clase", "10:00 recreo", "10:30 clase", "11:15 clase", "12:00 recreo", "12:15 clase",
    ]);
    const [vista] = await listarPlantillas(c.ctxDe("direccion"));
    expect(vista).toMatchObject({ nombre: "Primaria mañana", clases: 6, recreos: manana.recreos, salones: [{ id: c.salon.id, nombre: "3.° B" }] });
  });

  it("valida el nombre repetido y la hora de falta; profesor y familia no las tocan", async () => {
    expect(await guardarPlantilla(c.ctxDe("direccion"), null, manana)).toEqual({ ok: false, error: "Ya hay una plantilla con ese nombre." });
    expect(await guardarPlantilla(c.ctxDe("direccion"), null, { ...manana, nombre: "Otra", horaLimiteFalta: "07:00" })).toEqual({ ok: false, error: "La hora límite de falta debe ser después de la entrada." });
    await esperarProhibido(guardarPlantilla(c.ctxDe("tutora"), null, { ...manana, nombre: "Tarde" }));
    await esperarProhibido(listarPlantillas(c.ctxDe("madre")));
  });

  it("al editarla, las clases puestas siguen en su hora (la 1.ª en la 1.ª) y las que sobran se vacían", async () => {
    const [p1] = (await periodosDeLaPlantilla(c.ctxDe("direccion"), id)).filter((p) => p.tipo === "clase");
    const ultima = (await periodosDeLaPlantilla(c.ctxDe("direccion"), id)).filter((p) => p.tipo === "clase").at(-1)!;
    expect((await asignarBloque(c.ctxDe("direccion"), { salonId: c.salon.id, dia: 1, periodoId: p1.id, cursoId: c.cursoTutora.id })).ok).toBe(true);
    expect((await asignarBloque(c.ctxDe("direccion"), { salonId: c.salon.id, dia: 1, periodoId: ultima.id, titulo: "Taller" })).ok).toBe(true);
    // Entrada 08:00 y salida 13:00: entran 5 horas de clase en vez de 6.
    const r = await guardarPlantilla(c.ctxDe("direccion"), id, { ...manana, horaEntrada: "08:00", horaSalida: "13:00", horaLimiteFalta: "09:00" });
    expect(r).toMatchObject({ ok: true, mensaje: expect.stringContaining("Se vació 1 casillero") });
    const bloques = await c.db.bloqueHorario.findMany({ where: { salonId: c.salon.id }, select: { periodoId: true, periodo: { select: { horaInicio: true } } } });
    expect(bloques).toEqual([{ periodoId: p1.id, periodo: { horaInicio: "08:00" } }]);
  });

  it("al pasar un salón a otra plantilla, sus clases van a la misma hora de clase de la nueva", async () => {
    const tarde = await guardarPlantilla(c.ctxDe("direccion"), null, { ...manana, nombre: "Tarde", horaEntrada: "13:30", horaSalida: "18:00", horaLimiteFalta: "14:30", recreos: [{ horaInicio: "15:45", horaFin: "16:00" }], salonIds: [c.salon.id] });
    expect(tarde.ok).toBe(true);
    const b = await c.db.bloqueHorario.findFirstOrThrow({ where: { salonId: c.salon.id }, select: { periodo: { select: { horaInicio: true, plantillaId: true } } } });
    expect(b.periodo).toEqual({ horaInicio: "13:30", plantillaId: tarde.id });
    // La de la mañana ya no la usa nadie: se puede eliminar. La de la tarde, no.
    expect(await eliminarPlantilla(c.ctxDe("direccion"), tarde.id!)).toEqual({ ok: false, error: "Esta plantilla la usan salones. Primero pásalos a otra plantilla." });
    expect((await eliminarPlantilla(c.ctxDe("direccion"), id)).ok).toBe(true);
  });
});

describe("asistencia según la plantilla del salón", () => {
  it("portería marca tardanza desde la entrada de la plantilla; sin plantilla, desde la hora de Configuración", async () => {
    const temprano = await guardarPlantilla(c.ctxDe("direccion"), null, { ...manana, nombre: "Temprano", horaEntrada: "07:30", horaLimiteFalta: "08:15", salonIds: [c.salon.id] });
    expect(temprano.ok).toBe(true);
    await c.db.salon.update({ where: { id: c.otroSalon.id }, data: { plantillaId: null } });
    const t = await db.tenant.update({ where: { id: c.tenant.id }, data: { horaLimiteTardanza: "08:00", horaLimiteFalta: "09:00", controlIngresoAutomatico: true } });
    Object.assign(c.tenant, t);
    // 07:40: Valentina (3.° B, entrada 07:30) llega tarde; Thiago (5.° A, sin plantilla, 08:00) llega a tiempo.
    const valentina = await registrarLlegadaManual(c.ctxDe("porteria"), c.alumnos.valentina.id, a("07:40"));
    const thiago = await registrarLlegadaManual(c.ctxDe("porteria"), c.alumnos.thiago.id, a("07:40"));
    expect(valentina).toMatchObject({ ok: true, estado: "tarde" });
    expect(thiago).toMatchObject({ ok: true, estado: "llego" });
  });

  it("el control de ingreso corre con las horas de cada grupo de salones", async () => {
    // 07:50: pasó la entrada de 3.° B (07:30) pero no la del colegio (08:00): solo se avisa a la familia de Mateo.
    expect(await controlDelColegio(await db.tenant.findUniqueOrThrow({ where: { id: c.tenant.id } }), a("07:50"))).toEqual({ avisosNoLlega: 1, faltas: 0 });
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_no_llega" } });
    expect(aviso.payload).toMatchObject({ horaTardanza: "07:30", horaFalta: "08:15" });
    // 08:20: falta para Mateo (límite 08:15 de su plantilla); 5.° A aún no llega a su hora de falta.
    expect(await controlDelColegio(await db.tenant.findUniqueOrThrow({ where: { id: c.tenant.id } }), a("08:20"))).toEqual({ avisosNoLlega: 0, faltas: 1 });
    const falta = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id, fecha: fechaDb("2026-11-04"), ambito: "dia" } });
    expect(falta).toMatchObject({ estado: "falta", hora: "08:15", origen: "automatico" });
    expect(await c.db.controlIngresoDia.count()).toBe(2); // grupo «colegio» y grupo de la plantilla
  });
});
