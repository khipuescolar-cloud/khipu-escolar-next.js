// Solicitudes de demo (specs/25). Requiere la BD local. Todo lo creado lleva el dominio test-solic.local y se borra al final.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/generated/prisma/client";

const enviados: { destinatario: string; asunto: string; texto: string; html: string }[] = [];
let fallarEnvio = false;
vi.mock("@/lib/server/notificaciones/email", () => ({
  EmailChannel: class {
    async enviar(e: { destinatario: string; mensaje: { asunto: string; texto: string; html: string } }) {
      if (fallarEnvio) throw new Error("SMTP caído");
      enviados.push({ destinatario: e.destinatario, asunto: e.mensaje.asunto, texto: e.mensaje.texto, html: e.mensaje.html });
      return { providerMessageId: "x" };
    }
  },
}));

import { db } from "@/lib/server/db";
import type { AdminContext } from "@/lib/server/plataforma";
import {
  asignarSolicitud, cambiarEstadoSolicitud, eliminarSolicitud, exportarSolicitudes, guardarNotasSolicitud, listarSolicitudes,
  pendientesSolicitudes, vincularSolicitudColegio,
} from "@/lib/server/plataforma-solicitudes";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { crearSolicitudDemo, MAX_SOLICITUDES_POR_HORA } from "@/lib/server/solicitudes";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const sufijo = randomUUID().slice(0, 8);
const DOMINIO = "test-solic.local";
let khipu: Profile;
let admin: AdminContext;
let colegio: ColegioPrueba;
let remitente: string | undefined;
let desde: string | undefined;

const datos = (extra: Record<string, unknown> = {}) => ({
  nombre: "Marta Quispe", cargo: "Directora", colegio: `Colegio ${sufijo}`, ciudad: "Cusco", correo: `marta-${randomUUID().slice(0, 6)}@${DOMINIO}`,
  telefono: "987654321", alumnos: 320, planInteres: "fase2" as const, ...extra,
});
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

beforeAll(async () => {
  if (!process.env.EMAIL_FROM_ADDRESS && !process.env.SMTP_USER) process.env.EMAIL_FROM_ADDRESS = "equipo@test-solic.local";
  remitente = process.env.EMAIL_FROM_ADDRESS;
  desde = process.env.SMTP_USER;
  khipu = await db.profile.create({ data: { id: randomUUID(), email: `khipu-${sufijo}@${DOMINIO}`, nombres: "Rocío", apellidos: "Equipo" } });
  await db.adminPlataforma.create({ data: { userId: khipu.id } });
  admin = { user: khipu };
  colegio = await crearColegioPrueba({ prefijo: "test-solic" });
});

afterAll(async () => {
  await db.solicitudDemo.deleteMany({ where: { correo: { endsWith: `@${DOMINIO}` } } });
  await colegio.limpiar();
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: khipu.id } });
  await db.adminPlataforma.deleteMany({ where: { userId: khipu.id } });
  await db.profile.deleteMany({ where: { id: khipu.id } });
  void remitente; void desde;
  await db.$disconnect();
});

describe("crear solicitud y aviso al equipo", () => {
  it("guarda el pedido y avisa al buzón del equipo sin correo ni teléfono de la persona", async () => {
    enviados.length = 0;
    const s = await crearSolicitudDemo(datos(), ip());
    expect(s?.estado).toBe("nueva");
    expect(enviados).toHaveLength(1);
    const c = enviados[0];
    expect(c.asunto).toContain(s!.colegio);
    expect(c.texto).toContain("Marta Quispe");
    expect(c.texto).toContain(`/solicitudes/${s!.id}`);
    expect(c.texto).not.toContain("987654321");
    expect(c.texto).not.toContain("@test-solic.local\n");
    expect(c.destinatario).toContain("@");
  });

  it("si el envío falla, igual guarda la solicitud", async () => {
    fallarEnvio = true;
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const s = await crearSolicitudDemo(datos(), ip());
      expect(s).not.toBeNull();
      expect(await db.solicitudDemo.findUnique({ where: { id: s!.id } })).not.toBeNull();
      expect(espia).toHaveBeenCalled();
    } finally {
      fallarEnvio = false;
      espia.mockRestore();
    }
  });

  it("campo trampa: no guarda ni avisa", async () => {
    enviados.length = 0;
    const correo = `bot-${randomUUID().slice(0, 6)}@${DOMINIO}`;
    expect(await crearSolicitudDemo(datos({ correo, sitio: "http://spam" }), ip())).toBeNull();
    expect(await db.solicitudDemo.count({ where: { correo } })).toBe(0);
    expect(enviados).toHaveLength(0);
  });

  it("límite por IP y hora", async () => {
    const mismaIp = ip();
    for (let i = 0; i < MAX_SOLICITUDES_POR_HORA; i++) await crearSolicitudDemo(datos(), mismaIp);
    await expect(crearSolicitudDemo(datos(), mismaIp)).rejects.toBeInstanceOf(ErrorDeNegocio);
  });
});

describe("panel de solicitudes", () => {
  it("lista con filtros y cuenta las nuevas", async () => {
    const s = (await crearSolicitudDemo(datos({ colegio: `Buscable ${sufijo}`, ciudad: "Tacna" }), ip()))!;
    const porNombre = await listarSolicitudes(admin, { q: `buscable ${sufijo}` });
    expect(porNombre.map((x) => x.id)).toEqual([s.id]);
    expect((await listarSolicitudes(admin, { q: s.correo, estado: "nueva" })).length).toBe(1);
    expect(await listarSolicitudes(admin, { q: s.correo, estado: "descartada" })).toHaveLength(0);
    expect(await pendientesSolicitudes(admin)).toBeGreaterThanOrEqual(1);
  });

  it("estado, notas y asignación quedan auditados sin datos personales", async () => {
    const s = (await crearSolicitudDemo(datos(), ip()))!;
    await cambiarEstadoSolicitud(admin, s.id, "contactada");
    await guardarNotasSolicitud(admin, s.id, "  Llamar el lunes  ");
    await asignarSolicitud(admin, s.id, khipu.id);
    const f = await db.solicitudDemo.findUniqueOrThrow({ where: { id: s.id } });
    expect(f).toMatchObject({ estado: "contactada", notas: "Llamar el lunes", atendidaPor: khipu.id });
    await expect(cambiarEstadoSolicitud(admin, s.id, "inventado")).rejects.toBeInstanceOf(ErrorDeNegocio);
    await expect(asignarSolicitud(admin, s.id, randomUUID())).rejects.toBeInstanceOf(ErrorDeNegocio);
    const auditoria = await db.auditoriaPlataforma.findMany({ where: { actorId: khipu.id, accion: { startsWith: "solicitud_" } } });
    const acciones = auditoria.filter((a) => (a.detalle as { solicitudId?: string })?.solicitudId === s.id).map((a) => a.accion).sort();
    expect(acciones).toEqual(["solicitud_asignar", "solicitud_estado", "solicitud_notas"]);
    expect(JSON.stringify(auditoria.map((a) => a.detalle))).not.toContain("Llamar el lunes");
  });

  it("convertir enlaza el colegio y marca la solicitud como convertida", async () => {
    const s = (await crearSolicitudDemo(datos(), ip()))!;
    await vincularSolicitudColegio(admin, s.id, colegio.tenant.id);
    const f = await db.solicitudDemo.findUniqueOrThrow({ where: { id: s.id } });
    expect(f).toMatchObject({ estado: "convertida", tenantId: colegio.tenant.id });
    expect(await db.auditoriaPlataforma.count({ where: { actorId: khipu.id, accion: "solicitud_convertir", tenantId: colegio.tenant.id } })).toBeGreaterThanOrEqual(1);
    await expect(vincularSolicitudColegio(admin, s.id, randomUUID())).rejects.toBeInstanceOf(ErrorDeNegocio);
  });

  it("exporta CSV (auditado) y elimina la solicitud dejando solo el registro sin datos", async () => {
    const s = (await crearSolicitudDemo(datos(), ip()))!;
    const { filas } = await exportarSolicitudes(admin, { q: s.correo });
    expect(filas).toHaveLength(1);
    await eliminarSolicitud(admin, s.id);
    expect(await db.solicitudDemo.findUnique({ where: { id: s.id } })).toBeNull();
    const a = await db.auditoriaPlataforma.findFirstOrThrow({ where: { actorId: khipu.id, accion: "solicitud_eliminar" }, orderBy: { createdAt: "desc" } });
    expect(JSON.stringify(a.detalle)).not.toContain(s.correo);
    expect(await db.auditoriaPlataforma.count({ where: { actorId: khipu.id, accion: "solicitud_exportar" } })).toBe(1);
  });
});
