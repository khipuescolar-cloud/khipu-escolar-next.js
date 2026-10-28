/* eslint-disable @typescript-eslint/no-unused-vars -- `_admin` solo exige haber pasado por requireAdminPlataforma() */
import "server-only";
import { z } from "zod";
import type { Plan, Rol } from "@/generated/prisma/enums";
import { anuncioAplica, instanteDeLima, PESO_NIVEL } from "@/lib/anuncios-plataforma";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import type { AdminContext } from "./plataforma";
import { registrarPlataforma } from "./plataforma-registro";

// Anuncios del equipo Khipu a los colegios (specs/22). Modelo global `AnuncioPlataforma`; el CRUD es solo del super administrador.

const fechaLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Indica la fecha y la hora.");

export const esquemaAnuncio = z
  .object({
    titulo: z.string().trim().min(3, "El título necesita al menos 3 letras.").max(120, "El título es muy largo (máximo 120)."),
    cuerpo: z.string().trim().min(3, "Escribe el mensaje.").max(600, "El mensaje es muy largo (máximo 600)."),
    nivel: z.enum(["info", "novedad", "mantenimiento", "urgente"]),
    audiencia: z.enum(["direccion", "personal", "todos"]),
    planes: z.array(z.enum(["basico", "fase2", "promax"])).default([]),
    desde: fechaLocal,
    hasta: fechaLocal,
  })
  .refine((d) => instanteDeLima(d.hasta) > instanteDeLima(d.desde), { message: "«Hasta» debe ser posterior a «Desde».", path: ["hasta"] });

export type EntradaAnuncio = z.input<typeof esquemaAnuncio>;

function validar(entrada: EntradaAnuncio) {
  const r = esquemaAnuncio.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  const d = r.data;
  return { ...d, planes: [...new Set(d.planes)] as Plan[], desde: instanteDeLima(d.desde), hasta: instanteDeLima(d.hasta) };
}

export async function listarAnuncios(_admin: AdminContext) {
  return db.anuncioPlataforma.findMany({ orderBy: [{ desde: "desc" }] });
}

export async function crearAnuncio(admin: AdminContext, entrada: EntradaAnuncio) {
  const d = validar(entrada);
  const a = await db.anuncioPlataforma.create({ data: { ...d, creadoPorId: admin.user.id } });
  await registrarPlataforma(admin.user.id, "anuncio_crear", null, { anuncioId: a.id, titulo: a.titulo, nivel: a.nivel });
  return a;
}

export async function editarAnuncio(admin: AdminContext, id: string, entrada: EntradaAnuncio) {
  const d = validar(entrada);
  const existente = await db.anuncioPlataforma.findUnique({ where: { id } });
  if (!existente) throw new ErrorDeNegocio("Ese anuncio ya no existe.");
  const a = await db.anuncioPlataforma.update({ where: { id }, data: d });
  await registrarPlataforma(admin.user.id, "anuncio_editar", null, { anuncioId: a.id, titulo: a.titulo });
  return a;
}

export async function eliminarAnuncio(admin: AdminContext, id: string): Promise<void> {
  const a = await db.anuncioPlataforma.findUnique({ where: { id } });
  if (!a) throw new ErrorDeNegocio("Ese anuncio ya no existe.");
  await db.anuncioPlataforma.delete({ where: { id } });
  await registrarPlataforma(admin.user.id, "anuncio_eliminar", null, { anuncioId: id, titulo: a.titulo });
}

export type AnuncioVisible = { id: string; titulo: string; cuerpo: string; nivel: "info" | "novedad" | "mantenimiento" | "urgente" };

/**
 * Anuncios vigentes para la persona que mira el panel de un colegio: según su rol y el plan del colegio.
 * En modo soporte no se muestra ninguno (el super administrador ya los administra).
 */
export async function anunciosVigentes(
  ctx: { rol: Rol; soporte?: unknown; tenant: { plan: Plan } },
  ahora = new Date(),
): Promise<AnuncioVisible[]> {
  if (ctx.soporte) return [];
  const filas = await db.anuncioPlataforma.findMany({ where: { desde: { lte: ahora }, hasta: { gt: ahora } }, orderBy: { desde: "desc" } });
  return filas
    .filter((a) => anuncioAplica(a, { rol: ctx.rol, plan: ctx.tenant.plan }))
    .sort((a, b) => PESO_NIVEL[a.nivel] - PESO_NIVEL[b.nivel])
    .map(({ id, titulo, cuerpo, nivel }) => ({ id, titulo, cuerpo, nivel }));
}
