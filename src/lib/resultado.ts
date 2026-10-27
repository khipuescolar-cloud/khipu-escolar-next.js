// Resultado común de las acciones de formulario (cliente y servidor).
export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string };

export const ok = (mensaje?: string): Resultado => ({ ok: true, mensaje });
export const fallo = (error: string): Resultado => ({ ok: false, error });
