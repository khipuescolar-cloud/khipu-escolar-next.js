"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ejecutarYVolver, texto, textoONulo } from "@/lib/server/accion-formulario";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import {
  borrarCarpeta, borrarDocumento, crearCarpeta, editarCarpeta, editarDocumento, reemplazarArchivoDocumento, subirDocumento,
} from "@/lib/server/documentos";
import { compartirRecurso, quitarAccesoRecurso, destacarRecurso, restaurarRecurso, eliminarDefinitivoRecurso, accesosDeRecurso, registrarAccesoDocumento, cambiarAccesoGeneral, moverRecurso } from "@/lib/server/documentos-drive";
import type { Rol, NivelCompartidoDocumento } from "@/generated/prisma/enums";
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
  return volver && UUID.test(volver) ? `/documentos?vista=${vista || "biblioteca"}&carpeta=${volver}` : `/documentos?vista=${["unidad", "compartido", "recientes", "destacados", "papelera"].includes(vista) ? vista : "biblioteca"}`;
}

async function archivoDe(formData: FormData, campo = "archivo"): Promise<EntradaAdjunto | null> {
  const v = formData.get(campo);
  if (!v || typeof v === "string" || v.size === 0) return null;
  return { nombre: v.name, buffer: Buffer.from(await v.arrayBuffer()) };
}

const marcado = (formData: FormData, campo: string) => ["on", "true"].includes(texto(formData, campo));
const roles = (formData: FormData) => formData.getAll("visibleRoles").filter((v): v is string => typeof v === "string");

function datosDocumento(formData: FormData) {
  return {
    titulo: texto(formData, "titulo"),
    descripcion: textoONulo(formData, "descripcion"),
    carpetaId: textoONulo(formData, "carpetaId"),
    visibleRoles: roles(formData),
    salonId: textoONulo(formData, "salonId"),
    ambito: texto(formData, "ambito") === "unidad" ? "unidad" as const : "biblioteca" as const,
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

export async function cargarActividadDocumentoAction(tipo: "carpeta" | "documento", id: string) {
  const ctx = await contextoDeAccion([...ROLES_LECTURA]);
  requireFeature(ctx, "documentos");
  if (!UUID.test(id)) throw new Error("Recurso inválido.");
  await accesosDeRecurso(ctx, { tipo, id });
  return ctx.db.auditoria.findMany({ where: { entidad: { in: tipo === "carpeta" ? ["carpeta_documento", "carpeta"] : ["documento"] }, entidadId: id }, select: { accion: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 8 });
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
