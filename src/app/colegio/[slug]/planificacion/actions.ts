"use server";
import { revalidatePath } from "next/cache";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireTenantContext } from "@/lib/server/tenant";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import * as plan from "@/lib/server/plan-anual";

const campo = (datos: FormData, nombre: string) => String(datos.get(nombre) ?? "").trim();
const numero = (datos: FormData, nombre: string) => Number(campo(datos, nombre));
const ruta = (planId?: string) => planId ? "/planificacion/" + planId : "/planificacion";
async function ejecutar(fn: () => Promise<void>, planId?: string, mensaje = "Cambios guardados."): Promise<Resultado> {
  try { await fn(); revalidatePath(ruta(planId)); return ok(mensaje); }
  catch (e) { if (e instanceof ErrorDeNegocio) return fallo(e.message); throw e; }
}
export async function crearPlanAccion(slug: string, _previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const ctx = await requireTenantContext(slug);
  return ejecutar(async () => { await plan.crearPlan(ctx, { anio: numero(datos, "anio"), nivel: campo(datos, "nivel"), grado: numero(datos, "grado"), area: campo(datos, "area") }); }, undefined, "Plan creado.");
}
export async function accionPlan(slug: string, planId: string, operacion: string, _previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const ctx = await requireTenantContext(slug);
  return ejecutar(async () => {
    switch (operacion) {
      case "agregar_tema": await plan.agregarTemas(ctx, planId, [campo(datos, "temaClave")]); break;
      case "quitar_tema": await plan.quitarTema(ctx, planId, campo(datos, "temaClave")); break;
      case "mover_tema": {
        const p = await plan.obtenerPlan(ctx, planId);
        const temas = [...p.temas];
        const i = temas.findIndex(t => t.temaClave === campo(datos, "temaClave"));
        const destino = i + (campo(datos, "direccion") === "arriba" ? -1 : 1);
        if (i < 0 || destino < 0 || destino >= temas.length) throw new ErrorDeNegocio("El tema ya está en el extremo del plan.");
        [temas[i], temas[destino]] = [temas[destino], temas[i]];
        await plan.ordenarTemas(ctx, planId, temas.map((t, orden) => ({ temaClave: t.temaClave, orden, unidadId: t.unidadId })));
        break;
      }
      case "asignar_unidad": {
        const p = await plan.obtenerPlan(ctx, planId);
        const clave = campo(datos, "temaClave");
        await plan.ordenarTemas(ctx, planId, p.temas.map(t => ({ temaClave: t.temaClave, orden: t.orden, unidadId: t.temaClave === clave ? (campo(datos, "unidadId") || null) : t.unidadId })));
        break;
      }
      case "proponer_tema": {
        const p = await plan.obtenerPlan(ctx, planId);
        const tipoFuente = campo(datos, "tipoFuente");
        const fuenteId = campo(datos, "fuenteId");
        const fuente = tipoFuente === "generador" ? { tipo: "generador", generadorId: fuenteId } : tipoFuente === "banco" ? { tipo: "banco", bancoId: fuenteId } : { tipo: "lecturas", coleccionId: fuenteId };
        await plan.proponerTemaColegio(ctx, planId, { area: p.area, nivel: p.nivel, grado: p.grado, competenciaCneb: numero(datos, "competencia"), nombre: campo(datos, "nombre"), descripcion: campo(datos, "descripcion"), palabrasClave: campo(datos, "palabrasClave").split(",").map(x => x.trim()).filter(Boolean), dificultadMin: 1, dificultadMax: 5, tipos: datos.getAll("tipos").map(String), fuente });
        break;
      }
      case "crear_unidad": await plan.crearUnidad(ctx, planId, campo(datos, "titulo")); break;
      case "renombrar_unidad": await plan.renombrarUnidad(ctx, planId, campo(datos, "unidadId"), campo(datos, "titulo")); break;
      case "eliminar_unidad": await plan.eliminarUnidad(ctx, planId, campo(datos, "unidadId")); break;
      case "comentar": await plan.comentar(ctx, planId, { contenido: campo(datos, "contenido"), temaClave: campo(datos, "temaClave") || undefined, esObservacion: campo(datos, "esObservacion") === "true" }); break;
      case "resolver": await plan.resolverObservacion(ctx, campo(datos, "comentarioId"), campo(datos, "resolucion")); break;
      case "conformidad": await plan.registrarConformidad(ctx, planId, { decision: campo(datos, "decision"), comentario: campo(datos, "comentario") || undefined }); break;
      case "enviar": await plan.enviarARevision(ctx, planId); break;
      case "reenviar": await plan.reenviarARevision(ctx, planId); break;
      case "aprobar": await plan.aprobar(ctx, planId); break;
      case "publicar": await plan.publicar(ctx, planId); break;
      case "abrir": await plan.abrirRevision(ctx, planId, campo(datos, "motivo")); break;
      case "designar": await plan.designarCoordinador(ctx, planId, campo(datos, "membershipId"), campo(datos, "motivo")); break;
      case "agregar_participante": await plan.agregarParticipante(ctx, planId, campo(datos, "membershipId"), campo(datos, "motivo")); break;
      case "retirar_participante": await plan.retirarParticipante(ctx, planId, campo(datos, "membershipId"), campo(datos, "motivo")); break;
      case "archivar": await plan.archivarPlan(ctx, planId, campo(datos, "motivo")); break;
      case "copiar": await plan.copiarPlan(ctx, planId, numero(datos, "anio")); break;
      case "reunion": await plan.convocarReunionPlan(ctx, planId, { titulo: campo(datos, "titulo"), descripcion: campo(datos, "descripcion"), fecha: campo(datos, "fecha"), hora: campo(datos, "hora"), duracion: numero(datos, "duracion"), modalidad: campo(datos, "modalidad"), lugar: campo(datos, "lugar"), enlace: campo(datos, "enlace") || undefined }); break;
      default: throw new ErrorDeNegocio("Acción desconocida.");
    }
  }, planId);
}
