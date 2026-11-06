// Biblioteca de documentos (specs/31): visibilidad por rol, carpeta y salón; permisos de gestión; aislamiento entre colegios;
// plan base (403); borrado sin huérfanos y aviso opcional. Crea sus propios colegios (test-documentos-<azar>).
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { documentoVisible, type CarpetaPlana } from "@/lib/documentos";
import { requireArchivoVisible } from "@/lib/server/archivos";
import { db } from "@/lib/server/db";
import {
  borrarCarpeta, borrarDocumento, crearCarpeta, editarCarpeta, editarDocumento, listarContenido, reemplazarArchivoDocumento, subirDocumento,
} from "@/lib/server/documentos";
import type { EntradaAdjunto } from "@/lib/server/adjuntos";
import { cambiarAccesoGeneral, compartirRecurso, destacarRecurso, detalleAccesos, eliminarDefinitivoRecurso, moverRecurso, personasParaCompartir, quitarAccesoRecurso, renombrarRecurso, restaurarRecurso, vaciarPapeleraVencida, vencimientoPapelera } from "@/lib/server/documentos-drive";
import { requireFeature } from "@/lib/server/plan";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const pdf = (nombre = "reglamento.pdf", marca = ""): EntradaAdjunto => ({ nombre, buffer: Buffer.from(`%PDF-1.4\n%${marca}\n`) });
const ruta = (publicId: string) => path.resolve(process.cwd(), ".uploads", publicId);

describe("biblioteca de documentos", () => {
  let c: ColegioPrueba;
  let base: ColegioPrueba;
  let otro: ColegioPrueba;
  let administrativo: TenantContext;
  let alumno: TenantContext;
  let familiaOtroSalon: TenantContext;
  const perfiles: string[] = [];

  async function miembro(col: ColegioPrueba, rol: "apoderado" | "administrativo" | "alumno", nombre: string) {
    const id = randomUUID();
    perfiles.push(id);
    const user = await db.profile.create({ data: { id, email: `${nombre}-${id.slice(0, 8)}@test-documentos.local`, nombres: nombre, apellidos: "Prueba" } });
    const membership = await db.membership.create({ data: { tenantId: col.tenant.id, userId: id, rol } });
    return { tenant: col.tenant, user, membership, rol, roles: [rol], db: col.db, ...accesoModulosDeCodigo(col.tenant.plan) } as TenantContext;
  }

  beforeAll(async () => {
    c = await crearColegioPrueba({ plan: "pro", prefijo: "test-documentos" });
    base = await crearColegioPrueba({ plan: "base", prefijo: "test-documentos" });
    otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-documentos" });
    administrativo = await miembro(c, "administrativo", "Ana");
    alumno = await miembro(c, "alumno", "Mateo");
    await c.db.alumno.update({ where: { id: c.alumnos.mateo.id }, data: { cuentaId: alumno.membership.id } });
    familiaOtroSalon = await miembro(c, "apoderado", "Marta");
    await c.db.apoderadoAlumno.create({ data: { tenantId: c.tenant.id, apoderadoId: familiaOtroSalon.membership.id, alumnoId: c.alumnos.thiago.id } });
  });
  afterAll(async () => {
    await c?.limpiar();
    await base?.limpiar();
    await otro?.limpiar();
    await db.profile.deleteMany({ where: { id: { in: perfiles } } });
  });

  const titulos = async (quien: TenantContext, opciones: Parameters<typeof listarContenido>[1] = {}) => (await listarContenido(quien, opciones)).documentos.map((d) => d.titulo).sort();

  it("regla pura: dirección ve todo; autor ve lo suyo; salón no limita al administrativo; carpetas padre restringen", () => {
    const mapa = new Map<string, CarpetaPlana>([
      ["a", { id: "a", parentId: null, nombre: "A", visibleRoles: ["profesor"] }],
      ["b", { id: "b", parentId: "a", nombre: "B", visibleRoles: [] }],
    ]);
    const doc = { carpetaId: "b", visibleRoles: ["profesor", "apoderado"] as const, salonId: "s1", publicadoPorId: "x" };
    const quien = (rol: "direccion" | "profesor" | "apoderado" | "administrativo", salonIds: string[] = [], membershipId = "y") => ({ rol, membershipId, salonIds });
    expect(documentoVisible(mapa, doc, quien("direccion"))).toBe(true);
    expect(documentoVisible(mapa, doc, quien("profesor", ["s1"]))).toBe(true);
    expect(documentoVisible(mapa, doc, quien("profesor", ["s2"]))).toBe(false);
    expect(documentoVisible(mapa, doc, quien("apoderado", ["s1"]))).toBe(false); // la carpeta padre es solo de profesores
    expect(documentoVisible(mapa, { ...doc, visibleRoles: ["administrativo"] }, quien("administrativo"))).toBe(false); // carpeta padre
    expect(documentoVisible(mapa, { ...doc, carpetaId: null, visibleRoles: ["administrativo"] }, quien("administrativo"))).toBe(true); // sin salón propio
    expect(documentoVisible(mapa, { ...doc, carpetaId: null, visibleRoles: [] }, quien("profesor", ["s1"], "x"))).toBe(true); // autor
    expect(documentoVisible(mapa, { ...doc, carpetaId: null, visibleRoles: [] }, quien("profesor", ["s1"]))).toBe(false); // borrador
  });

  it("matriz de visibilidad por rol y salón; el apoderado y el alumno descargan solo lo suyo", async () => {
    const dir = c.ctxDe("direccion");
    const nuevo = (titulo: string, visibleRoles: string[], salonId: string | null, carpetaId: string | null = null) =>
      subirDocumento(dir, { titulo, carpetaId, visibleRoles, salonId }, pdf(`${titulo}.pdf`, titulo));
    const general = await nuevo("M general", ["apoderado", "alumno", "profesor", "administrativo"], null);
    const soloFamilias = await nuevo("M familias", ["apoderado"], null);
    const salon3B = await nuevo("M salón 3B", ["apoderado", "alumno", "profesor"], c.salon.id);
    const salon5A = await nuevo("M salón 5A", ["apoderado", "alumno", "profesor"], c.otroSalon.id);
    await nuevo("M borrador", [], null);

    expect(await titulos(dir)).toEqual(expect.arrayContaining(["M borrador", "M familias", "M general", "M salón 3B", "M salón 5A"]));
    const matriz: [TenantContext, string[]][] = [
      [c.ctxDe("madre"), ["M familias", "M general", "M salón 3B"]],
      [familiaOtroSalon, ["M familias", "M general", "M salón 5A"]],
      [alumno, ["M general", "M salón 3B"]],
      [c.ctxDe("tutora"), ["M general", "M salón 3B"]],
      [c.ctxDe("otroProfesor"), ["M general", "M salón 5A"]],
      [administrativo, ["M general"]],
    ];
    for (const [quien, esperado] of matriz) {
      expect((await titulos(quien)).filter((t) => t.startsWith("M ")), `${quien.rol}`).toEqual(esperado);
    }

    const archivoDe = (id: string) => c.db.archivo.findFirstOrThrow({ where: { documentoId: id } });
    const [aGeneral, aFamilias, a3B, a5A] = await Promise.all([general, soloFamilias, salon3B, salon5A].map(async (d) => archivoDe(d.id)));
    expect(aGeneral).toMatchObject({ privado: true, mimeType: "application/pdf", subidoPorId: dir.user.id });
    expect((await requireArchivoVisible(c.ctxDe("madre"), a3B.id)).id).toBe(a3B.id);
    expect((await requireArchivoVisible(alumno, a3B.id)).id).toBe(a3B.id);
    await esperarProhibido(requireArchivoVisible(c.ctxDe("madre"), a5A.id));
    await esperarProhibido(requireArchivoVisible(alumno, aFamilias.id));
    await esperarProhibido(requireArchivoVisible(administrativo, aFamilias.id));
    await esperarProhibido(requireArchivoVisible(c.ctxDe("porteria"), aGeneral.id));
    // Cada descarga queda auditada.
    const descargas = await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "documento", entidadId: salon3B.id, accion: "ver" } });
    expect(descargas).toBe(2);
  });

  it("carpetas anidadas: la visibilidad se hereda, las rutas y la búsqueda respetan permisos", async () => {
    const dir = c.ctxDe("direccion");
    const raiz = await crearCarpeta(dir, { nombre: "Interno docentes", parentId: null, visibleRoles: ["profesor"] });
    const hija = await crearCarpeta(dir, { nombre: "Anexos", parentId: raiz.id });
    await subirDocumento(dir, { titulo: "Anexo para familias", carpetaId: hija.id, visibleRoles: ["apoderado", "profesor"], salonId: null }, pdf());
    await subirDocumento(dir, { titulo: "Anexo docente", carpetaId: hija.id, visibleRoles: ["profesor"], salonId: null }, pdf());

    const tutora = c.ctxDe("tutora");
    expect((await listarContenido(tutora, { carpetaId: hija.id })).ruta.map((r) => r.nombre)).toEqual(["Interno docentes", "Anexos"]);
    expect(await titulos(tutora, { carpetaId: hija.id })).toEqual(["Anexo docente", "Anexo para familias"]);
    // La familia no ve la carpeta ni lo que hay dentro (aunque el documento le sea «visible» por rol): 404 y sin resultados en la búsqueda.
    const madre = c.ctxDe("madre");
    await expect(listarContenido(madre, { carpetaId: hija.id })).rejects.toThrow();
    expect((await listarContenido(madre)).carpetas.map((x) => x.nombre)).not.toContain("Interno docentes");
    expect(await titulos(madre, { q: "anexo" })).toEqual([]);
    expect(await titulos(tutora, { q: "ANEXO", orden: "titulo" })).toEqual(["Anexo docente", "Anexo para familias"]);
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { documento: { titulo: "Anexo para familias" } } });
    await esperarProhibido(requireArchivoVisible(madre, archivo.id));
  });

  it("mover carpetas: sin ciclos ni nombres repetidos; solo dirección y administrativo administran carpetas", async () => {
    const dir = c.ctxDe("direccion");
    const a = await crearCarpeta(dir, { nombre: "Ciclo A", parentId: null });
    const b = await crearCarpeta(dir, { nombre: "Ciclo B", parentId: a.id });
    await expect(editarCarpeta(dir, a.id, { nombre: "Ciclo A", parentId: b.id, visibleRoles: [] })).rejects.toThrow(/dentro de sí misma/);
    await expect(editarCarpeta(dir, a.id, { nombre: "Ciclo A", parentId: a.id, visibleRoles: [] })).rejects.toThrow(/dentro de sí misma/);
    await expect(crearCarpeta(dir, { nombre: "ciclo a", parentId: null })).rejects.toThrow(/Ya existe/);
    await editarCarpeta(dir, b.id, { nombre: "Ciclo B2", parentId: null, visibleRoles: ["profesor"] });
    expect((await listarContenido(dir)).carpetas.map((x) => x.nombre)).toContain("Ciclo B2");
    // El administrativo se mantiene en las carpetas con roles para seguir viendo lo que administra.
    const adm = await crearCarpeta(administrativo, { nombre: "Del personal", parentId: null, visibleRoles: ["apoderado"] });
    expect((await c.db.carpetaDocumento.findFirstOrThrow({ where: { id: adm.id } })).visibleRoles.sort()).toEqual(["administrativo", "apoderado"]);
    for (const quien of [c.ctxDe("tutora"), c.ctxDe("madre"), alumno]) {
      await esperarProhibido(crearCarpeta(quien, { nombre: "Intruso", parentId: null }));
      await esperarProhibido(editarCarpeta(quien, a.id, { nombre: "x", parentId: null, visibleRoles: [] }));
      await esperarProhibido(borrarCarpeta(quien, a.id));
      if (quien.rol !== "profesor") await esperarProhibido(subirDocumento(quien, { titulo: "x", carpetaId: null, visibleRoles: [], salonId: null }, pdf()));
    }
  });

  it("el profesor sube solo a sus salones y gestiona solo lo suyo", async () => {
    const tutora = c.ctxDe("tutora");
    await expect(subirDocumento(tutora, { titulo: "Sin salón", carpetaId: null, visibleRoles: ["apoderado"], salonId: null }, pdf())).rejects.toThrow(/Elige uno de tus salones/);
    await esperarProhibido(subirDocumento(tutora, { titulo: "Salón ajeno", carpetaId: null, visibleRoles: ["apoderado"], salonId: c.otroSalon.id }, pdf()));
    await expect(subirDocumento(tutora, { titulo: "Rol raro", carpetaId: null, visibleRoles: ["administrativo"], salonId: c.salon.id }, pdf())).rejects.toThrow(/roles válidos/);
    const { id } = await subirDocumento(tutora, { titulo: "Guía de 3.° B", carpetaId: null, visibleRoles: ["apoderado", "alumno"], salonId: c.salon.id }, pdf("guia.pdf"));
    expect(await titulos(c.ctxDe("madre"))).toContain("Guía de 3.° B");
    expect(await titulos(familiaOtroSalon)).not.toContain("Guía de 3.° B");
    // Otro profesor no puede editar ni borrar (tampoco la ve); dirección y la autora, sí.
    const colega = c.ctxDe("otroProfesor");
    await expect(editarDocumento(colega, id, { titulo: "x", carpetaId: null, visibleRoles: [], salonId: c.otroSalon.id })).rejects.toThrow();
    await expect(borrarDocumento(colega, id)).rejects.toThrow();
    await editarDocumento(tutora, id, { titulo: "Guía de 3.° B (v2)", carpetaId: null, visibleRoles: ["apoderado"], salonId: c.salon.id });
    expect(await titulos(alumno)).not.toContain("Guía de 3.° B (v2)");
    await borrarDocumento(c.ctxDe("direccion"), id);
    expect(await c.db.documento.count({ where: { id, eliminadoAt: null } })).toBe(0);
    await eliminarDefinitivoRecurso(c.ctxDe("direccion"), { tipo: "documento", id });
    expect(await c.db.documento.count({ where: { id } })).toBe(0);
  });

  it("valida el archivo, reemplaza (gana el último) y borra sin dejar archivos en el almacenamiento", async () => {
    const dir = c.ctxDe("direccion");
    await expect(subirDocumento(dir, { titulo: "Malo", carpetaId: null, visibleRoles: [], salonId: null }, { nombre: "x.exe", buffer: Buffer.from("MZ") })).rejects.toThrow(/no se puede adjuntar/);
    await expect(subirDocumento(dir, { titulo: "Grande", carpetaId: null, visibleRoles: [], salonId: null }, { nombre: "g.pdf", buffer: Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(10 * 1024 * 1024)]) })).rejects.toThrow(/10 MB/);
    await expect(subirDocumento(dir, { titulo: "Sin archivo", carpetaId: null, visibleRoles: [], salonId: null }, null)).rejects.toThrow(/Elige el archivo/);
    expect(await c.db.documento.count({ where: { titulo: { in: ["Malo", "Grande", "Sin archivo"] } } })).toBe(0);

    const { id } = await subirDocumento(dir, { titulo: "Versionado", carpetaId: null, visibleRoles: ["apoderado"], salonId: null }, pdf("v1.pdf", "uno"));
    const v1 = await c.db.archivo.findFirstOrThrow({ where: { documentoId: id } });
    await reemplazarArchivoDocumento(dir, id, pdf("v2.pdf", "dos"));
    const actuales = await c.db.archivo.findMany({ where: { documentoId: id } });
    expect(actuales.map((a) => a.nombre)).toEqual(["v2.pdf"]);
    expect(existsSync(ruta(v1.publicId))).toBe(false);
    expect(existsSync(ruta(actuales[0].publicId))).toBe(true);

    const carpeta = await crearCarpeta(dir, { nombre: "Para borrar", parentId: null });
    const sub = await crearCarpeta(dir, { nombre: "Sub", parentId: carpeta.id });
    await subirDocumento(dir, { titulo: "En raíz de carpeta", carpetaId: carpeta.id, visibleRoles: [], salonId: null }, pdf());
    await subirDocumento(dir, { titulo: "En subcarpeta", carpetaId: sub.id, visibleRoles: [], salonId: null }, pdf());
    const archivos = await c.db.archivo.findMany({ where: { documento: { carpetaId: { in: [carpeta.id, sub.id] } } } });
    expect(archivos).toHaveLength(2);
    expect(await borrarCarpeta(dir, carpeta.id)).toEqual({ documentos: 2 });
    expect(await c.db.carpetaDocumento.count({ where: { id: { in: [carpeta.id, sub.id] }, eliminadoAt: null } })).toBe(0);
    expect(archivos.every((a) => existsSync(ruta(a.publicId)))).toBe(true);
    await restaurarRecurso(dir, { tipo: "carpeta", id: carpeta.id });
    expect(await c.db.carpetaDocumento.count({ where: { id: { in: [carpeta.id, sub.id] }, eliminadoAt: null } })).toBe(2);
    await borrarCarpeta(dir, carpeta.id);
    await eliminarDefinitivoRecurso(dir, { tipo: "carpeta", id: carpeta.id });
    expect(archivos.some((a) => existsSync(ruta(a.publicId)))).toBe(false);
    expect(await c.db.archivo.count({ where: { id: { in: archivos.map((a) => a.id) } } })).toBe(0);
    const auditados = await db.auditoria.findMany({ where: { tenantId: c.tenant.id, accion: "borrar", entidad: "carpeta_documento", entidadId: carpeta.id } });
    expect(auditados).toHaveLength(2);
  });

  it("Mi unidad: comparte con persona, rol y salón; hereda acceso y respeta niveles", async () => {
    const tutora = c.ctxDe("tutora");
    const madre = c.ctxDe("madre");
    const colega = c.ctxDe("otroProfesor");
    const carpeta = await crearCarpeta(tutora, { nombre: "Mi unidad 3B", parentId: null, ambito: "unidad" });
    const documento = await subirDocumento(tutora, { titulo: "Ficha compartida 3B", carpetaId: carpeta.id, visibleRoles: [], salonId: null }, pdf());
    expect((await listarContenido(madre, { vista: "compartido" })).carpetas.map((c) => c.id)).not.toContain(carpeta.id);
    await compartirRecurso(tutora, { tipo: "carpeta", id: carpeta.id }, { membershipId: madre.membership.id }, "lector");
    await compartirRecurso(tutora, { tipo: "carpeta", id: carpeta.id }, { rol: "apoderado", salonId: c.salon.id }, "lector");
    await compartirRecurso(tutora, { tipo: "carpeta", id: carpeta.id }, { membershipId: colega.membership.id }, "editor");
    expect((await listarContenido(madre, { vista: "compartido" })).carpetas.map((c) => c.id)).toContain(carpeta.id);
    expect(await titulos(madre, { vista: "compartido", carpetaId: carpeta.id })).toContain("Ficha compartida 3B");
    await expect(listarContenido(familiaOtroSalon, { vista: "compartido", carpetaId: carpeta.id })).rejects.toThrow();
    await esperarProhibido(subirDocumento(madre, { titulo: "No", carpetaId: carpeta.id, visibleRoles: [], salonId: null }, pdf()));
    await editarDocumento(colega, documento.id, { titulo: "Ficha editada 3B", carpetaId: carpeta.id, visibleRoles: [], salonId: null });
    expect(await titulos(madre, { vista: "compartido", carpetaId: carpeta.id })).toContain("Ficha editada 3B");
    await esperarProhibido(compartirRecurso(tutora, { tipo: "carpeta", id: carpeta.id }, { membershipId: madre.membership.id }, "editor"));
    await esperarProhibido(compartirRecurso(tutora, { tipo: "carpeta", id: carpeta.id }, { rol: "apoderado", salonId: c.otroSalon.id }, "lector"));
    await destacarRecurso(madre, { tipo: "carpeta", id: carpeta.id }, true);
    expect((await listarContenido(madre, { vista: "destacados" })).carpetas.map((c) => c.id)).toContain(carpeta.id);
    await destacarRecurso(madre, { tipo: "carpeta", id: carpeta.id }, false);
    expect((await listarContenido(madre, { vista: "destacados" })).carpetas.map((c) => c.id)).not.toContain(carpeta.id);
    await expect(listarContenido(otro.ctxDe("direccion"), { carpetaId: carpeta.id, vista: "unidad" })).rejects.toThrow();
    await esperarProhibido(compartirRecurso(base.ctxDe("direccion"), { tipo: "carpeta", id: carpeta.id }, { rol: "profesor" }, "lector"));
    await borrarCarpeta(tutora, carpeta.id);
    expect((await listarContenido(madre, { vista: "compartido" })).carpetas.map((c) => c.id)).not.toContain(carpeta.id);
    expect((await listarContenido(tutora, { vista: "papelera" })).carpetas.map((c) => c.id)).toContain(carpeta.id);
    await restaurarRecurso(tutora, { tipo: "carpeta", id: carpeta.id });
    expect((await listarContenido(madre, { vista: "compartido" })).carpetas.map((c) => c.id)).toContain(carpeta.id);
  });

  it("diálogo Compartir: detalle con propietario, accesos heredados y general; renombrar, mover y quitar acceso respetan niveles", async () => {
    const tutora = c.ctxDe("tutora");
    const madre = c.ctxDe("madre");
    const colega = c.ctxDe("otroProfesor");
    const padre = await crearCarpeta(tutora, { nombre: "Detalle 3B", parentId: null, ambito: "unidad" });
    const hija = await crearCarpeta(tutora, { nombre: "Hija 3B", parentId: padre.id, ambito: "unidad" });
    const doc = await subirDocumento(tutora, { titulo: "Rúbrica 3B", carpetaId: hija.id, visibleRoles: [], salonId: null }, pdf());
    await compartirRecurso(tutora, { tipo: "carpeta", id: padre.id }, { rol: "apoderado", salonId: c.salon.id }, "lector");
    await compartirRecurso(tutora, { tipo: "documento", id: doc.id }, { membershipId: colega.membership.id }, "editor");
    const d = await detalleAccesos(tutora, { tipo: "documento", id: doc.id });
    expect(d.puedeCompartir).toBe(true);
    expect(d.propietario).toMatchObject({ esTu: true, rol: "profesor" });
    expect(d.entradas.map((e) => e.nivel)).toEqual(["editor"]);
    expect(d.heredadas.map((h) => [h.nombre, h.desde, h.nivel])).toEqual([["Familias de 3.° B", "Detalle 3B", "lector"]]);
    // Un lector ve el detalle pero no puede compartir ni renombrar.
    const dm = await detalleAccesos(madre, { tipo: "documento", id: doc.id });
    expect(dm.puedeCompartir).toBe(false);
    await esperarProhibido(renombrarRecurso(madre, { tipo: "documento", id: doc.id }, "Mío"));
    await esperarProhibido(cambiarAccesoGeneral(madre, { tipo: "documento", id: doc.id }, ["apoderado"], null));
    await esperarProhibido(moverRecurso(madre, { tipo: "documento", id: doc.id }, null));
    await expect(detalleAccesos(familiaOtroSalon, { tipo: "documento", id: doc.id })).rejects.toThrow();
    // Renombrar: el editor puede; nombre único entre hermanas; límites de largo.
    await renombrarRecurso(colega, { tipo: "documento", id: doc.id }, "Rúbrica final 3B");
    expect((await c.db.documento.findFirstOrThrow({ where: { id: doc.id } })).titulo).toBe("Rúbrica final 3B");
    await crearCarpeta(tutora, { nombre: "Otra 3B", parentId: padre.id, ambito: "unidad" });
    await expect(renombrarRecurso(tutora, { tipo: "carpeta", id: hija.id }, "otra 3b")).rejects.toThrow(/Ya existe/);
    await expect(renombrarRecurso(tutora, { tipo: "carpeta", id: hija.id }, "   ")).rejects.toThrow();
    await renombrarRecurso(tutora, { tipo: "carpeta", id: hija.id }, "Hija renombrada");
    // Mover: sin ciclos; el lector no mueve.
    await expect(moverRecurso(tutora, { tipo: "carpeta", id: padre.id }, hija.id)).rejects.toThrow(/subcarpeta/);
    await moverRecurso(tutora, { tipo: "documento", id: doc.id }, null);
    expect((await c.db.documento.findFirstOrThrow({ where: { id: doc.id } })).carpetaId).toBeNull();
    // Acceso general: mapea a visibleRoles y salonId; el profesor no puede abrir a un salón ajeno ni sin salón.
    await cambiarAccesoGeneral(tutora, { tipo: "documento", id: doc.id }, ["apoderado"], c.salon.id);
    expect((await detalleAccesos(tutora, { tipo: "documento", id: doc.id })).general).toMatchObject({ roles: ["apoderado"], salonId: c.salon.id });
    await esperarProhibido(cambiarAccesoGeneral(tutora, { tipo: "documento", id: doc.id }, ["apoderado"], c.otroSalon.id));
    await esperarProhibido(cambiarAccesoGeneral(tutora, { tipo: "documento", id: doc.id }, ["administrativo"], c.salon.id));
    await cambiarAccesoGeneral(tutora, { tipo: "documento", id: doc.id }, [], null);
    // Quitar acceso: el lector no puede; el propietario sí y queda auditado.
    const entrada = (await detalleAccesos(tutora, { tipo: "documento", id: doc.id })).entradas[0];
    await esperarProhibido(quitarAccesoRecurso(madre, { tipo: "documento", id: doc.id }, entrada.id));
    await quitarAccesoRecurso(tutora, { tipo: "documento", id: doc.id }, entrada.id);
    expect((await detalleAccesos(tutora, { tipo: "documento", id: doc.id })).entradas).toHaveLength(0);
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidadId: doc.id, accion: "editar" } })).toBeGreaterThanOrEqual(4);
  });

  it("buscador de personas: el profesor solo ve a las familias y alumnos de sus salones; los colegios no se mezclan", async () => {
    const tutora = await personasParaCompartir(c.ctxDe("tutora"));
    const idsMadre = c.miembros.madre.membership.id;
    expect(tutora.personas.map((p) => p.id)).toContain(idsMadre);
    expect(tutora.personas.map((p) => p.id)).not.toContain(familiaOtroSalon.membership.id);
    expect(tutora.salones.map((s) => s.id)).toEqual([c.salon.id]);
    const dir = await personasParaCompartir(c.ctxDe("direccion"));
    expect(dir.personas.map((p) => p.id)).toContain(familiaOtroSalon.membership.id);
    expect(dir.personas.every((p) => p.rol !== "porteria")).toBe(true);
    expect((await personasParaCompartir(otro.ctxDe("direccion"))).personas.map((p) => p.id)).not.toContain(idsMadre);
  });

  it("papelera: se vacía sola a los 30 días (solo dirección) y no deja archivos huérfanos", async () => {
    const dir = c.ctxDe("direccion");
    const viejo = await subirDocumento(dir, { titulo: "Viejo en papelera", carpetaId: null, visibleRoles: [], salonId: null }, pdf("viejo.pdf", "viejo"));
    const reciente = await subirDocumento(dir, { titulo: "Reciente en papelera", carpetaId: null, visibleRoles: [], salonId: null }, pdf("reciente.pdf", "reciente"));
    const archivoViejo = await c.db.archivo.findFirstOrThrow({ where: { documentoId: viejo.id } });
    await borrarDocumento(dir, viejo.id);
    await borrarDocumento(dir, reciente.id);
    await c.db.documento.update({ where: { id: viejo.id }, data: { eliminadoAt: new Date(Date.now() - 31 * 86_400_000) } });
    expect(vencimientoPapelera(new Date(Date.now() - 31 * 86_400_000))).toBe(true);
    expect(vencimientoPapelera(new Date(Date.now() - 2 * 86_400_000))).toBe(false);
    await esperarProhibido(vaciarPapeleraVencida(c.ctxDe("tutora")));
    await vaciarPapeleraVencida(dir);
    expect(await c.db.documento.count({ where: { id: viejo.id } })).toBe(0);
    expect(existsSync(ruta(archivoViejo.publicId))).toBe(false);
    expect(await c.db.documento.count({ where: { id: reciente.id } })).toBe(1);
  });

  it("aviso opcional: solo con «avisar», solo a familias que lo ven y sin repetirse", async () => {
    const dir = c.ctxDe("direccion");
    const sin = await subirDocumento(dir, { titulo: "Sin aviso", carpetaId: null, visibleRoles: ["apoderado"], salonId: c.salon.id }, pdf());
    expect(sin.avisados).toBe(0);
    expect(await c.db.aviso.count({ where: { plantilla: "documento_nuevo" } })).toBe(0);

    const soloProfes = await subirDocumento(dir, { titulo: "Solo profesores", carpetaId: null, visibleRoles: ["profesor"], salonId: null, avisar: true }, pdf());
    expect(soloProfes.avisados).toBe(0);

    const con = await subirDocumento(dir, { titulo: "Con aviso", carpetaId: null, visibleRoles: ["apoderado"], salonId: c.salon.id, avisar: true }, pdf());
    expect(con.avisados).toBe(1); // solo la madre de 3.° B (la otra familia tiene consentimiento revocado o es de otro salón)
    const avisos = await c.db.aviso.findMany({ where: { plantilla: "documento_nuevo", referenciaId: con.id } });
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos.every((a) => a.tipo === "documento" && a.apoderadoId === c.miembros.madre.membership.id)).toBe(true);
    expect(avisos[0].asunto).toContain("Con aviso");
  });

  it("aislamiento entre colegios y plan Base (403)", async () => {
    const dir = c.ctxDe("direccion");
    const { id } = await subirDocumento(dir, { titulo: "Solo de este colegio", carpetaId: null, visibleRoles: ["apoderado"], salonId: null }, pdf());
    const archivo = await c.db.archivo.findFirstOrThrow({ where: { documentoId: id } });

    const dirOtro = otro.ctxDe("direccion");
    expect(await titulos(dirOtro)).not.toContain("Solo de este colegio");
    await expect(requireArchivoVisible(dirOtro, archivo.id)).rejects.toThrow(); // 404: no existe en su colegio
    await expect(editarDocumento(dirOtro, id, { titulo: "robado", carpetaId: null, visibleRoles: [], salonId: null })).rejects.toThrow();
    await expect(borrarDocumento(dirOtro, id)).rejects.toThrow();
    expect(await c.db.documento.count({ where: { id } })).toBe(1);

    // Khipu Base no incluye Documentos: requireFeature corta con 403, también al pedir un archivo de documento.
    await esperarProhibido(Promise.resolve().then(() => requireFeature(base.ctxDe("direccion"), "documentos")));
    await esperarProhibido(Promise.resolve().then(() => requireFeature(base.ctxDe("madre"), "documentos")));
    const docBase = await base.db.documento.create({ data: { tenantId: base.tenant.id, titulo: "x", visibleRoles: ["apoderado"], publicadoPorId: base.miembros.direccion.membership.id } });
    const archBase = await base.db.archivo.create({
      data: { tenantId: base.tenant.id, proveedor: "local", publicId: "no/existe.pdf", mimeType: "application/pdf", bytes: 1, documentoId: docBase.id, nombre: "x.pdf" },
    });
    await esperarProhibido(requireArchivoVisible(base.ctxDe("direccion"), archBase.id));
  });
});
