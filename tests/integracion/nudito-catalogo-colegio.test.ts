// Requiere la BD local. Temas propios del colegio para Nudito (specs/42): CRUD, permisos, banco revisado y aislamiento.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { temasDeConBanco } from "@/lib/nudito/conocimiento/servidor";
import { esquemaTema } from "@/lib/nudito/contratos";
import { validarTema } from "@/lib/nudito/validar-tema";
import { db } from "@/lib/server/db";
import {
  activarTemaColegio, catalogoDelColegio, crearTemaColegio, desactivarTemaColegio, editarTemaColegio, listarTemasColegio, revisarTemaColegio, temasParaAlumno,
} from "@/lib/server/nudito/catalogo";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let otro: ColegioPrueba;
let base: ColegioPrueba;

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-temas" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-temas-otro" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-nudito-temas-base" });
  await db.curso.update({ where: { id: c.cursoTutora.id }, data: { areaCneb: "matematica" } });
}, 30_000);

afterAll(async () => {
  await c?.limpiar();
  await otro?.limpiar();
  await base?.limpiar();
}, 30_000);

const temaFeria = {
  area: "matematica", nivel: "primaria", grado: 3, competenciaCneb: 23,
  nombre: "Problemas de la kermés", descripcion: "Sumar y restar precios de la kermés del colegio.",
  palabrasClave: ["kermes", "precios", "vuelto"], prerrequisitos: ["mat.p2.suma-resta-hasta-100"],
  tipos: ["numerico"], fuente: { tipo: "generador", generadorId: "mat.operaciones" },
};

describe("temas del colegio", () => {
  it("dirección crea un tema: se une al catálogo global y Nudito lo reconoce", async () => {
    const ctx = c.ctxDe("direccion");
    const { id } = await crearTemaColegio(ctx, temaFeria);
    const catalogo = await catalogoDelColegio(c.db, { area: "matematica", nivel: "primaria" });
    expect(catalogo.length).toBe((await temasDeConBanco("matematica", "primaria")).length + 1);
    const propio = catalogo.find((t) => t.clave === `col:${id}`)!;
    expect(propio).toMatchObject({ origen: "colegio", grado: 3, nombre: "Problemas de la kermés" });
    expect(esquemaTema.safeParse(propio).success).toBe(true);
    const r = validarTema({ texto: "la kermés", area: "matematica", nivel: "primaria", grado: 3, temas: catalogo, desbloqueados: new Set() });
    expect(r).toMatchObject({ tipo: "permitido", relacion: "grado_actual", tema: { clave: `col:${id}` } });
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "nudito_tema_colegio", entidadId: id, accion: "crear" } })).toBe(1);
  });

  it("valida datos, prerrequisitos y fuente", async () => {
    const ctx = c.ctxDe("direccion");
    await expect(crearTemaColegio(ctx, { ...temaFeria, nombre: "" })).rejects.toThrow();
    await expect(crearTemaColegio(ctx, { ...temaFeria, prerrequisitos: ["mat.p6.porcentajes"] })).rejects.toThrow(/grado superior/);
    await expect(crearTemaColegio(ctx, { ...temaFeria, prerrequisitos: ["mat.p1.no-existe"] })).rejects.toThrow(/no existe/);
    await expect(crearTemaColegio(ctx, { ...temaFeria, fuente: { tipo: "generador", generadorId: "mat.magia" } })).rejects.toThrow(/fuente/);
  });

  it("un tema con fuente banco nace inactivo y solo se activa con sus ítems revisados", async () => {
    const ctx = c.ctxDe("direccion");
    const { id } = await crearTemaColegio(ctx, {
      ...temaFeria, area: "ciencia-tecnologia", competenciaCneb: 21, nombre: "Biohuerto", palabrasClave: ["biohuerto"], prerrequisitos: [],
      tipos: ["opcion_multiple"], fuente: { tipo: "banco", bancoId: "cyt.banco" },
    });
    expect((await db.nuditoTemaColegio.findUniqueOrThrow({ where: { id } })).activo).toBe(false);
    expect((await catalogoDelColegio(c.db, { area: "ciencia-tecnologia", nivel: "primaria" })).some((t) => t.clave === `col:${id}`)).toBe(false);
    await expect(activarTemaColegio(ctx, id)).rejects.toThrow(/revisa/);
    await revisarTemaColegio(ctx, id);
    await activarTemaColegio(ctx, id);
    const tema = (await catalogoDelColegio(c.db, { area: "ciencia-tecnologia", nivel: "primaria" })).find((t) => t.clave === `col:${id}`);
    expect(tema?.revisado?.por).toBe(c.miembros.direccion.user.id);
  });

  it("editar y desactivar (no borra)", async () => {
    const ctx = c.ctxDe("direccion");
    const { id } = await crearTemaColegio(ctx, { ...temaFeria, nombre: "Tema para editar" });
    await editarTemaColegio(ctx, id, { ...temaFeria, nombre: "Tema editado", grado: 4 });
    expect(await db.nuditoTemaColegio.findUniqueOrThrow({ where: { id } })).toMatchObject({ nombre: "Tema editado", grado: 4 });
    await desactivarTemaColegio(ctx, id);
    expect(await db.nuditoTemaColegio.findUniqueOrThrow({ where: { id } })).toMatchObject({ activo: false });
    expect((await catalogoDelColegio(c.db, { area: "matematica", nivel: "primaria" })).some((t) => t.clave === `col:${id}`)).toBe(false);
  });

  it("temasParaAlumno: su grado y anteriores, más los desbloqueados", async () => {
    const ctx = c.ctxDe("direccion");
    const temas = await temasParaAlumno(ctx, { area: "matematica", nivel: "primaria", grado: 3, desbloqueados: new Set(["mat.p4.fracciones-equivalentes"]) });
    expect(temas.every((t) => t.grado <= 3 || t.clave === "mat.p4.fracciones-equivalentes")).toBe(true);
    expect(temas.some((t) => t.clave === "mat.p4.fracciones-equivalentes")).toBe(true);
    expect(temas.some((t) => t.origen === "colegio")).toBe(true);
    const sec = await temasParaAlumno(ctx, { area: "matematica", nivel: "secundaria", grado: 1 });
    expect(sec.some((t) => t.nivel === "primaria")).toBe(true);
    expect(sec.some((t) => t.nivel === "secundaria" && t.grado === 2)).toBe(false);
  });

  it("permisos: profesor del área solo lee; otro profesor no ve el área; apoderado no entra; plan Base no", async () => {
    const lectura = await listarTemasColegio(c.ctxDe("tutora"));
    expect(lectura.length).toBeGreaterThan(0);
    expect(lectura.every((t) => t.area === "matematica" && t.activo)).toBe(true);
    expect(await listarTemasColegio(c.ctxDe("otroProfesor"), { area: "matematica" })).toEqual([]);
    await esperarProhibido(crearTemaColegio(c.ctxDe("tutora"), temaFeria));
    await esperarProhibido(listarTemasColegio(c.ctxDe("madre")));
    await esperarProhibido(crearTemaColegio(base.ctxDe("direccion"), temaFeria));
  });

  it("aislamiento: otro colegio no ve ni edita los temas", async () => {
    const propios = await db.nuditoTemaColegio.findMany({ where: { tenantId: c.tenant.id }, select: { id: true } });
    expect(await listarTemasColegio(otro.ctxDe("direccion"))).toEqual([]);
    expect((await catalogoDelColegio(otro.db, { area: "matematica", nivel: "primaria" })).every((t) => t.origen === "cneb")).toBe(true);
    await expect(desactivarTemaColegio(otro.ctxDe("direccion"), propios[0].id)).rejects.toThrow(/No se encontró/);
    await expect(editarTemaColegio(otro.ctxDe("direccion"), propios[0].id, temaFeria)).rejects.toThrow(/No se encontró/);
  });
});
