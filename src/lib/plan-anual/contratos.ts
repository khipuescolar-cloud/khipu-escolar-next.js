import { z } from "zod";
import { Nivel } from "@/generated/prisma/enums";

const uuid = z.uuid();
const texto = z.string().trim().min(1);
export const esquemaCrearPlan = z.object({
  anio: z.number().int().min(2020).max(2100),
  nivel: z.enum([Nivel.primaria, Nivel.secundaria]),
  grado: z.number().int().min(1).max(6),
  area: texto.max(80),
});
export const esquemaComentar = z.object({
  contenido: texto.max(3000),
  temaClave: texto.max(200).optional(),
  esObservacion: z.boolean().default(false),
});
export const esquemaConformidad = z.object({
  decision: z.enum(["conforme", "observaciones"]),
  comentario: texto.max(3000).optional(),
}).refine(x => x.decision !== "observaciones" || !!x.comentario, "Explica tus observaciones.");
export const esquemaOrdenarTemas = z.array(z.object({
  temaClave: texto.max(200),
  orden: z.number().int().nonnegative(),
  unidadId: uuid.nullable().optional(),
})).min(1).superRefine((filas, ctx) => {
  if (new Set(filas.map(x => x.temaClave)).size !== filas.length)
    ctx.addIssue({ code: "custom", message: "No repitas un tema." });
});
export const esquemaCopiarPlan = z.object({ planOrigenId: uuid, anioDestino: z.number().int().min(2020).max(2100) });
export const esquemaMotivo = texto.min(5).max(1000);
