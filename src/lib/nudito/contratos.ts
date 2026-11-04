// Contratos de Nudito, tutor educativo de Khipu Pro (specs/41–44). Paso 0: CONGELADO.
// Cambios solo por PR al responsable del paso 0 (y en el mismo commit, la spec que corresponda).
//
// Archivo PURO, compartido cliente/servidor: solo zod y tipos. Nunca importa Prisma, `server-only` ni la BD.
// Los datos (temas, ejercicios, respuestas, salidas de IA) se definen como esquemas zod y sus tipos se derivan con
// `z.infer`: así los fixtures, el catálogo en JSON y las salidas estructuradas de la IA se validan en tiempo de ejecución.
//
// Reglas que este contrato fija:
// - `solucion`, `pistas` y `explicacion` de un ejercicio NUNCA se serializan al cliente (solo `EjercicioPublico`).
// - Toda salida de la IA pasa por `safeParse` de su esquema; si falla, se reintenta una vez y luego se usa el texto
//   determinista (repaso/pistas revisados) o el resultado `incierto`.
// - La IA no decide permisos, temas permitidos, matrículas, notas ni la corrección de ítems cerrados.
import { z } from "zod";

// ───────────────────────────── Básicos ─────────────────────────────

/** Áreas de la primera versión. Son claves de `CATALOGO_CNEB` (`src/lib/cneb`) y de `cursos.area_cneb`. */
export const AREAS_NUDITO = ["matematica", "comunicacion", "ciencia-tecnologia"] as const;
export type AreaNudito = (typeof AREAS_NUDITO)[number];
export const esquemaArea = z.enum(AREAS_NUDITO);

export function esAreaNudito(valor: unknown): valor is AreaNudito {
  return typeof valor === "string" && (AREAS_NUDITO as readonly string[]).includes(valor);
}

export const NIVELES_NUDITO = ["primaria", "secundaria"] as const;
export type NivelNudito = (typeof NIVELES_NUDITO)[number];
export const esquemaNivel = z.enum(NIVELES_NUDITO);

export const esquemaDificultad = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
export type Dificultad = z.infer<typeof esquemaDificultad>;

/** Clave estable de un tema. Global: «mat.p3.fracciones-equivalentes». Del colegio: «col:<uuid>». */
export type TemaClave = string;
export const esquemaTemaClave = z.string().regex(/^([a-z]{3}\.[ps][1-6]\.[a-z0-9-]+|col:[0-9a-f-]{36})$/, "Clave de tema no válida");

/** Mismo orden y nombres que el enum `TipoEjercicioNudito` de Prisma. */
export const TIPOS_EJERCICIO = [
  "opcion_multiple", "numerico", "fraccion", "texto_corto", "lectura", "escritura_rubrica", "relacionar", "verdadero_falso",
] as const;
export type TipoEjercicio = (typeof TIPOS_EJERCICIO)[number];

const texto = (max: number) => z.string().trim().min(1).max(max);
const id = z.string().regex(/^[a-z0-9_-]{1,32}$/i, "id no válido");

// ───────────────────────────── Temas ─────────────────────────────

export const esquemaFuenteTema = z.discriminatedUnion("tipo", [
  /** Matemática: generador parametrizado del registro (src/lib/nudito/generadores/registro.ts). */
  z.object({ tipo: z.literal("generador"), generadorId: z.string().min(1) }),
  /** Ciencia y Tecnología: banco de ítems revisados. */
  z.object({ tipo: z.literal("banco"), bancoId: z.string().min(1) }),
  /** Comunicación: colección de lecturas breves con preguntas y consignas de escritura. */
  z.object({ tipo: z.literal("lecturas"), coleccionId: z.string().min(1) }),
]);
export type FuenteTema = z.infer<typeof esquemaFuenteTema>;

export const esquemaTema = z
  .object({
    clave: esquemaTemaClave,
    area: esquemaArea,
    nivel: esquemaNivel,
    grado: z.number().int().min(1).max(6),
    /** Número oficial de la competencia en el CNEB (1–31). */
    competenciaCneb: z.number().int().min(1).max(31),
    capacidad: z.string().optional(),
    /** Código del desempeño en `src/lib/cneb/*.json` («MAT-C23-P3-01»). */
    desempenoCodigo: z.string().regex(/^[A-Z]{2,4}-C\d{1,2}-[IPS]\d-\d{2}$/).optional(),
    nombre: texto(80),
    subtema: z.string().max(80).optional(),
    descripcionCorta: texto(200),
    palabrasClave: z.array(z.string().min(2)).min(1),
    sinonimos: z.array(z.string().min(2)).optional(),
    prerrequisitos: z.array(esquemaTemaClave),
    dificultad: z.object({ min: esquemaDificultad, max: esquemaDificultad }),
    tipos: z.array(z.enum(TIPOS_EJERCICIO)).min(1),
    fuente: esquemaFuenteTema,
    /** Repaso escrito y revisado por personas: NO lo genera la IA. */
    repaso: z.object({ idea: texto(600), ejemplo: texto(600), errorFrecuente: z.string().max(300).optional() }),
    /** Solo URL de dominios activos en `SitioPermitido` (lo verifica el test de integridad del catálogo). */
    recursos: z.array(z.object({ titulo: texto(120), url: z.url() })),
    origen: z.enum(["cneb", "colegio"]),
    version: z.number().int().min(1),
    revisado: z.object({ por: z.string().min(1), fecha: z.iso.date() }).nullable(),
  })
  .refine((t) => t.dificultad.min <= t.dificultad.max, { message: "dificultad.min > dificultad.max", path: ["dificultad"] })
  .refine((t) => (t.nivel === "secundaria" ? t.grado <= 5 : true), { message: "Secundaria tiene grados 1–5", path: ["grado"] });
export type Tema = z.infer<typeof esquemaTema>;

// ─────────────────── Validación determinista de «Otro tema» (specs/42) ───────────────────

export type ValidacionTema =
  | { tipo: "permitido"; tema: Tema; relacion: "grado_actual" | "grado_anterior" | "desbloqueado" }
  | { tipo: "demasiado_avanzado"; solicitado: Tema; alternativas: Tema[]; mensaje: string }
  | { tipo: "ambiguo"; opciones: Tema[]; pregunta: string }
  | { tipo: "no_reconocido"; sugerencias: Tema[]; mensaje: string }
  | { tipo: "fuera_de_area"; areaDetectada?: string; mensaje: string };

export type EntradaValidarTema = {
  texto: string;
  area: AreaNudito;
  nivel: NivelNudito;
  /** Grado OFICIAL del salón del alumno. */
  grado: number;
  /** Temas del área (globales + del colegio), de todos los grados del nivel. */
  temas: readonly Tema[];
  /** Temas por encima del grado ya autorizados por la política de dominio. */
  desbloqueados: ReadonlySet<TemaClave>;
};

/** Puro. La IA puede, como mucho, proponer claves del catálogo (`esquemaCandidatosTema`); la decisión es de esta función. */
export type ValidarTema = (entrada: EntradaValidarTema) => ValidacionTema;

// ───────────────────────────── Ejercicios ─────────────────────────────

const opcion = z.object({ id, texto: texto(300) });

const base = {
  temaClave: esquemaTemaClave,
  dificultad: esquemaDificultad,
  /** generadorId@versión | bancoId:itemId | coleccionId:lecturaId */
  fuenteId: z.string().min(1),
  semilla: z.number().int().nonnegative(),
  enunciado: texto(1200),
  imagenAlt: z.string().max(300).optional(),
};

export const esquemaEjercicioPublico = z.discriminatedUnion("tipo", [
  z.object({ ...base, tipo: z.literal("opcion_multiple"), opciones: z.array(opcion).min(2).max(6) }),
  z.object({ ...base, tipo: z.literal("numerico"), unidad: z.string().max(20).optional(), decimalesPermitidos: z.number().int().min(0).max(4).optional() }),
  z.object({ ...base, tipo: z.literal("fraccion"), pideSimplificar: z.boolean() }),
  z.object({ ...base, tipo: z.literal("texto_corto"), maxCaracteres: z.number().int().min(1).max(200) }),
  z.object({
    ...base,
    tipo: z.literal("lectura"),
    texto: texto(3000),
    preguntas: z
      .array(z.object({ id, tipo: z.enum(["literal", "inferencial", "critica"]), enunciado: texto(400), opciones: z.array(opcion).min(2).max(5).optional() }))
      .min(1)
      .max(8),
  }),
  z.object({
    ...base,
    tipo: z.literal("escritura_rubrica"),
    consigna: texto(800),
    minPalabras: z.number().int().min(1),
    maxPalabras: z.number().int().min(1),
    rubricaId: z.string().min(1),
    criteriosVisibles: z.array(texto(200)).min(1),
  }),
  z.object({ ...base, tipo: z.literal("relacionar"), izquierda: z.array(opcion).min(2).max(8), derecha: z.array(opcion).min(2).max(8) }),
  z.object({ ...base, tipo: z.literal("verdadero_falso"), afirmaciones: z.array(opcion).min(1).max(8) }),
]);
export type EjercicioPublico = z.infer<typeof esquemaEjercicioPublico>;

export const esquemaRubrica = z.object({
  id: z.string().min(1),
  nombre: texto(120),
  grado: z.number().int().min(1).max(6),
  criterios: z
    .array(z.object({ id, descripcion: texto(300), /** 0 = inicio … 3 = logrado */ niveles: z.tuple([texto(300), texto(300), texto(300), texto(300)]) }))
    .min(1)
    .max(6),
});
export type Rubrica = z.infer<typeof esquemaRubrica>;

export const esquemaSolucion = z.discriminatedUnion("tipo", [
  /** `distractores`: opción incorrecta → código del error típico que revela. */
  z.object({ tipo: z.literal("opcion_multiple"), correcta: id, distractores: z.record(z.string(), z.string()) }),
  z.object({ tipo: z.literal("numerico"), valor: z.number().finite(), tolerancia: z.number().min(0) }),
  z.object({ tipo: z.literal("fraccion"), num: z.number().int(), den: z.number().int().refine((d) => d !== 0, "den ≠ 0"), aceptarEquivalentes: z.boolean() }),
  z.object({ tipo: z.literal("texto_corto"), aceptadas: z.array(z.string().min(1)).min(1), normalizacion: z.enum(["estricta", "flexible"]) }),
  /** Por pregunta: id de opción correcta o textos aceptados. */
  z.object({ tipo: z.literal("lectura"), respuestas: z.record(z.string(), z.union([z.string(), z.object({ aceptadas: z.array(z.string().min(1)).min(1) })])) }),
  z.object({ tipo: z.literal("escritura_rubrica"), rubrica: esquemaRubrica }),
  z.object({ tipo: z.literal("relacionar"), pares: z.record(z.string(), z.string()) }),
  z.object({ tipo: z.literal("verdadero_falso"), valores: z.record(z.string(), z.boolean()), justificacion: z.record(z.string(), z.string()).optional() }),
]);
export type Solucion = z.infer<typeof esquemaSolucion>;

/** Lo que produce un generador o el banco. Solo servidor: `publico` es lo único que llega al alumno. */
export const esquemaEjercicioConSolucion = z
  .object({
    publico: esquemaEjercicioPublico,
    solucion: esquemaSolucion,
    /** Pistas graduadas (1 → 3), revisadas o generadas por código. Ninguna revela la respuesta. */
    pistas: z.tuple([texto(400), texto(400), texto(400)]),
    /** Explicación de la solución que se muestra tras responder. */
    explicacion: texto(1200),
  })
  .superRefine((e, ctx) => {
    const p = e.publico;
    const s = e.solucion;
    if (p.tipo !== s.tipo) {
      ctx.addIssue({ code: "custom", message: `solucion.tipo (${s.tipo}) ≠ publico.tipo (${p.tipo})`, path: ["solucion", "tipo"] });
      return;
    }
    const ids = (l: { id: string }[]) => new Set(l.map((x) => x.id));
    if (p.tipo === "opcion_multiple" && s.tipo === "opcion_multiple") {
      const o = ids(p.opciones);
      if (!o.has(s.correcta)) ctx.addIssue({ code: "custom", message: "La opción correcta no existe", path: ["solucion", "correcta"] });
      for (const d of Object.keys(s.distractores)) {
        if (!o.has(d) || d === s.correcta) ctx.addIssue({ code: "custom", message: `Distractor no válido: ${d}`, path: ["solucion", "distractores"] });
      }
    }
    if (p.tipo === "lectura" && s.tipo === "lectura") {
      for (const q of p.preguntas) {
        const r = s.respuestas[q.id];
        if (r === undefined) ctx.addIssue({ code: "custom", message: `Falta la respuesta de ${q.id}`, path: ["solucion", "respuestas"] });
        else if (q.opciones && (typeof r !== "string" || !ids(q.opciones).has(r))) {
          ctx.addIssue({ code: "custom", message: `Respuesta de ${q.id} no es una de sus opciones`, path: ["solucion", "respuestas", q.id] });
        }
      }
    }
    if (p.tipo === "relacionar" && s.tipo === "relacionar") {
      const izq = ids(p.izquierda);
      const der = ids(p.derecha);
      for (const [a, b] of Object.entries(s.pares)) {
        if (!izq.has(a) || !der.has(b)) ctx.addIssue({ code: "custom", message: `Par no válido ${a}→${b}`, path: ["solucion", "pares"] });
      }
      if (Object.keys(s.pares).length !== izq.size) ctx.addIssue({ code: "custom", message: "Cada elemento de la izquierda necesita su par", path: ["solucion", "pares"] });
    }
    if (p.tipo === "verdadero_falso" && s.tipo === "verdadero_falso") {
      const a = ids(p.afirmaciones);
      if (a.size !== Object.keys(s.valores).length || ![...a].every((x) => x in s.valores)) {
        ctx.addIssue({ code: "custom", message: "Cada afirmación necesita su valor", path: ["solucion", "valores"] });
      }
    }
    if (p.tipo === "escritura_rubrica" && s.tipo === "escritura_rubrica") {
      if (p.rubricaId !== s.rubrica.id) ctx.addIssue({ code: "custom", message: "rubricaId no coincide", path: ["publico", "rubricaId"] });
      if (p.minPalabras > p.maxPalabras) ctx.addIssue({ code: "custom", message: "minPalabras > maxPalabras", path: ["publico", "minPalabras"] });
    }
  });
export type EjercicioConSolucion = z.infer<typeof esquemaEjercicioConSolucion>;

// ───────────────────────────── Respuestas ─────────────────────────────

export const esquemaRespuesta = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("opcion"), opcionId: id }),
  /** Texto tal como lo escribió el alumno («3,5», «-2»): el evaluador lo interpreta. */
  z.object({ tipo: z.literal("numero"), valor: z.string().trim().min(1).max(30) }),
  z.object({ tipo: z.literal("fraccion"), num: z.string().trim().min(1).max(12), den: z.string().trim().min(1).max(12) }),
  z.object({ tipo: z.literal("texto"), texto: z.string().trim().min(1).max(3000) }),
  z.object({ tipo: z.literal("lectura"), respuestas: z.record(z.string(), z.string().max(600)) }),
  z.object({ tipo: z.literal("relacionar"), pares: z.record(z.string(), z.string()) }),
  z.object({ tipo: z.literal("vf"), valores: z.record(z.string(), z.boolean()) }),
]);
export type Respuesta = z.infer<typeof esquemaRespuesta>;

/** Tipo de respuesta que espera cada tipo de ejercicio. */
export const RESPUESTA_DE_TIPO = {
  opcion_multiple: "opcion",
  numerico: "numero",
  fraccion: "fraccion",
  texto_corto: "texto",
  lectura: "lectura",
  escritura_rubrica: "texto",
  relacionar: "relacionar",
  verdadero_falso: "vf",
} as const satisfies Record<TipoEjercicio, Respuesta["tipo"]>;

export const esquemaEnvioRespuesta = z.object({
  respuesta: esquemaRespuesta,
  /** Procedimiento escrito (opcional): se guarda y puede usarse para la retroalimentación. */
  procedimiento: z.string().trim().max(2000).optional(),
  /** Foto privada ya subida con `subirFoto` (specs/44). */
  fotoArchivoId: z.uuid().optional(),
  tiempoMs: z.number().int().min(0).max(3_600_000).optional(),
});
export type EnvioRespuesta = z.infer<typeof esquemaEnvioRespuesta>;

// ───────────────────────────── Evaluación ─────────────────────────────

export const RESULTADOS_EVALUACION = ["correcto", "parcial", "incorrecto", "incierto"] as const;
export type ResultadoEvaluacion = (typeof RESULTADOS_EVALUACION)[number];

export const esquemaEvaluacion = z.object({
  resultado: z.enum(RESULTADOS_EVALUACION),
  puntaje: z.number().min(0).max(1),
  retro: texto(1200),
  errorDetectado: z.string().max(60).optional(),
  evaluadoPor: z.enum(["codigo", "banco", "rubrica_ia", "rubrica_simulada"]),
  criterios: z.array(z.object({ id: z.string(), nivel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), comentario: z.string().max(300) })).optional(),
});
export type Evaluacion = z.infer<typeof esquemaEvaluacion>;

/** Puro y determinista: mismo (tema, dificultad, semilla) → mismo ejercicio. */
export interface Generador {
  readonly id: string;
  readonly version: number;
  readonly area: AreaNudito;
  readonly tipos: readonly TipoEjercicio[];
  generar(tema: Tema, dificultad: Dificultad, semilla: number): EjercicioConSolucion;
}

/** Puro: ítems cerrados (y lectura con respuestas cerradas). */
export interface Evaluador {
  readonly tipos: readonly TipoEjercicio[];
  evaluar(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion;
}

/** Respuestas abiertas (escritura con rúbrica): usa la IA; si duda, `incierto`. */
export interface EvaluadorAbierto {
  evaluar(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta, ia: ProveedorTutorIA): Promise<{ evaluacion: Evaluacion; consumo: ConsumoIA }>;
}

// ───────────────────────────── Dominio (specs/43) ─────────────────────────────

export const esquemaPoliticaDominio = z.object({
  version: z.string().min(1),
  /** Cuántas evidencias recientes se miran. */
  ventana: z.number().int().min(4).max(20),
  minIntentos: z.number().int().min(3),
  minPuntajePonderado: z.number().min(0.5).max(1),
  /** Peso de un acierto con pista (1 = como sin pista). */
  pesoConPista: z.number().min(0).max(1),
  pesoParcial: z.number().min(0).max(1),
  maxPistasPromedio: z.number().min(0),
  minSesionesDistintas: z.number().int().min(1),
  horasEntreSesiones: z.number().min(0),
  dificultadMinimaDominio: z.number().int().min(1).max(5),
  ejerciciosComprobacion: z.number().int().min(1),
  minAciertosComprobacionSinPista: z.number().int().min(1),
  subirTrasAciertosSeguidos: z.number().int().min(2),
  bajarTrasFallosSeguidos: z.number().int().min(1),
  desbloqueo: z.object({ requiereDificultad: z.number().int().min(1).max(5), requierePrerrequisitosDominados: z.literal(true) }),
});
export type PoliticaDominio = z.infer<typeof esquemaPoliticaDominio>;

/** Mismo orden y nombres que el enum `EstadoDominioNudito` de Prisma. */
export const ESTADOS_DOMINIO = ["no_iniciado", "en_progreso", "en_comprobacion", "dominado", "reforzar"] as const;
export type EstadoDominio = (typeof ESTADOS_DOMINIO)[number];

export const esquemaEvidenciaPractica = z.object({
  resultado: z.enum(RESULTADOS_EVALUACION),
  dificultad: esquemaDificultad,
  pistas: z.number().int().min(0).max(3),
  sesionId: z.string().min(1),
  comprobacion: z.boolean(),
  at: z.iso.datetime(),
});
export type EvidenciaPractica = z.infer<typeof esquemaEvidenciaPractica>;

export type EstadoDominioTema = {
  estado: EstadoDominio;
  dificultad: Dificultad;
  /** Ventana de evidencias (la más reciente al final). */
  evidencia: EvidenciaPractica[];
  sesionesDistintas: number;
  politicaVersion: string;
};

/** Mismos nombres que el enum `TipoEventoDominioNudito` de Prisma. */
export type TipoEventoDominio = "dificultad_sube" | "dificultad_baja" | "estado" | "desbloqueo_tema" | "bloqueo_tema";

export type DecisionDominio = {
  nuevo: EstadoDominioTema;
  /** Cada cambio con su motivo legible: se guarda en `nudito_dominio_eventos` con la evidencia y la política. */
  eventos: { tipo: TipoEventoDominio; motivo: string }[];
};

/** Puro: aplica una evidencia nueva según la política. Un `incierto` no cuenta para el dominio. */
export type EvaluarDominio = (actual: EstadoDominioTema, evidencia: EvidenciaPractica, politica: PoliticaDominio) => DecisionDominio;

// ───────────────────────────── IA intercambiable ─────────────────────────────

export type ConsumoIA = {
  proveedor: string;
  modelo: string | null;
  tokensEntrada: number;
  tokensSalida: number;
  latenciaMs: number;
  cache: boolean;
  /** true con el proveedor simulado (hoy siempre: no hay credenciales). */
  simulado: boolean;
};

/** Mismos nombres que el enum `OperacionIaNudito` de Prisma. */
export type OperacionIa = "explicar" | "pista" | "retroalimentar_abierta" | "interpretar_imagen" | "preguntar" | "moderar" | "validar_tema";

export const esquemaExplicacion = z.object({ texto: z.string().min(1).max(900), ejemplo: z.string().max(400).optional() });
/** Si `revelaRespuesta` es true, la pista se descarta y se usa la revisada. */
export const esquemaPista = z.object({ texto: z.string().min(1).max(400), revelaRespuesta: z.boolean() });
export const esquemaEvaluacionRubrica = z.object({
  criterios: z.array(z.object({ id: z.string(), nivel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), comentario: z.string().max(300) })),
  retroGeneral: z.string().min(1).max(600),
  confianza: z.number().min(0).max(1),
});
export const esquemaLecturaImagen = z.object({
  transcripcion: z.string().max(1500),
  /** Si la foto muestra un rostro, se descarta y se pide escribir la respuesta. */
  contieneRostro: z.boolean(),
  legible: z.boolean(),
  confianza: z.number().min(0).max(1),
});
/** La IA solo puede proponer claves que ya están en el catálogo (se filtran contra él). */
export const esquemaCandidatosTema = z.object({ claves: z.array(z.string()).max(3) });

export type Explicacion = z.infer<typeof esquemaExplicacion>;
export type PistaIA = z.infer<typeof esquemaPista>;
export type EvaluacionRubricaIA = z.infer<typeof esquemaEvaluacionRubrica>;
export type LecturaImagen = z.infer<typeof esquemaLecturaImagen>;
export type CandidatosTema = z.infer<typeof esquemaCandidatosTema>;

export type SalidaIA<T> = { datos: T; consumo: ConsumoIA };
export type MensajeTutorIA = { rol: "usuario" | "asistente"; texto: string };

/**
 * Amplía `ProveedorIA` (src/lib/server/nudito-plus/proveedor.ts): conserva `responder` (función «preguntar») y agrega
 * operaciones con salida estructurada. Implementaciones: simulada (hoy) y, cuando haya credenciales, Claude/GPT/Gemini.
 */
export interface ProveedorTutorIA {
  readonly nombre: string;
  readonly simulado: boolean;
  responder(entrada: { sistema: string; mensajes: MensajeTutorIA[] }): Promise<{ texto: string; tokensEntrada: number; tokensSalida: number }>;
  explicar(entrada: { tema: Pick<Tema, "nombre" | "repaso" | "grado" | "nivel">; duda?: string }): Promise<SalidaIA<Explicacion>>;
  pista(entrada: { ejercicio: EjercicioPublico; nivel: 1 | 2 | 3; pistaBase: string }): Promise<SalidaIA<PistaIA>>;
  retroalimentarAbierta(entrada: { consigna: string; texto: string; rubrica: Rubrica }): Promise<SalidaIA<EvaluacionRubricaIA>>;
  interpretarImagen(entrada: { mime: string; bytes: Uint8Array; proposito: "ejercicio" | "procedimiento" }): Promise<SalidaIA<LecturaImagen>>;
  sugerirTemas?(entrada: { texto: string; candidatos: { clave: string; nombre: string }[] }): Promise<SalidaIA<CandidatosTema>>;
}

// ───────────────────────────── Configuración institucional (specs/44) ─────────────────────────────

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora HH:mm");

/** Lo que dirección puede cambiar (columnas de `nudito_config_colegio`). */
export const esquemaConfigNudito = z.object({
  activo: z.boolean(),
  areas: z.array(esquemaArea).min(1),
  niveles: z.array(esquemaNivel).min(1),
  gradoMinimoPrimaria: z.number().int().min(1).max(6),
  permitirModoHijo: z.boolean(),
  permitirFotos: z.boolean(),
  minutosPorDia: z.number().int().min(5).max(600).nullable(),
  sesionesPorDia: z.number().int().min(1).max(50),
  topeCostoUsdMes: z.number().min(0).nullable(),
  retencionDias: z.number().int().min(30).max(730),
  horaDesde: hora.nullable(),
  horaHasta: hora.nullable(),
  politicaDominio: esquemaPoliticaDominio.partial().nullable(),
});
export type ConfigNudito = z.infer<typeof esquemaConfigNudito>;

// ───────────────────────────── API de servidor ─────────────────────────────

/** Quién usa Nudito: el alumno con su cuenta, o su apoderado en «modo hijo» (lo resuelve el acceso, specs/44). */
export type AccesoNudito = {
  alumno: { id: string; nombres: string; apellidos: string; salonId: string };
  modo: "alumno" | "hijo";
};

export type CursoNuditoVista = { cursoId: string; nombre: string; area: AreaNudito };
export type TemaVista = Pick<Tema, "clave" | "nombre" | "subtema" | "grado"> & { estado: EstadoDominio; recomendado: boolean };

export type ResultadosSesion = { aciertos: number; total: number; pistas: number; minutos: number; temas: TemaVista[]; mensaje: string };
export type ProgresoAlumno = {
  porArea: { area: AreaNudito; temas: (TemaVista & { ultimaPractica: string | null; motivo: string | null })[] }[];
};
export type ProgresoCurso = {
  alumnos: { alumnoId: string; nombre: string; dominados: number; enProgreso: number; reforzar: number; ultimaActividad: string | null }[];
  temasDificiles: { clave: TemaClave; nombre: string; alumnos: number }[];
};

/**
 * Forma de entrada y salida de cada operación. En el servidor (src/lib/server/nudito/*) cada una recibe además
 * `ctx: TenantContext` y, las del alumno, `acceso: AccesoNudito`.
 */
export type ApiNudito = {
  iniciarSesion(i: { alumnoId: string }): Promise<{
    sesionId: string;
    bienvenida: { nombre: string; mensaje: string; mascota: "saludo" };
    cursos: CursoNuditoVista[];
    reanudable?: { sesionId: string; tema: string };
  }>;
  elegirCurso(i: { sesionId: string; cursoId: string }): Promise<{ temas: TemaVista[] }>;
  elegirTema(i: { sesionId: string } & ({ temaClave: TemaClave } | { textoLibre: string })): Promise<ValidacionTema>;
  pedirRepaso(i: { sesionId: string }): Promise<{ idea: string; ejemplo: string; explicacionIa?: string }>;
  siguienteEjercicio(i: { sesionId: string }): Promise<
    { ejercicioId: string; numero: number; total: number; comprobacion: boolean; ejercicio: EjercicioPublico } | { fin: true }
  >;
  responder(i: { ejercicioId: string } & EnvioRespuesta): Promise<{
    evaluacion: Evaluacion;
    puedeReintentar: boolean;
    cambioDominio?: { estado: EstadoDominio; motivo: string };
  }>;
  pedirPista(i: { ejercicioId: string }): Promise<{ nivel: 1 | 2 | 3; texto: string; quedan: number }>;
  preguntar(i: { sesionId: string; texto: string }): Promise<{ texto: string; bloqueado: boolean }>;
  subirFoto(i: { sesionId: string; ejercicioId?: string; archivo: { nombre: string; buffer: Uint8Array } }): Promise<{ archivoId: string; lectura: LecturaImagen }>;
  finalizar(i: { sesionId: string }): Promise<ResultadosSesion>;
  progresoDeAlumno(i: { alumnoId: string; area?: AreaNudito }): Promise<ProgresoAlumno>;
  progresoDeCurso(i: { cursoId: string }): Promise<ProgresoCurso>;
};

export type OperacionApi = keyof ApiNudito;
export type EntradaApi<K extends OperacionApi> = Parameters<ApiNudito[K]>[0];
export type SalidaApi<K extends OperacionApi> = Awaited<ReturnType<ApiNudito[K]>>;
