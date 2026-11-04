"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Resultado } from "@/lib/resultado";
import { consultarDisponibilidad, type Disponibilidad, type FranjaVista } from "@/lib/server/disponibilidad";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireFeature } from "@/lib/server/plan";
import {
  agregarAcuerdo, cancelarReunion, convocarReunion, crearBloqueo, franjasParaSolicitud, guardarActa, guardarHorarioAtencion, marcarAcuerdo,
  marcarAsistencia, marcarRealizada, quitarBloqueo, recordarPendientes, reprogramarReunion, responderInvitacion, solicitarReunion, type ResultadoReserva,
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

/** Asistente (specs/40): disponibilidad por persona y alternativas. */
export async function disponibilidadAction(slug: string, entrada: unknown): Promise<Disponibilidad | { error: string }> {
  return consultarDisponibilidad(await contexto(slug), entrada);
}

/** Asistente: confirma la reunión (el servidor revalida la franja). */
export async function confirmarReunionAction(slug: string, entrada: unknown): Promise<ResultadoReserva> {
  const ctx = await contexto(slug);
  const r = await convocarReunion(ctx, entrada);
  if (r.ok) {
    refrescar();
    enviarAvisos(ctx);
  }
  return r;
}

export async function reprogramarAction(slug: string, reunionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await reprogramarReunion(ctx, reunionId, {
    fecha: texto(f, "fecha"), hora: texto(f, "hora"), duracion: texto(f, "duracion"), motivo: texto(f, "motivo"),
    fueraDeHorario: f.get("fueraDeHorario") === "on", forzarClase: f.get("forzarClase") === "on", motivoForzar: texto(f, "motivoForzar"),
  });
  if (r.ok) {
    refrescar();
    enviarAvisos(ctx);
    return r;
  }
  const alternativas = r.alternativas?.length ? ` Libres: ${r.alternativas.map((a) => `${a.fecha.slice(8)}/${a.fecha.slice(5, 7)} ${a.hora}`).join(", ")}.` : "";
  return { ok: false, error: `${r.error}${alternativas}` };
}

export async function solicitarAction(slug: string, entrada: unknown): Promise<Resultado & { id?: string }> {
  const ctx = await contexto(slug);
  const r = await solicitarReunion(ctx, entrada);
  if (r.ok) {
    refrescar();
    enviarAvisos(ctx);
  }
  return r;
}

export async function franjasSolicitudAction(slug: string, alumnoId: string, docenteId: string): Promise<FranjaVista[] | null> {
  return franjasParaSolicitud(await contexto(slug), alumnoId, docenteId);
}

export async function acuerdoAction(slug: string, reunionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await agregarAcuerdo(await contexto(slug), reunionId, { texto: texto(f, "texto"), responsableId: texto(f, "responsableId"), fechaCompromiso: texto(f, "fechaCompromiso") });
  if (r.ok) refrescar();
  return r;
}

export async function marcarAcuerdoAction(slug: string, acuerdoId: string, cumplido: boolean): Promise<Resultado> {
  const r = await marcarAcuerdo(await contexto(slug), acuerdoId, cumplido);
  if (r.ok) refrescar();
  return r;
}

export async function horarioAtencionAction(slug: string, franjas: unknown): Promise<Resultado> {
  const r = await guardarHorarioAtencion(await contexto(slug), franjas);
  if (r.ok) refrescar();
  return r;
}

export async function bloqueoAction(slug: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await crearBloqueo(await contexto(slug), {
    fecha: texto(f, "fecha"), fechaFin: texto(f, "fechaFin"), horaDesde: texto(f, "horaDesde"), horaHasta: texto(f, "horaHasta"),
    motivo: texto(f, "motivo"), tipo: texto(f, "tipo") || "bloqueo", membershipId: texto(f, "membershipId"),
  });
  if (r.ok) refrescar();
  return r;
}

export async function quitarBloqueoAction(slug: string, bloqueoId: string): Promise<Resultado> {
  const r = await quitarBloqueo(await contexto(slug), bloqueoId);
  if (r.ok) refrescar();
  return r;
}

export async function responderAction(slug: string, reunionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const r = await responderInvitacion(await contexto(slug), reunionId, {
    respuesta: texto(f, "respuesta"), comentario: texto(f, "comentario"), fechaPropuesta: texto(f, "fechaPropuesta"), horaPropuesta: texto(f, "horaPropuesta"),
  });
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

export async function cancelarAction(slug: string, reunionId: string, _previo: Resultado | null, f: FormData): Promise<Resultado> {
  const ctx = await contexto(slug);
  const r = await cancelarReunion(ctx, reunionId, { motivo: texto(f, "motivo") });
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

