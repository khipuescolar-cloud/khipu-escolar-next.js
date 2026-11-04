// Requiere la BD local. Calendario institucional (specs/12): clases proyectadas, reuniones (convocadas e invitado),
// filtros por tipo y salón, alcance por rol, aislamiento entre colegios, feriados y rango máximo.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { instanteEnZona } from "@/lib/dias-habiles";
import { itemsDeAgenda, type ItemAgenda, type OpcionesAgenda } from "@/lib/server/agenda";
import { db } from "@/lib/server/db";
import { asignarTareasSinDestinos } from "../../prisma/seed-tareas-destinos";
import { asignarBloque, crearPlantillaSugerida, periodosDeLaPlantilla } from "@/lib/server/horario";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let pro: ColegioPrueba;
let otro: ColegioPrueba;
let administrativo: TenantContext;
const perfiles: string[] = [];
const ids = { bloqueLunes: "", bloqueMartes: "", propia: "", invitada: "", ajena: "", cancelada: "", individualAjena: "", actividad: "", eventoOtroSalon: "", tarea: "" };

const lima = (fecha: string, hora: string) => instanteEnZona(fecha, hora, "America/Lima");
/** Semana sin feriados: lunes 1 a domingo 7 de marzo de 2027. */
const SEMANA = { desde: lima("2027-03-01", "00:00"), hasta: lima("2027-03-08", "00:00") };

async function semana(ctx: TenantContext, extra: Partial<OpcionesAgenda> = {}): Promise<ItemAgenda[]> {
  return itemsDeAgenda(ctx, { ...SEMANA, incluirClases: true, ...extra });
}
const idsDe = (items: ItemAgenda[]) => items.map((i) => i.id);

beforeAll(async () => {
  pro = await crearColegioPrueba({ plan: "pro", prefijo: "test-calendario" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-calendario-otro" });
  const dir = pro.ctxDe("direccion");
  // Horario: Matemática (la tutora) el lunes y el martes en la primera hora de clase.
  expect((await crearPlantillaSugerida(dir, pro.salon.id)).ok).toBe(true);
  const { plantillaId } = await pro.db.salon.findFirstOrThrow({ where: { id: pro.salon.id }, select: { plantillaId: true } });
  const [p1] = (await periodosDeLaPlantilla(dir, plantillaId)).filter((p) => p.tipo === "clase");
  for (const dia of [1, 2]) expect((await asignarBloque(dir, { salonId: pro.salon.id, dia, periodoId: p1.id, cursoId: pro.cursoTutora.id })).ok).toBe(true);
  const bloques = await pro.db.bloqueHorario.findMany({ where: { salonId: pro.salon.id }, select: { id: true, dia: true } });
  ids.bloqueLunes = bloques.find((b) => b.dia === 1)!.id;
  ids.bloqueMartes = bloques.find((b) => b.dia === 2)!.id;

  const t = pro.tenant.id;
  const m = pro.miembros;
  const reunion = (convocadaPorId: string, extra: Record<string, unknown>) =>
    db.reunion.create({ data: { tenantId: t, titulo: "Reunión", alcance: "salon", salonId: pro.salon.id, convocadaPorId, inicio: lima("2027-03-03", "18:00"), ...extra } });
  ids.propia = (await reunion(m.tutora.membership.id, { titulo: "Reunión de padres 3.° B" })).id;
  ids.invitada = (await reunion(m.otroProfesor.membership.id, { titulo: "Coordinación con la tutora", alcance: "individual", salonId: pro.otroSalon.id, inicio: lima("2027-03-04", "17:00") })).id;
  await db.reunionInvitado.create({ data: { tenantId: t, reunionId: ids.invitada, membershipId: m.tutora.membership.id } });
  ids.ajena = (await reunion(m.direccion.membership.id, { titulo: "Asamblea de dirección", alcance: "colegio", salonId: null })).id;
  ids.cancelada = (await reunion(m.tutora.membership.id, { titulo: "Cancelada", estado: "cancelada" })).id;
  ids.individualAjena = (await reunion(m.otroProfesor.membership.id, { titulo: "Caso reservado de Thiago", alcance: "individual", salonId: pro.otroSalon.id, descripcion: "Detalle privado" })).id;

  ids.actividad = (await db.eventoAgenda.create({ data: { tenantId: t, titulo: "Feria de ciencias", tipo: "actividad", inicio: lima("2027-03-05", "10:00"), creadoPorId: m.direccion.membership.id } })).id;
  ids.eventoOtroSalon = (await db.eventoAgenda.create({ data: { tenantId: t, salonId: pro.otroSalon.id, titulo: "Paseo 5.° A", inicio: lima("2027-03-05", "09:00"), creadoPorId: m.otroProfesor.membership.id } })).id;
  ids.tarea = (await db.tarea.create({ data: { tenantId: t, cursoId: pro.cursoTutora.id, titulo: "Fracciones", fechaEntrega: lima("2027-03-02", "23:59"), creadoPorId: m.tutora.membership.id } })).id;
  // Tareas con destinatarios (specs/39): la sección «Todos» y sus asignaciones, como en el seed.
  await asignarTareasSinDestinos(db, t);
  // Feriado del colegio el lunes 8 de marzo.
  await db.eventoAgenda.create({ data: { tenantId: t, titulo: "Aniversario", tipo: "feriado", inicio: lima("2027-03-08", "00:00"), creadoPorId: m.direccion.membership.id } });

  const id = crypto.randomUUID();
  perfiles.push(id);
  const user = await db.profile.create({ data: { id, email: `adm-${id.slice(0, 8)}@test-basico.local`, nombres: "Sara" } });
  const membership = await db.membership.create({ data: { tenantId: t, userId: id, rol: "administrativo" } });
  administrativo = { ...dir, user, membership, rol: "administrativo", roles: ["administrativo"] };
}, 60_000);

afterAll(async () => {
  await pro?.limpiar();
  await otro?.limpiar();
  await db.profile.deleteMany({ where: { id: { in: perfiles } } });
}, 30_000);

describe("calendario del profesor", () => {
  it("ve sus clases proyectadas y sus reuniones (convocadas e invitado) juntas en la semana", async () => {
    const items = await semana(pro.ctxDe("tutora"));
    const clases = items.filter((i) => i.tipo === "clase");
    expect(clases.map((c) => c.id)).toEqual([`${ids.bloqueLunes}:2027-03-01`, `${ids.bloqueMartes}:2027-03-02`]);
    expect(clases[0]).toMatchObject({ titulo: "Matemática", categoria: "clase", salonId: pro.salon.id });
    const reuniones = items.filter((i) => i.tipo === "reunion");
    expect(reuniones.map((r) => r.id).sort()).toEqual([ids.propia, ids.invitada].sort());
    expect(reuniones.every((r) => r.categoria === "mi-reunion")).toBe(true);
    // Invitada: sin enlace al detalle (el detalle de reuniones solo lo ve quien convoca o dirección).
    expect(reuniones.find((r) => r.id === ids.invitada)?.href).toBeUndefined();
    expect(reuniones.find((r) => r.id === ids.propia)?.href).toBe(`/reuniones/${ids.propia}`);
    expect(idsDe(items)).not.toContain(ids.ajena);
    expect(idsDe(items)).not.toContain(ids.cancelada);
    expect(idsDe(items)).not.toContain(ids.eventoOtroSalon);
    expect(idsDe(items)).toEqual(expect.arrayContaining([ids.actividad, ids.tarea]));
  });

  it("sin incluirClases no proyecta clases (forma del .ics y de «Mi horario»)", async () => {
    expect((await itemsDeAgenda(pro.ctxDe("tutora"), SEMANA.desde, SEMANA.hasta)).some((i) => i.tipo === "clase")).toBe(false);
  });

  it("filtra por tipo y por salón", async () => {
    const tutora = pro.ctxDe("tutora");
    expect(idsDe(await semana(tutora, { filtros: { filtro: "mis-reuniones" } })).sort()).toEqual([ids.propia, ids.invitada].sort());
    expect(idsDe(await semana(tutora, { filtros: { filtro: "academico" } }))).toEqual([ids.tarea]);
    expect(idsDe(await semana(tutora, { filtros: { filtro: "institucional" } }))).toEqual([ids.actividad]);
    // «Personal» es solo para dirección y administrativo.
    expect(await semana(tutora, { filtros: { filtro: "personal" } })).toEqual([]);
    const delSalon = await semana(tutora, { filtros: { salonId: pro.salon.id } });
    expect(delSalon.every((i) => i.salonId === pro.salon.id)).toBe(true);
    expect(idsDe(delSalon)).toEqual(expect.arrayContaining([ids.propia, ids.tarea, `${ids.bloqueLunes}:2027-03-01`]));
    expect(idsDe(delSalon)).not.toContain(ids.actividad);
    // Un salón que no es suyo: nada.
    expect(await semana(tutora, { filtros: { salonId: pro.otroSalon.id } })).toEqual([]);
  });

  it("no tiene clases en feriados del colegio ni nacionales", async () => {
    const conFeriado = await itemsDeAgenda(pro.ctxDe("tutora"), { desde: lima("2027-03-08", "00:00"), hasta: lima("2027-03-10", "00:00"), incluirClases: true });
    expect(conFeriado.filter((i) => i.tipo === "clase").map((i) => i.id)).toEqual([`${ids.bloqueMartes}:2027-03-09`]);
    // 8 de diciembre de 2026 (martes): Inmaculada Concepción.
    const diciembre = await itemsDeAgenda(pro.ctxDe("tutora"), { desde: lima("2026-12-07", "00:00"), hasta: lima("2026-12-09", "00:00"), incluirClases: true });
    expect(diciembre.filter((i) => i.tipo === "clase").map((i) => i.id)).toEqual([`${ids.bloqueLunes}:2026-12-07`]);
  });

  it("rechaza rangos de más de 42 días cuando proyecta clases", async () => {
    await expect(itemsDeAgenda(pro.ctxDe("tutora"), { desde: lima("2027-03-01", "00:00"), hasta: lima("2027-04-20", "00:00"), incluirClases: true })).rejects.toThrow(/42 días/);
  });
});

describe("dirección y administrativo", () => {
  it("dirección ve todas las reuniones en «Personal»", async () => {
    const r = await semana(pro.ctxDe("direccion"), { filtros: { filtro: "personal" } });
    expect(idsDe(r)).toEqual(expect.arrayContaining([ids.propia, ids.invitada, ids.ajena, ids.individualAjena]));
    expect(r.find((i) => i.id === ids.individualAjena)?.titulo).toBe("Caso reservado de Thiago");
  });

  it("el administrativo ve las del personal sin el detalle de las individuales ajenas", async () => {
    const r = await semana(administrativo, { filtros: { filtro: "personal" } });
    const reservada = r.find((i) => i.id === ids.individualAjena);
    expect(reservada).toMatchObject({ titulo: "Reunión individual", descripcion: null, categoria: "personal" });
    expect(reservada?.href).toBeUndefined();
    // En «Todo» solo las suyas (ninguna aquí).
    expect((await semana(administrativo)).some((i) => i.tipo === "reunion")).toBe(false);
  });
});

describe("familia y aislamiento", () => {
  it("la familia solo ve lo del salón de su hijo y del colegio, sin clases", async () => {
    const r = await semana(pro.ctxDe("madre"));
    expect(idsDe(r).sort()).toEqual([ids.actividad, ids.tarea].sort());
  });

  it("otro colegio no ve nada de este", async () => {
    const r = await semana(otro.ctxDe("direccion"), { filtros: { filtro: "personal" } });
    const todo = [...r, ...(await semana(otro.ctxDe("tutora")))];
    expect(idsDe(todo).filter((i) => Object.values(ids).some((x) => i.startsWith(x)))).toEqual([]);
  });
});
