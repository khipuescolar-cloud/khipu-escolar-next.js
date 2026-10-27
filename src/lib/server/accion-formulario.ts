import "server-only";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { ErrorDeNegocio } from "./contexto-accion";

/**
 * Ejecuta una acción de formulario y vuelve a la página con `?ok=` o `?error=` (se muestra con <Flash />).
 * Solo captura errores de negocio y de validación; 403/404/redirects de Next siguen su camino.
 */
export async function ejecutarYVolver(destino: string, fn: () => Promise<string | void>): Promise<never> {
  let query: string;
  try {
    const ok = await fn();
    query = ok ? `ok=${encodeURIComponent(ok)}` : "ok=Listo";
  } catch (e) {
    if (e instanceof ErrorDeNegocio) query = `error=${encodeURIComponent(e.message)}`;
    else if (e instanceof ZodError) query = `error=${encodeURIComponent(e.issues[0]?.message ?? "Revisa los datos.")}`;
    else throw e;
  }
  const [ruta, existente] = destino.split("?");
  redirect(`${ruta}?${existente ? `${existente}&` : ""}${query}`);
}

export function texto(formData: FormData, nombre: string): string {
  return String(formData.get(nombre) ?? "");
}

/** Campo opcional: vacío → null. */
export function textoONulo(formData: FormData, nombre: string): string | null {
  const v = texto(formData, nombre).trim();
  return v === "" ? null : v;
}
