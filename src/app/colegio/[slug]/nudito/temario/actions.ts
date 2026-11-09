"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireTenantContext } from "@/lib/server/tenant";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import {
  crearTemario,
  agregarTemasTemario,
  quitarTemaTemario,
  moverTemaTemario,
  comentarTemaTemario,
  aceptarTemario,
  copiarTemarioAnterior,
} from "@/lib/server/plan-anual/temario";
const campo = (d: FormData, n: string) => String(d.get(n) ?? "").trim();
export async function crearTemarioAccion(slug: string, _previo: Resultado | null, d: FormData): Promise<Resultado> {
  const ctx = await requireTenantContext(slug, ["profesor"]);
  try {
    const plan = await crearTemario(ctx, {
      anio: Number(campo(d, "anio")),
      nivel: campo(d, "nivel") as "primaria" | "secundaria",
      grado: Number(campo(d, "grado")),
      area: campo(d, "area"),
      nombreCurso: campo(d, "nombreCurso"),
    });
    revalidatePath("/nudito/temario");
    redirect("/nudito/temario/" + plan.id);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}
export async function temarioAccion(
  slug: string,
  id: string,
  operacion: string,
  _previo: Resultado | null,
  d: FormData,
): Promise<Resultado> {
  const ctx = await requireTenantContext(slug, ["profesor"]);
  try {
    switch (operacion) {
      case "agregar":
        await agregarTemasTemario(ctx, id, d.getAll("claves").map(String));
        break;
      case "quitar":
        await quitarTemaTemario(ctx, id, campo(d, "clave"));
        break;
      case "mover":
        await moverTemaTemario(ctx, id, campo(d, "clave"), campo(d, "direccion") === "arriba" ? "arriba" : "abajo");
        break;
      case "comentar":
        await comentarTemaTemario(ctx, id, campo(d, "clave"), campo(d, "contenido"));
        break;
      case "aceptar":
        await aceptarTemario(ctx, id);
        break;
      case "copiar":
        await copiarTemarioAnterior(ctx, id);
        break;
      default:
        return fallo("Acción desconocida.");
    }
    revalidatePath("/nudito/temario");
    revalidatePath("/nudito/temario/" + id);
    return ok("Temario actualizado.");
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}
