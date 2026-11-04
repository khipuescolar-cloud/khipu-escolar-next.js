// Acceso a Nudito, tutor de Khipu Pro (specs/44). Requiere la BD local; crea colegios `test-nudito-acc-*` y los borra.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONSENTIMIENTO_POR_DEFECTO } from "@/lib/nudito-plus";
import { db } from "@/lib/server/db";
import { evaluarAccesoNuditoPlus, requireNuditoPlus } from "@/lib/server/nudito-plus/acceso";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let pro: ColegioPrueba;
let base: ColegioPrueba;

const consentir = (c: ColegioPrueba, alumnoId: string, versionTexto: string) =>
  db.consentimientoIa.create({ data: { tenantId: c.tenant.id, apoderadoId: c.miembros.madre.membership.id, alumnoId, versionTexto } });

beforeAll(async () => {
  pro = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-acc" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-nudito-acc" });
  await db.salon.update({ where: { id: pro.salon.id }, data: { grado: 3 } });
});

afterAll(async () => {
  await pro.limpiar();
  await base.limpiar();
  await db.$disconnect();
});

describe("acceso a Nudito", () => {
  it("sin configuración del colegio (o apagada) → bloqueado con motivo «colegio»", async () => {
    await consentir(pro, pro.alumnos.mateo.id, CONSENTIMIENTO_POR_DEFECTO.version);
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id)).toMatchObject({ ok: false, motivo: "colegio" });
    await esperarProhibido(requireNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id));
    await db.nuditoConfigColegio.create({ data: { tenantId: pro.tenant.id, activo: false } });
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id)).toMatchObject({ ok: false, motivo: "colegio" });
  });

  it("activo → entra en modo hijo; bloqueado por la plataforma → «colegio»", async () => {
    await db.nuditoConfigColegio.update({ where: { tenantId: pro.tenant.id }, data: { activo: true } });
    expect(await requireNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id)).toMatchObject({ modo: "hijo", alumno: { id: pro.alumnos.mateo.id } });
    await db.nuditoConfigColegio.update({ where: { tenantId: pro.tenant.id }, data: { bloqueadoPlataforma: true } });
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id)).toMatchObject({ ok: false, motivo: "colegio" });
    await db.nuditoConfigColegio.update({ where: { tenantId: pro.tenant.id }, data: { bloqueadoPlataforma: false } });
  });

  it("grado, área y modo hijo según la configuración", async () => {
    await db.nuditoConfigColegio.update({ where: { tenantId: pro.tenant.id }, data: { gradoMinimoPrimaria: 4 } });
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id)).toMatchObject({ ok: false, motivo: "grado" });
    await db.nuditoConfigColegio.update({ where: { tenantId: pro.tenant.id }, data: { gradoMinimoPrimaria: 1, areas: ["matematica"] } });
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id, new Date(), { area: "comunicacion" })).toMatchObject({ ok: false, motivo: "grado" });
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id, new Date(), { area: "matematica" })).toMatchObject({ ok: true });
    await db.nuditoConfigColegio.update({ where: { tenantId: pro.tenant.id }, data: { permitirModoHijo: false } });
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.mateo.id)).toMatchObject({ ok: false, motivo: "modo_hijo" });
    await db.nuditoConfigColegio.update({ where: { tenantId: pro.tenant.id }, data: { permitirModoHijo: true, areas: ["matematica", "comunicacion", "ciencia-tecnologia"] } });
  });

  it("consentimiento v2: el de la versión v1 (Nudito+ familiar) ya no vale", async () => {
    expect(CONSENTIMIENTO_POR_DEFECTO.version).toBe("v2");
    await consentir(pro, pro.alumnos.valentina.id, "v1");
    await db.apoderadoAlumno.create({ data: { tenantId: pro.tenant.id, apoderadoId: pro.miembros.madre.membership.id, alumnoId: pro.alumnos.valentina.id } });
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.valentina.id)).toMatchObject({ ok: false, motivo: "consentimiento" });
    await consentir(pro, pro.alumnos.valentina.id, "v2");
    expect(await evaluarAccesoNuditoPlus(pro.ctxDe("madre"), pro.alumnos.valentina.id)).toMatchObject({ ok: true, modo: "hijo" });
  });

  it("Khipu Base → 403 aunque tenga configuración activa y consentimiento", async () => {
    await db.nuditoConfigColegio.create({ data: { tenantId: base.tenant.id, activo: true } });
    await consentir(base, base.alumnos.mateo.id, "v2");
    expect(await evaluarAccesoNuditoPlus(base.ctxDe("madre"), base.alumnos.mateo.id)).toEqual({ ok: false, motivo: "plan" });
    await esperarProhibido(requireNuditoPlus(base.ctxDe("madre"), base.alumnos.mateo.id));
  });

  it("modo soporte → 403; profesores y dirección no usan el tutor", async () => {
    const soporte = { ...pro.ctxDe("direccion"), soporte: { accesoId: randomUUID(), expiraAt: new Date(Date.now() + 3_600_000) } };
    expect(await evaluarAccesoNuditoPlus(soporte, pro.alumnos.mateo.id)).toEqual({ ok: false, motivo: "plan" });
    await esperarProhibido(requireNuditoPlus(soporte, pro.alumnos.mateo.id));
    for (const quien of ["tutora", "direccion"] as const) await esperarProhibido(requireNuditoPlus(pro.ctxDe(quien), pro.alumnos.mateo.id));
  });
});
