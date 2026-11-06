import { Check, ChevronRight, CircleAlert, Clock, HelpCircle, Mail, MailCheck, MailX, School } from "lucide-react";
import Link from "next/link";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import type { AsistenciaColegio } from "@/lib/server/inicio-tablero";
import type { ResumenAvisosHoy } from "@/lib/server/resumen-direccion";
import { cn } from "@/lib/utils";
import { TituloBloque } from "./TituloBloque";

type Dato = { palabra: string; valor: number; Icono: typeof Clock; clase: string; barra: string };

const datosDe = (s: { llego: number; tarde: number; falta: number; sinRegistrar: number }): Dato[] => [
  { palabra: "Llegaron", valor: s.llego, Icono: Check, clase: "bg-llego-fondo text-llego", barra: "bg-llego" },
  { palabra: "Tarde", valor: s.tarde, Icono: Clock, clase: "bg-tarde-fondo text-tarde", barra: "bg-tarde" },
  { palabra: "No llegaron", valor: s.falta, Icono: CircleAlert, clase: "bg-falta-fondo text-falta", barra: "bg-falta" },
  { palabra: "Sin registrar", valor: s.sinRegistrar, Icono: HelpCircle, clase: "bg-superficie-2 text-muted-foreground", barra: "bg-arena" },
];

/** Asistencia al colegio de hoy para dirección (specs/10): el colegio en una barra y los salones que requieren atención. */
export function ResumenDireccion({ colegio }: { colegio: AsistenciaColegio }) {
  const requierenAtencion = colegio.salones.filter((s) => s.falta > 0 || s.tarde > 0 || s.problema > 0 || s.sinRegistrar > 0);
  const visibles = (requierenAtencion.length ? requierenAtencion : colegio.salones).slice(0, 5);
  const datos = datosDe(colegio);
  return (
    <section aria-labelledby="resumen-hoy" data-seccion="dia" className="flex flex-col gap-4">
      <TituloBloque id="resumen-hoy" accion={
        <Link href="/asistencia/reportes" className="inline-flex min-h-10 items-center gap-0.5 text-cuerpo-sm enlace">Ver reporte del día<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>
      }>Asistencia de hoy</TituloBloque>
      {colegio.salones.length === 0 ? (
        <EstadoVacio icono={School} titulo="Aún no hay salones creados" descripcion="Crea los grados y salones en Gestión para ver la asistencia del día." />
      ) : (
        <div className="flex flex-col gap-4">
          {colegio.total > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex h-3 w-full overflow-hidden rounded-pildora bg-superficie-2" role="img" aria-label={datos.map((d) => `${d.palabra}: ${d.valor}`).join(", ") + ` de ${colegio.total} alumnos`}>
                {datos.filter((d) => d.valor > 0).map((d) => (
                  <span key={d.palabra} className={cn("h-full", d.barra)} style={{ width: `${(d.valor / colegio.total) * 100}%` }} />
                ))}
              </div>
              <ul className="flex flex-wrap gap-2">
                {datos.map(({ palabra, valor, Icono, clase }) => (
                  <li key={palabra} className={cn("inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta", clase)}>
                    <Icono className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    {palabra} <strong className="tabular-nums">{valor}</strong>
                  </li>
                ))}
                <li className="inline-flex items-center px-1 text-cuerpo-sm text-muted-foreground tabular-nums">de {colegio.total} alumnos</li>
              </ul>
            </div>
          )}
          <div>
            <h3 className="mb-1 text-cuerpo-sm font-semibold text-muted-foreground">{requierenAtencion.length ? "Salones que requieren atención" : "Salones"}</h3>
            <ul className="divide-y divide-borde-sutil border-y border-borde-sutil">
              {visibles.map((s) => (
                <li key={s.salonId} className="grid grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] items-center gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <p className="text-cuerpo-sm font-semibold">{s.salon} <span className="font-normal text-muted-foreground tabular-nums">· {s.total}</span></p>
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-cuerpo-sm tabular-nums">
                    {datosDe(s).filter((d) => d.valor > 0).map(({ palabra, valor, Icono, clase }) => (
                      <span key={palabra} className="inline-flex items-center gap-1">
                        <span className={cn("grid size-5 place-items-center rounded-full", clase)}><Icono className="size-3" strokeWidth={2.5} aria-hidden /></span>
                        {palabra} <strong>{valor}</strong>
                      </span>
                    ))}
                    {s.problema > 0 && <span className="inline-flex items-center gap-1 text-problema"><CircleAlert className="size-4" strokeWidth={2} aria-hidden />Con aviso <strong>{s.problema}</strong></span>}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

/** Avisos a familias de hoy (dirección y secretaría). */
export function AvisosDeHoy({ avisos }: { avisos: ResumenAvisosHoy }) {
  const datos = [
    { palabra: "Enviados", valor: avisos.enviados, Icono: Mail, clase: "text-foreground" },
    { palabra: "Abiertos", valor: avisos.abiertos, Icono: MailCheck, clase: "text-llego" },
    { palabra: "Con error", valor: avisos.conError, Icono: MailX, clase: avisos.conError > 0 ? "text-falta" : "text-muted-foreground" },
  ];
  return (
    <section aria-labelledby="resumen-avisos" data-seccion="dia" className="flex flex-col gap-3">
      <TituloBloque id="resumen-avisos" accion={<Link href="/avisos" className="inline-flex min-h-10 items-center gap-0.5 text-cuerpo-sm enlace">Ver avisos<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>}>Avisos de hoy</TituloBloque>
      <dl className="grid grid-cols-3 divide-x divide-borde-sutil">
        {datos.map(({ palabra, valor, Icono, clase }) => (
          <div key={palabra} className="flex flex-col gap-0.5 px-2.5 first:pl-0 last:pr-0">
            <dt className={cn("inline-flex items-center gap-1 text-etiqueta whitespace-nowrap", clase)}><Icono className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />{palabra}</dt>
            <dd className="font-heading text-titulo-2 tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
