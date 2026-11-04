// Configuración institucional y retención de Nudito (specs/44). Requiere la BD local; crea colegios `test-nudito-cfg-*`
// y un super administrador de prueba, y los borra al terminar. Los archivos de prueba van al almacenamiento local.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import { CONFIG_NUDITO_POR_DEFECTO, configNudito, guardarConfigNudito, nuditoHabilitadoPara } from "@/lib/server/nudito/config-colegio";
import { purgarRetencion } from "@/lib/server/nudito/retencion";
import { bloquearNuditoColegio } from "@/lib/server/plataforma-nudito-plus";
import { leerArchivo, storage } from "@/lib/server/storage";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let superadmin: Profile;
const DIA = 86_400_000;
const config = (cambios: Record<string, unknown> = {}) => ({ ...CONFIG_NUDITO_POR_DEFECTO, activo: true, ...cambios });

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-cfg" });
  superadmin = await db.profile.create({ data: { id: randomUUID(), email: `super-${randomUUID().slice(0, 8)}@test-nudito.local`, nombres: "Equipo", apellidos: "Prueba" } });
  await db.adminPlataforma.create({ data: { userId: superadmin.id } });
});

afterAll(async () => {
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: superadmin.id } });
  await c.limpiar();
  await db.profile.delete({ where: { id: superadmin.id } });
  await db.$disconnect();
});

describe("configuración del colegio", () => {
  it("sin fila: apagado y con valores por defecto (fotos apagadas, 180 días)", async () => {
    const e = await configNudito(c.ctxDe("direccion"));
    expect(e).toMatchObject({ activo: false, motivo: "colegio" });
    expect(e.config).toMatchObject({ permitirFotos: false, retencionDias: 180, permitirModoHijo: true });
  });

  it("dirección lo activa y desactiva (auditado); otros roles no", async () => {
    await esperarProhibido(guardarConfigNudito(c.ctxDe("tutora"), config()));
    expect(await guardarConfigNudito(c.ctxDe("direccion"), config({ areas: ["matematica"], gradoMinimoPrimaria: 3 }))).toMatchObject({ activo: true });
    const fila = await db.nuditoConfigColegio.findUniqueOrThrow({ where: { tenantId: c.tenant.id } });
    expect(fila).toMatchObject({ activo: true, actualizadoPorId: c.miembros.direccion.membership.id });
    expect(fila.activadoAt).not.toBeNull();
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "nudito_config" } })).toBe(1);
    expect(await nuditoHabilitadoPara(c.ctxDe("madre"), { nivel: "primaria", grado: 3, area: "matematica" })).toBe(true);
    expect(await nuditoHabilitadoPara(c.ctxDe("madre"), { nivel: "primaria", grado: 2, area: "matematica" })).toBe(false);
    expect(await nuditoHabilitadoPara(c.ctxDe("madre"), { nivel: "primaria", grado: 3, area: "comunicacion" })).toBe(false);
    expect(await guardarConfigNudito(c.ctxDe("direccion"), config({ activo: false }))).toMatchObject({ activo: false, motivo: "colegio" });
  });

  it("rechaza overrides de política inválidos y valores fuera de rango; acepta los válidos", async () => {
    const d = c.ctxDe("direccion");
    await expect(guardarConfigNudito(d, config({ politicaDominio: { minIntentos: 1 } }))).rejects.toThrow(/configuración|Política/);
    await expect(guardarConfigNudito(d, config({ politicaDominio: { minPuntajePonderado: 0.2 } }))).rejects.toThrow();
    await expect(guardarConfigNudito(d, config({ politicaDominio: { inventado: 3 } }))).rejects.toThrow();
    await expect(guardarConfigNudito(d, config({ retencionDias: 10 }))).rejects.toThrow();
    await expect(guardarConfigNudito(d, config({ horaDesde: "18:00", horaHasta: "08:00" }))).rejects.toThrow("anterior");
    const r = await guardarConfigNudito(d, config({ politicaDominio: { minIntentos: 8 }, retencionDias: 30 }));
    expect(r.config).toMatchObject({ politicaDominio: { minIntentos: 8 }, retencionDias: 30 });
  });

  it("el bloqueo de plataforma manda sobre «activo» y queda en la auditoría de plataforma", async () => {
    const admin = { user: superadmin };
    await expect(bloquearNuditoColegio(admin, c.tenant.id, true, "")).rejects.toThrow("motivo");
    await bloquearNuditoColegio(admin, c.tenant.id, true, "Incidente en revisión");
    expect(await configNudito(c.ctxDe("direccion"))).toMatchObject({ activo: false, motivo: "plataforma" });
    await bloquearNuditoColegio(admin, c.tenant.id, false, "Incidente resuelto");
    expect(await configNudito(c.ctxDe("direccion"))).toMatchObject({ activo: true });
    expect(await db.auditoriaPlataforma.count({ where: { actorId: superadmin.id, tenantId: c.tenant.id, accion: { startsWith: "nudito_colegio_" } } })).toBe(2);
  });
});

describe("retención", () => {
  it("borra solo lo vencido (intentos, ejercicios, mensajes de sesión y fotos) y conserva dominios y eventos", async () => {
    const t = c.tenant.id;
    const alumnoId = c.alumnos.mateo.id;
    const viejo = new Date(Date.now() - 40 * DIA);
    const conv = await db.nuditoConversacion.create({ data: { tenantId: t, membershipId: c.miembros.madre.membership.id, alumnoId, modo: "hijo" } });
    const sesion = await db.nuditoSesion.create({ data: { tenantId: t, alumnoId, membershipId: c.miembros.madre.membership.id, modo: "hijo", semilla: 1, conversacionId: conv.id, iniciadaAt: viejo } });
    const ej = (orden: number, presentadoAt: Date) =>
      db.nuditoEjercicio.create({ data: { tenantId: t, sesionId: sesion.id, alumnoId, temaClave: "mat.p3.restas", tipo: "numerico", dificultad: 1, fuenteId: "g@1", semilla: orden, enunciado: {}, solucion: {}, orden, presentadoAt } });
    const ejViejo = await ej(1, viejo);
    const ejNuevo = await ej(2, new Date());
    const intento = (ejercicioId: string, createdAt: Date) =>
      db.nuditoIntento.create({ data: { tenantId: t, ejercicioId, alumnoId, numero: 1, respuesta: {}, resultado: "correcto", puntaje: 1, retro: "Bien", evaluadoPor: "codigo", pistasUsadas: 0, createdAt } });
    await intento(ejViejo.id, viejo);
    const intNuevo = await intento(ejNuevo.id, new Date());
    const msg = (createdAt: Date, sesionId: string | null) => db.nuditoMensaje.create({ data: { tenantId: t, conversacionId: conv.id, autor: "usuario", cuerpo: "texto", sesionId, createdAt } });
    await msg(viejo, sesion.id);
    const msgNuevo = await msg(new Date(), sesion.id);
    const msgChatAntiguo = await msg(viejo, null);
    const subido = await storage().subir(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), { tenantId: t, carpeta: "nudito", privado: true, mimeType: "image/jpeg" });
    const foto = await db.archivo.create({ data: { tenantId: t, proveedor: subido.proveedor, publicId: subido.publicId, mimeType: "image/jpeg", bytes: 7, nuditoSesionId: sesion.id, createdAt: viejo } });
    const dom = await db.nuditoDominio.create({ data: { tenantId: t, alumnoId, temaClave: "mat.p3.restas", area: "matematica", gradoTema: 3, politicaVersion: "v1" } });
    const ev = await db.nuditoDominioEvento.create({ data: { tenantId: t, alumnoId, temaClave: "mat.p3.restas", tipo: "estado", motivo: "Empezó", evidencia: [], politica: {}, createdAt: viejo } });

    const r = await purgarRetencion(); // el colegio quedó con retencionDias = 30
    expect(r.colegios).toBeGreaterThanOrEqual(1);
    expect(r).toMatchObject({ intentos: expect.any(Number), fotos: expect.any(Number) });
    expect(await db.nuditoEjercicio.findMany({ where: { tenantId: t }, select: { id: true } })).toEqual([{ id: ejNuevo.id }]);
    expect(await db.nuditoIntento.findMany({ where: { tenantId: t }, select: { id: true } })).toEqual([{ id: intNuevo.id }]);
    expect((await db.nuditoMensaje.findMany({ where: { tenantId: t }, select: { id: true } })).map((m) => m.id).sort()).toEqual([msgNuevo.id, msgChatAntiguo.id].sort());
    expect(await db.archivo.findUnique({ where: { id: foto.id } })).toBeNull();
    await expect(leerArchivo(foto)).rejects.toThrow();
    expect(await db.nuditoDominio.findUnique({ where: { id: dom.id } })).not.toBeNull();
    expect(await db.nuditoDominioEvento.findUnique({ where: { id: ev.id } })).not.toBeNull();
    expect(await db.nuditoSesion.findUnique({ where: { id: sesion.id } })).not.toBeNull();
  });
});
