import "server-only";
import type { AmbitoDocumento, NivelCompartidoDocumento, Rol } from "@/generated/prisma/enums";
import { cadenaDeCarpetas, carpetaVisible, documentoVisible, type CarpetaPlana } from "@/lib/documentos";
import { salonIdsVisibles, type TenantContext } from "./tenant";

type CarpetaAcceso = CarpetaPlana & { creadoPorId: string; creadoPor: { user: { nombres: string; apellidos: string } }; ambito: AmbitoDocumento; eliminadoAt: Date | null; archivadoAt: Date | null; salonId: string | null; createdAt: Date; updatedAt: Date };
type DocumentoAcceso = { id: string; carpetaId: string | null; publicadoPorId: string; ambito: AmbitoDocumento; eliminadoAt: Date | null; visibleRoles: Rol[]; salonId: string | null };
type Compartido = { carpetaId: string | null; documentoId: string | null; membershipId: string | null; rol: Rol | null; salonId: string | null; nivel: NivelCompartidoDocumento };

export function destinatarioCoincide(share: Compartido, membershipId: string, rol: Rol, salones: readonly string[]): boolean {
  if (share.membershipId) return share.membershipId === membershipId;
  return share.rol === rol && (!share.salonId || salones.includes(share.salonId));
}

export function nivelEfectivo(
  mapa: ReadonlyMap<string, CarpetaAcceso>, compartidos: readonly Compartido[],
  recurso: { id: string; carpetaId: string | null; propietarioId: string; ambito: AmbitoDocumento; eliminadoAt: Date | null; visibleRoles?: Rol[]; salonId?: string | null },
  tipo: "carpeta" | "documento", quien: { membershipId: string; rol: Rol; salones: readonly string[] },
): "ninguno" | NivelCompartidoDocumento | "propietario" {
  if (recurso.eliminadoAt || cadenaDeCarpetas(mapa, tipo === "carpeta" ? recurso.id : recurso.carpetaId).some((c) => mapa.get(c.id)?.eliminadoAt)) return "ninguno";
  if (quien.rol === "direccion" || recurso.propietarioId === quien.membershipId) return "propietario";
  const cadena = cadenaDeCarpetas(mapa, tipo === "carpeta" ? recurso.id : recurso.carpetaId);
  const ids = new Set(cadena.map((c) => c.id));
  const entradas = compartidos.filter((s) => ((tipo === "documento" && s.documentoId === recurso.id) || (s.carpetaId && ids.has(s.carpetaId))) && destinatarioCoincide(s, quien.membershipId, quien.rol, quien.salones));
  if (entradas.some((s) => s.nivel === "editor") && quien.rol !== "alumno" && quien.rol !== "apoderado") return "editor";
  if (entradas.length) return "lector";
  if (recurso.ambito === "unidad") {
    if (cadena.some((c) => {
      const carpeta = mapa.get(c.id);
      return carpeta?.visibleRoles.includes(quien.rol) && (!carpeta.salonId || quien.salones.includes(carpeta.salonId));
    })) return "lector";
    if (tipo === "documento" && recurso.visibleRoles?.includes(quien.rol) && (!recurso.salonId || quien.salones.includes(recurso.salonId))) return "lector";
    return "ninguno";
  }
  if (tipo === "carpeta") return carpetaVisible(mapa, recurso.id, quien.rol) ? (quien.rol === "administrativo" ? "editor" : "lector") : "ninguno";
  return documentoVisible(mapa, { carpetaId: recurso.carpetaId, visibleRoles: recurso.visibleRoles ?? [], salonId: recurso.salonId ?? null, publicadoPorId: recurso.propietarioId }, { rol: quien.rol, membershipId: quien.membershipId, salonIds: quien.salones }) ? (quien.rol === "administrativo" ? "editor" : "lector") : "ninguno";
}

export async function contextoPermisosDocumento(ctx: TenantContext) {
  const [carpetas, compartidos, salones] = await Promise.all([
    ctx.db.carpetaDocumento.findMany({ select: { id: true, parentId: true, nombre: true, visibleRoles: true, salonId: true, creadoPorId: true, creadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } }, ambito: true, eliminadoAt: true, archivadoAt: true, createdAt: true, updatedAt: true } }),
    ctx.db.compartidoDocumento.findMany({ select: { carpetaId: true, documentoId: true, membershipId: true, rol: true, salonId: true, nivel: true } }),
    salonIdsVisibles(ctx),
  ]);
  return { mapa: new Map(carpetas.map((c) => [c.id, c])), compartidos, quien: { membershipId: ctx.membership.id, rol: ctx.rol, salones } };
}

export function nivelCarpeta(p: Awaited<ReturnType<typeof contextoPermisosDocumento>>, id: string) {
  const c = p.mapa.get(id);
  return c ? nivelEfectivo(p.mapa, p.compartidos, { ...c, carpetaId: c.parentId, propietarioId: c.creadoPorId }, "carpeta", p.quien) : "ninguno";
}

export function nivelDocumento(p: Awaited<ReturnType<typeof contextoPermisosDocumento>>, d: DocumentoAcceso) {
  return nivelEfectivo(p.mapa, p.compartidos, { ...d, propietarioId: d.publicadoPorId }, "documento", p.quien);
}

export function puedeEditarNivel(nivel: ReturnType<typeof nivelCarpeta>) { return nivel === "editor" || nivel === "propietario"; }
