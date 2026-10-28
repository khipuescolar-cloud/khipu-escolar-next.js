// Mesa de ayuda (specs/23). Requiere la BD local. Colegios de prueba aislados y un super administrador de prueba; todo se borra al final.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { borrarDelProveedor } from "@/lib/server/adjuntos";
import { requireArchivoVisible } from "@/lib/server/archivos";
import { db, dbTenant } from "@/lib/server/db";
import { accesoModulos, invalidarCacheModulos } from "@/lib/server/modulos";
import type { AdminContext } from "@/lib/server/plataforma";
import {
  asignarTicket, cambiarEstadoTicket, cambiarPrioridadTicket, listarBandeja, obtenerTicketKhipu, pendientesMesaAyuda, responderKhipu, resumenMesaAyuda,
} from "@/lib/server/plataforma-mesa-ayuda";
import {
  cerrarColegio, cerrarResueltosInactivos, crearTicket, listarTicketsColegio, marcarResueltoColegio, obtenerTicketColegio, reabrirColegio,
  respuestasNuevasSoporte, responderColegio, valorarTicket,
} from "@/lib/server/soporte";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const sufijo = randomUUID().slice(0, 8);
let a: ColegioPrueba;
let b: ColegioPrueba;
let khipu: Profile;
let admin: AdminContext;
let administrativo: { user: Profile; membershipId: string };

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

async function esperarNoEncontrado(promesa: Promise<unknown>) {
  await promesa.then(
    () => {
      throw new Error("Se esperaba 404 y la operación se permitió");
    },
    (error: unknown) => {
      if (!(error instanceof Error) || !String((error as { digest?: string }).digest ?? error.message).includes("404")) throw error;
    },
  );
}

/** Contexto del administrativo: `quitarSoporte` simula RolModulo(administrativo, soporte) = deshabilitado. */
function ctxAdministrativo(quitarSoporte: boolean): TenantContext {
  const base = accesoModulosDeCodigo(a.tenant.plan);
  const membership = { id: administrativo.membershipId, tenantId: a.tenant.id, userId: administrativo.user.id, rol: "administrativo" as const, estado: "activa" as const, cargo: "Secretaria", createdAt: new Date() };
  return {
    tenant: a.tenant, user: administrativo.user, membership, rol: "administrativo", roles: ["administrativo"], db: dbTenant(a.tenant.id),
    modulos: base.modulos,
    accesoModulos: { ...base.accesoModulos, quitadosRol: quitarSoporte ? new Set(["soporte"]) : new Set() },
  };
}

beforeAll(async () => {
  a = await crearColegioPrueba({ prefijo: "test-mesa" });
  b = await crearColegioPrueba({ prefijo: "test-mesa" });
  khipu = await db.profile.create({ data: { id: randomUUID(), email: `khipu-${sufijo}@test-mesa.local`, nombres: "Rocío", apellidos: "Equipo" } });
  await db.adminPlataforma.create({ data: { userId: khipu.id } });
  admin = { user: khipu };
  const u = await db.profile.create({ data: { id: randomUUID(), email: `secretaria-${sufijo}@test-mesa.local`, nombres: "Sara", apellidos: "Secretaria" } });
  const m = await db.membership.create({ data: { tenantId: a.tenant.id, userId: u.id, rol: "administrativo", cargo: "Secretaria" } });
  administrativo = { user: u, membershipId: m.id };
});

afterAll(async () => {
  await borrarDelProveedor(await db.archivo.findMany({ where: { tenantId: a.tenant.id, mensajeSoporteId: { not: null } } }));
  await a.limpiar();
  await b.limpiar();
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: khipu.id } });
  await db.adminPlataforma.deleteMany({ where: { userId: khipu.id } });
  await db.profile.deleteMany({ where: { id: { in: [khipu.id, administrativo.user.id] } } });
  await db.$disconnect();
});

describe("mesa de ayuda · colegio", () => {
  it("dirección abre una conversación con captura; queda «abierta» y avisa al buzón del equipo", async () => {
    const ctx = a.ctxDe("direccion");
    const { id, avisos } = await crearTicket(ctx, { asunto: `No llegan avisos ${sufijo}`, categoria: "problema", prioridad: "alta", cuerpo: "Desde ayer no llegan." }, [{ nombre: "captura.png", buffer: PNG }]);
    expect(avisos).toBeGreaterThanOrEqual(0);
    const t = await db.ticketSoporte.findUniqueOrThrow({ where: { id } });
    expect(t.estado).toBe("abierto");
    expect(t.primeraRespuestaAt).toBeNull();
    const vista = await obtenerTicketColegio(ctx, id);
    expect(vista.mensajes).toHaveLength(1);
    expect(vista.mensajes[0].adjuntos).toHaveLength(1);
    // La captura la descarga quien ve la conversación.
    await expect(requireArchivoVisible(ctx, vista.mensajes[0].adjuntos[0].id)).resolves.toBeTruthy();
    const correos = await db.aviso.findMany({ where: { referenciaId: id, plantilla: "soporte_nuevo" } });
    if (process.env.SMTP_USER || process.env.EMAIL_FROM_ADDRESS) expect(correos.length).toBeGreaterThan(0);
    expect(correos.every((c) => c.tipo === "soporte" && c.tenantId === a.tenant.id && c.canal === "correo")).toBe(true);
  });

  it("rechaza capturas que no son PNG, JPG ni PDF", async () => {
    await expect(
      crearTicket(a.ctxDe("direccion"), { asunto: "Archivo raro", categoria: "duda", prioridad: "normal", cuerpo: "x" }, [{ nombre: "nota.txt", buffer: Buffer.from("hola") }]),
    ).rejects.toThrow(/PNG, JPG o PDF/);
  });

  it("un rol sin el módulo recibe 403: profesor, portería y administrativo con el módulo desactivado", async () => {
    await esperarProhibido(listarTicketsColegio(a.ctxDe("tutora")));
    await esperarProhibido(listarTicketsColegio(a.ctxDe("porteria")));
    await esperarProhibido(listarTicketsColegio(ctxAdministrativo(true)));
  });

  it("por defecto (RolModulo sembrado) el administrativo no tiene el módulo; habilitado, entra y ve las suyas y las de dirección", async () => {
    invalidarCacheModulos();
    const real = await accesoModulos(a.tenant, "administrativo");
    expect(real.accesoModulos.quitadosRol.has("soporte")).toBe(true);

    const ctx = ctxAdministrativo(false);
    const propia = await crearTicket(ctx, { asunto: `Secretaría ${sufijo}`, categoria: "cuentas_accesos", prioridad: "normal", cuerpo: "No puedo invitar a una familia." });
    const lista = await listarTicketsColegio(ctx);
    expect(lista.map((t) => t.id)).toContain(propia.id);
    expect(lista.some((t) => t.asunto.startsWith("No llegan avisos"))).toBe(true); // abierta por dirección
    // Dirección ve todas.
    expect((await listarTicketsColegio(a.ctxDe("direccion"))).map((t) => t.id)).toContain(propia.id);
  });

  it("aislamiento: otro colegio no lee ni responde conversaciones ajenas (404)", async () => {
    const [ajena] = await listarTicketsColegio(a.ctxDe("direccion"));
    const otro = b.ctxDe("direccion");
    await esperarNoEncontrado(obtenerTicketColegio(otro, ajena.id));
    await esperarNoEncontrado(responderColegio(otro, ajena.id, "hola"));
    await esperarNoEncontrado(marcarResueltoColegio(otro, ajena.id));
    expect(await listarTicketsColegio(otro)).toHaveLength(0);
    await esperarNoEncontrado(obtenerTicketColegio(otro, "no-es-uuid"));
  });
});

describe("mesa de ayuda · equipo Khipu y estados", () => {
  let id: string;

  it("la plataforma ve todo; la nota interna nunca llega al colegio y la respuesta fija la primera respuesta", async () => {
    const ctx = a.ctxDe("direccion");
    ({ id } = await crearTicket(ctx, { asunto: `Estados ${sufijo}`, categoria: "duda", prioridad: "normal", cuerpo: "¿Cómo cambio el logo?" }));
    const bandeja = await listarBandeja(admin, { estado: "todas", colegio: a.tenant.id });
    const fila = bandeja.find((f) => f.id === id)!;
    expect(fila.noLeidos).toBe(1);
    expect(fila.sla?.texto).toMatch(/^Sin respuesta hace/);
    expect(await pendientesMesaAyuda(admin)).toBeGreaterThan(0);

    await responderKhipu(admin, id, `Nota secreta ${sufijo}`, true);
    let t = await db.ticketSoporte.findUniqueOrThrow({ where: { id } });
    expect(t.primeraRespuestaAt).toBeNull();
    expect(t.estado).toBe("abierto");

    await responderKhipu(admin, id, "Ve a Configuración → Logo.", false);
    t = await db.ticketSoporte.findUniqueOrThrow({ where: { id } });
    expect(t.primeraRespuestaAt).not.toBeNull();
    expect(t.estado).toBe("esperando_colegio");
    expect(t.asignadoAId).toBe(khipu.id);

    const vistaColegio = await obtenerTicketColegio(ctx, id);
    expect(vistaColegio.mensajes.some((m) => m.interno || m.cuerpo.includes("Nota secreta"))).toBe(false);
    expect(vistaColegio.mensajes.find((m) => m.autor === "khipu")?.nombre).toBe("Equipo Khipu · Rocío");
    const lista = await listarTicketsColegio(ctx);
    expect(JSON.stringify(lista)).not.toContain("Nota secreta");
    // Khipu sí ve la nota.
    expect((await obtenerTicketKhipu(admin, id)).vista.mensajes.some((m) => m.interno)).toBe(true);
  });

  it("la respuesta de Khipu se avisa al creador (correo, plantilla soporte_respuesta) y suma en la campana", async () => {
    const ctx = a.ctxDe("direccion");
    const avisos = await db.aviso.findMany({ where: { referenciaId: id, plantilla: "soporte_respuesta" } });
    expect(avisos.some((x) => x.destinatario === a.miembros.direccion.user.email && x.tipo === "soporte")).toBe(true);
    expect(JSON.stringify(avisos.map((x) => x.payload))).not.toContain("Configuración → Logo");
    // La campana cuenta respuestas no leídas (la vista anterior ya marcó como leído → 0; una nueva respuesta → 1).
    await responderKhipu(admin, id, "¿Pudiste?", false);
    expect(await respuestasNuevasSoporte(ctx)).toBeGreaterThanOrEqual(1);
    await obtenerTicketColegio(ctx, id);
    expect(await respuestasNuevasSoporte(ctx)).toBe(0);
  });

  it("si la abrió el administrativo, la respuesta también avisa a la dirección", async () => {
    const ctx = ctxAdministrativo(false);
    const { id: propio } = await crearTicket(ctx, { asunto: `Aviso dirección ${sufijo}`, categoria: "otro", prioridad: "baja", cuerpo: "x" });
    await responderKhipu(admin, propio, "Hola", false);
    const destinos = (await db.aviso.findMany({ where: { referenciaId: propio, plantilla: "soporte_respuesta", canal: "correo" } })).map((x) => x.destinatario);
    expect(destinos).toEqual(expect.arrayContaining([administrativo.user.email, a.miembros.direccion.user.email]));
  });

  it("el colegio responde → «En progreso», resuelve, reabre, cierra y valora; cada cambio deja mensaje del sistema", async () => {
    const ctx = a.ctxDe("direccion");
    await responderColegio(ctx, id, "Gracias, ya lo vi.");
    expect((await db.ticketSoporte.findUniqueOrThrow({ where: { id } })).estado).toBe("en_progreso");
    await expect(valorarTicket(ctx, id, { valoracion: 5 })).rejects.toThrow(/resuelta/);
    await marcarResueltoColegio(ctx, id);
    expect((await db.ticketSoporte.findUniqueOrThrow({ where: { id } })).estado).toBe("resuelto");
    await reabrirColegio(ctx, id);
    expect((await db.ticketSoporte.findUniqueOrThrow({ where: { id } })).estado).toBe("en_progreso");
    await cerrarColegio(ctx, id);
    await expect(responderColegio(ctx, id, "otra cosa")).rejects.toThrow(/cerrada/);
    await valorarTicket(ctx, id, { valoracion: 4, comentario: "Rápido" });
    const t = await db.ticketSoporte.findUniqueOrThrow({ where: { id } });
    expect(t.estado).toBe("cerrado");
    expect(t.valoracion).toBe(4);
    const sistema = await db.mensajeSoporte.count({ where: { ticketId: id, autor: "sistema" } });
    expect(sistema).toBeGreaterThanOrEqual(3);
    expect((await resumenMesaAyuda(admin)).valoracionMedia).not.toBeNull();
  });

  it("la plataforma cambia estado, prioridad y asignación (auditado y con mensaje del sistema)", async () => {
    await cambiarEstadoTicket(admin, id, "en_progreso");
    await cambiarPrioridadTicket(admin, id, "urgente");
    await asignarTicket(admin, id, null);
    const t = await db.ticketSoporte.findUniqueOrThrow({ where: { id } });
    expect([t.estado, t.prioridad, t.asignadoAId]).toEqual(["en_progreso", "urgente", null]);
    const ultimos = await db.mensajeSoporte.findMany({ where: { ticketId: id, autor: "sistema" }, orderBy: { createdAt: "desc" }, take: 3 });
    expect(ultimos.map((m) => m.cuerpo).join(" ")).toMatch(/Urgente/);
    const acciones = (await db.auditoriaPlataforma.findMany({ where: { actorId: khipu.id } })).map((x) => x.accion);
    expect(acciones).toEqual(expect.arrayContaining(["mesa_responder", "mesa_nota_interna", "mesa_estado", "mesa_prioridad", "mesa_asignar"]));
    await expect(cambiarEstadoTicket(admin, id, "inventado")).rejects.toThrow();
  });

  it("cierre automático: resuelta sin actividad hace más de 7 días → cerrada", async () => {
    const ctx = a.ctxDe("direccion");
    const { id: viejo } = await crearTicket(ctx, { asunto: `Viejo ${sufijo}`, categoria: "duda", prioridad: "normal", cuerpo: "x" });
    const { id: reciente } = await crearTicket(ctx, { asunto: `Reciente ${sufijo}`, categoria: "duda", prioridad: "normal", cuerpo: "x" });
    const hace8 = new Date(Date.now() - 8 * 86_400_000);
    await db.ticketSoporte.update({ where: { id: viejo }, data: { estado: "resuelto", resueltoAt: hace8, ultimoMensajeAt: hace8 } });
    await db.ticketSoporte.update({ where: { id: reciente }, data: { estado: "resuelto", resueltoAt: new Date(), ultimoMensajeAt: new Date() } });
    expect(await cerrarResueltosInactivos()).toBeGreaterThanOrEqual(1);
    expect((await db.ticketSoporte.findUniqueOrThrow({ where: { id: viejo } })).estado).toBe("cerrado");
    expect((await db.ticketSoporte.findUniqueOrThrow({ where: { id: reciente } })).estado).toBe("resuelto");
    expect(await db.mensajeSoporte.count({ where: { ticketId: viejo, autor: "sistema", cuerpo: { contains: "automáticamente" } } })).toBe(1);
  });
});
