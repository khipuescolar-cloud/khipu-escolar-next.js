"use server";

import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ejecutarYVolver, texto, textoONulo } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import {
  archivarDocumento, borrarCarpeta, borrarDocumento, crearCarpeta, editarCarpeta, editarDocumento, iniciarSubidaDocumento, reemplazarArchivoDocumento, subirDocumento, subirDocumentoDesdeSubida,
} from "@/lib/server/documentos";
import { compartirRecurso, detalleAccesos, renombrarRecurso, quitarAccesoRecurso, destacarRecurso, restaurarRecurso, eliminarDefinitivoRecurso, accesosDeRecurso, registrarAccesoDocumento, cambiarAccesoGeneral, moverRecurso } from "@/lib/server/documentos-drive";
import type { Rol, NivelCompartidoDocumento, CategoriaBiblioteca } from "@/generated/prisma/enums";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { avisarDocumentoNuevo } from "@/lib/server/notificaciones/avisos-documentos";
import { requireFeature } from "@/lib/server/plan";
import type { EntradaAdjunto } from "@/lib/server/adjuntos";

const ROLES = ["direccion", "administrativo", "profesor"] as const;
const ROLES_LECTURA = ["direccion", "administrativo", "profesor", "apoderado", "alumno"] as const;
const UUID = /^[0-9a-f-]{36}$/i;

/** Vuelve a la carpeta donde estaba el usuario (el id viene del formulario, solo se acepta si es un UUID). */
function destino(formData: FormData): string {
  const volver = textoONulo(formData, "volver");
  const vista = texto(formData, "vista");
  const seccion = vista === "unidad" ? "borradores" : ["recientes", "destacados", "papelera"].includes(vista) ? vista : "borradores";
  return volver && UUID.test(volver) ? `/documentos?seccion=${seccion}&carpeta=${volver}` : `/documentos?seccion=${seccion}`;
}

async function archivoDe(formData: FormData, campo = "archivo"): Promise<EntradaAdjunto | null> {
  const v = formData.get(campo);
  if (!v || typeof v === "string" || v.size === 0) return null;
  return { nombre: v.name, buffer: Buffer.from(await v.arrayBuffer()) };
}

const marcado = (formData: FormData, campo: string) => ["on", "true"].includes(texto(formData, campo));
const roles = (formData: FormData) => formData.getAll("visibleRoles").filter((v): v is string => typeof v === "string");

function datosDocumento(formData: FormData) {
  const categoria = texto(formData, "categoria");
  const categorias = ["reglamento", "convivencia", "protocolo", "calendario", "formato", "oficial", "otro"];
  if (categoria && !categorias.includes(categoria)) throw new ErrorDeNegocio("Elige una categoría válida.");
  return {
    titulo: texto(formData, "titulo"),
    descripcion: textoONulo(formData, "descripcion"),
    carpetaId: textoONulo(formData, "carpetaId"),
    visibleRoles: roles(formData),
    salonId: textoONulo(formData, "salonId"),
    ambito: texto(formData, "ambito") === "unidad" ? "unidad" as const : "biblioteca" as const,
    categoria: (categoria || "otro") as CategoriaBiblioteca,
    oficial: marcado(formData, "oficial"),
  };
}

export async function crearCarpetaAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await crearCarpeta(ctx, { nombre: texto(formData, "nombre"), parentId: textoONulo(formData, "parentId"), visibleRoles: roles(formData), ambito: texto(formData, "ambito") === "unidad" ? "unidad" : "biblioteca" });
    revalidatePath("/documentos");
    return "Carpeta creada.";
  });
}

/** El botón Nuevo espera el ID antes de navegar y mostrar la carpeta creada. */
export async function crearCarpetaDesdeExploradorAction(nombre: string, parentId: string | null): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  try {
    const carpeta = await crearCarpeta(ctx, { nombre, parentId, ambito: "unidad" });
    revalidatePath("/documentos");
    return { ok: true, id: carpeta.id };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { ok: false, error: e.message };
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Revisa el nombre." };
    unstable_rethrow(e);
    throw e;
  }
}

function recurso(formData: FormData) {
  const id = texto(formData, "id");
  if (!UUID.test(id)) throw new Error("Recurso inválido.");
  return { id, tipo: texto(formData, "tipo") === "carpeta" ? "carpeta" as const : "documento" as const };
}

export async function compartirDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const rol = textoONulo(formData, "rol") as Rol | null;
    const nivel = texto(formData, "nivel") as NivelCompartidoDocumento;
    await compartirRecurso(ctx, recurso(formData), { membershipId: textoONulo(formData, "membershipId") ?? undefined, rol: rol ?? undefined, salonId: textoONulo(formData, "salonId") }, nivel);
    if (marcado(formData, "avisar")) {
      const r = recurso(formData);
      const ids = r.tipo === "documento" ? [r.id] : (await ctx.db.documento.findMany({ where: { carpetaId: r.id, eliminadoAt: null }, select: { id: true } })).map((d) => d.id);
      let avisados = 0;
      for (const id of ids) avisados += await avisarDocumentoNuevo(ctx, id);
      if (avisados > 0) after(async () => { try { await procesarCola({ tenantId: ctx.tenant.id }); } catch (error) { console.error("[avisos] error al procesar la cola", error); } });
    }
    revalidatePath("/documentos");
    return "Acceso compartido.";
  });
}

export async function accesoGeneralDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const roles = formData.getAll("visibleRoles").filter((v): v is Rol => typeof v === "string") as Rol[];
    await cambiarAccesoGeneral(ctx, recurso(formData), texto(formData, "acceso") === "restringido" ? [] : roles, textoONulo(formData, "salonId"));
    revalidatePath("/documentos");
    return "Acceso general actualizado.";
  });
}

export async function quitarAccesoDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await quitarAccesoRecurso(ctx, recurso(formData), texto(formData, "compartidoId"));
    revalidatePath("/documentos");
    return "Acceso quitado.";
  });
}

export async function destacarDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES_LECTURA]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await destacarRecurso(ctx, recurso(formData), texto(formData, "destacar") === "true");
    revalidatePath("/documentos");
    return "Destacados actualizados.";
  });
}

export async function moverDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await moverRecurso(ctx, recurso(formData), textoONulo(formData, "destinoId"));
    revalidatePath("/documentos");
    return "Elemento movido.";
  });
}

export async function moverLoteDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const ids = formData.getAll("recursos").filter((v): v is string => typeof v === "string");
    if (ids.length > 50 || ids.some((v) => !/^(carpeta|documento):[0-9a-f-]{36}$/i.test(v))) throw new Error("Selección inválida.");
    for (const v of ids) {
      const [tipo, id] = v.split(":");
      await moverRecurso(ctx, { tipo: tipo as "carpeta" | "documento", id }, textoONulo(formData, "destinoId"));
    }
    revalidatePath("/documentos");
    return `${ids.length} elementos movidos.`;
  });
}

export async function papeleraLoteDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const ids = formData.getAll("recursos").filter((v): v is string => typeof v === "string");
    if (ids.length > 50 || ids.some((v) => !/^(carpeta|documento):[0-9a-f-]{36}$/i.test(v))) throw new Error("Selección inválida.");
    for (const v of ids) {
      const [tipo, id] = v.split(":");
      if (tipo === "carpeta") await borrarCarpeta(ctx, id);
      else await borrarDocumento(ctx, id);
    }
    revalidatePath("/documentos");
    return `${ids.length} elementos movidos a la papelera.`;
  });
}

export async function restaurarDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES_LECTURA]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await restaurarRecurso(ctx, recurso(formData));
    revalidatePath("/documentos");
    return "Elemento restaurado.";
  });
}

export async function eliminarDefinitivoDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES_LECTURA]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await eliminarDefinitivoRecurso(ctx, recurso(formData));
    revalidatePath("/documentos");
    return "Elemento eliminado para siempre.";
  });
}

export async function cargarAccesosDocumentoAction(tipo: "carpeta" | "documento", id: string) {
  const ctx = await contextoDeAccion([...ROLES_LECTURA]);
  requireFeature(ctx, "documentos");
  if (!UUID.test(id)) throw new Error("Recurso inválido.");
  return accesosDeRecurso(ctx, { tipo, id });
}

export async function cargarActividadDocumentoAction(tipo: "carpeta" | "documento", id: string): Promise<{ texto: string; createdAt: Date }[]> {
  const ctx = await contextoDeAccion([...ROLES_LECTURA]);
  requireFeature(ctx, "documentos");
  if (!UUID.test(id)) throw new Error("Recurso inválido.");
  await accesosDeRecurso(ctx, { tipo, id });
  const filas = await ctx.db.auditoria.findMany({ where: { entidad: { in: tipo === "carpeta" ? ["carpeta_documento", "carpeta"] : ["documento"] }, entidadId: id }, select: { accion: true, detalle: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 30 });
  const texto = (accion: string, d: Record<string, unknown>): string | null => {
    if (accion === "crear") return tipo === "carpeta" ? "Carpeta creada" : "Documento subido";
    if (accion === "ver") return d.descarga ? "Visto o descargado" : null;
    if (accion === "borrar") return d.definitivo ? "Eliminado para siempre" : "Enviado a la papelera";
    if (d.restaurar) return "Restaurado de la papelera";
    if (d.compartir) return `Compartido como ${d.nivel === "editor" ? "Editor" : "Lector"}`;
    if (d.accesoQuitado) return "Se quitó un acceso";
    if (d.accesoGeneral) return "Cambió el acceso general";
    if (d.mover) return "Movido a otra carpeta";
    if (d.renombrar) return "Renombrado";
    if (d.archivoReemplazado) return "Archivo reemplazado";
    if (d.destacado !== undefined) return null;
    return "Editado";
  };
  // Varias vistas seguidas se muestran como una sola línea (la más reciente).
  const lineas = filas.flatMap((f) => { const t = texto(f.accion, (f.detalle ?? {}) as Record<string, unknown>); return t ? [{ texto: t, createdAt: f.createdAt }] : []; });
  return lineas.filter((l, i) => i === 0 || l.texto !== lineas[i - 1].texto).slice(0, 8);
}

export async function registrarAccesoDocumentoAction(tipo: "carpeta" | "documento", id: string) {
  const ctx = await contextoDeAccion([...ROLES_LECTURA]);
  requireFeature(ctx, "documentos");
  if (!UUID.test(id)) throw new Error("Recurso inválido.");
  await registrarAccesoDocumento(ctx, { tipo, id });
}

export async function editarCarpetaAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await editarCarpeta(ctx, texto(formData, "id"), { nombre: texto(formData, "nombre"), parentId: textoONulo(formData, "parentId"), visibleRoles: roles(formData) });
    revalidatePath("/documentos");
    return "Carpeta actualizada.";
  });
}

export async function borrarCarpetaAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const r = await borrarCarpeta(ctx, texto(formData, "id"));
    revalidatePath("/documentos");
    return `Carpeta borrada${r.documentos ? ` con ${r.documentos} ${r.documentos === 1 ? "documento" : "documentos"}` : ""}.`;
  });
}

export async function subirDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const r = await subirDocumento(ctx, { ...datosDocumento(formData), avisar: marcado(formData, "avisar") }, await archivoDe(formData));
    revalidatePath("/documentos");
    if (r.avisados > 0) {
      // Envía el correo y el push ahora, sin esperar al cron.
      after(async () => {
        try {
          await procesarCola({ tenantId: ctx.tenant.id });
        } catch (error) {
          console.error("[avisos] error al procesar la cola", error);
        }
      });
    }
    return `Documento publicado.${r.avisados > 0 ? ` Se avisó a ${r.avisados} ${r.avisados === 1 ? "familia" : "familias"}.` : ""}`;
  });
}

export async function iniciarSubidaDocumentoAction(entrada: { titulo: string; carpetaId: string | null; ambito: "unidad" | "biblioteca"; nombre: string; bytes: number; mimeDeclarado: string }) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  return iniciarSubidaDocumento(ctx, { titulo: entrada.titulo, carpetaId: entrada.carpetaId, ambito: entrada.ambito, visibleRoles: [], salonId: null }, { nombre: entrada.nombre, bytes: entrada.bytes, mimeDeclarado: entrada.mimeDeclarado });
}

export async function confirmarSubidaDocumentoAction(entrada: { titulo: string; carpetaId: string | null; ambito: "unidad" | "biblioteca"; subidaId: string }) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  const r = await subirDocumentoDesdeSubida(ctx, { titulo: entrada.titulo, carpetaId: entrada.carpetaId, ambito: entrada.ambito, visibleRoles: [], salonId: null }, entrada.subidaId);
  revalidatePath("/documentos");
  return r;
}

export async function editarDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const id = texto(formData, "id");
    const nuevo = await archivoDe(formData);
    await editarDocumento(ctx, id, datosDocumento(formData));
    if (nuevo) await reemplazarArchivoDocumento(ctx, id, nuevo);
    revalidatePath("/documentos");
    return nuevo ? "Documento actualizado con el archivo nuevo." : "Documento actualizado.";
  });
}

export async function borrarDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    await borrarDocumento(ctx, texto(formData, "id"));
    revalidatePath("/documentos");
    return "Documento borrado.";
  });
}

export async function archivarDocumentoAction(formData: FormData) {
  const ctx = await contextoDeAccion([...ROLES]);
  requireFeature(ctx, "documentos");
  await ejecutarYVolver(destino(formData), async () => {
    const archivar = texto(formData, "archivar") === "true";
    await archivarDocumento(ctx, texto(formData, "id"), archivar);
    revalidatePath("/documentos");
    return archivar ? "Documento archivado." : "Documento desarchivado.";
  });
}

// ───────────── Acciones directas del diálogo Compartir (sin redirección: devuelven el resultado) ─────────────

export type ResultadoDirecto = { ok: true; mensaje?: string } | { ok: false; error: string };
type Destinatario = { membershipId?: string; rol?: Rol; salonId?: string | null };

async function directa(fn: (ctx: Awaited<ReturnType<typeof contextoDeAccion>>) => Promise<string | void>, roles: readonly string[] = ROLES): Promise<ResultadoDirecto> {
  const ctx = await contextoDeAccion([...roles] as never);
  requireFeature(ctx, "documentos");
  try {
    const mensaje = await fn(ctx);
    revalidatePath("/documentos");
    return { ok: true, mensaje: mensaje || undefined };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { ok: false, error: e.message };
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Revisa los datos." };
    unstable_rethrow(e);
    return { ok: false, error: "No tienes permiso para hacer esto." };
  }
}

function recursoDe(tipo: string, id: string) {
  if (!UUID.test(id)) throw new ErrorDeNegocio("Recurso inválido.");
  return { id, tipo: tipo === "carpeta" ? "carpeta" as const : "documento" as const };
}

export async function cargarDetalleAccesosAction(tipo: "carpeta" | "documento", id: string) {
  const ctx = await contextoDeAccion([...ROLES_LECTURA]);
  requireFeature(ctx, "documentos");
  if (!UUID.test(id)) throw new Error("Recurso inválido.");
  return detalleAccesos(ctx, { tipo, id });
}

export async function compartirDirectoAction(tipo: string, id: string, destinatarios: Destinatario[], nivel: NivelCompartidoDocumento, avisar: boolean): Promise<ResultadoDirecto> {
  return directa(async (ctx) => {
    if (destinatarios.length === 0 || destinatarios.length > 30) throw new ErrorDeNegocio("Elige a quién compartir.");
    if (nivel !== "lector" && nivel !== "editor") throw new ErrorDeNegocio("Nivel inválido.");
    const r = recursoDe(tipo, id);
    for (const d of destinatarios) await compartirRecurso(ctx, r, { membershipId: d.membershipId, rol: d.rol, salonId: d.salonId ?? null }, nivel);
    if (avisar) {
      const ids = r.tipo === "documento" ? [r.id] : (await ctx.db.documento.findMany({ where: { carpetaId: r.id, eliminadoAt: null }, select: { id: true } })).map((x) => x.id);
      let avisados = 0;
      for (const did of ids) avisados += await avisarDocumentoNuevo(ctx, did);
      if (avisados > 0) after(async () => { try { await procesarCola({ tenantId: ctx.tenant.id }); } catch (error) { console.error("[avisos] error al procesar la cola", error); } });
    }
    return destinatarios.length === 1 ? "Acceso compartido." : "Accesos compartidos.";
  });
}

export async function quitarAccesoDirectoAction(tipo: string, id: string, compartidoId: string): Promise<ResultadoDirecto> {
  return directa(async (ctx) => { await quitarAccesoRecurso(ctx, recursoDe(tipo, id), compartidoId); return "Acceso quitado."; });
}

export async function accesoGeneralDirectoAction(tipo: string, id: string, rolesElegidos: Rol[], salonId: string | null): Promise<ResultadoDirecto> {
  return directa(async (ctx) => { await cambiarAccesoGeneral(ctx, recursoDe(tipo, id), rolesElegidos, salonId); });
}

export async function renombrarDirectoAction(tipo: string, id: string, nombre: string): Promise<ResultadoDirecto> {
  return directa(async (ctx) => { await renombrarRecurso(ctx, recursoDe(tipo, id), nombre); return "Nombre actualizado."; });
}

export async function moverDirectoAction(recursos: { tipo: string; id: string }[], destinoId: string | null): Promise<ResultadoDirecto> {
  return directa(async (ctx) => {
    if (recursos.length === 0 || recursos.length > 50) throw new ErrorDeNegocio("Selección inválida.");
    if (destinoId !== null && !UUID.test(destinoId)) throw new ErrorDeNegocio("Destino inválido.");
    for (const r of recursos) await moverRecurso(ctx, recursoDe(r.tipo, r.id), destinoId);
    return recursos.length === 1 ? "Elemento movido." : `${recursos.length} elementos movidos.`;
  });
}
