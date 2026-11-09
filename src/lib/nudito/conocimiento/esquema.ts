import { z } from "zod";

const texto = z.string().trim().min(1);
export const esquemaEjercicioBanco = z.object({
  id: z.string().regex(/^e\d{2}$/),
  dificultad: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  tipo: z.enum(["numerico", "opcion_multiple", "verdadero_falso", "texto_corto"]),
  enunciado: texto,
  lectura: texto.max(3000).optional(),
  respuesta: z.union([z.number().finite(), z.boolean(), texto]),
  alternativasAceptadas: z.array(texto).default([]),
  opciones: z.array(z.object({ id: texto, texto })).optional(),
  pistas: z.tuple([texto, texto, texto]),
  retroalimentacion: texto,
  operacion: z.object({ tipo: z.enum(["suma", "resta", "multiplicacion", "division", "perimetro_rectangulo"]), a: z.number().int(), b: z.number().int() }).optional(),
}).superRefine((e, ctx) => {
  if (e.tipo === "numerico" && typeof e.respuesta !== "number") ctx.addIssue({ code: "custom", message: "Respuesta numérica requerida" });
  if (e.tipo === "verdadero_falso" && typeof e.respuesta !== "boolean") ctx.addIssue({ code: "custom", message: "Respuesta booleana requerida" });
  if (e.tipo === "opcion_multiple" && (!e.opciones || e.opciones.length < 2 || e.opciones.filter(o => o.id === e.respuesta).length !== 1)) ctx.addIssue({ code: "custom", message: "Debe existir exactamente una opción correcta" });
});
export const esquemaFicha = z.object({
  clave: z.string().regex(/^(mat|com|cyt)\.(p|s)\d\.[a-z0-9-]+$/), area: z.enum(["matematica", "comunicacion", "ciencia-tecnologia"]), nivel: z.enum(["primaria", "secundaria"]), grado: z.number().int().min(1).max(6),
  competenciaCneb: z.number().int().min(1).max(31), capacidad: texto,
  desempenosOrigen: z.array(z.string().regex(/^(MAT|COM|CYT)-C\d{1,2}-(P|S)\d-\d{2}$/)).min(1), bloque: texto,
  nombre: texto.max(80), descripcionCorta: texto.max(200), palabrasClave: z.array(texto).min(1),
  prerrequisitos: z.array(z.string()), ordenSugerido: z.number().int().positive(),
  ideaCentral: texto, pasos: z.array(texto).min(2),
  ejemplos: z.array(z.object({ situacion: texto, desarrollo: texto, respuesta: texto })).min(2).max(3),
  erroresFrecuentes: z.array(z.object({ error: texto, correccion: texto })).min(1),
  vocabulario: z.array(z.object({ termino: texto, significado: texto })).min(1),
  ejercicios: z.array(esquemaEjercicioBanco).min(12),
  generadorId: z.string().optional(), fuentes: z.array(z.object({ documento: texto, url: z.url(), paginas: texto.optional() })).min(1),
  version: z.number().int().positive(), revisado: z.null(),
}).superRefine((f, ctx) => {
  const prefijo = { matematica: "mat", comunicacion: "com", "ciencia-tecnologia": "cyt" }[f.area];
  const codigoArea = prefijo.toUpperCase();
  const nivel = f.nivel === "primaria" ? "p" : "s";
  if (f.nivel === "secundaria" && f.grado > 5) ctx.addIssue({ code: "custom", path: ["grado"], message: "Secundaria tiene grados 1–5" });
  if (!f.clave.startsWith(`${prefijo}.${nivel}${f.grado}.`)) ctx.addIssue({ code: "custom", path: ["clave"], message: "Clave incoherente con área, nivel o grado" });
  if (f.desempenosOrigen.some(c => !c.startsWith(`${codigoArea}-C${f.competenciaCneb}-${nivel.toUpperCase()}${f.grado}-`))) ctx.addIssue({ code: "custom", path: ["desempenosOrigen"], message: "Desempeño incoherente con ficha" });
});
export type FichaConocimiento = z.infer<typeof esquemaFicha>;
