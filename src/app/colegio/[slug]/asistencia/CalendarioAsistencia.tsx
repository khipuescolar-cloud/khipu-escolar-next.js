import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { buttonVariants } from "@/components/ui/button";
import { claveMes, mesAnterior, mesPedido, mesSiguiente, type MesAsistencia } from "@/lib/calendario-asistencia";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const ORDEN: Estado[] = ["llego", "tarde", "falta", "problema"];
const DIAS = [
  { corto: "L", largo: "lunes" }, { corto: "M", largo: "martes" }, { corto: "M", largo: "miércoles" }, { corto: "J", largo: "jueves" },
  { corto: "V", largo: "viernes" }, { corto: "S", largo: "sábado" }, { corto: "D", largo: "domingo" },
];

export function nombreMes(anio: number, mes: number): string {
  return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(anio, mes - 1, 15)));
}

/** Calendario del mes de un hijo: cada día con ícono + palabra (accesible) y color por estado; navegación por mes. */
export function CalendarioAsistencia({ hijoId, nombre, mes, hoy, compacto = false, hrefMes = (clave) => `/asistencia?mes=${clave}` }: {
  hijoId: string; nombre: string; mes: MesAsistencia; hoy: string;
  /** Celdas más bajas y navegación con solo flechas (el calendario va junto a una lista). */
  compacto?: boolean;
  hrefMes?: (clave: string) => string;
}) {
  const anterior = mesAnterior(mes.anio, mes.mes);
  const siguiente = mesSiguiente(mes.anio, mes.mes);
  const claveAnterior = claveMes(anterior.anio, anterior.mes);
  const acotado = mesPedido(claveAnterior, hoy);
  const hayAnterior = claveMes(acotado.anio, acotado.mes) === claveAnterior;
  const haySiguiente = claveMes(siguiente.anio, siguiente.mes) <= hoy.slice(0, 7);
  const titulo = nombreMes(mes.anio, mes.mes);
  const nav = "min-h-10";

  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-borde-sutil bg-superficie p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-[18px] leading-6 font-semibold first-letter:uppercase" id={`mes-${hijoId}`}>{titulo}</h3>
          <nav aria-label={`Cambiar de mes para ${nombre}`} className="flex gap-2">
            {hayAnterior ? (
              <Link href={hrefMes(claveMes(anterior.anio, anterior.mes))} aria-label="Mes anterior" className={cn(buttonVariants({ variant: "outline", size: compacto ? "icon" : "default" }), nav)} scroll={false}>
                <ChevronLeft strokeWidth={2} aria-hidden /> {!compacto && "Mes anterior"}
              </Link>
            ) : null}
            {haySiguiente ? (
              <Link href={hrefMes(claveMes(siguiente.anio, siguiente.mes))} aria-label="Mes siguiente" className={cn(buttonVariants({ variant: "outline", size: compacto ? "icon" : "default" }), nav)} scroll={false}>
                {!compacto && "Mes siguiente"} <ChevronRight strokeWidth={2} aria-hidden />
              </Link>
            ) : null}
          </nav>
        </div>

        <table className="w-full table-fixed border-separate border-spacing-1" aria-labelledby={`mes-${hijoId}`}>
          <thead>
            <tr>
              {DIAS.map((d) => (
                <th key={d.largo} scope="col" className="pb-1 text-center text-etiqueta text-muted-foreground">
                  <abbr title={d.largo} className="no-underline">{d.corto}</abbr>
                  <span className="sr-only">{d.largo}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mes.semanas.map((semana) => (
              <tr key={semana[0].fecha}>
                {semana.map((d) => {
                  if (!d.delMes) return <td key={d.fecha} aria-hidden className={cn("rounded-md", compacto ? "h-10" : "h-12")} />;
                  const info = d.estado ? ESTADOS_ASISTENCIA[d.estado] : null;
                  return (
                    <td
                      key={d.fecha}
                      data-estado={d.estado ?? "sin-registro"}
                      className={cn(
                        compacto ? "h-10 rounded-md border text-center align-middle" : "h-12 rounded-md border text-center align-middle sm:h-14",
                        info ? `${info.clase} border-current/20` : d.esFinDeSemana || d.esFuturo ? "border-transparent bg-superficie-2/60 text-muted-foreground" : "bg-superficie text-muted-foreground",
                        d.esHoy && "ring-2 ring-primary",
                      )}
                    >
                      <span className="flex flex-col items-center justify-center gap-0.5 text-xs leading-none font-semibold">
                        <span>{d.dia}</span>
                        {info ? <info.Icono className="size-4" strokeWidth={2} aria-hidden /> : <span aria-hidden className="size-4" />}
                      </span>
                      <span className="sr-only">
                        {info ? `${d.dia}: ${info.palabra}` : d.esFinDeSemana ? `${d.dia}: fin de semana` : d.esFuturo ? `${d.dia}: aún no` : `${d.dia}: sin registro`}
                        {d.esHoy ? " (hoy)" : ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Leyenda">
          {ORDEN.map((e) => {
            const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[e];
            return (
              <li key={e} className="flex items-center gap-1.5 text-sm">
                <span className={`flex size-6 items-center justify-center rounded-sm ${clase}`}><Icono className="size-4" strokeWidth={2} aria-hidden /></span>
                {palabra} <strong>{mes.conteo[e]}</strong>
              </li>
            );
          })}
          <li className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span aria-hidden className="size-6 rounded border border-borde-sutil bg-superficie" /> Sin registro
          </li>
        </ul>
    </div>
  );
}
