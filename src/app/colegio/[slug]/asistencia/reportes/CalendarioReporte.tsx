import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { cuadriculaMes, fechaLarga, hora12 } from "@/lib/fechas";
import { porcentajeAsistencia, type DetalleDia, type DiaAgregado } from "@/lib/reportes-asistencia";
import type { ReporteAsistencia } from "@/lib/server/reportes-asistencia";
import { cn } from "@/lib/utils";
import { nombreMes } from "../CalendarioAsistencia";
import { enlaceCorregir } from "./vistas";

// Vista calendario del reporte filtrado (specs/27): un mes por bloque, de lunes a viernes.
// Los días normales van en blanco con su estado (ícono + palabra); solo lo que pide atención (faltas, avisos,
// asistencia baja) lleva fondo de color. Salón y colegio: «asistieron / con registro» y una barra con el %.

const DIAS = [
  { corto: "Lun", largo: "lunes" }, { corto: "Mar", largo: "martes" }, { corto: "Mié", largo: "miércoles" },
  { corto: "Jue", largo: "jueves" }, { corto: "Vie", largo: "viernes" },
];

/** Tramo del % de asistencia de un día (siempre acompañado del número, nunca solo color). */
const TRAMOS = [
  { min: 95, texto: "95 % o más", barra: "bg-llego", cifra: "text-llego", fondo: "" },
  { min: 85, texto: "De 85 % a 94 %", barra: "bg-tarde", cifra: "text-tarde", fondo: "" },
  { min: 0, texto: "Menos de 85 %", barra: "bg-falta", cifra: "text-falta", fondo: "bg-falta-fondo/60 border-falta/25" },
];
const tramoDe = (p: number) => TRAMOS.find((t) => p >= t.min)!;

const CELDA = "flex h-full flex-col justify-between gap-1 rounded-lg border p-1.5 sm:p-2.5";

/** Meses (año, mes) que toca el rango, en orden. */
function mesesDelRango(desde: string, hasta: string): { anio: number; mes: number }[] {
  const meses: { anio: number; mes: number }[] = [];
  let anio = Number(desde.slice(0, 4));
  let mes = Number(desde.slice(5, 7));
  const fin = hasta.slice(0, 7);
  while (`${anio}-${String(mes).padStart(2, "0")}` <= fin) {
    meses.push({ anio, mes });
    mes = mes === 12 ? 1 : mes + 1;
    if (mes === 1) anio++;
  }
  return meses;
}

export function CalendarioReporte({ reporte, hoy, veTodo, puedeCorregir }: { reporte: ReporteAsistencia; hoy: string; veTodo: boolean; puedeCorregir: boolean }) {
  const meses = mesesDelRango(reporte.desde, reporte.hastaEfectivo);
  const enRango = (f: string) => f >= reporte.desde && f <= reporte.hastaEfectivo;
  const individual = reporte.tipo === "alumno" ? new Map(reporte.detalle.map((d) => [d.fecha, d])) : null;
  const agregado = reporte.tipo !== "alumno" ? new Map(reporte.porDia.map((d) => [d.fecha, d])) : null;
  // A dónde lleva un día: dirección corrige la lista del día del salón; en el colegio, la vista de ese día.
  const enlaceDia = (fecha: string): string | null => {
    if (reporte.tipo === "colegio") return veTodo ? `/asistencia/reportes?dia=${fecha}` : null;
    if (!puedeCorregir) return null;
    return enlaceCorregir(reporte.tipo === "salon" ? reporte.salon.id : reporte.alumno.salonId, "dia", fecha);
  };
  const ayudaEnlace = reporte.tipo === "colegio" ? (veTodo ? "Toca un día para ver su detalle." : null) : puedeCorregir ? "Toca un día para corregir la lista de ese día." : null;

  return (
    <div className="flex flex-col gap-4" data-testid="calendario-reporte">
      {meses.map(({ anio, mes }) => {
        const clave = `${anio}-${String(mes).padStart(2, "0")}`;
        const delMes = (f: string) => f.startsWith(clave);
        const semanas = cuadriculaMes(anio, mes)
          .map((s) => s.slice(0, 5))
          .filter((s) => s.some((f) => delMes(f) && enRango(f)));
        return (
          <div key={clave} className="flex flex-col gap-4 rounded-[14px] border border-borde-sutil bg-superficie p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h3 id={`mes-${clave}`} className="text-titulo-2 first-letter:uppercase">{nombreMes(anio, mes)}</h3>
                {reporte.tipo === "alumno"
                  ? <ResumenMesAlumno dias={reporte.detalle.filter((d) => delMes(d.fecha))} />
                  : <ResumenMesGrupo dias={reporte.porDia.filter((d) => delMes(d.fecha))} />}
              </div>
              <table className="w-full table-fixed border-separate border-spacing-1 sm:border-spacing-1.5" aria-labelledby={`mes-${clave}`}>
                <thead>
                  <tr>
                    {DIAS.map((d) => (
                      <th key={d.largo} scope="col" className="pb-1 text-left text-etiqueta font-medium text-muted-foreground sm:px-1">
                        <abbr title={d.largo} className="no-underline">{d.corto}</abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {semanas.map((semana) => (
                    <tr key={semana[0]}>
                      {semana.map((fecha) => {
                        if (!delMes(fecha) || !enRango(fecha)) return <td key={fecha} aria-hidden className="h-16 sm:h-24" />;
                        const dia = Number(fecha.slice(8, 10));
                        const esHoy = fecha === hoy;
                        const contenido = individual
                          ? <CeldaAlumno dia={dia} fecha={fecha} esHoy={esHoy} d={individual.get(fecha)} />
                          : <CeldaGrupo dia={dia} fecha={fecha} esHoy={esHoy} d={agregado!.get(fecha)} />;
                        const href = (individual?.has(fecha) || agregado?.has(fecha)) ? enlaceDia(fecha) : null;
                        return (
                          <td key={fecha} className="h-16 p-0 align-top sm:h-24">
                            {href ? (
                              <Link
                                href={href}
                                className="group/dia block h-full rounded-lg transition-[box-shadow,translate] duration-150 hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                              >
                                {contenido}
                              </Link>
                            ) : contenido}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        );
      })}
      <Leyenda individual={Boolean(individual)} ayuda={ayudaEnlace} />
    </div>
  );
}

/** Número del día; «hoy» lleva un círculo de marca. */
function NumeroDia({ dia, esHoy }: { dia: number; esHoy: boolean }) {
  return esHoy ? (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-sec-tinta text-xs font-semibold text-fondo tabular-nums">{dia}</span>
  ) : (
    <span className="inline-flex h-6 items-center text-xs font-semibold text-foreground tabular-nums">{dia}</span>
  );
}

function CeldaAlumno({ dia, fecha, esHoy, d }: { dia: number; fecha: string; esHoy: boolean; d?: DetalleDia }) {
  if (!d) return <Vacia dia={dia} esHoy={esHoy} fecha={fecha} texto="No hábil" />;
  if (!d.estado) return <Vacia dia={dia} esHoy={esHoy} fecha={fecha} texto="Sin registro" borde />;
  const info = ESTADOS_ASISTENCIA[d.estado];
  const fondo = d.estado === "falta" ? "border-falta/25 bg-falta-fondo/60" : d.estado === "problema" ? "border-problema/25 bg-problema-fondo/60" : "bg-card";
  const justificada = d.estado === "falta" && d.justificada;
  const nota = d.estado === "falta" ? (d.justificada ? "Justificada" : d.enRevision ? "En revisión" : "Sin justificar") : d.hora ? hora12(d.hora) : null;
  return (
    <div className={cn(CELDA, fondo, "group-hover/dia:border-foreground/20")}>
      <span className="flex items-start justify-between gap-1">
        <NumeroDia dia={dia} esHoy={esHoy} />
        {nota && (
          <span className={cn("hidden truncate pt-1 text-[11px] leading-none tabular-nums sm:block", justificada ? "text-llego" : "text-muted-foreground")}>
            {justificada && <CircleCheck className="mr-0.5 inline size-3 align-[-2px]" strokeWidth={2} aria-hidden />}
            {nota}
          </span>
        )}
      </span>
      <span className={cn("inline-flex w-fit max-w-full items-center gap-1 rounded-pildora px-1.5 py-0.5 text-xs font-semibold sm:px-2", info.clase)}>
        <info.Icono className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="hidden truncate sm:inline" aria-hidden>{info.palabra}</span>
      </span>
      <span className="sr-only">{fechaLarga(fecha)}{esHoy ? " (hoy)" : ""}: {info.palabra}{nota ? `, ${nota}` : ""}</span>
    </div>
  );
}

function CeldaGrupo({ dia, fecha, esHoy, d }: { dia: number; fecha: string; esHoy: boolean; d?: DiaAgregado }) {
  if (!d) return <Vacia dia={dia} esHoy={esHoy} fecha={fecha} texto="No hábil" />;
  if (d.porcentaje === null) return <Vacia dia={dia} esHoy={esHoy} fecha={fecha} texto="Sin registro" borde />;
  const asistieron = d.llego + d.tarde;
  const conRegistro = asistieron + d.falta + d.problema;
  const tramo = tramoDe(d.porcentaje);
  return (
    <div className={cn(CELDA, tramo.fondo || "bg-card", "group-hover/dia:border-foreground/20")}>
      <span className="flex items-start justify-between gap-1">
        <NumeroDia dia={dia} esHoy={esHoy} />
        <span className={cn("hidden pt-1 text-[11px] leading-none font-semibold tabular-nums sm:block", tramo.cifra)}>{d.porcentaje} %</span>
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex items-baseline gap-1">
          <span className="text-sm leading-none font-semibold tabular-nums sm:text-base">
            {asistieron}<span className="font-normal text-muted-foreground">/{conRegistro}</span>
          </span>
          {d.falta > 0 && (
            <span className="ml-auto hidden items-center gap-0.5 text-[11px] leading-none font-medium text-falta tabular-nums sm:inline-flex">
              <CircleAlert className="size-3" strokeWidth={2} aria-hidden />{d.falta}
            </span>
          )}
        </span>
        <span aria-hidden className="h-1 overflow-hidden rounded-full bg-muted sm:h-1.5">
          <span className={cn("block h-full rounded-full", tramo.barra)} style={{ width: `${d.porcentaje}%` }} />
        </span>
      </span>
      <span className="sr-only">
        {fechaLarga(fecha)}{esHoy ? " (hoy)" : ""}: asistieron {asistieron} de {conRegistro} con registro ({d.porcentaje} %), {d.falta} {d.falta === 1 ? "falta" : "faltas"}
        {d.faltasJustificadas ? `, ${d.faltasJustificadas} justificadas` : ""}{d.sinRegistro ? `, ${d.sinRegistro} sin registro` : ""}
      </span>
    </div>
  );
}

/** Día sin dato: no hábil (feriado o fin del rango) o hábil sin ningún registro. */
function Vacia({ dia, esHoy, fecha, texto, borde = false }: { dia: number; esHoy: boolean; fecha: string; texto: string; borde?: boolean }) {
  return (
    <div className={cn(CELDA, "text-muted-foreground", borde ? "border-dashed bg-card" : "border-transparent bg-muted/50")}>
      <NumeroDia dia={dia} esHoy={esHoy} />
      <span className="hidden text-[11px] leading-tight sm:block" aria-hidden>{texto}</span>
      <span className="sr-only">{fechaLarga(fecha)}: {texto.toLowerCase()}</span>
    </div>
  );
}

/** Conteo del mes de un alumno: un chip por estado con registros. */
function ResumenMesAlumno({ dias }: { dias: DetalleDia[] }) {
  const conteo = { llego: 0, tarde: 0, falta: 0, problema: 0 };
  for (const d of dias) if (d.estado) conteo[d.estado]++;
  const estados = (["llego", "tarde", "falta", "problema"] as const).filter((e) => conteo[e] > 0);
  if (estados.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Resumen del mes">
      {estados.map((e) => {
        const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[e];
        return (
          <li key={e} className={cn("inline-flex items-center gap-1 rounded-pildora px-2.5 py-1 text-etiqueta tabular-nums", clase)}>
            <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {palabra} {conteo[e]}
          </li>
        );
      })}
    </ul>
  );
}

/** % del mes de un salón o del colegio (sobre los registros del mes) y sus faltas. */
function ResumenMesGrupo({ dias }: { dias: DiaAgregado[] }) {
  const t = dias.reduce(
    (s, d) => ({ presentes: s.presentes + d.llego + d.tarde, base: s.base + d.llego + d.tarde + d.falta + d.problema, faltas: s.faltas + d.falta }),
    { presentes: 0, base: 0, faltas: 0 },
  );
  const p = porcentajeAsistencia(t.presentes, t.base);
  if (p === null) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground" aria-label="Resumen del mes">
      <span>Asistencia del mes <strong className={cn("text-base tabular-nums", tramoDe(p).cifra)}>{p} %</strong></span>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <CircleAlert className="size-4 text-falta" strokeWidth={2} aria-hidden /> {t.faltas} {t.faltas === 1 ? "falta" : "faltas"}
      </span>
    </p>
  );
}

function Leyenda({ individual, ayuda }: { individual: boolean; ayuda: string | null }) {
  const muestra = (clase: string, contenido?: ReactNode) => (
    <span aria-hidden className={cn("flex size-5 items-center justify-center rounded", clase)}>{contenido}</span>
  );
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-superficie px-4 py-3">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Leyenda">
        {individual
          ? (["llego", "tarde", "falta", "problema"] as const).map((e) => {
              const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[e];
              return <li key={e} className="flex items-center gap-1.5">{muestra(clase, <Icono className="size-3.5" strokeWidth={2} />)} {palabra}</li>;
            })
          : TRAMOS.map((t) => (
              <li key={t.texto} className="flex items-center gap-1.5">
                <span aria-hidden className="h-1.5 w-6 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full w-2/3 rounded-full", t.barra)} /></span>
                {t.texto}
              </li>
            ))}
        <li className="flex items-center gap-1.5 text-muted-foreground">{muestra("border border-dashed bg-card")} Sin registro</li>
        <li className="flex items-center gap-1.5 text-muted-foreground">{muestra("bg-muted/50")} No hábil</li>
        <li className="flex items-center gap-1.5 text-muted-foreground">{muestra("bg-primary")} Hoy</li>
      </ul>
      <p className="text-cuerpo-sm text-muted-foreground">
        {individual ? "Los días con falta o aviso se resaltan en color." : "Cada día: asistieron / alumnos con registro. Los días con menos de 85 % se resaltan en color."}
        {ayuda ? ` ${ayuda}` : ""}
      </p>
    </div>
  );
}
