// Responsable: B (specs/43). Política de dominio por tema/habilidad: configurable (nudito_config_colegio.politica_dominio)
// y verificable (cada cambio deja motivo y evidencia en nudito_dominio_eventos). Puro.
//
// Reglas (v1), en este orden, por cada evidencia nueva:
// 1. `incierto` no cuenta: el estado no cambia y la evidencia no entra en la ventana.
// 2. Sesiones distintas: una sesión nueva cuenta si pasaron ≥ `horasEntreSesiones` desde la última evidencia de otra sesión.
// 3. Peso de cada evidencia: correcto sin pista = 1; con 1–2 pistas = `pesoConPista`; parcial = `pesoParcial` (× pesoConPista
//    si usó pistas); con la pista 3 (respuesta revelada) = 0 y nunca es un acierto independiente; incorrecto = 0.
// 4. Dificultad: sube tras `subirTrasAciertosSeguidos` aciertos seguidos (correcto, < 3 pistas) en la dificultad actual;
//    baja tras `bajarTrasFallosSeguidos` incorrectos seguidos. Rango 1–5 (el servicio la acota al rango del tema).
// 5. Estados: no_iniciado → en_progreso con la primera evidencia. → en_comprobacion cuando, en la ventana, hay
//    ≥ `minIntentos` evidencias con dificultad ≥ `dificultadMinimaDominio`, su puntaje ponderado ≥ `minPuntajePonderado`
//    y el promedio de pistas ≤ `maxPistasPromedio`. En comprobación, la ronda son las evidencias de comprobación
//    seguidas al final de la ventana: con ≥ `minAciertosComprobacionSinPista` aciertos SIN pista y ≥ `minSesionesDistintas`
//    sesiones → dominado; con más fallos de los que permite `ejerciciosComprobacion` → en_progreso (o reforzar si el
//    puntaje está por debajo de 0,5). dominado → reforzar si hay fallos seguidos o el puntaje cae por debajo del umbral
//    − 0,2; en_progreso en dificultad 1 con fallos seguidos → reforzar; reforzar → en_progreso al volver a acertar seguido.
// 6. `desbloqueo_tema` solo al pasar a dominado con dificultad ≥ `desbloqueo.requiereDificultad` y TODOS los prerrequisitos
//    dominados. Como el tipo `EvaluarDominio` del contrato no recibe prerrequisitos, `evaluarDominio` acepta un 4.º
//    parámetro opcional `contexto` que arma el servicio (C) con `tema.prerrequisitos` y los temas dominados del alumno;
//    sin `contexto` nunca se emite `desbloqueo_tema`.
import {
  esquemaPoliticaDominio,
  type DecisionDominio,
  type Dificultad,
  type EstadoDominio,
  type EstadoDominioTema,
  type EvaluarDominio,
  type EvidenciaPractica,
  type PoliticaDominio,
  type TemaClave,
} from "./contratos";

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
  if (cambios === null || cambios === undefined) return POLITICA_DOMINIO_POR_DEFECTO;
  const parciales = esquemaPoliticaDominio.partial().safeParse(cambios);
  if (!parciales.success) throw new Error(`Política de dominio no válida: ${parciales.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const sinVersion = Object.keys(parciales.data).filter((k) => k !== "version");
  const version = parciales.data.version ?? (sinVersion.length ? `${POLITICA_DOMINIO_POR_DEFECTO.version}-colegio` : POLITICA_DOMINIO_POR_DEFECTO.version);
  const p = esquemaPoliticaDominio.parse({ ...POLITICA_DOMINIO_POR_DEFECTO, ...parciales.data, version });
  if (p.minIntentos > p.ventana) throw new Error("Política de dominio no válida: minIntentos no puede ser mayor que ventana");
  if (p.minAciertosComprobacionSinPista > p.ejerciciosComprobacion) {
    throw new Error("Política de dominio no válida: minAciertosComprobacionSinPista no puede ser mayor que ejerciciosComprobacion");
  }
  return p;
}

/** Lo que el servicio sabe del tema y que el contrato no lleva: prerrequisitos y temas ya dominados por el alumno. */
export type ContextoDominio = { prerrequisitos: readonly TemaClave[]; dominados: ReadonlySet<TemaClave> };

export const RESPUESTA_REVELADA = 3;

/** Peso de una evidencia (regla 3). */
export function pesoEvidencia(e: EvidenciaPractica, p: PoliticaDominio): number {
  if (e.pistas >= RESPUESTA_REVELADA) return 0;
  const conPista = e.pistas > 0 ? p.pesoConPista : 1;
  if (e.resultado === "correcto") return conPista;
  if (e.resultado === "parcial") return p.pesoParcial * conPista;
  return 0;
}

export const esAcierto = (e: EvidenciaPractica) => e.resultado === "correcto" && e.pistas < RESPUESTA_REVELADA;
export const esAciertoSinPista = (e: EvidenciaPractica) => e.resultado === "correcto" && e.pistas === 0;
export const esFallo = (e: EvidenciaPractica) => e.resultado === "incorrecto";

export function puntajePonderado(evidencia: readonly EvidenciaPractica[], p: PoliticaDominio): number {
  if (!evidencia.length) return 0;
  return evidencia.reduce((a, e) => a + pesoEvidencia(e, p), 0) / evidencia.length;
}

function rachaFinal(evidencia: readonly EvidenciaPractica[], cumple: (e: EvidenciaPractica) => boolean): number {
  let n = 0;
  for (let i = evidencia.length - 1; i >= 0 && cumple(evidencia[i]); i--) n++;
  return n;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

function evaluarDominioConContexto(
  actual: EstadoDominioTema,
  ev: EvidenciaPractica,
  p: PoliticaDominio,
  contexto?: ContextoDominio,
): DecisionDominio {
  if (ev.resultado === "incierto") return { nuevo: { ...actual, politicaVersion: p.version }, eventos: [] };

  const eventos: DecisionDominio["eventos"] = [];
  const previa = actual.evidencia;
  const ultima = previa.at(-1);

  // 2. Sesiones distintas.
  let sesiones = actual.sesionesDistintas;
  if (!ultima) sesiones = Math.max(1, sesiones);
  else if (ev.sesionId !== ultima.sesionId && !previa.some((e) => e.sesionId === ev.sesionId)) {
    const horas = (Date.parse(ev.at) - Date.parse(ultima.at)) / 3_600_000;
    if (horas >= p.horasEntreSesiones) sesiones += 1;
  }
  const evidencia = [...previa, ev].slice(-p.ventana);

  // 4. Dificultad.
  let dificultad = actual.dificultad;
  const enDificultad = evidencia.filter((e) => e.dificultad === actual.dificultad);
  const aciertosSeguidos = rachaFinal(enDificultad, esAcierto);
  const fallosSeguidos = rachaFinal(evidencia, esFallo);
  if (!ev.comprobacion && esAcierto(ev) && aciertosSeguidos >= p.subirTrasAciertosSeguidos && dificultad < 5) {
    dificultad = (dificultad + 1) as Dificultad;
    eventos.push({ tipo: "dificultad_sube", motivo: `Sube a dificultad ${dificultad}: ${aciertosSeguidos} aciertos seguidos en dificultad ${actual.dificultad}.` });
  } else if (esFallo(ev) && fallosSeguidos >= p.bajarTrasFallosSeguidos && dificultad > 1) {
    dificultad = (dificultad - 1) as Dificultad;
    eventos.push({ tipo: "dificultad_baja", motivo: `Baja a dificultad ${dificultad}: ${fallosSeguidos} respuestas incorrectas seguidas.` });
  }

  // 5. Estado.
  const umbral = p.minPuntajePonderado;
  const validas = evidencia.filter((e) => e.dificultad >= p.dificultadMinimaDominio);
  const puntajeValidas = puntajePonderado(validas, p);
  const pistasPromedio = validas.length ? validas.reduce((a, e) => a + e.pistas, 0) / validas.length : Infinity;
  const puntajeVentana = puntajePonderado(evidencia, p);
  const cumpleUmbral = validas.length >= p.minIntentos && puntajeValidas >= umbral && pistasPromedio <= p.maxPistasPromedio;

  let estado: EstadoDominio = actual.estado;
  let motivo = "";
  const cambiar = (nuevo: EstadoDominio, m: string) => {
    estado = nuevo;
    motivo = m;
  };

  switch (actual.estado) {
    case "no_iniciado":
      cambiar("en_progreso", "Empezó a practicar el tema.");
      break;
    case "en_progreso":
    case "reforzar":
      if (cumpleUmbral) {
        cambiar(
          "en_comprobacion",
          `Pasa a comprobación: ${validas.length} ejercicios en dificultad ≥ ${p.dificultadMinimaDominio} con puntaje ponderado ${pct(puntajeValidas)} (mínimo ${pct(umbral)}) y ${pistasPromedio.toFixed(1)} pistas en promedio.`,
        );
      } else if (actual.estado === "en_progreso" && actual.dificultad === 1 && fallosSeguidos >= p.bajarTrasFallosSeguidos) {
        cambiar("reforzar", `Conviene reforzar: ${fallosSeguidos} respuestas incorrectas seguidas en la dificultad más baja.`);
      } else if (actual.estado === "reforzar" && rachaFinal(evidencia, esAcierto) >= p.subirTrasAciertosSeguidos) {
        cambiar("en_progreso", `Vuelve a progresar: ${rachaFinal(evidencia, esAcierto)} aciertos seguidos.`);
      }
      break;
    case "en_comprobacion": {
      if (!ev.comprobacion) break;
      const ronda: EvidenciaPractica[] = [];
      for (let i = evidencia.length - 1; i >= 0 && evidencia[i].comprobacion; i--) ronda.unshift(evidencia[i]);
      const sinPista = ronda.filter(esAciertoSinPista).length;
      const fallosPermitidos = p.ejerciciosComprobacion - p.minAciertosComprobacionSinPista;
      const fallosRonda = ronda.length - sinPista;
      if (sinPista >= p.minAciertosComprobacionSinPista && sesiones >= p.minSesionesDistintas) {
        cambiar(
          "dominado",
          `Dominado: ${sinPista} aciertos sin pista en la comprobación, practicado en ${sesiones} sesiones distintas (mínimo ${p.minSesionesDistintas}).`,
        );
      } else if (fallosRonda > fallosPermitidos) {
        const bajo = puntajeVentana < 0.5;
        cambiar(
          bajo ? "reforzar" : "en_progreso",
          `No superó la comprobación: ${sinPista} de ${ronda.length} ejercicios correctos sin pista (se necesitan ${p.minAciertosComprobacionSinPista}).${bajo ? " Conviene reforzar." : ""}`,
        );
      }
      break;
    }
    case "dominado":
      if (fallosSeguidos >= p.bajarTrasFallosSeguidos || (evidencia.length >= p.minIntentos && puntajeVentana < umbral - 0.2)) {
        cambiar(
          "reforzar",
          fallosSeguidos >= p.bajarTrasFallosSeguidos
            ? `Conviene reforzar: ${fallosSeguidos} respuestas incorrectas seguidas en un tema dominado.`
            : `Conviene reforzar: el puntaje reciente bajó a ${pct(puntajeVentana)}.`,
        );
      }
      break;
  }
  if (estado !== actual.estado) eventos.push({ tipo: "estado", motivo });

  // 6. Desbloqueo.
  if (estado === "dominado" && actual.estado !== "dominado" && contexto) {
    const faltan = contexto.prerrequisitos.filter((c) => !contexto.dominados.has(c));
    if (actual.dificultad >= p.desbloqueo.requiereDificultad && faltan.length === 0) {
      eventos.push({
        tipo: "desbloqueo_tema",
        motivo: `Desbloquea los temas siguientes: dominado en dificultad ${actual.dificultad} (mínimo ${p.desbloqueo.requiereDificultad})${contexto.prerrequisitos.length ? " y con todos sus prerrequisitos dominados" : ""}.`,
      });
    }
  }

  return { nuevo: { estado, dificultad, evidencia, sesionesDistintas: sesiones, politicaVersion: p.version }, eventos };
}

/** Puro: aplica una evidencia nueva según la política. El 4.º parámetro (opcional) habilita `desbloqueo_tema`. */
export const evaluarDominio: EvaluarDominio & ((actual: EstadoDominioTema, evidencia: EvidenciaPractica, politica: PoliticaDominio, contexto?: ContextoDominio) => DecisionDominio) =
  evaluarDominioConContexto;

/** Estado inicial de un tema que el alumno aún no practica. */
export function estadoInicial(politica: PoliticaDominio = POLITICA_DOMINIO_POR_DEFECTO, dificultad: Dificultad = 1): EstadoDominioTema {
  return { estado: "no_iniciado", dificultad, evidencia: [], sesionesDistintas: 0, politicaVersion: politica.version };
}
