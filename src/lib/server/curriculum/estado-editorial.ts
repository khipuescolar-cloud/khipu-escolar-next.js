import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { EstadoEditorialTema, Nivel } from "@/generated/prisma/enums";
import { huellaActualDeTema } from "./autorizacion";
import { db } from "../db";
import { ErrorDeNegocio } from "../contexto-accion";
import { requireAdminPlataforma } from "../plataforma";

export const esquemaFiltroEditorial = z.object({
  area: z.string().trim().max(80).optional().catch(undefined),
  nivel: z.enum(["inicial", "primaria", "secundaria"]).optional().catch(undefined),
  grado: z.coerce.number().int().min(1).max(6).optional().catch(undefined),
  disciplina: z.string().trim().max(80).optional().catch(undefined),
  estado: z.enum(["borrador", "revisado", "publicado", "pendiente_revision"]).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(10000).default(1).catch(1),
});
export type FiltroEditorial = z.input<typeof esquemaFiltroEditorial>;
export const TAMANO_PAGINA_EDITORIAL = 30;

const esquemaBloque = z.object({
  area: z.string().trim().min(1).max(80),
  nivel: z.enum(["inicial", "primaria", "secundaria"]),
  grado: z.coerce.number().int().min(1).max(6),
  disciplina: z.string().trim().min(1).max(80),
});
export type BloqueEditorial = z.input<typeof esquemaBloque>;

export async function requireEditorKhipu() {
  return requireAdminPlataforma();
}

async function conVigencia<T extends { clave: string; estado: EstadoEditorialTema; huellaContenidoRevisado: string | null }>(temas: T[]) {
  const resultado = [];
  for (let i = 0; i < temas.length; i += 40) {
    resultado.push(...await Promise.all(temas.slice(i, i + 40).map(async (tema) => {
      const huellaActual = await huellaActualDeTema(tema.clave);
      return {
        ...tema,
        huellaActual,
        pendienteRevision: tema.estado !== "borrador" && (!huellaActual || tema.huellaContenidoRevisado !== huellaActual),
      };
    })));
  }
  return resultado;
}

export async function listarTemasEditoriales(filtroCrudo: FiltroEditorial = {}) {
  await requireEditorKhipu();
  const filtro = esquemaFiltroEditorial.parse(filtroCrudo);
  const where = {
    ...(filtro.area ? { areaCneb: filtro.area } : {}),
    ...(filtro.nivel ? { nivel: filtro.nivel as Nivel } : {}),
    ...(filtro.grado ? { grado: filtro.grado } : {}),
    ...(filtro.disciplina ? { disciplinas: { has: filtro.disciplina } } : {}),
  };
  const [filas, areas, disciplinas, borradoresGlobales, revisadosGlobales] = await Promise.all([
    db.temaCurricular.findMany({
      where,
      orderBy: { clave: "asc" },
      select: {
        clave: true, areaCneb: true, disciplinas: true, nivel: true, grado: true, estado: true,
        huellaContenidoRevisado: true, fuenteId: true, fuenteLocator: true, version: true, revisadoAt: true,
        desempenosOficiales: { where: { verificadoAt: { not: null } }, select: { id: true }, take: 1 },
      },
    }),
    db.temaCurricular.findMany({ distinct: ["areaCneb"], select: { areaCneb: true }, orderBy: { areaCneb: "asc" } }),
    db.temaCurricular.findMany({ select: { disciplinas: true } }),
    db.temaCurricular.count({ where: { estado: "borrador" } }),
    db.temaCurricular.findMany({ where: { estado: { in: ["revisado", "publicado"] } }, select: { clave: true, estado: true, huellaContenidoRevisado: true } }),
  ]);
  const conEstado = await conVigencia(filas);
  const globales = await conVigencia(revisadosGlobales);
  const pendientes = borradoresGlobales + globales.filter((tema) => tema.pendienteRevision).length;
  const visibles = conEstado.filter((tema) => !filtro.estado || (filtro.estado === "pendiente_revision" ? tema.pendienteRevision : tema.estado === filtro.estado && !tema.pendienteRevision));
  const total = visibles.length;
  return {
    filtro, total, pendientes,
    temas: visibles.slice((filtro.pagina - 1) * TAMANO_PAGINA_EDITORIAL, filtro.pagina * TAMANO_PAGINA_EDITORIAL),
    areas: areas.map((a) => a.areaCneb),
    disciplinas: [...new Set(disciplinas.flatMap((d) => d.disciplinas))].sort(),
    paginas: Math.ceil(total / TAMANO_PAGINA_EDITORIAL),
  };
}

function comprobarRevision(tema: {
  fuenteId: string | null; fuenteLocator: string | null; desempenosOficiales: { id: string }[];
}, huella: string | null, confirmado: boolean) {
  if (!confirmado || !huella || !tema.fuenteId || !tema.fuenteLocator || tema.desempenosOficiales.length === 0) {
    throw new ErrorDeNegocio("Confirma el checklist y completa contenido, fuente, localizador y desempeño oficial verificado.");
  }
}

/** Cambio condicional, huella y auditoría dentro de una transacción. */
export async function cambiarEstadoEditorial(
  claveCruda: unknown,
  estadoCrudo: unknown,
  checklistConfirmado: unknown = false,
): Promise<{ anterior: EstadoEditorialTema; actual: EstadoEditorialTema }> {
  const admin = await requireEditorKhipu();
  const clave = z.string().trim().min(1).max(160).parse(claveCruda);
  const siguiente = z.enum(["borrador", "revisado", "publicado"]).parse(estadoCrudo);
  const confirmado = checklistConfirmado === true;
  return db.$transaction(async (tx) => {
    const tema = await tx.temaCurricular.findUnique({
      where: { clave },
      select: {
        estado: true, huellaContenidoRevisado: true, fuenteId: true, fuenteLocator: true,
        desempenosOficiales: { where: { verificadoAt: { not: null } }, select: { id: true }, take: 1 },
      },
    });
    if (!tema) notFound();
    const anterior = tema.estado;
    const huella = await huellaActualDeTema(clave);
    const vencido = anterior !== "borrador" && (!huella || tema.huellaContenidoRevisado !== huella);
    if (anterior === siguiente && !vencido) return { anterior, actual: siguiente };
    if (siguiente !== "borrador") {
      comprobarRevision(tema, huella, confirmado);
      if (siguiente === "publicado" && anterior === "borrador") throw new ErrorDeNegocio("Primero marca el tema como revisado.");
    }
    const ahora = new Date();
    const cambio = await tx.temaCurricular.updateMany({
      where: { clave, estado: anterior, huellaContenidoRevisado: tema.huellaContenidoRevisado },
      data: {
        estado: siguiente,
        huellaContenidoRevisado: siguiente === "borrador" ? null : huella,
        revisadoPorId: siguiente === "borrador" ? null : admin.user.id,
        revisadoAt: siguiente === "borrador" ? null : ahora,
      },
    });
    if (cambio.count !== 1) throw new ErrorDeNegocio("El estado cambió. Vuelve a cargar la página.");
    await tx.auditoriaPlataforma.create({ data: {
      actorId: admin.user.id, accion: "curriculum_estado_editorial", tenantId: null,
      detalle: { clave, anterior, actual: siguiente, huellaAnterior: tema.huellaContenidoRevisado, huellaActual: huella, checklistConfirmado: confirmado },
    } });
    return { anterior, actual: siguiente };
  });
}

/** Bloque = área + nivel + grado + disciplina. Todo el lote se valida y audita atómicamente. */
export async function revisarBloqueEditorial(bloqueCrudo: BloqueEditorial, checklistConfirmado: unknown): Promise<number> {
  const admin = await requireEditorKhipu();
  const bloque = esquemaBloque.parse(bloqueCrudo);
  const confirmado = checklistConfirmado === true;
  if (!confirmado) throw new ErrorDeNegocio("Confirma el checklist antes de revisar el bloque.");
  return db.$transaction(async (tx) => {
    const temas = await tx.temaCurricular.findMany({
      where: { areaCneb: bloque.area, nivel: bloque.nivel, grado: bloque.grado, disciplinas: { has: bloque.disciplina } },
      select: {
        clave: true, estado: true, huellaContenidoRevisado: true, fuenteId: true, fuenteLocator: true,
        desempenosOficiales: { where: { verificadoAt: { not: null } }, select: { id: true }, take: 1 },
      },
      take: 101,
    });
    if (temas.length > 100) throw new ErrorDeNegocio("El bloque supera 100 temas. Divídelo antes de revisar.");
    const conHuella = await conVigencia(temas);
    const pendientes = conHuella.filter((tema) => tema.estado === "borrador" || tema.pendienteRevision);
    if (pendientes.length === 0) throw new ErrorDeNegocio("Este bloque no tiene temas pendientes.");
    const ahora = new Date();
    for (const tema of pendientes) {
      comprobarRevision(tema, tema.huellaActual, true);
      const siguiente = tema.estado === "borrador" ? "revisado" : tema.estado;
      const cambio = await tx.temaCurricular.updateMany({
        where: { clave: tema.clave, estado: tema.estado, huellaContenidoRevisado: tema.huellaContenidoRevisado },
        data: { estado: siguiente, huellaContenidoRevisado: tema.huellaActual, revisadoPorId: admin.user.id, revisadoAt: ahora },
      });
      if (cambio.count !== 1) throw new ErrorDeNegocio("Un tema del bloque cambió. Vuelve a cargar la página.");
      await tx.auditoriaPlataforma.create({ data: {
        actorId: admin.user.id, accion: "curriculum_estado_editorial", tenantId: null,
        detalle: {
          clave: tema.clave, anterior: tema.estado, actual: siguiente, bloque,
          huellaAnterior: tema.huellaContenidoRevisado, huellaActual: tema.huellaActual, checklistConfirmado: true,
        },
      } });
    }
    return pendientes.length;
  });
}
