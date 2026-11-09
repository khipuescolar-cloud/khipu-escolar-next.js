import { createHash } from "node:crypto";
import { z } from "zod";
import type { EstadoDominioNudito, EstadoLeccionNudito, OrigenLeccionNudito } from "@/generated/prisma/enums";

const texto = z.string().trim().min(1);
const muestra = z.object({
  enunciado: texto.max(1000),
  respuesta: texto.max(1000),
  pistas: z.array(texto.max(500)).max(5),
});
export const esquemaLeccion = z.object({
  titulo: texto.max(200),
  idea: texto.max(400),
  explicacion: texto.max(1500),
  ejemplos: z.array(z.object({ enunciado: texto.max(1000), desarrollo: texto.max(1500) })).min(1).max(3),
  errorFrecuente: texto.max(500).optional(),
  recursos: z.array(z.object({
    tipo: z.enum(["svg", "diagrama", "enlace"]),
    titulo: texto.max(200),
    valor: texto.max(3000),
  })).max(10),
  ejerciciosMuestra: z.array(muestra).min(1).max(5),
});
export type Leccion = z.infer<typeof esquemaLeccion>;
const datoPersonal = /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{8,9}\b|\b(?:me llamo|mi dni|vivo en|mi teléfono)\b/i;
export function validarLeccion(contenido: unknown, opciones: { evaluar?: (muestra: Leccion["ejerciciosMuestra"][number]) => boolean; permitirEnlace?: (url: URL) => boolean } = {}) {
  const parsed = esquemaLeccion.safeParse(contenido);
  if (!parsed.success) return { ok: false as const, errores: parsed.error.issues.map(i => `El campo ${i.path.join(".") || "contenido"} es inválido (${i.code}).`) };
  const errores: string[] = [];
  const leccion = parsed.data;
  if (datoPersonal.test(JSON.stringify(leccion))) errores.push("El contenido parece incluir datos personales.");
  for (const recurso of leccion.recursos) {
    if (recurso.tipo === "enlace") {
      try {
        const url = new URL(recurso.valor);
        if (url.protocol !== "https:") errores.push("Los enlaces deben usar HTTPS.");
        else if (!opciones.permitirEnlace || !opciones.permitirEnlace(url)) errores.push("El enlace no pertenece a un sitio permitido.");
      } catch { errores.push("Hay un enlace inválido."); }
    } else if (recurso.tipo === "svg" && /<script|onload\s*=|javascript:/i.test(recurso.valor)) {
      errores.push("El SVG contiene código no permitido.");
    }
  }
  if (opciones.evaluar) for (const m of leccion.ejerciciosMuestra)
    if (!opciones.evaluar(m)) errores.push("Una respuesta de muestra no coincide con el evaluador.");
  return errores.length ? { ok: false as const, errores } : { ok: true as const, errores: [], contenido: leccion };
}
function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return "[" + valor.map(canonico).join(",") + "]";
  if (valor && typeof valor === "object") return "{" + Object.entries(valor).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k)+":"+canonico(v)).join(",") + "}";
  return JSON.stringify(valor);
}
export function hashContenido(contenido: unknown): string {
  return createHash("sha256").update(canonico(contenido)).digest("hex");
}
export type AccionLeccion = "enviar_revision" | "solicitar_cambios" | "aprobar" | "publicar" | "retirar";
export function puedeTransicionarLeccion(estado: EstadoLeccionNudito, accion: AccionLeccion, contexto: { origen: OrigenLeccionNudito; valida?: boolean }): { ok: true; siguiente: EstadoLeccionNudito } | { ok: false; motivo: string } {
  const destinos: Record<EstadoLeccionNudito, Partial<Record<AccionLeccion, EstadoLeccionNudito>>> = {
    borrador: { enviar_revision: "en_revision", retirar: "retirada" },
    en_revision: { solicitar_cambios: "cambios_solicitados", aprobar: "aprobada", retirar: "retirada" },
    cambios_solicitados: { enviar_revision: "en_revision", retirar: "retirada" },
    aprobada: { publicar: "publicada", retirar: "retirada" },
    publicada: { retirar: "retirada" },
    retirada: {},
  };
  const siguiente = destinos[estado][accion];
  if (!siguiente) return { ok: false, motivo: "La acción no corresponde al estado de la lección." };
  if (accion === "enviar_revision" && !contexto.valida) return { ok: false, motivo: "Corrige la lección antes de enviarla a revisión." };
  if (accion === "aprobar" && contexto.origen === "ia_simulada")
    return { ok: false, motivo: "La lección simulada requiere edición docente antes de aprobarse." };
  return { ok: true, siguiente };
}
export function mapearEstadoProgreso(estado: EstadoDominioNudito | null): "pendiente" | "en_progreso" | "necesita_refuerzo" | "dominado" {
  if (estado === null || estado === "no_iniciado") return "pendiente";
  if (estado === "reforzar") return "necesita_refuerzo";
  if (estado === "dominado") return "dominado";
  return "en_progreso";
}
