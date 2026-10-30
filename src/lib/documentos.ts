// Biblioteca de documentos (specs/31): reglas puras de visibilidad y textos. Compartido cliente/servidor.
import type { Rol } from "@/generated/prisma/enums";

/** Roles que se pueden marcar como destinatarios (dirección siempre ve todo; portería no usa la biblioteca). */
export const ROLES_DESTINO: Rol[] = ["apoderado", "alumno", "profesor", "administrativo"];
/** Lo que un profesor puede elegir como destinatarios de sus documentos. */
export const ROLES_DESTINO_PROFESOR: Rol[] = ["apoderado", "alumno", "profesor"];

export const ETIQUETA_DESTINO: Record<string, string> = {
  apoderado: "Familias",
  alumno: "Alumnos",
  profesor: "Profesores",
  administrativo: "Personal administrativo",
};

/** Roles que usan la biblioteca. */
export const ROLES_BIBLIOTECA: Rol[] = ["direccion", "administrativo", "profesor", "apoderado", "alumno"];

/** Roles que administran carpetas (y todos los documentos que ven). */
export const esGestorDocumentos = (rol: Rol) => rol === "direccion" || rol === "administrativo";

/** Una carpeta permite el rol si no tiene roles propios o lo incluye. */
export const carpetaPermiteRol = (visibleRoles: readonly Rol[], rol: Rol) => visibleRoles.length === 0 || visibleRoles.includes(rol);

export type CarpetaPlana = { id: string; parentId: string | null; nombre: string; visibleRoles: Rol[] };

/** Cadena de la carpeta hacia la raíz (la primera es la propia). Corta si hubiera un ciclo. */
export function cadenaDeCarpetas(mapa: ReadonlyMap<string, CarpetaPlana>, carpetaId: string | null): CarpetaPlana[] {
  const cadena: CarpetaPlana[] = [];
  const vistos = new Set<string>();
  let actual = carpetaId ? mapa.get(carpetaId) : undefined;
  while (actual && !vistos.has(actual.id)) {
    cadena.push(actual);
    vistos.add(actual.id);
    actual = actual.parentId ? mapa.get(actual.parentId) : undefined;
  }
  return cadena;
}

/** Visible solo si la carpeta y todas sus carpetas padre permiten el rol (dirección ve todo). */
export function carpetaVisible(mapa: ReadonlyMap<string, CarpetaPlana>, carpetaId: string | null, rol: Rol): boolean {
  if (rol === "direccion") return true;
  return cadenaDeCarpetas(mapa, carpetaId).every((c) => carpetaPermiteRol(c.visibleRoles, rol));
}

export type DatosVisibilidadDocumento = {
  carpetaId: string | null;
  visibleRoles: readonly Rol[];
  salonId: string | null;
  publicadoPorId: string;
};

/**
 * Regla de visibilidad de un documento (specs/31):
 * dirección ve todo; el resto necesita que TODAS las carpetas de su cadena permitan su rol y, además, que sea quien lo publicó
 * o que su rol esté en `visibleRoles` y, si el documento es de un salón, que el salón esté en su alcance
 * (el personal administrativo no pertenece a un salón: la restricción de salón no lo afecta).
 */
export function documentoVisible(
  mapa: ReadonlyMap<string, CarpetaPlana>,
  doc: DatosVisibilidadDocumento,
  quien: { rol: Rol; membershipId: string; salonIds: readonly string[] },
): boolean {
  if (quien.rol === "direccion") return true;
  if (!carpetaVisible(mapa, doc.carpetaId, quien.rol)) return false;
  if (doc.publicadoPorId === quien.membershipId) return true;
  if (!doc.visibleRoles.includes(quien.rol)) return false;
  if (doc.salonId && quien.rol !== "administrativo") return quien.salonIds.includes(doc.salonId);
  return true;
}

/** Texto corto de quién lo ve, para las etiquetas de la lista. */
export function etiquetasDestino(visibleRoles: readonly string[]): string[] {
  if (visibleRoles.length === 0) return ["Solo dirección"];
  return ROLES_DESTINO.filter((r) => visibleRoles.includes(r)).map((r) => ETIQUETA_DESTINO[r]);
}

export const ORDENES_DOCUMENTO = { recientes: "Más recientes", antiguos: "Más antiguos", titulo: "Título (A–Z)" } as const;
export type OrdenDocumento = keyof typeof ORDENES_DOCUMENTO;
export const esOrdenDocumento = (v: unknown): v is OrdenDocumento => typeof v === "string" && Object.hasOwn(ORDENES_DOCUMENTO, v);
