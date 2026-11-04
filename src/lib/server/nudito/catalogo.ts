import "server-only";
import type { AreaNudito, NivelNudito, Tema } from "@/lib/nudito/contratos";
import { pendiente } from "@/lib/nudito/pendiente";
import type { DbTenant } from "../db";
import type { TenantContext } from "../tenant";

// Responsable: A (specs/42). Catálogo efectivo de un colegio = temas globales (src/lib/nudito/catalogo, en código) +
// temas propios (nudito_temas_colegio, clave «col:<id>»). Caché en memoria por colegio con invalidación al editar.

/** Temas del área para el nivel (todos los grados: la validación decide qué se permite). */
export async function catalogoDelColegio(db: DbTenant, filtro: { area: AreaNudito; nivel: NivelNudito }): Promise<Tema[]> {
  return pendiente("A", "catalogoDelColegio", db, filtro);
}

/** Solo dirección. Valida con `esquemaTema` (origen «colegio») y que prerrequisitos y fuente existan. */
export async function crearTemaColegio(ctx: TenantContext, entrada: unknown): Promise<{ id: string }> {
  return pendiente("A", "crearTemaColegio", ctx, entrada);
}

export async function editarTemaColegio(ctx: TenantContext, id: string, entrada: unknown): Promise<void> {
  return pendiente("A", "editarTemaColegio", ctx, id, entrada);
}

/** Desactiva (no borra: el progreso guarda la clave). */
export async function desactivarTemaColegio(ctx: TenantContext, id: string): Promise<void> {
  return pendiente("A", "desactivarTemaColegio", ctx, id);
}
