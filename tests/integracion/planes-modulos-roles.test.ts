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

let pro: ColegioPrueba;
let base: ColegioPrueba;
let admin: AdminContext;

const ctxDe = (c: ColegioPrueba, quien: "direccion" | "tutora", user?: Profile) =>
  resolverContextoColegio(user ?? c.miembros[quien].user, c.tenant.slug);

beforeAll(async () => {
  pro = await crearColegioPrueba({ plan: "pro", prefijo: "test-modulos" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-modulos" });
  admin = { user: pro.miembros.direccion.user };
  invalidarCacheModulos();
});

afterAll(async () => {
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: admin.user.id } });
  await pro?.limpiar();
  await base?.limpiar();
  invalidarCacheModulos();
});

describe("módulos por plan (PlanModulo)", () => {
  it("quitar un módulo de un plan bloquea (403) sus páginas y acciones en los colegios de ese plan", async () => {
    const antes = await ctxDe(pro, "tutora");
    expect(tieneFeature(antes, "tareas")).toBe(true);
    try {
      const { afectados } = await cambiarModuloDePlan(admin, "pro", "tareas", false);
      expect(afectados).toBeGreaterThanOrEqual(1);
      const ctx = await ctxDe(pro, "tutora");
      expect(ctx.modulos.has("tareas")).toBe(false);
      expect(() => requireFeature(ctx, "tareas")).toThrow();
      await esperarProhibido(tareasDelDocente(ctx));
      // Khipu Pro es el plan mayor: si ningún plan del catálogo incluye el módulo, se oculta (no hay candado que ofrecer).
      expect(estadoModulo(ctx, "tareas")).toEqual({ estado: "oculto" });
      // Otro módulo del plan sigue disponible.
      expect(tieneFeature(ctx, "notas")).toBe(true);
      const planes = await planesDelCatalogo(admin);
      expect(planes.find((p) => p.plan === "pro")?.modulos).not.toContain("tareas");
    } finally {
      await cambiarModuloDePlan(admin, "pro", "tareas", true);
    }
    expect(tieneFeature(await ctxDe(pro, "tutora"), "tareas")).toBe(true);
    const auditoria = await db.auditoriaPlataforma.findMany({ where: { actorId: admin.user.id, accion: "plan_modulo" } });
    expect(auditoria.length).toBeGreaterThanOrEqual(2);
  });

  it("gestion no se puede quitar de un plan", async () => {
    await expect(cambiarModuloDePlan(admin, "base", "gestion", false)).rejects.toThrow(/esencial/);
    expect((await ctxDe(base, "direccion")).modulos.has("gestion")).toBe(true);
  });
});

describe("módulos de un colegio (TenantModulo)", () => {
  it("un módulo extra lo habilita aunque el plan no lo tenga; quitar uno del plan lo oculta", async () => {
    expect(estadoModulo(await ctxDe(base, "direccion"), "notas").estado).toBe("bloqueado");

    await cambiarModuloDeColegio(admin, base.tenant.id, { modulo: "notas", accion: "agregar", motivo: "Piloto de notas" });
    await cambiarModuloDeColegio(admin, base.tenant.id, { modulo: "comunicados", accion: "quitar", motivo: "Pedido de la dirección" });
    const ctx = await ctxDe(base, "direccion");
    expect(tieneFeature(ctx, "notas")).toBe(true);
    expect(tieneFeature(ctx, "comunicados")).toBe(false);
    expect(estadoModulo(ctx, "comunicados")).toEqual({ estado: "oculto" });
    // Otro colegio con el mismo plan no cambia.
    const panel = await modulosDeColegioParaPanel(admin, base.tenant.id);
    expect(panel.find((m) => m.modulo === "notas")).toMatchObject({ estado: "extra", motivo: "Piloto de notas" });
    expect(panel.find((m) => m.modulo === "comunicados")).toMatchObject({ estado: "quitado" });

    await cambiarModuloDeColegio(admin, base.tenant.id, { modulo: "notas", accion: "restablecer" });
    await cambiarModuloDeColegio(admin, base.tenant.id, { modulo: "comunicados", accion: "restablecer" });
    const despues = await ctxDe(base, "direccion");
    expect(tieneFeature(despues, "notas")).toBe(false);
    expect(tieneFeature(despues, "comunicados")).toBe(true);
  });

  it("exige motivo y no permite tocar gestion", async () => {
    await expect(cambiarModuloDeColegio(admin, base.tenant.id, { modulo: "notas", accion: "agregar", motivo: "" })).rejects.toThrow(/motivo/);
    await expect(cambiarModuloDeColegio(admin, base.tenant.id, { modulo: "gestion", accion: "quitar", motivo: "No debería" })).rejects.toThrow(/esencial/);
  });

  it("la caché en memoria se invalida al guardar desde el panel", async () => {
    await modulosDelColegio(base.tenant); // llena la caché
    // Escritura directa (sin pasar por el panel): la caché la oculta hasta invalidar.
    await db.tenantModulo.create({ data: { tenantId: base.tenant.id, modulo: "agenda", habilitado: true, motivo: "directo" } });
    expect((await modulosDelColegio(base.tenant)).activos.has("agenda")).toBe(false);
    invalidarCacheModulos({ tenantId: base.tenant.id });
    expect((await modulosDelColegio(base.tenant)).activos.has("agenda")).toBe(true);
    // Guardar desde el panel invalida sola.
    await cambiarModuloDeColegio(admin, base.tenant.id, { modulo: "agenda", accion: "restablecer" });
    expect((await modulosDelColegio(base.tenant)).activos.has("agenda")).toBe(false);
  });
});

describe("módulos por rol (RolModulo)", () => {
  it("quitar un módulo a un rol lo bloquea solo para ese rol", async () => {
    try {
      await cambiarModuloDeRol(admin, { rol: "profesor", modulo: "agenda", habilitado: false });
      const profe = await ctxDe(pro, "tutora");
      const dir = await ctxDe(pro, "direccion");
      expect(tieneFeature(profe, "agenda")).toBe(false);
      expect(estadoModulo(profe, "agenda")).toEqual({ estado: "oculto" });
      await esperarProhibido(itemsDeAgenda(profe, new Date("2026-01-01"), new Date("2026-12-31")));
      expect(tieneFeature(dir, "agenda")).toBe(true);
      expect((await matrizRoles(admin)).profesor.agenda).toBe("desactivado");
    } finally {
      await cambiarModuloDeRol(admin, { rol: "profesor", modulo: "agenda", habilitado: true });
    }
    expect(tieneFeature(await ctxDe(pro, "tutora"), "agenda")).toBe(true);
  });

  it("no se puede dar un módulo que el código no soporta ni desactivar gestion", async () => {
    expect((await matrizRoles(admin)).alumno.mensajes).toBe("no_disponible");
    await expect(cambiarModuloDeRol(admin, { rol: "alumno", modulo: "mensajes", habilitado: true })).rejects.toThrow(/no está disponible/);
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
