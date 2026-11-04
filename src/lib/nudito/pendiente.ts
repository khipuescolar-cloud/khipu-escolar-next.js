// Paso 0 de Nudito (specs/41): marca las funciones con firma definitiva y sin implementar. Responsable:
// A = currículo (specs/42) · B = práctica y dominio (specs/43) · C = sesiones, IA e interfaz (specs/41) ·
// D = seguimiento y gobierno (specs/44). Ningún esqueleto debe quedar al integrar la rama del responsable.

export type ResponsableNudito = "A" | "B" | "C" | "D";

/** Lanza `Error("pendiente")`; `cause` dice quién y qué. Recibe los argumentos para que la firma quede «usada». */
export function pendiente(responsable: ResponsableNudito, funcion: string, ...argumentos: unknown[]): never {
  void argumentos;
  throw new Error("pendiente", { cause: `${responsable}: ${funcion}` });
}
