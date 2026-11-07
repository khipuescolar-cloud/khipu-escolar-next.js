import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { crearMaterial, nuevaVersionMaterial, moverMaterialAPapelera, eliminarDefinitivoMaterial } from "@/lib/server/materiales";
import { resolverAccesoMaterial } from "@/lib/server/archivos-acceso/material";
import { crearTarea, detalleTareaFamilia, eliminarTarea } from "@/lib/server/tareas";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba, alumno: TenantContext;
let uid: string;
const pdf = (nombre: string) => ({ nombre, buffer: Buffer.from("%PDF-1.4\n%test\n") });
beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-tarea-material" });
  uid = randomUUID();
  const user = await db.profile.create({ data: { id: uid, email: `${uid}@test-materiales.local`, nombres: "Mateo", apellidos: "Prueba" } });
  const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: uid, rol: "alumno" } });
  await c.db.alumno.update({ where: { id: c.alumnos.mateo.id }, data: { cuentaId: membership.id } });
  alumno = { ...c.ctxDe("madre"), user, membership, rol: "alumno", roles: ["alumno"] };
});
afterAll(async () => { await c?.limpiar(); await db.profile.deleteMany({ where: { id: uid } }); });

describe("referencia de materiales en tareas", () => {
  it("7: fija la versión, no duplica archivo y conserva descarga tras cambiar versión", async () => {
    const m = await crearMaterial(c.ctxDe("tutora"), { titulo: "Guía de fracciones", cursoIds: [c.cursoTutora.id], archivos: [pdf("guia.pdf")], publicar: false });
    const v1 = await c.db.materialVersion.findFirstOrThrow({ where: { materialId: m.id, numero: 1 }, include: { archivos: { include: { archivo: true } } } });
    const t = await crearTarea(c.ctxDe("tutora"), { titulo: "Resolver la guía", cursoId: c.cursoTutora.id, materialesExistentes: [{ materialId: m.id }] });
    expect(t.ok).toBe(true);
    const tareaId = t.tareaId!;
    expect(await c.db.tareaMaterial.count({ where: { tareaId, versionId: v1.id } })).toBe(1);
    expect(await c.db.archivo.count({ where: { id: v1.archivos[0].archivoId } })).toBe(1);
    expect(await resolverAccesoMaterial(alumno, v1.archivos[0].archivo)).toBe("permitir");
    expect((await detalleTareaFamilia(alumno, tareaId, c.alumnos.mateo.id)).tarea.adjuntos.map((a) => a.nombre)).toContain("guia.pdf");
    await nuevaVersionMaterial(c.ctxDe("tutora"), m.id, { archivos: [pdf("guia-v2.pdf")] });
    expect((await detalleTareaFamilia(alumno, tareaId, c.alumnos.mateo.id)).tarea.adjuntos.map((a) => a.nombre)).toEqual(["guia.pdf"]);
    await moverMaterialAPapelera(c.ctxDe("tutora"), m.id);
    await c.db.materialClase.update({ where: { id: m.id }, data: { eliminadoAt: new Date(Date.now() - 31 * 86400_000) } });
    await expect(eliminarDefinitivoMaterial(c.ctxDe("tutora"), m.id)).rejects.toThrow("referenciado");
    await eliminarTarea(c.ctxDe("tutora"), tareaId);
    expect(await c.db.archivo.count({ where: { id: v1.archivos[0].archivoId } })).toBe(1);
  });
});
