import "server-only";
import { ZodError } from "zod";
import type { Consolidado } from "@/lib/tablero-consolidado";
import { consolidadoNotas, filtrosConsolidado } from "./tablero-consolidado";
import { requireTablero } from "./tablero";
import { requireTenantContext } from "./tenant";

/** Valida permisos (dirección con el módulo `tablero`: 403 si no) y filtros (400) y devuelve el consolidado. */
export async function consolidadoParaExportar(
  request: Request,
  slug: string,
  formato: "excel" | "pdf",
): Promise<Consolidado | Response> {
  const ctx = await requireTenantContext(slug);
  requireTablero(ctx);
  const params = new URL(request.url).searchParams;
  try {
    const f = filtrosConsolidado((k) => params.get(k));
    return await consolidadoNotas(ctx, f, { accion: "exportar", formato });
  } catch (error) {
    if (error instanceof ZodError) return new Response("Elige un salón y un periodo válidos.", { status: 400 });
    throw error;
  }
}
