import "server-only";
import { armarPlanesPublicos, catalogoDeCodigo, type FilaCatalogoPublico, type PlanPublico } from "@/lib/landing-planes";
import { db } from "./db";
import { CLAVE_CORREO_SOPORTE } from "./notificaciones/avisos-soporte";

// Lectores públicos de solo lectura para la landing (specs/25-landing-publica.md). Sin sesión: nunca
// devuelven datos de colegios, personas ni alumnos; solo el catálogo comercial y el buzón de contacto.

/** Filas del catálogo (PlanCatalogo + PlanModulo) con precios en número. */
export async function leerCatalogoPublico(): Promise<FilaCatalogoPublico[]> {
  const planes = await db.planCatalogo.findMany({ orderBy: { orden: "asc" }, include: { modulos: { select: { modulo: true } } } });
  return planes.map((p) => ({
    plan: p.plan,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioPorAlumno: p.precioPorAlumno === null ? null : Number(p.precioPorAlumno),
    precioMinimoMensual: p.precioMinimoMensual === null ? null : Number(p.precioMinimoMensual),
    activo: p.activo,
    orden: p.orden,
    modulos: p.modulos.map((m) => m.modulo),
  }));
}

/**
 * Planes que se ofrecen hoy, listos para la landing. Si la BD no responde o el catálogo está vacío, usa los
 * planes del código (la landing nunca se cae por esto).
 */
export async function planesPublicos(): Promise<{ planes: PlanPublico[]; desdeCatalogo: boolean }> {
  try {
    const filas = await leerCatalogoPublico();
    const planes = armarPlanesPublicos(filas);
    if (planes.length > 0) return { planes, desdeCatalogo: true };
  } catch (e) {
    console.error("[landing] no se pudo leer el catálogo de planes", e);
  }
  return { planes: armarPlanesPublicos(catalogoDeCodigo()), desdeCatalogo: false };
}

/** Correo público de Khipu Escolar (pie de la landing y privacidad) cuando la plataforma no configuró otro. */
export const CORREO_CONTACTO_KHIPU = "khipuescolar@gmail.com";

/**
 * Correo de contacto público: el buzón de soporte configurado en la plataforma (specs/22) o, si no hay,
 * `CORREO_CONTACTO_KHIPU`. Nunca el remitente de los avisos ni la cuenta SMTP.
 */
export async function correoContactoPublico(): Promise<string> {
  try {
    const fila = await db.configPlataforma.findUnique({ where: { clave: CLAVE_CORREO_SOPORTE } });
    const v = fila?.valor as { correo?: unknown } | string | null | undefined;
    const guardado = typeof v === "string" ? v : typeof v?.correo === "string" ? v.correo : "";
    if (guardado.includes("@")) return guardado.trim();
  } catch {
    // sin BD: se usa el correo público fijo
  }
  return CORREO_CONTACTO_KHIPU;
}
