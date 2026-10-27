// Requiere la BD local con el seed. Crea su propio colegio de prueba y lo borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db, dbTenant } from "@/lib/server/db";
import { IntentNudito } from "@/lib/server/nudito/intent-nudito";
import { planIncluye } from "@/lib/planes";
import type { TenantContext } from "@/lib/server/tenant";

const motor = new IntentNudito();
const slugPrueba = `test-promax-${randomUUID().slice(0, 8)}`;

async function contextoDe(slug: string, email: string, rol: "apoderado" = "apoderado"): Promise<TenantContext> {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug } });
  const user = await db.profile.findUniqueOrThrow({ where: { email } });
  const membership = await db.membership.findFirstOrThrow({ where: { tenantId: tenant.id, userId: user.id, rol } });
  return { tenant, user, membership, rol, roles: [rol], db: dbTenant(tenant.id) };
}

describe("Nudito: aislamiento de datos", () => {
  afterAll(async () => {
    await db.tenant.deleteMany({ where: { slug: slugPrueba } });
    await db.$disconnect();
  });

  it("responde tareas reales del hijo en el seed (Nuevo Horizonte)", async () => {
    const ctx = await contextoDe("nuevohorizonte", "rosa.quispe@gmail.com");
    const r = await motor.responder(ctx, "¿qué tareas tiene Mateo?", []);
    expect(r.intencion).toBe("tareas_pendientes");
    expect(r.texto).toContain("Fichas de fracciones");
    expect(r.texto).toContain("Soy un asistente con IA");
    const siguiente = await motor.responder(ctx, "¿qué tareas tiene Mateo?", [{ autor: "nudito", cuerpo: "x", intencion: "saludo", derivado: false }]);
    expect(siguiente.texto).not.toContain("Soy un asistente con IA");
  });

  it("no devuelve tareas de otro salón ni de otro colegio", async () => {
    const rosa = await db.profile.findUniqueOrThrow({ where: { email: "rosa.quispe@gmail.com" } });
    const t = await db.tenant.create({ data: { slug: slugPrueba, nombre: "Test Promax", plan: "promax" } });
    const profe = await db.profile.findFirstOrThrow({ where: { email: "lucia.garcia@nuevohorizonte.demo" } });
    const mRosa = await db.membership.create({ data: { tenantId: t.id, userId: rosa.id, rol: "apoderado" } });
    const mProfe = await db.membership.create({ data: { tenantId: t.id, userId: profe.id, rol: "profesor" } });
    const salonA = await db.salon.create({ data: { tenantId: t.id, nombre: "A", nivel: "primaria", anio: 2026 } });
    const salonB = await db.salon.create({ data: { tenantId: t.id, nombre: "B", nivel: "primaria", anio: 2026 } });
    const cursoA = await db.curso.create({ data: { tenantId: t.id, salonId: salonA.id, nombre: "CursoA" } });
    const cursoB = await db.curso.create({ data: { tenantId: t.id, salonId: salonB.id, nombre: "CursoB" } });
    const hijo = await db.alumno.create({ data: { tenantId: t.id, salonId: salonA.id, nombres: "Hijo", apellidos: "Propio" } });
    await db.alumno.create({ data: { tenantId: t.id, salonId: salonB.id, nombres: "Ajeno", apellidos: "Otro" } });
    await db.apoderadoAlumno.create({ data: { tenantId: t.id, apoderadoId: mRosa.id, alumnoId: hijo.id } });
    const en = (d: number) => new Date(Date.now() + d * 86_400_000);
    await db.tarea.create({ data: { tenantId: t.id, cursoId: cursoA.id, titulo: "TAREA_PROPIA", fechaEntrega: en(2), creadoPorId: mProfe.id } });
    await db.tarea.create({ data: { tenantId: t.id, cursoId: cursoB.id, titulo: "TAREA_AJENA", fechaEntrega: en(2), creadoPorId: mProfe.id } });

    const ctxPrueba = await contextoDe(slugPrueba, "rosa.quispe@gmail.com");
    const r = await motor.responder(ctxPrueba, "¿qué tareas tiene?", []);
    expect(r.texto).toContain("TAREA_PROPIA");
    expect(r.texto).not.toContain("TAREA_AJENA");

    // Nombra a un alumno que SÍ existe en el colegio pero no es su hijo: no responde con datos de su hijo
    // ni revela que ese alumno existe (misma respuesta que con un nombre inventado).
    const ajeno = await motor.responder(ctxPrueba, "¿qué tareas tiene Ajeno?", []);
    expect(ajeno.texto).toContain("No encuentro a Ajeno entre tus hijos. Puedo ayudarte con Hijo.");
    expect(ajeno.texto).not.toContain("TAREA_PROPIA");
    expect(ajeno.texto).not.toContain("TAREA_AJENA");
    const inventado = await motor.responder(ctxPrueba, "¿qué tareas tiene Zzyzx?", []);
    expect(inventado.texto.replace("Zzyzx", "Ajeno")).toBe(ajeno.texto);

    const ctxNh = await contextoDe("nuevohorizonte", "rosa.quispe@gmail.com");
    const rNh = await motor.responder(ctxNh, "¿qué tareas tiene Mateo?", []);
    expect(rNh.texto).not.toContain("TAREA_PROPIA");
    expect(rNh.texto).not.toContain("TAREA_AJENA");
  });

  it("deriva las malas noticias y no inventa asistencia", async () => {
    const ctx = await contextoDe("nuevohorizonte", "rosa.quispe@gmail.com");
    const r = await motor.responder(ctx, "¿Mateo faltó hoy?", []);
    expect(r.derivado).toBe(true);
    expect(r.texto).toContain("Para eso es mejor hablar con su tutora.");
    expect(r.acciones?.[0].tipo).toBe("abrir_chat");
  });

  it("el plan Fase 2 (academiaeuler) no incluye Nudito", async () => {
    const eu = await db.tenant.findUniqueOrThrow({ where: { slug: "academiaeuler" } });
    expect(planIncluye(eu.plan, "nudito")).toBe(false);
  });
});
