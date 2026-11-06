import type { ReactNode } from "react";
import { CuerdasSaludo } from "@/components/marca/Cuerda";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { fechaLarga } from "@/lib/fechas";

/**
 * Franja de saludo del inicio: fecha del colegio, saludo, una frase con lo pendiente y Nudito bajo las cuerdas del khipu.
 * Nudito solo dice frases benignas (nunca faltas ni errores).
 */
export function SaludoInicio({
  nombre, isoFecha, hora, resumen, frase, acciones, pie,
}: {
  nombre: string;
  isoFecha: string;
  hora: string;
  resumen: string;
  frase: string;
  acciones?: ReactNode;
  pie?: ReactNode;
}) {
  const fecha = fechaLarga(isoFecha);
  return (
    <section aria-labelledby="titulo-inicio" className="relative isolate overflow-hidden rounded-[22px] bg-saludo-fondo px-5 pt-6 pb-6 sm:px-8 sm:pt-8">
      <CuerdasSaludo className="absolute top-0 right-4 -z-10 hidden h-[150px] w-[300px] md:block lg:right-10" />
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="text-cuerpo-sm font-semibold text-[var(--academico-tinta)] first-letter:uppercase">
            <time dateTime={`${isoFecha}T${hora}`}>{fecha}</time> · {hora}
          </p>
          <h1 id="titulo-inicio" className="mt-2 text-titulo-1 sm:text-titulo-xl">Hola, {nombre}</h1>
          <p className="mt-2 text-cuerpo text-pretty text-tinta/80">{resumen}</p>
          {acciones && <div className="mt-5 flex flex-wrap gap-2">{acciones}</div>}
        </div>
        <aside aria-label="Saludo de Nudito" className="flex items-end gap-3 self-start md:mt-24 md:self-end">
          <p className="relative order-1 max-w-56 rounded-2xl rounded-bl-md bg-superficie md:rounded-bl-2xl md:rounded-br-md px-4 py-2.5 font-nudito text-voz-nudito text-tinta md:order-none">
            {frase}
          </p>
          <NuditoMascota tamano={72} estado="saludo" />
        </aside>
      </div>
      {pie && <div className="mt-5 text-cuerpo-sm text-tinta/75">{pie}</div>}
    </section>
  );
}
