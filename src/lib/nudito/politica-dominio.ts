// Responsable: B (specs/43). Política de dominio por tema/habilidad: configurable (nudito_config_colegio.politica_dominio)
// y verificable (cada cambio deja motivo y evidencia en nudito_dominio_eventos). Puro.
import { esquemaPoliticaDominio, type EstadoDominioTema, type EvaluarDominio, type EvidenciaPractica, type PoliticaDominio } from "./contratos";
import { pendiente } from "./pendiente";

/** Valores iniciales (B puede ajustarlos con tests; cambiar umbrales = nueva `version`). */
export const POLITICA_DOMINIO_POR_DEFECTO: PoliticaDominio = esquemaPoliticaDominio.parse({
  version: "v1",
  ventana: 8,
  minIntentos: 6,
  minPuntajePonderado: 0.8,
  pesoConPista: 0.5,
  pesoParcial: 0.5,
  maxPistasPromedio: 1,
  minSesionesDistintas: 2,
  horasEntreSesiones: 12,
  dificultadMinimaDominio: 3,
  ejerciciosComprobacion: 3,
  minAciertosComprobacionSinPista: 2,
  subirTrasAciertosSeguidos: 3,
  bajarTrasFallosSeguidos: 2,
  desbloqueo: { requiereDificultad: 4, requierePrerrequisitosDominados: true },
});

/** Política del colegio = por defecto + cambios validados. Cambios inválidos → error claro (no se ignoran en silencio). */
export function politicaEfectiva(cambios: unknown): PoliticaDominio {
  return pendiente("B", "politicaEfectiva", cambios);
}

export const evaluarDominio: EvaluarDominio = (actual: EstadoDominioTema, evidencia: EvidenciaPractica, politica: PoliticaDominio) =>
  pendiente("B", "evaluarDominio", actual, evidencia, politica);
