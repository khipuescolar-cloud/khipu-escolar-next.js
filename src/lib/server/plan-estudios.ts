import "server-only";
import { z } from "zod";
import type { Nivel } from "@/generated/prisma/enums";
import { esNivelCneb, gradoValido, normalizar } from "@/lib/cneb/catalogo";
import { cursoKhipu, detectarCursoKhipu } from "@/lib/cursos-khipu/catalogo";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { restaurarPlantillaOficial } from "./curriculo";
import { requireRol, type TenantContext } from "./tenant";

const nivelValido = z.enum(["inicial", "primaria", "secundaria", "academia"]);
const anioValido = z.number().int().min(2000).max(2100);
const gradoPermitido = (nivel: Nivel, grado: number) =>
  (nivel === "inicial" && grado >= 3 && grado <= 5) ||
  (nivel === "primaria" && grado >= 1 && grado <= 6) ||
  (nivel === "secundaria" && grado >= 1 && grado <= 5) ||
  (nivel === "academia" && grado > 0);

function exigirEdicion(ctx: TenantContext) {
  requireRol(ctx, ["direccion", "administrativo"]);
  if (ctx.soporte) throw new ErrorDeNegocio("Modo soporte: solo lectura.");
}

function validarMalla(anio: number, nivel: Nivel, grado: number) {
  if (!anioValido.safeParse(anio).success || !nivelValido.safeParse(nivel).success || !Number.isInteger(grado) || !gradoPermitido(nivel, grado)) {
    throw new ErrorDeNegocio("Elige un año, nivel y grado válidos.");
  }
}

export async function guardarCursoColegio(
  ctx: TenantContext,
  entrada: { cursoKhipu?: string | null; nombre?: string; orden?: number },
): Promise<string> {
  exigirEdicion(ctx);
  const catalogo = entrada.cursoKhipu ? cursoKhipu(entrada.cursoKhipu) : null;
  if (entrada.cursoKhipu && !catalogo) throw new ErrorDeNegocio("Ese curso no está en el catálogo de Khipu.");
  const nombre = catalogo?.nombre ?? entrada.nombre?.trim();
  if (!nombre || nombre.length > 80) throw new ErrorDeNegocio("Escribe un nombre de curso de hasta 80 caracteres.");
  const orden = entrada.orden ?? 0;
  if (!Number.isInteger(orden) || orden < 0) throw new ErrorDeNegocio("El orden del curso debe ser un número válido.");
  const existentes = await ctx.db.cursoColegio.findMany({ where: { archivadoAt: null } });
  const previo = existentes.find((c) => catalogo ? c.cursoKhipu === catalogo.clave : !c.cursoKhipu && normalizar(c.nombre) === normalizar(nombre));
  if (previo) return previo.id;
  const creado = await ctx.db.cursoColegio.create({
    data: { tenantId: ctx.tenant.id, cursoKhipu: catalogo?.clave ?? null, nombre, orden },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "curso_colegio", entidadId: creado.id });
  return creado.id;
}

/** Guarda la oferta de un año/grado y aplica el cambio a sus salones activos. */
export async function guardarMallaGrado(
  ctx: TenantContext,
  entrada: { anio: number; nivel: Nivel; grado: number; cursoColegioIds: string[] },
) {
  exigirEdicion(ctx);
  const { anio, nivel, grado } = entrada;
  validarMalla(anio, nivel, grado);
  const ids = [...new Set(entrada.cursoColegioIds)];
  if (ids.length !== entrada.cursoColegioIds.length) throw new ErrorDeNegocio("Hay cursos repetidos en la malla.");
  const cursos = await ctx.db.cursoColegio.findMany({ where: { id: { in: ids }, archivadoAt: null } });
  if (cursos.length !== ids.length) throw new ErrorDeNegocio("Uno de los cursos no pertenece al colegio o está archivado.");
  for (const curso of cursos) {
    const ficha = curso.cursoKhipu ? cursoKhipu(curso.cursoKhipu) : null;
    if (ficha && !ficha.niveles.includes(nivel === "academia" ? "secundaria" : nivel)) throw new ErrorDeNegocio(`El curso «${curso.nombre}» no corresponde a ese nivel.`);
  }
  const actuales = await ctx.db.cursoColegioGrado.findMany({ where: { anio, nivel, grado } });
  const deseados = new Set(ids);
  const sobrantes = actuales.filter((c) => !deseados.has(c.cursoColegioId));
  if (sobrantes.length) await ctx.db.cursoColegioGrado.deleteMany({ where: { id: { in: sobrantes.map((c) => c.id) } } });
  const ya = new Set(actuales.map((c) => c.cursoColegioId));
  for (const [orden, id] of ids.entries()) {
    if (ya.has(id)) await ctx.db.cursoColegioGrado.updateMany({ where: { cursoColegioId: id, anio, nivel, grado }, data: { orden } });
    else await ctx.db.cursoColegioGrado.create({ data: { tenantId: ctx.tenant.id, cursoColegioId: id, anio, nivel, grado, orden } });
  }
  const resultado = await sincronizarCursosDeSalones(ctx, { anio, nivel, grado });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "malla_grado", detalle: { anio, nivel, grado, cursos: ids, ...resultado } });
  return resultado;
}

/** Aplica la malla a todos los salones activos del grado, o a una selección recién creada. */
export async function sincronizarCursosDeSalones(
  ctx: TenantContext,
  entrada: { anio: number; nivel: Nivel; grado: number; salonIds?: string[] },
): Promise<{ creados: number; enlazados: number; borrados: number; avisos: string[] }> {
  exigirEdicion(ctx);
  const { anio, nivel, grado } = entrada;
  validarMalla(anio, nivel, grado);
  const salones = await ctx.db.salon.findMany({
    where: { anio, nivel, grado, archivadoAt: null, ...(entrada.salonIds ? { id: { in: entrada.salonIds } } : {}) },
    include: { cursos: { include: { _count: { select: { asistencias: true, evaluaciones: true, tareas: true } } } } },
  });
  const oferta = await ctx.db.cursoColegioGrado.findMany({
    where: { anio, nivel, grado },
    include: { cursoColegio: true },
    orderBy: { orden: "asc" },
  });
  const deseados = new Set(oferta.map((o) => o.cursoColegioId));
  let creados = 0, enlazados = 0, borrados = 0;
  const avisos: string[] = [];
  for (const salon of salones) {
    const utilizados = new Set<string>();
    for (const o of oferta) {
      const definicion = o.cursoColegio;
      if (definicion.archivadoAt) continue;
      const existente = salon.cursos.find((c) => !utilizados.has(c.id) && (
        c.cursoColegioId === definicion.id ||
        (!c.cursoColegioId && (definicion.cursoKhipu
          ? detectarCursoKhipu(c.nombre, nivel === "academia" ? undefined : nivel)?.clave === definicion.cursoKhipu
          : normalizar(c.nombre) === normalizar(definicion.nombre)))
      ));
      if (existente) {
        utilizados.add(existente.id);
        if (existente.cursoColegioId !== definicion.id) {
          await ctx.db.curso.update({ where: { id: existente.id }, data: { cursoColegioId: definicion.id } });
          enlazados++;
        }
        continue;
      }
      const areaCneb = definicion.cursoKhipu ? cursoKhipu(definicion.cursoKhipu)?.area ?? null : null;
      const creado = await ctx.db.curso.create({
        data: { tenantId: ctx.tenant.id, salonId: salon.id, cursoColegioId: definicion.id, nombre: definicion.nombre, areaCneb, profesorId: salon.tutorId },
      });
      if (ctx.modulos.has("notas") && areaCneb && esNivelCneb(nivel) && gradoValido(nivel, grado)) await restaurarPlantillaOficial(ctx, creado.id);
      await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "curso", entidadId: creado.id, detalle: { origen: "malla" } });
      creados++;
    }
    for (const curso of salon.cursos) {
      if (!curso.cursoColegioId || deseados.has(curso.cursoColegioId)) continue;
      const usos = curso._count.asistencias + curso._count.evaluaciones + curso._count.tareas;
      if (usos > 0) {
        avisos.push(`«${curso.nombre}» de ${salon.nombre} conserva asistencia, notas o tareas; archívalo manualmente si ya no se dicta.`);
        continue;
      }
      await ctx.db.curso.delete({ where: { id: curso.id } });
      await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "curso", entidadId: curso.id, detalle: { origen: "malla" } });
      borrados++;
    }
  }
  return { creados, enlazados, borrados, avisos };
}

/** Un curso añadido a mano se incorpora a la definición y oferta de su año/grado. */
export async function vincularCursoManual(ctx: TenantContext, cursoId: string): Promise<void> {
  exigirEdicion(ctx);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, include: { salon: true } });
  if (!curso) throw new ErrorDeNegocio("No se encontró el curso.");
  if (curso.salon.grado === null || !gradoPermitido(curso.salon.nivel, curso.salon.grado)) return;
  const ficha = detectarCursoKhipu(curso.nombre, curso.salon.nivel === "academia" ? undefined : curso.salon.nivel);
  const id = await guardarCursoColegio(ctx, { cursoKhipu: ficha?.clave, nombre: curso.nombre });
  await ctx.db.curso.update({ where: { id: curso.id }, data: { cursoColegioId: id } });
  await ctx.db.cursoColegioGrado.upsert({
    where: { cursoColegioId_anio_nivel_grado: { cursoColegioId: id, anio: curso.salon.anio, nivel: curso.salon.nivel, grado: curso.salon.grado } },
    update: {},
    create: { tenantId: ctx.tenant.id, cursoColegioId: id, anio: curso.salon.anio, nivel: curso.salon.nivel, grado: curso.salon.grado },
  });
}
