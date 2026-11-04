// Textos y etiquetas del seguimiento y gobierno de Nudito (specs/44). Puro, cliente/servidor.
import type { AreaNudito, ConfigNudito, EstadoDominio } from "@/lib/nudito/contratos";

export const NOMBRE_AREA_NUDITO: Record<AreaNudito, string> = {
  matematica: "Matemática",
  comunicacion: "Comunicación",
  "ciencia-tecnologia": "Ciencia y Tecnología",
};

/** Estado de dominio para personas (siempre en positivo: «para reforzar», nunca «mal»). */
export const NOMBRE_ESTADO_DOMINIO: Record<EstadoDominio, string> = {
  no_iniciado: "Sin empezar",
  en_progreso: "Practicando",
  en_comprobacion: "Comprobando",
  dominado: "Dominado",
  reforzar: "Para reforzar",
};

/** Aviso que acompaña TODA vista de progreso. */
export const AVISO_FORMATIVO = "Práctica formativa, no es nota: no cambia calificaciones ni libretas.";

/** FormData del formulario de configuración → entrada de `guardarConfigNudito` (la valida el servidor con zod). */
export function configDesdeFormulario(f: FormData): Omit<ConfigNudito, "politicaDominio"> & { politicaDominio: unknown } {
  const t = (k: string) => String(f.get(k) ?? "").trim();
  const num = (k: string) => (t(k) === "" ? null : Number(t(k).replace(",", ".")));
  let politica: unknown = null;
  if (t("politicaDominio") !== "") {
    try {
      politica = JSON.parse(t("politicaDominio"));
    } catch {
      politica = "json-no-valido";
    }
  }
  return {
    activo: f.get("activo") === "on",
    areas: f.getAll("areas").map(String) as AreaNudito[],
    niveles: f.getAll("niveles").map(String) as ConfigNudito["niveles"],
    gradoMinimoPrimaria: num("gradoMinimoPrimaria") ?? 1,
    permitirModoHijo: f.get("permitirModoHijo") === "on",
    permitirFotos: f.get("permitirFotos") === "on",
    minutosPorDia: num("minutosPorDia"),
    sesionesPorDia: num("sesionesPorDia") ?? 6,
    topeCostoUsdMes: num("topeCostoUsdMes"),
    retencionDias: num("retencionDias") ?? 180,
    horaDesde: t("horaDesde") || null,
    horaHasta: t("horaHasta") || null,
    politicaDominio: politica,
  };
}
