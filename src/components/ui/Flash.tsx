import { Alerta } from "./Alerta";

/** Muestra el resultado de una acción de formulario (`?ok=` / `?error=`). */
export function Flash({ ok, error }: { ok?: string | string[]; error?: string | string[] }) {
  const o = Array.isArray(ok) ? ok[0] : ok;
  const e = Array.isArray(error) ? error[0] : error;
  if (!o && !e) return null;
  return e ? <Alerta tipo="error">{e}</Alerta> : <Alerta tipo="exito">{o}</Alerta>;
}
