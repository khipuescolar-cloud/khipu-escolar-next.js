// Planes, módulos y roles desde la BD (specs/19). Usa colegios de prueba aislados; los cambios globales
// (módulo de un plan, módulo de un rol) se revierten al terminar cada prueba.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import { catalogoModulos, invalidarCacheModulos, modulosDelColegio } from "@/lib/server/modulos";
import { estadoModulo, requireFeature, tieneFeature } from "@/lib/server/plan";
import type { AdminContext } from "@/lib/server/plataforma";
import { cambiarModuloDeColegio, cambiarModuloDePlan, modulosDeColegioParaPanel, planesDelCatalogo } from "@/lib/server/plataforma-planes";
import { cambiarModuloDeRol, matrizRoles, restablecerRoles } from "@/lib/server/plataforma-roles";
import { itemsDeAgenda } from "@/lib/server/agenda";
import { tareasDelDocente } from "@/lib/server/tareas";
import { resolverContextoColegio } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let fase2: ColegioPrueba;
let basico: ColegioPrueba;
let admin: AdminContext;

const ctxDe = (c: ColegioPrueba, quien: "direccion" | "tutora", user?: Profile) =>
  resolverContextoColegio(user ?? c.miembros[quien].user, c.tenant.slug);

beforeAll(async () => {
  fase2 = await crearColegioPrueba({ plan: "fase2", prefijo: "test-modulos" });
  basico = await crearColegioPrueba({ plan: "basico", prefijo: "test-modulos" });
  admin = { user: fase2.miembros.direccion.user };
  invalidarCacheModulos();
});

afterAll(async () => {
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: admin.user.id } });
  await fase2?.limpiar();
  await basico?.limpiar();
  invalidarCacheModulos();
});

describe("módulos por plan (PlanModulo)", () => {
  it("quitar un módulo de un plan bloquea (403) sus páginas y acciones en los colegios de ese plan", async () => {
    const antes = await ctxDe(fase2, "tutora");
    expect(tieneFeature(antes, "tareas")).toBe(true);
    try {
      const { afectados } = await cambiarModuloDePlan(admin, "fase2", "tareas", false);
      expect(afectados).toBeGreaterThanOrEqual(1);
      const ctx = await ctxDe(fase2, "tutora");
      expect(ctx.modulos.has("tareas")).toBe(false);
      expect(() => requireFeature(ctx, "tareas")).toThrow();
      await esperarProhibido(tareasDelDocente(ctx));
      // Candado (no oculto): el módulo sigue en otro plan del catálogo.
      expect(estadoModulo(ctx, "tareas")).toEqual({ estado: "bloqueado", planMinimo: expect.any(String) });
      // Otro módulo del plan sigue disponible.
      expect(tieneFeature(ctx, "notas")).toBe(true);
      const planes = await planesDelCatalogo(admin);
      expect(planes.find((p) => p.plan === "fase2")?.modulos).not.toContain("tareas");
    } finally {
      await cambiarModuloDePlan(admin, "fase2", "tareas", true);
    }
    expect(tieneFeature(await ctxDe(fase2, "tutora"), "tareas")).toBe(true);
    const auditoria = await db.auditoriaPlataforma.findMany({ where: { actorId: admin.user.id, accion: "plan_modulo" } });
    expect(auditoria.length).toBeGreaterThanOrEqual(2);
  });

  it("gestion no se puede quitar de un plan", async () => {
    await expect(cambiarModuloDePlan(admin, "basico", "gestion", false)).rejects.toThrow(/esencial/);
    expect((await ctxDe(basico, "direccion")).modulos.has("gestion")).toBe(true);
  });
});

describe("módulos de un colegio (TenantModulo)", () => {
  it("un módulo extra lo habilita aunque el plan no lo tenga; quitar uno del plan lo oculta", async () => {
    expect(estadoModulo(await ctxDe(basico, "direccion"), "notas").estado).toBe("bloqueado");

    await cambiarModuloDeColegio(admin, basico.tenant.id, { modulo: "notas", accion: "agregar", motivo: "Piloto de notas" });
    await cambiarModuloDeColegio(admin, basico.tenant.id, { modulo: "comunicados", accion: "quitar", motivo: "Pedido de la dirección" });
    const ctx = await ctxDe(basico, "direccion");
    expect(tieneFeature(ctx, "notas")).toBe(true);
    expect(tieneFeature(ctx, "comunicados")).toBe(false);
    expect(estadoModulo(ctx, "comunicados")).toEqual({ estado: "oculto" });
    // Otro colegio con el mismo plan no cambia.
    const panel = await modulosDeColegioParaPanel(admin, basico.tenant.id);
    expect(panel.find((m) => m.modulo === "notas")).toMatchObject({ estado: "extra", motivo: "Piloto de notas" });
    expect(panel.find((m) => m.modulo === "comunicados")).toMatchObject({ estado: "quitado" });

    await cambiarModuloDeColegio(admin, basico.tenant.id, { modulo: "notas", accion: "restablecer" });
    await cambiarModuloDeColegio(admin, basico.tenant.id, { modulo: "comunicados", accion: "restablecer" });
    const despues = await ctxDe(basico, "direccion");
    expect(tieneFeature(despues, "notas")).toBe(false);
    expect(tieneFeature(despues, "comunicados")).toBe(true);
  });

  it("exige motivo y no permite tocar gestion", async () => {
    await expect(cambiarModuloDeColegio(admin, basico.tenant.id, { modulo: "notas", accion: "agregar", motivo: "" })).rejects.toThrow(/motivo/);
    await expect(cambiarModuloDeColegio(admin, basico.tenant.id, { modulo: "gestion", accion: "quitar", motivo: "No debería" })).rejects.toThrow(/esencial/);
  });

  it("la caché en memoria se invalida al guardar desde el panel", async () => {
    await modulosDelColegio(basico.tenant); // llena la caché
    // Escritura directa (sin pasar por el panel): la caché la oculta hasta invalidar.
    await db.tenantModulo.create({ data: { tenantId: basico.tenant.id, modulo: "agenda", habilitado: true, motivo: "directo" } });
    expect((await modulosDelColegio(basico.tenant)).activos.has("agenda")).toBe(false);
    invalidarCacheModulos({ tenantId: basico.tenant.id });
    expect((await modulosDelColegio(basico.tenant)).activos.has("agenda")).toBe(true);
    // Guardar desde el panel invalida sola.
    await cambiarModuloDeColegio(admin, basico.tenant.id, { modulo: "agenda", accion: "restablecer" });
    expect((await modulosDelColegio(basico.tenant)).activos.has("agenda")).toBe(false);
  });
});

describe("módulos por rol (RolModulo)", () => {
  it("quitar un módulo a un rol lo bloquea solo para ese rol", async () => {
    try {
      await cambiarModuloDeRol(admin, { rol: "profesor", modulo: "agenda", habilitado: false });
      const profe = await ctxDe(fase2, "tutora");
      const dir = await ctxDe(fase2, "direccion");
      expect(tieneFeature(profe, "agenda")).toBe(false);
      expect(estadoModulo(profe, "agenda")).toEqual({ estado: "oculto" });
      await esperarProhibido(itemsDeAgenda(profe, new Date("2026-01-01"), new Date("2026-12-31")));
      expect(tieneFeature(dir, "agenda")).toBe(true);
      expect((await matrizRoles(admin)).profesor.agenda).toBe("desactivado");
    } finally {
      await cambiarModuloDeRol(admin, { rol: "profesor", modulo: "agenda", habilitado: true });
    }
    expect(tieneFeature(await ctxDe(fase2, "tutora"), "agenda")).toBe(true);
  });

  it("no se puede dar un módulo que el código no soporta ni desactivar gestion", async () => {
    expect((await matrizRoles(admin)).alumno.mensajes).toBe("no_disponible");
    await expect(cambiarModuloDeRol(admin, { rol: "alumno", modulo: "nudito", habilitado: true })).rejects.toThrow(/no está disponible/);
    await expect(cambiarModuloDeRol(admin, { rol: "direccion", modulo: "gestion", habilitado: false })).rejects.toThrow(/esencial/);
  });

  it("restablecer vuelve a los valores por defecto", async () => {
    const previas = await db.rolModulo.findMany();
    try {
      await cambiarModuloDeRol(admin, { rol: "porteria", modulo: "porteria", habilitado: false });
      expect((await catalogoModulos()).desactivadosPorRol.get("porteria")?.has("porteria")).toBe(true);
      await restablecerRoles(admin);
      expect((await catalogoModulos()).desactivadosPorRol.size).toBe(0);
    } finally {
      await db.rolModulo.deleteMany({});
      if (previas.length) await db.rolModulo.createMany({ data: previas.map(({ rol, modulo, habilitado }) => ({ rol, modulo, habilitado })) });
      invalidarCacheModulos();
    }
  });
});
