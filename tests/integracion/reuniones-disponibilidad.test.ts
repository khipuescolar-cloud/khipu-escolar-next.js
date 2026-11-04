// Disponibilidad del personal y confirmación transaccional de reuniones (specs/40). Requiere la BD local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { esDiaHabil } from "@/lib/dias-habiles";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { diaDeSemana } from "@/lib/horario";
import { consultarDisponibilidad, type Disponibilidad } from "@/lib/server/disponibilidad";
import { notificarReunion } from "@/lib/server/notificaciones/avisos-reuniones";
import {
  MENSAJE_FRANJA_OCUPADA, agregarAcuerdo, acuerdosPendientes, cancelarReunion, convocarReunion, crearBloqueo, detalleReunion, franjasParaSolicitud,
  guardarHorarioAtencion, listarReuniones, marcarAcuerdo, ocupacionPropia, reprogramarReunion, reunionesParaCalendario, responderInvitacion, solicitarReunion,
} from "@/lib/server/reuniones";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let pro: ColegioPrueba;
let otro: ColegioPrueba;
let eva: { membershipId: string; perfil: string };
/** Un martes lectivo dentro de 1–3 semanas. */
let MARTES: string;

const lucia = () => pro.ctxDe("tutora");
const luis = () => pro.ctxDe("otroProfesor"); // «Luis» en los casos: el otro profesor del colegio de prueba
const dir = () => pro.ctxDe("direccion");

function martesLectivo(): string {
  let f = sumarDias(fechaLima(new Date()), 7);
  while (diaDeSemana(f) !== 2 || !esDiaHabil(f)) f = sumarDias(f, 1);
  return f;
}

const base = (extra: Record<string, unknown> = {}) => ({
  titulo: "Coordinación", fecha: MARTES, duracion: 30, lugar: "Sala de profesores", alcance: "ninguno", ...extra,
});

beforeAll(async () => {
  MARTES = martesLectivo();
  pro = await crearColegioPrueba({ plan: "pro", prefijo: "test-disponibilidad" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-disponibilidad-otro" });
  const { db } = await import("@/lib/server/db");
  // Lucía (tutora) tiene clase los martes de 10:00 a 11:00 (Matemática en 3.° B).
  const plantilla = await db.plantillaHorario.create({
    data: { tenantId: pro.tenant.id, nombre: "Primaria", horaEntrada: "08:00", horaSalida: "13:00", duracionClase: 60, horaLimiteFalta: "09:00" },
  });
  const periodo = await db.horarioPeriodo.create({ data: { tenantId: pro.tenant.id, plantillaId: plantilla.id, nombre: "3.ª hora", horaInicio: "10:00", horaFin: "11:00" } });
  await db.salon.update({ where: { id: pro.salon.id }, data: { plantillaId: plantilla.id } });
  await db.bloqueHorario.create({ data: { tenantId: pro.tenant.id, salonId: pro.salon.id, dia: 2, periodoId: periodo.id, cursoId: pro.cursoTutora.id } });
  // Eva: tercera docente, con un bloqueo privado de 08:00 a 09:00.
  const id = crypto.randomUUID();
  await db.profile.create({ data: { id, email: `eva-${id.slice(0, 8)}@test-basico.local`, nombres: "Eva", apellidos: "Prueba" } });
  const m = await db.membership.create({ data: { tenantId: pro.tenant.id, userId: id, rol: "profesor" } });
  eva = { membershipId: m.id, perfil: id };
}, 30_000);

afterAll(async () => {
  await pro?.limpiar();
  await otro?.limpiar();
  const { db } = await import("@/lib/server/db");
  if (eva) await db.profile.deleteMany({ where: { id: eva.perfil } });
}, 30_000);

const ctxEva = async () => {
  const { db } = await import("@/lib/server/db");
  const membership = await db.membership.findUniqueOrThrow({ where: { id: eva.membershipId } });
  const user = await db.profile.findUniqueOrThrow({ where: { id: eva.perfil } });
  return { ...lucia(), user, membership, rol: membership.rol, roles: [membership.rol] };
};

describe("disponibilidad y confirmación", () => {
  let reunionLuis: string;

  it("una reunión de Luis de 11:00 a 11:30 reserva su agenda; tocarse en el borde no es cruce", async () => {
    const r = await convocarReunion(dir(), base({ titulo: "Plan lector (privado)", motivo: "Tema delicado", tipo: "direccion", hora: "11:00", requeridos: [pro.miembros.otroProfesor.membership.id] }));
    expect(r.ok).toBe(true);
    reunionLuis = (r as { id: string }).id;
    const reservas = await pro.db.reservaAgenda.findMany({ where: { reunionId: reunionLuis, activa: true } });
    expect(reservas.map((x) => x.membershipId).sort()).toEqual([pro.miembros.direccion.membership.id, pro.miembros.otroProfesor.membership.id].sort());
    // Eva bloquea su agenda (motivo privado).
    expect((await crearBloqueo(await ctxEva(), { fecha: MARTES, horaDesde: "08:00", horaHasta: "09:00", motivo: "Cita médica" })).ok).toBe(true);
  });

  it("la clase de Ana/Lucía (10:00–11:00) y la reunión de Luis bloquean; coincidencias de 3 docentes para 45 min", async () => {
    const d = (await consultarDisponibilidad(dir(), {
      requeridos: [pro.miembros.tutora.membership.id, pro.miembros.otroProfesor.membership.id, eva.membershipId], fecha: MARTES, hora: "10:00", duracion: 45, dias: 1,
    })) as Disponibilidad;
    expect(d.preferida.libre).toBe(false);
    expect(d.preferida.conflictos.map((c) => c.etiqueta)).toContain("Clase"); // dirección ve «Clase»
    const libres = d.alternativas.map((a) => [a.hora, a.horaFin]);
    expect(libres.length).toBeGreaterThanOrEqual(3);
    for (const [h, f] of libres) {
      expect(h >= "07:30" && f <= "16:30").toBe(true);
      expect(f <= "08:00" || h >= "09:00").toBe(true); // bloqueo de Eva
      expect(f <= "10:00" || h >= "11:30").toBe(true); // clase de Lucía + reunión de Luis
    }
    expect(libres).toContainEqual(["09:00", "09:45"]);
    expect(libres).toContainEqual(["11:30", "12:15"]);
    const filaLucia = d.personas.find((p) => p.membershipId === pro.miembros.tutora.membership.id)!;
    const i10 = d.celdas.findIndex((c) => c.hora === "10:00");
    expect(filaLucia.celdas[i10]).toEqual({ estado: "ocupado", etiqueta: "Clase" });
    expect(filaLucia.celdas[d.celdas.findIndex((c) => c.hora === "17:00")].estado).toBe("fuera_de_horario");
  });

  it("privacidad: otro profesor ve solo «Ocupado», nunca el título ni el motivo de reuniones o bloqueos ajenos", async () => {
    const d = (await consultarDisponibilidad(lucia(), {
      requeridos: [pro.miembros.otroProfesor.membership.id, eva.membershipId], fecha: MARTES, hora: "11:00", duracion: 30, dias: 1,
    })) as Disponibilidad;
    const texto = JSON.stringify(d);
    expect(texto).not.toContain("Plan lector");
    expect(texto).not.toContain("Tema delicado");
    expect(texto).not.toContain("Cita médica");
    const filaLuis = d.personas.find((p) => p.membershipId === pro.miembros.otroProfesor.membership.id)!;
    expect(filaLuis.celdas[d.celdas.findIndex((c) => c.hora === "11:00")]).toEqual({ estado: "ocupado", etiqueta: "Ocupado" });
    // La propia clase sí se ve con detalle.
    const propia = d.personas.find((p) => p.propia)!;
    expect(propia.celdas[d.celdas.findIndex((c) => c.hora === "10:00")].etiqueta).toContain("Matemática");
    // Y Luis, invitado, sí ve el título de su reunión.
    expect((await detalleReunion(luis(), reunionLuis))?.titulo).toBe("Plan lector (privado)");
    expect(await detalleReunion(lucia(), reunionLuis)).toBeNull();
  });

  it("las familias no consultan la ocupación del personal y otro colegio no ve a nadie", async () => {
    await esperarProhibido(consultarDisponibilidad(pro.ctxDe("madre"), { requeridos: [], fecha: MARTES, hora: "10:00", duracion: 30 }));
    const ajeno = (await consultarDisponibilidad(otro.ctxDe("direccion"), {
      requeridos: [pro.miembros.tutora.membership.id], fecha: MARTES, hora: "10:00", duracion: 30, dias: 1,
    })) as Disponibilidad;
    expect(ajeno.personas.map((p) => p.membershipId)).toEqual([otro.miembros.direccion.membership.id]);
    expect(await detalleReunion(otro.ctxDe("direccion"), reunionLuis)).toBeNull();
    expect((await listarReuniones(otro.ctxDe("direccion"))).map((r) => r.id)).not.toContain(reunionLuis);
    // Tampoco convoca con personal de otro colegio.
    expect((await convocarReunion(otro.ctxDe("direccion"), base({ tipo: "direccion", hora: "12:00", requeridos: [pro.miembros.tutora.membership.id] }))).ok).toBe(false);
  });

  it("el backend revalida: una franja ocupada devuelve el aviso y alternativas nuevas", async () => {
    const r = await convocarReunion(lucia(), base({ tipo: "coordinacion", hora: "11:00", requeridos: [pro.miembros.otroProfesor.membership.id] }));
    expect(r).toMatchObject({ ok: false, error: MENSAJE_FRANJA_OCUPADA });
    expect((r as { alternativas: unknown[] }).alternativas.length).toBeGreaterThan(0);
  });

  it("una clase solo se puede forzar desde dirección, con motivo", async () => {
    const conLucia = base({ tipo: "direccion", hora: "10:00", requeridos: [pro.miembros.tutora.membership.id] });
    const sin = await convocarReunion(dir(), conLucia);
    expect(sin.ok).toBe(false);
    expect((sin as { error: string }).error).toMatch(/tiene clase/);
    expect((await convocarReunion(dir(), { ...conLucia, forzarClase: true })).ok).toBe(false); // falta el motivo
    const forzada = await convocarReunion(dir(), { ...conLucia, forzarClase: true, motivoForzar: "Visita de UGEL" });
    expect(forzada.ok).toBe(true);
    const cambio = await pro.db.reunionCambio.findFirstOrThrow({ where: { reunionId: (forzada as { id: string }).id, tipo: "creada" } });
    expect(cambio.motivo).toBe("Visita de UGEL");
    // Un profesor no fuerza: su clase la ve como ocupación.
    expect((await convocarReunion(luis(), base({ tipo: "coordinacion", hora: "10:00", requeridos: [pro.miembros.tutora.membership.id], forzarClase: true, motivoForzar: "x" }))).ok).toBe(false);
  });

  it("fuera del horario laboral exige confirmarlo", async () => {
    const tarde = base({ tipo: "coordinacion", hora: "17:00", requeridos: [eva.membershipId] });
    expect((await convocarReunion(luis(), tarde)).ok).toBe(false);
    expect((await convocarReunion(luis(), { ...tarde, fueraDeHorario: true })).ok).toBe(true);
  });

  describe("concurrencia, reprogramar y cancelar", () => {
    let ganadora: string;

    it("dos confirmaciones en paralelo de la misma franja: gana una sola", async () => {
      const pedido = base({ tipo: "direccion", hora: "14:00", requeridos: [eva.membershipId] });
      const [a, b] = await Promise.all([convocarReunion(dir(), { ...pedido, titulo: "Paralela A" }), convocarReunion(dir(), { ...pedido, titulo: "Paralela B" })]);
      expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
      const perdedora = a.ok ? b : a;
      expect((perdedora as { error: string }).error).toBe(MENSAJE_FRANJA_OCUPADA);
      ganadora = ((a.ok ? a : b) as { id: string }).id;
      const reservasEva = await pro.db.reservaAgenda.count({ where: { membershipId: eva.membershipId, activa: true, reunion: { titulo: { startsWith: "Paralela" } } } });
      expect(reservasEva).toBe(1);
      expect(await pro.db.reunion.count({ where: { titulo: { startsWith: "Paralela" } } })).toBe(1);
    });

    it("la restricción de exclusión impide dos reservas activas cruzadas aunque se salte el código", async () => {
      const r = await pro.db.reservaAgenda.findFirstOrThrow({ where: { reunionId: ganadora, membershipId: eva.membershipId } });
      await expect(pro.db.reservaAgenda.create({ data: { tenantId: pro.tenant.id, membershipId: eva.membershipId, inicio: r.inicio, fin: r.fin } })).rejects.toThrow();
    });

    it("el profesor invitado ve la reunión y su respuesta llega al organizador sin correo", async () => {
      const e = await ctxEva();
      expect((await listarReuniones(e)).map((r) => r.id)).toContain(ganadora);
      expect((await reunionesParaCalendario(e, new Date(), new Date(Date.now() + 30 * 86_400_000))).find((r) => r.id === ganadora)?.rol).toBe("invitado");
      const correosAntes = await pro.db.aviso.count({ where: { referenciaId: ganadora, canal: "correo" } });
      expect((await responderInvitacion(e, ganadora, { respuesta: "propone_otra", fechaPropuesta: MARTES, horaPropuesta: "15:00" })).ok).toBe(true);
      expect(await pro.db.aviso.count({ where: { referenciaId: ganadora, canal: "correo" } })).toBe(correosAntes);
      expect(await pro.db.notificacion.count({ where: { membershipId: pro.miembros.direccion.membership.id, tipo: "reunion", url: `/reuniones/${ganadora}` } })).toBe(1);
    });

    it("reprogramar revalida, mueve las reservas, reinicia respuestas y avisa por correo", async () => {
      const r = await reprogramarReunion(dir(), ganadora, { fecha: MARTES, hora: "15:00", duracion: 30, motivo: "Propuesta de Eva" });
      expect(r.ok).toBe(true);
      const reservas = await pro.db.reservaAgenda.findMany({ where: { reunionId: ganadora } });
      expect(reservas.filter((x) => x.activa)).toHaveLength(2);
      expect(reservas.filter((x) => !x.activa)).toHaveLength(2);
      const fila = await pro.db.reunionInvitado.findFirstOrThrow({ where: { reunionId: ganadora, membershipId: eva.membershipId } });
      expect(fila.respuesta).toBe("pendiente");
      expect(await pro.db.aviso.count({ where: { referenciaId: ganadora, canal: "correo", plantilla: "reunion_reprogramada" } })).toBe(1);
      expect(await pro.db.reunionCambio.count({ where: { reunionId: ganadora, tipo: "reprogramada" } })).toBe(1);
      // La franja vieja (14:00) quedó libre para Eva.
      expect((await convocarReunion(dir(), base({ tipo: "direccion", titulo: "Reusa 14:00", hora: "14:00", requeridos: [eva.membershipId] }))).ok).toBe(true);
    });

    it("cancelar libera las reservas y avisa por correo", async () => {
      expect((await cancelarReunion(dir(), ganadora, { motivo: "Se suspende" })).ok).toBe(true);
      expect(await pro.db.reservaAgenda.count({ where: { reunionId: ganadora, activa: true } })).toBe(0);
      expect(await pro.db.aviso.count({ where: { referenciaId: ganadora, canal: "correo", plantilla: "reunion_cancelada" } })).toBe(1);
      const r = await pro.db.reunion.findFirstOrThrow({ where: { id: ganadora } });
      expect(r).toMatchObject({ estado: "cancelada", motivoCancelacion: "Se suspende", canceladaPorId: pro.miembros.direccion.membership.id });
    });

    it("correos solo en invitación, reprogramación y cancelación; reintentar no duplica", async () => {
      const porPlantilla = await pro.db.aviso.groupBy({ by: ["plantilla"], where: { referenciaId: ganadora, canal: "correo" }, _count: true });
      expect(Object.fromEntries(porPlantilla.map((p) => [p.plantilla, p._count]))).toEqual({ reunion_convocada: 1, reunion_reprogramada: 1, reunion_cancelada: 1 });
      const r = await pro.db.reunion.findFirstOrThrow({ where: { id: ganadora } });
      const antes = await pro.db.aviso.count({ where: { referenciaId: ganadora } });
      await notificarReunion(dir(), { evento: "invitacion", reunion: { ...r, organizador: "Carmen" }, destinatarios: [{ membershipId: eva.membershipId, alumnoId: null }] });
      await notificarReunion(dir(), { evento: "cancelada", reunion: { ...r, organizador: "Carmen" }, destinatarios: [{ membershipId: eva.membershipId, alumnoId: null }] });
      expect(await pro.db.aviso.count({ where: { referenciaId: ganadora } })).toBe(antes);
    });
  });

  it("acuerdos con responsable y seguimiento", async () => {
    const despues = new Date(Date.now() + 40 * 86_400_000);
    expect((await agregarAcuerdo(dir(), reunionLuis, { texto: "Enviar el plan lector", responsableId: pro.miembros.otroProfesor.membership.id, fechaCompromiso: MARTES })).ok).toBe(true);
    expect((await agregarAcuerdo(dir(), reunionLuis, { texto: "Ajeno", responsableId: pro.miembros.tutora.membership.id })).ok).toBe(false);
    const pendientes = await acuerdosPendientes(luis());
    expect(pendientes.map((a) => a.texto)).toEqual(["Enviar el plan lector"]);
    expect(await acuerdosPendientes(lucia())).toEqual([]);
    await esperarProhibido(marcarAcuerdo(lucia(), pendientes[0].id, true));
    expect((await marcarAcuerdo(luis(), pendientes[0].id, true, despues)).ok).toBe(true);
    expect(await acuerdosPendientes(luis())).toEqual([]);
  });

  it("ocupación propia: solo los bloqueos del usuario", async () => {
    const e = await ctxEva();
    const propios = await ocupacionPropia(e, new Date(), new Date(Date.now() + 30 * 86_400_000));
    expect(propios.map((b) => b.motivo)).toEqual(["Cita médica"]);
    expect(await ocupacionPropia(lucia(), new Date(), new Date(Date.now() + 30 * 86_400_000))).toEqual([]);
  });
});

describe("solicitudes de familias", () => {
  const madre = () => pro.ctxDe("madre");
  const pedido = (extra: Record<string, unknown> = {}) => ({
    alumnoId: pro.alumnos.mateo.id, docenteId: pro.miembros.tutora.membership.id, fecha: MARTES, hora: "12:00", motivo: "Conversar sobre lectura", ...extra,
  });

  it("no solicita para un alumno ajeno ni a un docente que no enseña a su hijo", async () => {
    await esperarProhibido(solicitarReunion(madre(), pedido({ alumnoId: pro.alumnos.thiago.id })));
    await esperarProhibido(solicitarReunion(madre(), pedido({ docenteId: pro.miembros.otroProfesor.membership.id })));
    expect(await franjasParaSolicitud(madre(), pro.alumnos.mateo.id, pro.miembros.otroProfesor.membership.id)).toBeNull();
  });

  it("sin horario de atención propone fecha y hora; antiabuso de 2 abiertas por docente; el docente confirma", async () => {
    expect(await franjasParaSolicitud(madre(), pro.alumnos.mateo.id, pro.miembros.tutora.membership.id)).toEqual([]);
    const a = await solicitarReunion(madre(), pedido());
    expect(a.ok).toBe(true);
    expect((await solicitarReunion(madre(), pedido({ hora: "12:30" }))).ok).toBe(true);
    const tercera = await solicitarReunion(madre(), pedido({ hora: "13:00" }));
    expect(tercera).toMatchObject({ ok: false });
    expect((tercera as { error: string }).error).toMatch(/2 solicitudes abiertas/);
    const id = (a as { id: string }).id;
    const r = await pro.db.reunion.findFirstOrThrow({ where: { id } });
    expect(r).toMatchObject({ estado: "por_confirmar", organizadorId: pro.miembros.tutora.membership.id });
    expect(await pro.db.reservaAgenda.count({ where: { reunionId: id } })).toBe(0);
    // Al docente le llega la solicitud.
    expect(await pro.db.notificacion.count({ where: { membershipId: pro.miembros.tutora.membership.id, url: `/reuniones/${id}` } })).toBe(1);
    // Confirma a la misma hora: reserva su agenda.
    expect((await reprogramarReunion(lucia(), id, { fecha: MARTES, hora: "12:00", duracion: 30 })).ok).toBe(true);
    expect(await pro.db.reservaAgenda.count({ where: { reunionId: id, activa: true, membershipId: pro.miembros.tutora.membership.id } })).toBe(1);
    expect((await pro.db.reunion.findFirstOrThrow({ where: { id } })).estado).toBe("programada");
  });

  it("con horario de atención solo ofrece franjas libres dentro de él", async () => {
    expect((await guardarHorarioAtencion(lucia(), [{ dia: 2, horaDesde: "09:00", horaHasta: "11:00" }])).ok).toBe(true);
    const franjas = (await franjasParaSolicitud(madre(), pro.alumnos.mateo.id, pro.miembros.tutora.membership.id))!;
    const delMartes = franjas.filter((f) => f.fecha === MARTES).map((f) => f.hora);
    expect(delMartes).toEqual(["09:00", "09:30"]); // 10:00–11:00 tiene clase (y además la reunión forzada)
    expect(JSON.stringify(franjas)).not.toContain("Matemática");
  });
});
