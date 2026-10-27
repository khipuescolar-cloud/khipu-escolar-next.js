import { z } from "zod";
import type { AccionNudito } from "./tipos";

const esquemaAcciones = z.array(
  z.object({
    tipo: z.enum(["abrir_chat", "elegir_hijo", "ir"]),
    etiqueta: z.string().max(200),
    valor: z.string().max(500),
  }),
);

/** Botones guardados en `NuditoMensaje.acciones` (Json). Lo que no tenga el formato esperado se ignora. */
export function leerAcciones(valor: unknown): AccionNudito[] {
  const r = esquemaAcciones.safeParse(valor);
  return r.success ? r.data : [];
}
