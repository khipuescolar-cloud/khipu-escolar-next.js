"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Resultado } from "@/lib/resultado";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireFeature } from "@/lib/server/plan";
import {
  cancelarReunion, convocarReunion, guardarActa, marcarAsistencia, marcarRealizada, recordarPendientes, responderInvitacion,
} from "@/lib/server/reuniones";
import { requireTenantContext, type TenantContext } from "@/lib/server/tenant";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");

async function contexto(slug: string) {
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  return ctx;
}

function refrescar() {
  revalidatePath("/colegio/[slug]/reuniones", "layout");
  revalidatePath("/colegio/[slug]/agenda", "page");
}

/** Envía los avisos recién encolados sin hacer esperar a la persona. */
function enviarAvisos(ctx: TenantContext) {
  after(async () => {
    try {
      await procesarCola({ tenantId: ctx.tenant.id });
    } catch (error) {
      console.error("[avisos] error al procesar la cola", error);
    }
  });
}

export async function convocarReunionAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await convocarReunion(ctx, {
    titulo: texto(f, "titulo"), descripcion: texto(f, "descripcion"), fecha: texto(f, "fecha"), hora: texto(f, "hora"),
    horaFin: texto(f, "horaFin"), lugar: texto(f, "lugar"), enlace: texto(f, "enlace"), alcance: texto(f, "alcance"),
    salonId: texto(f, "salonId"), alumnoId: texto(f, "alumnoId"),
  });
  if (r.ok) {
    refrescar();
    enviarAvisos(ctx);
  }
  return r;
}

export async function responderAction(slug: string, reunionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await responderInvitacion(await contexto(slug), reunionId, { respuesta: texto(f, "respuesta"), comentario: texto(f, "comentario") });
  if (r.ok) refrescar();
  return r;
}

export async function recordarAction(slug: string, reunionId: string): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await recordarPendientes(ctx, reunionId);
  if (r.ok) {
    refrescar();
    enviarAvisos(ctx);
  }
  return r;
}

export async function cancelarAction(slug: string, reunionId: string): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await cancelarReunion(ctx, reunionId);
  if (r.ok) {
    refrescar();
    enviarAvisos(ctx);
  }
  return r;
}

export async function realizadaAction(slug: string, reunionId: string): Promise<Resultado> {
  const r = await marcarRealizada(await contexto(slug), reunionId);
  if (r.ok) refrescar();
  return r;
}

export async function asistenciaAction(slug: string, reunionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await marcarAsistencia(await contexto(slug), reunionId, f.getAll("asistio").map(String));
  if (r.ok) refrescar();
  return r;
}

export async function actaAction(slug: string, reunionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await guardarActa(ctx, reunionId, { acta: texto(f, "acta"), publicar: f.get("publicar") === "on" });
  if (r.ok) {
    refrescar();
    enviarAvisos(ctx);
  }
  return r;
}

