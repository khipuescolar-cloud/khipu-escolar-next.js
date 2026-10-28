"use server";

import { headers } from "next/headers";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { crearSolicitudDemo, esquemaSolicitudDemo } from "@/lib/server/solicitudes";
import type { CampoDemo, EstadoFormularioDemo } from "./_componentes/estado-demo";

const CAMPOS: CampoDemo[] = ["nombre", "cargo", "colegio", "ciudad", "correo", "telefono", "alumnos", "planInteres", "mensaje"];

/** IP del visitante (primera de x-forwarded-for, o x-real-ip). Solo se guarda como hash (specs/25). */
async function ipDelVisitante(): Promise<string> {
  const h = await headers();
  const reenviada = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || h.get("x-real-ip")?.trim() || "desconocida";
}

/** «Solicita una demo» (landing pública). Errores junto a cada campo; éxito con el nombre de la persona. */
export async function solicitarDemoAction(_previo: EstadoFormularioDemo, formData: FormData): Promise<EstadoFormularioDemo> {
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, String(formData.get(c) ?? "")])) as Record<CampoDemo, string>;
  const sitio = String(formData.get("sitio") ?? "");
  const errores: Partial<Record<CampoDemo | "consentimiento", string>> = {};

  const r = esquemaSolicitudDemo.safeParse({ ...valores, sitio });
  if (!r.success) {
    for (const issue of r.error.issues) {
      const campo = issue.path[0] as CampoDemo | undefined;
      if (campo && CAMPOS.includes(campo) && !errores[campo]) errores[campo] = issue.message;
    }
  }
  if (formData.get("consentimiento") !== "si") errores.consentimiento = "Marca la casilla para que podamos escribirte.";
  if (!r.success || Object.keys(errores).length > 0) return { estado: "error", errores, valores };

  try {
    await crearSolicitudDemo(r.data, await ipDelVisitante());
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { estado: "error", errores: {}, mensaje: e.message, valores };
    console.error("[landing] no se pudo guardar la solicitud de demo", e);
    return { estado: "error", errores: {}, mensaje: "No pudimos enviar tus datos. Inténtalo de nuevo en unos minutos.", valores };
  }
  // También si era un bot (campo trampa): misma respuesta, sin pistas.
  const nombre = valores.nombre.trim().split(/\s+/)[0] ?? "";
  return { estado: "ok", nombre };
}
