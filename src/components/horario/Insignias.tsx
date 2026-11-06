import { CalendarCheck, CircleDot } from "lucide-react";

/** «Hoy»: ícono + palabra, nunca solo color. */
export function InsigniaHoy() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pildora bg-sec-suave px-2 py-0.5 text-etiqueta text-sec-tinta">
      <CalendarCheck className="size-3.5" strokeWidth={2} aria-hidden />Hoy
    </span>
  );
}

/** «Ahora»: el bloque que está en curso. */
export function InsigniaAhora() {
  return (
    <span className="mb-0.5 inline-flex w-fit items-center gap-1 rounded-pildora bg-sec-tinta px-2 py-0.5 text-etiqueta text-background">
      <CircleDot className="size-3.5" strokeWidth={2} aria-hidden />Ahora
    </span>
  );
}
