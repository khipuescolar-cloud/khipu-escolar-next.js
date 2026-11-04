import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { NuditoTemaColegio } from "@/generated/prisma/client";
import { planIncluye } from "@/lib/planes";
import { posicionGrado, posicionTema, temasDe, temaPorClave, fuenteConocida, cicloDePrerrequisitos } from "@/lib/nudito/catalogo";
import {
  esquemaArea, esquemaFuenteTema, esquemaNivel, esquemaTema, esquemaTemaClave, TIPOS_EJERCICIO,
  type AreaNudito, type FuenteTema, type NivelNudito, type Tema, type TemaClave,
} from "@/lib/nudito/contratos";
import { auditar } from "../auditoria";
import { ErrorDeNegocio } from "../contexto-accion";
import type { DbTenant } from "../db";
import { requireRol, type TenantContext } from "../tenant";

// Responsable: A (specs/42). Catálogo efectivo de un colegio = temas globales (src/lib/nudito/catalogo, en código) +
// temas propios (nudito_temas_colegio, clave «col:<id>»). Sin caché: la consulta es una sola y por índice
// (tenant, área, nivel, grado).

export const PREFIJO_TEMA_COLEGIO = "col:";

/** Convierte una fila de `nudito_temas_colegio` en `Tema` (origen «colegio»). El repaso sale de la descripción. */
export function temaDeColegio(f: NuditoTemaColegio): Tema {
  const descripcion = f.descripcion?.trim() || f.nombre;
  return {
    clave: `${PREFIJO_TEMA_COLEGIO}${f.id}`,
    area: f.area as AreaNudito,
    nivel: f.nivel as NivelNudito,
    grado: f.grado,
    competenciaCneb: f.competenciaCneb,
    ...(f.capacidad ? { capacidad: f.capacidad } : {}),
    nombre: f.nombre,
    ...(f.subtema ? { subtema: f.subtema } : {}),
    descripcionCorta: descripcion.slice(0, 200),
    palabrasClave: f.palabrasClave.length > 0 ? f.palabrasClave : [f.nombre],
    prerrequisitos: f.prerrequisitos,
    dificultad: { min: f.dificultadMin, max: f.dificultadMax } as Tema["dificultad"],
    tipos: f.tipos,
    fuente: f.fuente as FuenteTema,
    repaso: { idea: descripcion.slice(0, 600), ejemplo: "Pídele a tu profesor o profesora un ejemplo de este tema." },
    recursos: (f.recursos as Tema["recursos"]) ?? [],
    origen: "colegio",
    version: 1,
    revisado: f.revisadoPorId && f.revisadoAt ? { por: f.revisadoPorId, fecha: f.revisadoAt.toISOString().slice(0, 10) } : null,
  };
}

/** Temas del área para el nivel (todos los grados: la validación decide qué se permite). Globales + activos del colegio. */
export async function catalogoDelColegio(db: DbTenant, filtro: { area: AreaNudito; nivel: NivelNudito }): Promise<Tema[]> {
  const propios = await db.nuditoTemaColegio.findMany({
    where: { area: filtro.area, nivel: filtro.nivel, activo: true },
    orderBy: [{ grado: "asc" }, { nombre: "asc" }],
  });
  return [...temasDe(filtro.area, filtro.nivel), ...propios.map(temaDeColegio)];
}

/**
 * Temas que el alumno puede practicar en el área: los de su grado y anteriores (de su nivel; en secundaria también los
 * de primaria del catálogo global) y los de grados superiores ya desbloqueados por la política de dominio.
 */
export async function temasParaAlumno(
  ctx: TenantContext,
  filtro: { area: AreaNudito; nivel: NivelNudito; grado: number; desbloqueados?: ReadonlySet<TemaClave> },
): Promise<Tema[]> {
  const pos = posicionGrado(filtro.nivel, filtro.grado);
  const propios = await catalogoDelColegio(ctx.db, filtro);
  const anteriores = filtro.nivel === "secundaria" ? temasDe(filtro.area, "primaria") : [];
  return [...anteriores, ...propios].filter((t) => posicionTema(t) <= pos || filtro.desbloqueados?.has(t.clave));
}

// ───────────── CRUD de temas del colegio (dirección; profesor del área solo lectura) ─────────────

const texto = (max: number) => z.string().trim().min(1).max(max);

export const esquemaTemaColegioEntrada = z
  .object({
    area: esquemaArea,
    nivel: esquemaNivel,
    grado: z.number().int().min(1).max(6),
    competenciaCneb: z.number().int().min(1).max(31),
    capacidad: z.string().trim().max(200).optional(),
    nombre: texto(80),
    subtema: z.string().trim().max(80).optional(),
    descripcion: texto(600),
    palabrasClave: z.array(z.string().trim().min(2).max(60)).min(1).max(12),
    prerrequisitos: z.array(esquemaTemaClave).max(10).default([]),
    dificultadMin: z.number().int().min(1).max(5).default(1),
    dificultadMax: z.number().int().min(1).max(5).default(5),
    tipos: z.array(z.enum(TIPOS_EJERCICIO)).min(1),
    fuente: esquemaFuenteTema,
  })
  .refine((t) => t.dificultadMin <= t.dificultadMax, { message: "La dificultad mínima no puede ser mayor que la máxima.", path: ["dificultadMin"] })
  .refine((t) => (t.nivel === "secundaria" ? t.grado <= 5 : true), { message: "Secundaria tiene grados de 1.° a 5.°.", path: ["grado"] });
export type TemaColegioEntrada = z.input<typeof esquemaTemaColegioEntrada>;

/**
 * Nudito es de Khipu Pro. Se exige el PLAN (no el interruptor del producto ni el del colegio): dirección puede preparar
 * sus temas antes de encender Nudito (specs/44).
 */
function exigirPlanPro(ctx: TenantContext) {
  if (!planIncluye(ctx.tenant.plan, "nudito_plus")) forbidden();
}

function exigirDireccion(ctx: TenantContext) {
  requireRol(ctx, ["direccion"]);
  exigirPlanPro(ctx);
}

function validarEntrada(entrada: unknown) {
  const r = esquemaTemaColegioEntrada.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos del tema.");
  return r.data;
}

/** Prerrequisitos existentes (globales o del colegio), de grado igual o menor, y fuente acordada (registrada por B). */
async function validarReferencias(ctx: TenantContext, d: z.infer<typeof esquemaTemaColegioEntrada>, idPropio?: string) {
  if (!fuenteConocida(d.fuente)) throw new ErrorDeNegocio("La fuente de ejercicios no existe.");
  const pos = posicionGrado(d.nivel, d.grado);
  const idsColegio = d.prerrequisitos.filter((c) => c.startsWith(PREFIJO_TEMA_COLEGIO)).map((c) => c.slice(PREFIJO_TEMA_COLEGIO.length));
  const delColegio = idsColegio.length > 0 ? await ctx.db.nuditoTemaColegio.findMany({ where: { id: { in: idsColegio } } }) : [];
  for (const clave of d.prerrequisitos) {
    const t = clave.startsWith(PREFIJO_TEMA_COLEGIO) ? delColegio.find((f) => `${PREFIJO_TEMA_COLEGIO}${f.id}` === clave) : temaPorClave(clave);
    if (!t || t.area !== d.area) throw new ErrorDeNegocio("Un prerrequisito no existe en el área.");
    if (posicionGrado(t.nivel as NivelNudito, t.grado) > pos) throw new ErrorDeNegocio("Un prerrequisito es de un grado superior.");
  }
  if (idPropio) {
    const todos = await ctx.db.nuditoTemaColegio.findMany({ where: { area: d.area }, select: { id: true, prerrequisitos: true } });
    const grafo = todos.map((f) => ({ clave: `${PREFIJO_TEMA_COLEGIO}${f.id}`, prerrequisitos: f.id === idPropio ? d.prerrequisitos : f.prerrequisitos }));
    if (cicloDePrerrequisitos(grafo)) throw new ErrorDeNegocio("Los prerrequisitos forman un ciclo.");
  }
}

/**
 * Lectura: dirección ve todos; un profesor solo los de las áreas de los cursos que dicta (solo lectura).
 * Incluye inactivos para dirección.
 */
export async function listarTemasColegio(ctx: TenantContext, filtro: { area?: AreaNudito } = {}): Promise<(Tema & { id: string; activo: boolean })[]> {
  requireRol(ctx, ["direccion", "profesor"]);
  exigirPlanPro(ctx);
  let areas: string[] | undefined = filtro.area ? [filtro.area] : undefined;
  if (ctx.rol === "profesor") {
    const cursos = await ctx.db.curso.findMany({ where: { profesorId: ctx.membership.id, areaCneb: { not: null } }, select: { areaCneb: true } });
    const propias = [...new Set(cursos.map((c) => c.areaCneb!))];
    areas = areas ? areas.filter((a) => propias.includes(a)) : propias;
  }
  const filas = await ctx.db.nuditoTemaColegio.findMany({
    where: { ...(areas ? { area: { in: areas } } : {}), ...(ctx.rol === "profesor" ? { activo: true } : {}) },
    orderBy: [{ area: "asc" }, { nivel: "asc" }, { grado: "asc" }, { nombre: "asc" }],
  });
  return filas.map((f) => ({ ...temaDeColegio(f), id: f.id, activo: f.activo }));
}

/**
 * Solo dirección. Valida con zod y `esquemaTema` (origen «colegio»), prerrequisitos y fuente. Un tema con fuente `banco`
 * nace INACTIVO: se activa recién cuando dirección marca sus ítems como revisados (`revisarTemaColegio`).
 */
export async function crearTemaColegio(ctx: TenantContext, entrada: unknown): Promise<{ id: string }> {
  exigirDireccion(ctx);
  const d = validarEntrada(entrada);
  await validarReferencias(ctx, d);
  const activo = d.fuente.tipo !== "banco";
  const fila = await ctx.db.nuditoTemaColegio.create({
    data: {
      tenantId: ctx.tenant.id, area: d.area, nivel: d.nivel, grado: d.grado, competenciaCneb: d.competenciaCneb, capacidad: d.capacidad ?? null,
      nombre: d.nombre, subtema: d.subtema ?? null, descripcion: d.descripcion, palabrasClave: d.palabrasClave, prerrequisitos: d.prerrequisitos,
      dificultadMin: d.dificultadMin, dificultadMax: d.dificultadMax, tipos: d.tipos, fuente: d.fuente, recursos: [], activo, creadoPorId: ctx.user.id,
    },
  });
  const tema = esquemaTema.safeParse(temaDeColegio(fila));
  if (!tema.success) {
    await ctx.db.nuditoTemaColegio.deleteMany({ where: { id: fila.id } });
    throw new ErrorDeNegocio("Revisa los datos del tema.");
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "nudito_tema_colegio", entidadId: fila.id, detalle: { area: d.area, activo } });
  return { id: fila.id };
}

export async function editarTemaColegio(ctx: TenantContext, id: string, entrada: unknown): Promise<void> {
  exigirDireccion(ctx);
  const d = validarEntrada(entrada);
  const actual = await ctx.db.nuditoTemaColegio.findFirst({ where: { id } });
  if (!actual) throw new ErrorDeNegocio("No se encontró el tema.");
  await validarReferencias(ctx, d, id);
  // Cambiar la fuente a «banco» exige una nueva revisión antes de seguir activo.
  const cambiaABanco = d.fuente.tipo === "banco" && JSON.stringify(d.fuente) !== JSON.stringify(actual.fuente);
  await ctx.db.nuditoTemaColegio.updateMany({
    where: { id },
    data: {
      area: d.area, nivel: d.nivel, grado: d.grado, competenciaCneb: d.competenciaCneb, capacidad: d.capacidad ?? null, nombre: d.nombre,
      subtema: d.subtema ?? null, descripcion: d.descripcion, palabrasClave: d.palabrasClave, prerrequisitos: d.prerrequisitos,
      dificultadMin: d.dificultadMin, dificultadMax: d.dificultadMax, tipos: d.tipos, fuente: d.fuente,
      ...(cambiaABanco ? { activo: false, revisadoPorId: null, revisadoAt: null } : {}),
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nudito_tema_colegio", entidadId: id });
}

/** Dirección marca como revisados los ítems del tema (requisito para activar un tema con fuente `banco`). */
export async function revisarTemaColegio(ctx: TenantContext, id: string): Promise<void> {
  exigirDireccion(ctx);
  const r = await ctx.db.nuditoTemaColegio.updateMany({ where: { id }, data: { revisadoPorId: ctx.user.id, revisadoAt: new Date() } });
  if (r.count === 0) throw new ErrorDeNegocio("No se encontró el tema.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nudito_tema_colegio", entidadId: id, detalle: { revisado: true } });
}

export async function activarTemaColegio(ctx: TenantContext, id: string): Promise<void> {
  exigirDireccion(ctx);
  const t = await ctx.db.nuditoTemaColegio.findFirst({ where: { id } });
  if (!t) throw new ErrorDeNegocio("No se encontró el tema.");
  if ((t.fuente as FuenteTema).tipo === "banco" && !t.revisadoPorId) {
    throw new ErrorDeNegocio("Antes de activarlo, revisa los ejercicios del banco de este tema.");
  }
  await ctx.db.nuditoTemaColegio.updateMany({ where: { id }, data: { activo: true } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nudito_tema_colegio", entidadId: id, detalle: { activo: true } });
}

/** Desactiva (no borra: el progreso guarda la clave). */
export async function desactivarTemaColegio(ctx: TenantContext, id: string): Promise<void> {
  exigirDireccion(ctx);
  const r = await ctx.db.nuditoTemaColegio.updateMany({ where: { id }, data: { activo: false } });
  if (r.count === 0) throw new ErrorDeNegocio("No se encontró el tema.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nudito_tema_colegio", entidadId: id, detalle: { activo: false } });
}
