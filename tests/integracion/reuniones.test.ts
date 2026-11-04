// Requiere la BD local. Crea sus propios colegios de prueba (Pro y Base) y los borra al terminar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { itemsDeAgenda } from "@/lib/server/agenda";
import {
  cancelarReunion, convocarReunion, detalleReunion, guardarActa, listarReuniones, marcarAsistencia, recordarPendientes, responderInvitacion,
} from "@/lib/server/reuniones";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let pro: ColegioPrueba;
let otro: ColegioPrueba;
let base: ColegioPrueba;
let thiagoMadreId: string;

const manana = () => sumarDias(fechaLima(new Date()), 1);
// Cada convocatoria en su propia franja de 15 min desde las 17:00 (fuera del horario laboral): las reservas de agenda
// del personal no se pueden cruzar (specs/40).
let franja = 0;
const siguienteHora = () => {
  const m = 17 * 60 + 15 * franja++;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const datos = (extra: Record<string, unknown> = {}) => ({
  titulo: "Reunión de prueba", fecha: manana(), hora: siguienteHora(), duracion: 15, lugar: "Aula 3.° B", alcance: "salon", fueraDeHorario: true, ...extra,
});

beforeAll(async () => {
  pro = await crearColegioPrueba({ plan: "pro", prefijo: "test-reuniones" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-reuniones-otro" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-reuniones-base" });
  // Familia de Thiago (5.° A, el salón del otro profesor), con consentimiento.
  const { db } = await import("@/lib/server/db");
  const id = crypto.randomUUID();
  await db.profile.create({ data: { id, email: `madre-thiago-${id.slice(0, 8)}@test-basico.local`, nombres: "Ana" } });
  const m = await db.membership.create({ data: { tenantId: pro.tenant.id, userId: id, rol: "apoderado" } });
  thiagoMadreId = m.id;
  const c = await db.consentimiento.create({ data: { tenantId: pro.tenant.id, apoderadoId: m.id, versionTexto: "test" } });
  await db.apoderadoAlumno.create({ data: { tenantId: pro.tenant.id, apoderadoId: m.id, alumnoId: pro.alumnos.thiago.id, consentimientoId: c.id } });
  // El perfil no cuelga del colegio: se borra aparte al terminar.
  extraPerfiles.push(id);
}, 30_000);

const extraPerfiles: string[] = [];

afterAll(async () => {
  await pro?.limpiar();
  await otro?.limpiar();
  await base?.limpiar();
  const { db } = await import("@/lib/server/db");
  await db.profile.deleteMany({ where: { id: { in: extraPerfiles } } });
}, 30_000);

describe("convocar reuniones", () => {
  it("la tutora convoca a su salón: crea una fila por apoderado y alumno y encola avisos solo con consentimiento", async () => {
    const r = await convocarReunion(pro.ctxDe("tutora"), datos({ salonId: pro.salon.id }));
    expect(r.ok).toBe(true);
    const id = (r as { id: string }).id;
    const filas = await pro.db.reunionInvitado.findMany({ where: { reunionId: id } });
    // Rosa (Mateo) y Martín (Valentina): ambos invitados en la app.
    expect(filas.map((f) => f.membershipId).sort()).toEqual([pro.miembros.madre.membership.id, pro.miembros.padreSinConsentimiento.membership.id].sort());
    // Avisos: solo Rosa (Martín revocó su consentimiento).
    const avisos = await pro.db.aviso.findMany({ where: { referenciaId: id } });
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos.every((a) => a.tipo === "reunion" && a.plantilla === "reunion_convocada")).toBe(true);
    expect(avisos.map((a) => a.apoderadoId)).toEqual([pro.miembros.madre.membership.id]);
    const auditoria = await (await import("@/lib/server/db")).db.auditoria.count({ where: { tenantId: pro.tenant.id, entidad: "reunion", entidadId: id, accion: "crear" } });
    expect(auditoria).toBe(1);
  });

  it("el profesor no convoca fuera de sus salones, a todo el colegio ni a familias de otros alumnos", async () => {
    const tutora = pro.ctxDe("tutora");
    expect((await convocarReunion(tutora, datos({ salonId: pro.otroSalon.id }))).ok).toBe(false);
    expect((await convocarReunion(tutora, datos({ alcance: "colegio" }))).ok).toBe(false);
    expect((await convocarReunion(tutora, datos({ alcance: "individual", alumnoId: pro.alumnos.thiago.id }))).ok).toBe(false);
    expect((await convocarReunion(tutora, datos({ alcance: "individual", alumnoId: pro.alumnos.mateo.id }))).ok).toBe(true);
  });

  it("dirección convoca a todo el colegio: una fila por apoderado activo, sin alumno", async () => {
    const r = await convocarReunion(pro.ctxDe("direccion"), datos({ titulo: "Asamblea", alcance: "colegio" }));
    expect(r.ok).toBe(true);
    const filas = await pro.db.reunionInvitado.findMany({ where: { reunionId: (r as { id: string }).id } });
    expect(filas.every((f) => f.alumnoId === null)).toBe(true);
    expect(new Set(filas.map((f) => f.membershipId))).toEqual(
      new Set([pro.miembros.madre.membership.id, pro.miembros.padreSinConsentimiento.membership.id, thiagoMadreId]),
    );
  });

  it("valida fecha futura, lugar o enlace y que haya familias", async () => {
    const dir = pro.ctxDe("direccion");
    expect((await convocarReunion(dir, datos({ salonId: pro.salon.id, fecha: "2020-01-01" }))).ok).toBe(false);
    expect((await convocarReunion(dir, datos({ salonId: pro.salon.id, lugar: "" }))).ok).toBe(false);
    expect((await convocarReunion(dir, datos({ salonId: pro.salon.id, hora: "18:00", horaFin: "17:00" }))).ok).toBe(false);
    const vacio = await convocarReunion(otro.ctxDe("direccion"), datos({ salonId: otro.salon.id }));
    expect(vacio.ok).toBe(true); // el salón de `otro` sí tiene a Rosa
    // Un salón sin apoderados no se puede convocar.
    const sin = await otro.db.salon.create({ data: { tenantId: otro.tenant.id, nombre: "Vacío", nivel: "primaria", anio: 2026 } });
    expect((await convocarReunion(otro.ctxDe("direccion"), datos({ salonId: sin.id }))).ok).toBe(false);
  });

  it("apoderados y portería no convocan (403)", async () => {
    await esperarProhibido(convocarReunion(pro.ctxDe("madre"), datos({ salonId: pro.salon.id })));
    await esperarProhibido(convocarReunion(pro.ctxDe("porteria"), datos({ salonId: pro.salon.id })));
  });

  it("el plan Base recibe 403", async () => {
    await esperarProhibido(convocarReunion(base.ctxDe("direccion"), datos({ salonId: base.salon.id })));
    await esperarProhibido(listarReuniones(base.ctxDe("madre")));
  });
});

describe("responder y ver", () => {
  let reunionId: string;
  beforeAll(async () => {
    const r = await convocarReunion(pro.ctxDe("tutora"), datos({ titulo: "Para responder", salonId: pro.salon.id }));
    reunionId = (r as { id: string }).id;
  });

  it("la familia responde y cambia su respuesta hasta que empiece", async () => {
    const madre = pro.ctxDe("madre");
    expect((await responderInvitacion(madre, reunionId, { respuesta: "asistire" })).ok).toBe(true);
    expect((await responderInvitacion(madre, reunionId, { respuesta: "no_asistire", comentario: "Viajo" })).ok).toBe(true);
    const fila = await pro.db.reunionInvitado.findFirstOrThrow({ where: { reunionId, membershipId: madre.membership.id } });
    expect(fila.respuesta).toBe("no_asistire");
    expect(fila.comentario).toBe("Viajo");
    expect(fila.respondidaAt).not.toBeNull();
    const tarde = new Date(Date.now() + 3 * 86_400_000);
    const r = await responderInvitacion(madre, reunionId, { respuesta: "asistire" }, tarde);
    expect(r.ok).toBe(false);
  });

  it("solo responde quien fue invitado y solo por sí mismo", async () => {
    await esperarProhibido(responderInvitacion(pro.ctxDe("madre"), "00000000-0000-4000-8000-000000000000", { respuesta: "asistire" }));
    // Una familia no invitada (Thiago) no puede responder a esta reunión.
    const { db } = await import("@/lib/server/db");
    const m = await db.membership.findUniqueOrThrow({ where: { id: thiagoMadreId } });
    const user = await db.profile.findUniqueOrThrow({ where: { id: m.userId } });
    const ctxNoInvitada = { ...pro.ctxDe("madre"), user, membership: m };
    await esperarProhibido(responderInvitacion(ctxNoInvitada, reunionId, { respuesta: "asistire" }));
    // Responder no toca la fila de otra familia.
    const otraFila = await pro.db.reunionInvitado.findFirstOrThrow({ where: { reunionId, membershipId: pro.miembros.padreSinConsentimiento.membership.id } });
    expect(otraFila.respuesta).toBe("pendiente");
  });

  it("las familias ven solo reuniones donde están invitadas; otro colegio no ve nada", async () => {
    const { db } = await import("@/lib/server/db");
    const m = await db.membership.findUniqueOrThrow({ where: { id: thiagoMadreId } });
    const user = await db.profile.findUniqueOrThrow({ where: { id: m.userId } });
    const ctxThiago = { ...pro.ctxDe("madre"), user, membership: m };
    const suyas = (await listarReuniones(ctxThiago)).map((r) => r.titulo);
    expect(suyas).toEqual(["Asamblea"]); // solo la de todo el colegio
    expect(await detalleReunion(ctxThiago, reunionId)).toBeNull();
    expect(await detalleReunion(otro.ctxDe("direccion"), reunionId)).toBeNull();
    expect((await listarReuniones(otro.ctxDe("direccion"))).map((r) => r.id)).not.toContain(reunionId);
    expect(await detalleReunion(pro.ctxDe("otroProfesor"), reunionId)).toBeNull(); // otro profesor no la ve
    const dirVe = await detalleReunion(pro.ctxDe("direccion"), reunionId);
    expect(dirVe?.personas?.length).toBe(2);
    const madreVe = await detalleReunion(pro.ctxDe("madre"), reunionId);
    expect(madreVe?.personas).toBeNull();
    expect(madreVe?.mia?.alumnos).toEqual(["Mateo"]);
  });

  it("aparece en la agenda de la familia y de la tutora, y no tras cancelarse", async () => {
    const desde = new Date();
    const hasta = new Date(Date.now() + 10 * 86_400_000);
    const delaMadre = await itemsDeAgenda(pro.ctxDe("madre"), desde, hasta);
    expect(delaMadre.find((i) => i.id === reunionId)).toMatchObject({ tipo: "reunion", href: `/reuniones/${reunionId}` });
    const delaOtra = await itemsDeAgenda(pro.ctxDe("otroProfesor"), desde, hasta);
    expect(delaOtra.find((i) => i.id === reunionId)).toBeUndefined();
  });
});

describe("recordatorio, asistencia, acta y cancelación", () => {
  it("recordatorio solo a pendientes, no repite en seguida y solo lo envía quien convocó", async () => {
    const r = await convocarReunion(pro.ctxDe("tutora"), datos({ titulo: "Recordatorio", salonId: pro.salon.id }));
    const id = (r as { id: string }).id;
    // Rosa no responde: recibe el recordatorio. Martín también está pendiente pero revocó su consentimiento.
    expect((await recordarPendientes(pro.ctxDe("tutora"), id)).ok).toBe(true);
    const avisos = await pro.db.aviso.findMany({ where: { referenciaId: id, plantilla: "reunion_recordatorio" } });
    expect(avisos.map((a) => a.apoderadoId)).toEqual([pro.miembros.madre.membership.id]);
    expect((await recordarPendientes(pro.ctxDe("tutora"), id)).ok).toBe(false);
    await esperarProhibido(recordarPendientes(pro.ctxDe("otroProfesor"), id));
    await esperarProhibido(recordarPendientes(pro.ctxDe("madre"), id));
  });

  it("asistencia y acta: solo desde que empieza; el acta llega a las familias solo si se publica", async () => {
    const r = await convocarReunion(pro.ctxDe("tutora"), datos({ titulo: "Con acta", salonId: pro.salon.id }));
    const id = (r as { id: string }).id;
    const tutora = pro.ctxDe("tutora");
    expect((await marcarAsistencia(tutora, id, [])).ok).toBe(false);
    expect((await guardarActa(tutora, id, { acta: "Acuerdos de la reunión: uno, dos.", publicar: false })).ok).toBe(false);

    const despues = new Date(Date.now() + 3 * 86_400_000);
    const madre = pro.miembros.madre.membership.id;
    expect((await marcarAsistencia(tutora, id, [madre], despues)).ok).toBe(true);
    const filas = await pro.db.reunionInvitado.findMany({ where: { reunionId: id } });
    expect(filas.find((f) => f.membershipId === madre)?.asistio).toBe(true);
    expect(filas.filter((f) => f.membershipId !== madre).every((f) => f.asistio === false)).toBe(true);

    expect((await guardarActa(tutora, id, { acta: "Acuerdos de la reunión: uno, dos.", publicar: false }, despues)).ok).toBe(true);
    expect((await detalleReunion(pro.ctxDe("madre"), id))?.acta).toBeNull(); // borrador: la familia no lo ve
    expect((await detalleReunion(tutora, id))?.acta).toContain("Acuerdos");

    expect((await guardarActa(tutora, id, { acta: "Acuerdos de la reunión: uno, dos.", publicar: true }, despues)).ok).toBe(true);
    const vista = await detalleReunion(pro.ctxDe("madre"), id);
    expect(vista?.acta).toContain("Acuerdos");
    expect(vista?.estado).toBe("realizada");
    expect(await pro.db.aviso.count({ where: { referenciaId: id, plantilla: "reunion_acta" } })).toBeGreaterThan(0);

    // Otro profesor y las familias no gestionan.
    await esperarProhibido(guardarActa(pro.ctxDe("otroProfesor"), id, { acta: "Intento ajeno de acta.", publicar: true }, despues));
    await esperarProhibido(marcarAsistencia(pro.ctxDe("madre"), id, [madre], despues));
  });

  it("cancelar avisa a los invitados, bloquea respuestas y se audita; dirección también puede", async () => {
    const r = await convocarReunion(pro.ctxDe("tutora"), datos({ titulo: "Se cancela", salonId: pro.salon.id }));
    const id = (r as { id: string }).id;
    const motivo = { motivo: "Cambio de planes" };
    await esperarProhibido(cancelarReunion(pro.ctxDe("otroProfesor"), id, motivo));
    expect((await cancelarReunion(pro.ctxDe("direccion"), id, {})).ok).toBe(false); // sin motivo
    expect((await cancelarReunion(pro.ctxDe("direccion"), id, motivo)).ok).toBe(true);
    expect((await cancelarReunion(pro.ctxDe("direccion"), id, motivo)).ok).toBe(false);
    expect(await pro.db.aviso.count({ where: { referenciaId: id, plantilla: "reunion_cancelada" } })).toBeGreaterThan(0);
    expect((await responderInvitacion(pro.ctxDe("madre"), id, { respuesta: "asistire" })).ok).toBe(false);
    const { db } = await import("@/lib/server/db");
    expect(await db.auditoria.count({ where: { tenantId: pro.tenant.id, entidad: "reunion", entidadId: id, accion: "borrar" } })).toBe(1);
    const items = await itemsDeAgenda(pro.ctxDe("madre"), new Date(), new Date(Date.now() + 10 * 86_400_000));
    expect(items.find((i) => i.id === id)).toBeUndefined();
  });
});
