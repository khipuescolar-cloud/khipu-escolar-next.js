import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { crearMaterial, listarMateriales, nuevaVersionMaterial, moverMaterialAPapelera, restaurarMaterial, eliminarDefinitivoMaterial } from "@/lib/server/materiales";
import { resolverAccesoMaterial } from "@/lib/server/archivos-acceso/material";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const pdf = (nombre: string) => ({ nombre, buffer: Buffer.from("%PDF-1.4\n%test\n") });
let c: ColegioPrueba, otro: ColegioPrueba, base: ColegioPrueba;
let alumno: TenantContext;
let gemelo: string;
let id: string;
const perfiles: string[] = [];

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-materiales" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-materiales-otro" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-materiales-base" });
  gemelo = (await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombre: "Matemática", profesorId: c.miembros.tutora.membership.id } })).id;
  const uid = randomUUID(); perfiles.push(uid);
  const user = await db.profile.create({ data: { id: uid, email: `${uid}@test-materiales.local`, nombres: "Alumno", apellidos: "Prueba" } });
  const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: uid, rol: "alumno" } });
  await c.db.alumno.update({ where: { id: c.alumnos.mateo.id }, data: { cuentaId: membership.id } });
  alumno = { ...c.ctxDe("madre"), user, membership, rol: "alumno", roles: ["alumno"] };
});
afterAll(async () => {
  await c?.limpiar(); await otro?.limpiar(); await base?.limpiar();
  await db.profile.deleteMany({ where: { id: { in: perfiles } } });
});

describe("materiales de clase", () => {
  it("1, 2, 3, 4: acepta cursos propios gemelos y un solo archivo para dos secciones", async () => {
    await esperarProhibido(crearMaterial(c.ctxDe("tutora"), { titulo: "Material ajeno", cursoIds: [c.cursoAjeno.id], archivos: [pdf("ajeno.pdf")], publicar: true }));
    const r = await crearMaterial(c.ctxDe("tutora"), { titulo: "Fracciones", cursoIds: [c.cursoTutora.id, gemelo], archivos: [pdf("fracciones.pdf")], publicar: true });
    id = r.id;
    expect(await c.db.materialSeccion.count({ where: { materialId: id } })).toBe(2);
    expect(await c.db.materialVersionArchivo.count({ where: { version: { materialId: id } } })).toBe(1);
    expect((await listarMateriales(c.ctxDe("tutora"))).anios[0].cursos[0].secciones).toHaveLength(2);
  });
  it("5, 6, 19: alumno autorizado ve, otro colegio y Base no", async () => {
    const arbol = await listarMateriales(alumno);
    expect(arbol.anios[0].cursos[0].secciones[0].materiales[0].id).toBe(id);
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { versionesMaterial: { some: { version: { materialId: id } } } } });
    expect(await resolverAccesoMaterial(alumno, archivo)).toBe("permitir");
    expect((await listarMateriales(otro.ctxDe("madre"))).anios).toHaveLength(0);
    await esperarProhibido(listarMateriales(base.ctxDe("madre")));
  });
  it("versiones conservadas y papelera recuperable", async () => {
    expect(await nuevaVersionMaterial(c.ctxDe("tutora"), id, { archivos: [pdf("fracciones-v2.pdf")] })).toEqual({ numero: 2 });
    expect(await c.db.materialVersion.count({ where: { materialId: id } })).toBe(2);
    await moverMaterialAPapelera(c.ctxDe("tutora"), id);
    expect((await listarMateriales(alumno)).anios).toHaveLength(0);
    await restaurarMaterial(c.ctxDe("tutora"), id);
    expect((await listarMateriales(alumno)).anios).toHaveLength(1);
    await expect(eliminarDefinitivoMaterial(c.ctxDe("tutora"), id)).rejects.toThrow("30 días");
  });
});
