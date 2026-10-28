// Requiere la BD local y Supabase Auth (pnpm db:start). Datos `test-op-*` / `@test-op.demo`; se borran al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import type { AdminContext } from "@/lib/server/plataforma";
import {
  esquemaFiltroAuditoria, detalleSinSensibles, exportarAuditoria, listarAuditoria, registrarAuditoriaPlataforma, textoAccion,
} from "@/lib/server/plataforma-auditoria";
import { estadoCron, panelMonitoreo, procesarColaAhora, registrarEjecucionCron, reintentarAvisosConError } from "@/lib/server/plataforma-monitoreo";
import {
  buscarUsuarios, cambiarEstadoMembresiaUsuario, enmascararIp, enviarRecuperacionUsuario, fichaUsuario, forzarCambioPasswordUsuario,
  restablecerPasswordUsuario,
} from "@/lib/server/plataforma-usuarios";
import { supabaseAdmin } from "@/lib/server/supabase";

vi.mock("@/lib/server/notificaciones/cola", async (original) => ({
  ...(await original<typeof import("@/lib/server/notificaciones/cola")>()),
  procesarCola: async () => ({ enviados: 0, reintentos: 0, errores: 0, omitidos: 0, diferidos: 0, recuperados: 0 }),
}));

const sufijo = randomUUID().slice(0, 8);
const correo = (n: string) => `${n}-${sufijo}@test-op.demo`;
const DNI = String(20_000_000 + Math.floor(Math.random() * 79_999_999));

let admin: AdminContext;
let superadmin: Profile;
let persona: Profile;
let sinDoc: Profile;
let tenantId = "";
let membershipId = "";
let alumnoId = "";

beforeAll(async () => {
  superadmin = await db.profile.create({ data: { id: randomUUID(), email: correo("super"), nombres: "Equipo", apellidos: "Operacion" } });
  await db.adminPlataforma.create({ data: { userId: superadmin.id } });
  admin = { user: superadmin };
  const { data, error } = await supabaseAdmin().auth.admin.createUser({ email: correo("persona"), password: "Inicial-123456", email_confirm: true });
  if (error || !data.user) throw new Error("No se pudo crear la cuenta de prueba");
  persona = await db.profile.create({
    data: { id: data.user.id, email: correo("persona"), nombres: "Marta", apellidos: "Quispe Soporte", tipoDocumento: "dni", numeroDocumento: DNI },
  });
  sinDoc = await db.profile.create({ data: { id: randomUUID(), email: correo("sindoc"), nombres: "Sin", apellidos: "Documento" } });
  const tenant = await db.tenant.create({ data: { slug: `test-op-${sufijo}`, nombre: `Colegio Operacion ${sufijo}`, plan: "basico" } });
  tenantId = tenant.id;
  membershipId = (await db.membership.create({ data: { tenantId, userId: persona.id, rol: "profesor" } })).id;
  const salon = await db.salon.create({ data: { tenantId, nombre: "1.° A", nivel: "primaria", anio: 2026 } });
  const alumno = await db.alumno.create({ data: { tenantId, salonId: salon.id, nombres: "AlumnoSecreto", apellidos: "NoDebeVerse" } });
  alumnoId = alumno.id;
  await db.loginIntento.createMany({
    data: [
      { email: persona.email, ip: "190.12.34.56", exito: false },
      { email: persona.email, ip: "2800:200:abcd:1::1", exito: true, userId: persona.id },
    ],
  });
});

afterAll(async () => {
  await db.auditoriaPlataforma.deleteMany({ where: { OR: [{ actorId: superadmin.id }, { tenantId }] } });
  await db.loginIntento.deleteMany({ where: { email: { endsWith: `-${sufijo}@test-op.demo` } } });
  await db.tenant.deleteMany({ where: { id: tenantId } });
  await supabaseAdmin().auth.admin.deleteUser(persona.id).catch(() => {});
  await db.profile.deleteMany({ where: { email: { endsWith: `-${sufijo}@test-op.demo` } } });
  await db.$disconnect();
});

describe("usuarios", () => {
  it("busca por correo, nombre y documento, y pagina", async () => {
    for (const q of [persona.email, "Quispe Soporte".split(" ")[0] + "", "Soporte", DNI]) {
      const r = await buscarUsuarios(admin, { q });
      expect(r.filas.some((f) => f.id === persona.id), `q=${q}`).toBe(true);
    }
    const r = await buscarUsuarios(admin, { q: `-${sufijo}@test-op.demo` });
    expect(r.total).toBe(3);
    const fila = r.filas.find((f) => f.id === persona.id)!;
    expect(fila.memberships[0]).toMatchObject({ rol: "profesor", estado: "activa" });
    expect(r.filas.find((f) => f.id === superadmin.id)?.esSuperAdmin).toBe(true);
    const todos = await buscarUsuarios(admin, {});
    expect(todos.filas.length).toBeLessThanOrEqual(20);
    expect((await buscarUsuarios(admin, { q: "zzz-no-existe-" + sufijo })).filas).toHaveLength(0);
  });

  it("la ficha enmascara las IP y no expone datos de alumnos ni el documento", async () => {
    const f = await fichaUsuario(admin, persona.id);
    expect(f).not.toBeNull();
    expect(f!.intentos).toHaveLength(2);
    const texto = JSON.stringify(f);
    expect(texto).not.toContain("190.12.34.56");
    expect(texto).not.toContain("abcd:1::1");
    expect(texto).toContain("190.12.•.•");
    expect(texto).not.toContain(DNI);
    expect(texto).not.toContain("AlumnoSecreto");
    expect(texto).not.toContain(alumnoId);
    expect(f!.tieneDocumento).toBe(true);
    expect(await fichaUsuario(admin, "no-es-uuid")).toBeNull();
    expect(enmascararIp("10.1.2.3")).toBe("10.1.•.•");
  });

  it("restablecer al documento: cambia la contraseña, exige cambiarla y queda auditado en plataforma y en el colegio", async () => {
    await restablecerPasswordUsuario(admin, persona.id);
    expect((await db.profile.findUniqueOrThrow({ where: { id: persona.id } })).debeCambiarPassword).toBe(true);
    const supabase = (await import("@supabase/supabase-js")).createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { error } = await supabase.auth.signInWithPassword({ email: persona.email, password: DNI });
    expect(error).toBeNull();
    const plat = await db.auditoriaPlataforma.findFirstOrThrow({ where: { actorId: superadmin.id, accion: "usuario_restablecer_password" } });
    expect(JSON.stringify(plat.detalle)).not.toContain(DNI);
    const col = await db.auditoria.findFirst({ where: { tenantId, actorId: superadmin.id, entidad: "cuenta" } });
    expect(col).not.toBeNull();
  });

  it("sin documento válido no restablece; tampoco a sí mismo", async () => {
    await expect(restablecerPasswordUsuario(admin, sinDoc.id)).rejects.toThrow(/documento/);
    await expect(restablecerPasswordUsuario(admin, superadmin.id)).rejects.toThrow(/propia contraseña/);
  });

  it("enviar recuperación y forzar cambio quedan auditados", async () => {
    await db.profile.update({ where: { id: persona.id }, data: { debeCambiarPassword: false } });
    const enviar = vi.fn(async () => {});
    await enviarRecuperacionUsuario(admin, persona.id, enviar);
    expect(enviar).toHaveBeenCalledWith(persona.email);
    await forzarCambioPasswordUsuario(admin, persona.id);
    expect((await db.profile.findUniqueOrThrow({ where: { id: persona.id } })).debeCambiarPassword).toBe(true);
    const acciones = (await db.auditoriaPlataforma.findMany({ where: { actorId: superadmin.id } })).map((a) => a.accion);
    expect(acciones).toEqual(expect.arrayContaining(["usuario_enviar_recuperacion", "usuario_forzar_cambio_password"]));
  });

  it("desactiva y reactiva una membresía con auditoría del colegio", async () => {
    await cambiarEstadoMembresiaUsuario(admin, membershipId, false);
    expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).estado).toBe("inactiva");
    await expect(cambiarEstadoMembresiaUsuario(admin, membershipId, false)).rejects.toThrow(/ya está inactiva/);
    await cambiarEstadoMembresiaUsuario(admin, membershipId, true);
    expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).estado).toBe("activa");
    const filas = await db.auditoriaPlataforma.findMany({ where: { tenantId, accion: "usuario_membresia_estado" } });
    expect(filas).toHaveLength(2);
  });
});

describe("monitoreo", () => {
  it("estadoCron: al día, atrasado o nunca", () => {
    const ahora = new Date("2026-10-28T12:00:00Z");
    const hace = (m: number) => ({ ultimaEjecucion: new Date(ahora.getTime() - m * 60_000).toISOString(), resultado: "ok" as const, duracionMs: 5 });
    expect(estadoCron(null, ahora)).toEqual({ estado: "nunca", minutos: null });
    expect(estadoCron(hace(3), ahora)).toEqual({ estado: "al_dia", minutos: 3 });
    expect(estadoCron(hace(10), ahora).estado).toBe("al_dia");
    expect(estadoCron(hace(11), ahora)).toEqual({ estado: "atrasado", minutos: 11 });
  });

  it("registra la última ejecución del cron y el panel la lee", async () => {
    const previo = await db.configPlataforma.findUnique({ where: { clave: "cron:exportaciones" } });
    try {
      await registrarEjecucionCron("exportaciones", "ok", 123.4);
      const p = await panelMonitoreo(admin);
      const c = p.crons.find((x) => x.nombre === "exportaciones")!;
      expect(c.estado).toBe("al_dia");
      expect(c.ejecucion).toMatchObject({ resultado: "ok", duracionMs: 123 });
    } finally {
      if (previo) await db.configPlataforma.update({ where: { clave: "cron:exportaciones" }, data: { valor: previo.valor as object } });
      else await db.configPlataforma.deleteMany({ where: { clave: "cron:exportaciones" } });
    }
  });

  it("reintentar avisos con error solo toca los `error` del colegio y no muestra contenido", async () => {
    const base = { tenantId, tipo: "mensaje", canal: "correo", plantilla: "x", asunto: "ASUNTO-SECRETO", destinatario: "padre@secreto.test" } as const;
    await db.aviso.createMany({
      data: [
        { ...base, estado: "error", intentos: 4, error: "SMTP caído" },
        { ...base, estado: "error", intentos: 4, error: "SMTP caído" },
        { ...base, estado: "rebotado", error: "buzón inexistente" },
      ],
    });
    const panel = await panelMonitoreo(admin);
    expect(panel.erroresPorColegio.find((c) => c.tenantId === tenantId)?.avisos).toBe(2);
    expect(panel.rebotesPorColegio.find((c) => c.tenantId === tenantId)).toMatchObject({ rebotes: 1, quejas: 0 });
    expect(JSON.stringify(panel)).not.toMatch(/ASUNTO-SECRETO|padre@secreto/);
    expect(panel.usoCanales.map((c) => c.canal)).toEqual(["correo", "push", "whatsapp", "sms"]);

    expect(await reintentarAvisosConError(admin, tenantId)).toBe(2);
    expect(await db.aviso.count({ where: { tenantId, estado: "pendiente", intentos: 0, error: null } })).toBe(2);
    expect(await db.aviso.count({ where: { tenantId, estado: "rebotado" } })).toBe(1);
    expect(await db.auditoriaPlataforma.count({ where: { tenantId, accion: "avisos_reintentar" } })).toBe(1);
    expect(await db.auditoria.count({ where: { tenantId, entidad: "aviso", actorId: superadmin.id } })).toBe(1);
    await db.aviso.deleteMany({ where: { tenantId } });
  });

  it("procesar la cola ahora queda auditado", async () => {
    await procesarColaAhora(admin);
    expect(await db.auditoriaPlataforma.count({ where: { actorId: superadmin.id, accion: "cola_procesar" } })).toBe(1);
  });
});

describe("auditoría de plataforma", () => {
  beforeAll(async () => {
    await db.auditoriaPlataforma.deleteMany({ where: { actorId: superadmin.id } });
    const base = new Date("2026-03-10T15:00:00Z");
    for (let i = 0; i < 7; i++) {
      await db.auditoriaPlataforma.create({
        data: {
          actorId: superadmin.id, tenantId, accion: i % 2 ? "cambiar_plan" : "cambiar_estado",
          detalle: { i, contrasena: "supersecreta", documento: "12345678" }, createdAt: new Date(base.getTime() + i * 86_400_000),
        },
      });
    }
    await registrarAuditoriaPlataforma(admin, "accion_nueva_desconocida", null);
  });

  it("filtra por colegio, acción, actor y rango de fechas", async () => {
    const todas = await listarAuditoria(admin, { tenantId, actor: superadmin.email });
    expect(todas.filas).toHaveLength(7);
    expect(todas.filas[0].actor?.email).toBe(superadmin.email);
    expect(todas.filas[0].colegio?.id).toBe(tenantId);
    const porAccion = await listarAuditoria(admin, { tenantId, accion: "cambiar_plan" });
    expect(porAccion.filas).toHaveLength(3);
    expect(porAccion.filas.every((f) => f.texto === "Cambió el plan de un colegio")).toBe(true);
    const rango = await listarAuditoria(admin, { tenantId, desde: "2026-03-11", hasta: "2026-03-13" });
    expect(rango.filas).toHaveLength(3);
    expect((await listarAuditoria(admin, { actor: "nadie-" + sufijo })).filas).toHaveLength(0);
    expect(textoAccion("accion_nueva_desconocida")).toBe("accion nueva desconocida");
  });

  it("pagina por cursor sin repetir ni saltar filas", async () => {
    const vistos: string[] = [];
    let cursor: string | undefined;
    let paginas = 0;
    do {
      const r = await listarAuditoria(admin, { tenantId, cursor }, 3);
      vistos.push(...r.filas.map((f) => f.id));
      cursor = r.siguienteCursor ?? undefined;
      paginas++;
    } while (cursor && paginas < 10);
    expect(paginas).toBe(3);
    expect(vistos).toHaveLength(7);
    expect(new Set(vistos).size).toBe(7);
    expect([...vistos].map(BigInt).every((v, i, a) => i === 0 || a[i - 1] > v)).toBe(true);
  });

  it("el detalle no trae datos sensibles y el CSV usa los mismos filtros", async () => {
    const { filas } = await listarAuditoria(admin, { tenantId });
    const texto = JSON.stringify(filas);
    expect(texto).not.toMatch(/supersecreta|12345678/);
    expect(texto).toContain("[oculto]");
    expect(detalleSinSensibles({ a: { password: "x", n: 1 }, activo: true })).toEqual({ a: { password: "[oculto]", n: 1 }, activo: true });
    expect(await exportarAuditoria(admin, { tenantId, accion: "cambiar_estado" })).toHaveLength(4);
    expect(esquemaFiltroAuditoria.parse({ tenantId: "malo", desde: "ayer" })).toEqual({});
  });
});
