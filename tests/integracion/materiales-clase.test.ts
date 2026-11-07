import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { carpetasDeSalon, crearMaterial, crearSubcarpetaMaterial, compartirMaterial, listarMateriales, listarSubcarpetasMaterial, moverMaterialACarpeta, nuevaVersionMaterial, moverMaterialAPapelera, restaurarMaterial, eliminarDefinitivoMaterial } from "@/lib/server/materiales";
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
  it("crea carpetas de salón automáticamente desde las asignaciones, aun vacías", async () => {
    const carpetas = await carpetasDeSalon(c.ctxDe("tutora"));
    expect(carpetas.map(x => x.id).sort()).toEqual([c.cursoTutora.id, gemelo].sort());
    expect(carpetas.some(x => x.id === c.cursoAjeno.id)).toBe(false);
    expect(await listarSubcarpetasMaterial(c.ctxDe("tutora"), c.cursoTutora.id)).toEqual([]);
  });
  it("impide crear o subir en un curso ajeno y exige nombres únicos entre hermanas", async () => {
    await esperarProhibido(crearSubcarpetaMaterial(c.ctxDe("tutora"), { cursoId: c.cursoAjeno.id, nombre: "Unidad 1" }));
    await esperarProhibido(crearMaterial(c.ctxDe("tutora"), { titulo: "Intento ajeno", cursoIds: [c.cursoAjeno.id], archivos: [pdf("ajeno.pdf")], publicar: true }));
    const raiz = await crearSubcarpetaMaterial(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, nombre: "Unidad 1" });
    await expect(crearSubcarpetaMaterial(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, nombre: "unidad 1" })).rejects.toThrow("Ya hay una carpeta");
    const hija = await crearSubcarpetaMaterial(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, parentId: raiz.id, nombre: "Unidad 1" });
    expect(hija.id).not.toBe(raiz.id);
    const material = await crearMaterial(c.ctxDe("tutora"), { titulo: "Material en carpeta", cursoIds: [c.cursoTutora.id], carpetaId: hija.id, archivos: [pdf("unidad.pdf")], publicar: true });
    expect((await c.db.materialClase.findUniqueOrThrow({ where: { id: material.id } })).carpetaId).toBe(hija.id);
    await moverMaterialACarpeta(c.ctxDe("tutora"), material.id, c.cursoTutora.id, null);
    expect((await c.db.materialClase.findUniqueOrThrow({ where: { id: material.id } })).carpetaId).toBeNull();
    await esperarProhibido(moverMaterialACarpeta(c.ctxDe("tutora"), material.id, c.cursoAjeno.id, hija.id));
    await esperarProhibido(crearMaterial(c.ctxDe("tutora"), { titulo: "Cruce de salón", cursoIds: [gemelo], carpetaId: hija.id, archivos: [pdf("cruce.pdf")], publicar: true }));
  });
  it("alumno y familia ven solo carpetas de sus salones", async () => {
    expect((await carpetasDeSalon(alumno)).map(x => x.id)).toContain(c.cursoTutora.id);
    expect((await carpetasDeSalon(alumno)).map(x => x.id)).not.toContain(gemelo);
    expect((await carpetasDeSalon(c.ctxDe("madre"))).map(x => x.id)).toContain(c.cursoTutora.id);
    expect((await carpetasDeSalon(c.ctxDe("madre"))).map(x => x.id)).not.toContain(gemelo);
    await esperarProhibido(listarSubcarpetasMaterial(alumno, gemelo));
  });
  it("1, 2, 3, 4: acepta cursos propios gemelos y un solo archivo para dos secciones", async () => {
    await esperarProhibido(crearMaterial(c.ctxDe("tutora"), { titulo: "Material ajeno", cursoIds: [c.cursoAjeno.id], archivos: [pdf("ajeno.pdf")], publicar: true }));
    const r = await crearMaterial(c.ctxDe("tutora"), { titulo: "Fracciones", cursoIds: [c.cursoTutora.id, gemelo], archivos: [pdf("fracciones.pdf")], publicar: true });
    id = r.id;
    expect(await c.db.materialSeccion.count({ where: { materialId: id } })).toBe(2);
    expect(await c.db.materialVersionArchivo.count({ where: { version: { materialId: id } } })).toBe(1);
    expect((await listarMateriales(c.ctxDe("tutora"))).anios[0].cursos[0].secciones).toHaveLength(2);
    await expect(moverMaterialACarpeta(c.ctxDe("tutora"), id, c.cursoTutora.id, null)).rejects.toThrow("varios salones");
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
    expect((await listarMateriales(alumno)).anios.flatMap(a => a.cursos.flatMap(c => c.secciones.flatMap(s => s.materiales))).some(m => m.id === id)).toBe(false);
    await restaurarMaterial(c.ctxDe("tutora"), id);
    expect((await listarMateriales(alumno)).anios).toHaveLength(1);
    await expect(eliminarDefinitivoMaterial(c.ctxDe("tutora"), id)).rejects.toThrow("30 días");
  });
  it("comparte sin copiar archivos, valida curso y docente, y respeta el salón de origen", async () => {
    const r = await crearMaterial(c.ctxDe("tutora"), { titulo: "Material para compartir", cursoIds: [c.cursoTutora.id], archivos: [pdf("compartir.pdf")], publicar: true });
    const archivosAntes = await c.db.archivo.count({ where: { versionesMaterial: { some: { version: { materialId: r.id } } } } });
    await compartirMaterial(c.ctxDe("tutora"), r.id, [c.cursoTutora.id, gemelo]);
    expect(await c.db.materialSeccion.count({ where: { materialId: r.id } })).toBe(2);
    expect(await c.db.archivo.count({ where: { versionesMaterial: { some: { version: { materialId: r.id } } } } })).toBe(archivosAntes);
    const uid = randomUUID(); perfiles.push(uid);
    const user = await db.profile.create({ data: { id: uid, email: `${uid}@test-materiales.local`, nombres: "Alumno", apellidos: "Compartido" } });
    const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: uid, rol: "alumno" } });
    await c.db.alumno.update({ where: { id: c.alumnos.thiago.id }, data: { cuentaId: membership.id } });
    const alumnoGemelo: TenantContext = { ...c.ctxDe("madre"), user, membership, rol: "alumno", roles: ["alumno"] };
    expect((await listarMateriales(alumnoGemelo)).anios.flatMap(a => a.cursos.flatMap(cu => cu.secciones.flatMap(s => s.materiales))).some(m => m.id === r.id)).toBe(true);
    expect((await listarMateriales(otro.ctxDe("madre"))).anios).toHaveLength(0);
    await esperarProhibido(compartirMaterial(c.ctxDe("tutora"), r.id, [c.cursoTutora.id, c.cursoAjeno.id]));
    const cursoProfesorAjeno = await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombre: "Matemática", profesorId: c.miembros.otroProfesor.membership.id } });
    await esperarProhibido(compartirMaterial(c.ctxDe("tutora"), r.id, [c.cursoTutora.id, cursoProfesorAjeno.id]));
    const cursoOtroNombre = await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.otroSalon.id, nombre: "Comunicación", profesorId: c.miembros.tutora.membership.id } });
    await esperarProhibido(compartirMaterial(c.ctxDe("tutora"), r.id, [c.cursoTutora.id, cursoOtroNombre.id]));
    await expect(compartirMaterial(c.ctxDe("tutora"), r.id, [])).rejects.toThrow("al menos un salón");
    await expect(compartirMaterial(c.ctxDe("tutora"), r.id, [gemelo])).rejects.toThrow("salón de origen");
    await compartirMaterial(c.ctxDe("tutora"), r.id, [c.cursoTutora.id]);
    expect((await listarMateriales(alumnoGemelo)).anios.flatMap(a => a.cursos.flatMap(cu => cu.secciones.flatMap(s => s.materiales))).some(m => m.id === r.id)).toBe(false);
  });
});
