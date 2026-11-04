// Responsable: A (specs/42). Validación DETERMINISTA del tema que pide el alumno («Otro tema»): grado actual y
// anteriores permitidos; superior solo si está desbloqueado; demasiado avanzado → alternativas amables; ambiguo →
// aclarar; no reconocido → sugerencias. La IA nunca decide aquí.
import type { EntradaValidarTema, ValidacionTema, ValidarTema } from "./contratos";
import { pendiente } from "./pendiente";

export const validarTema: ValidarTema = (entrada: EntradaValidarTema): ValidacionTema => pendiente("A", "validarTema", entrada);
