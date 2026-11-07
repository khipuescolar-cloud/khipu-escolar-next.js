"use server";
import { revalidatePath } from "next/cache";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { crearSolicitud, publicarSolicitud, presentarVersion, comenzarRevision, observarVersion, aprobarVersion, reabrirRevision, cambiarEstadoSolicitud, cambiarPlazoSolicitud, agregarDestinatarios, retirarDestinatario, editarSolicitud } from "@/lib/server/solicitudes/index";
import type { EntradaSolicitud } from "@/lib/server/solicitudes/gestion";
import type { EntradaArchivo } from "@/lib/server/almacenamiento";
const actualizar = () => revalidatePath("/documentos");
export async function crearSolicitudAction(e: EntradaSolicitud) { const r = await crearSolicitud(await contextoDeAccion(["direccion"]), e); actualizar(); return r; }
export async function editarSolicitudAction(id: string, e: Parameters<typeof editarSolicitud>[2]) { await editarSolicitud(await contextoDeAccion(["direccion"]), id, e); actualizar(); }
export async function publicarSolicitudAction(id: string) { await publicarSolicitud(await contextoDeAccion(["direccion"]), id); actualizar(); }
export async function cambiarEstadoSolicitudAction(id: string, estado: "cerrada" | "publicada" | "anulada") { await cambiarEstadoSolicitud(await contextoDeAccion(["direccion"]), id, estado); actualizar(); }
export async function cambiarPlazoSolicitudAction(id: string, fecha: Date | null, motivo: string) { await cambiarPlazoSolicitud(await contextoDeAccion(["direccion"]), id, fecha, motivo); actualizar(); }
export async function agregarDestinatariosAction(id: string, e: EntradaSolicitud["destinatarios"]) { await agregarDestinatarios(await contextoDeAccion(["direccion"]), id, e); actualizar(); }
export async function retirarDestinatarioAction(id: string) { await retirarDestinatario(await contextoDeAccion(["direccion"]), id); actualizar(); }
export async function presentarVersionAction(id: string, e: { archivos: EntradaArchivo[]; comentario?: string }) { const r = await presentarVersion(await contextoDeAccion(["profesor"]), id, e); actualizar(); return r; }
export async function comenzarRevisionAction(id: string) { await comenzarRevision(await contextoDeAccion(["direccion"]), id); actualizar(); }
export async function observarVersionAction(id: string, e: { observaciones: string; plazoCorreccion?: Date }) { await observarVersion(await contextoDeAccion(["direccion"]), id, e); actualizar(); }
export async function aprobarVersionAction(id: string) { await aprobarVersion(await contextoDeAccion(["direccion"]), id); actualizar(); }
export async function reabrirRevisionAction(id: string, motivo: string) { await reabrirRevision(await contextoDeAccion(["direccion"]), id, motivo); actualizar(); }
