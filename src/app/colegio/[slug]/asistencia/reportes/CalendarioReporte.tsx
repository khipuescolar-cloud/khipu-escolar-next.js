import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { Card, CardContent } from "@/components/ui/card";
import { cuadriculaMes, fechaLarga, hora12 } from "@/lib/fechas";
import type { DetalleDia, DiaAgregado } from "@/lib/reportes-asistencia";
import type { ReporteAsistencia } from "@/lib/server/reportes-asistencia";
import { cn } from "@/lib/utils";
import { nombreMes } from "../CalendarioAsistencia";
import { enlaceCorregir } from "./vistas";

// Vista calendario del reporte filtrado (specs/27): un mes por bloque, de lunes a viernes.
// Alumno: el estado de cada día (ícono + palabra). Salón y colegio: cuántos asistieron y cuántos faltaron cada día.

const DIAS = [
  { corto: "Lun", largo: "lunes" }, { corto: "Mar", largo: "martes" }, { corto: "Mié", largo: "miércoles" },
  { corto: "Jue", largo: "jueves" }, { corto: "Vie", largo: "viernes" },
];

/** Tono del día según el % de asistencia (siempre acompañado del número, nunca solo color). */
const TONOS = [
  { min: 95, clase: ESTADOS_ASISTENCIA.llego.clase, texto: "95 % o más" },
  { min: 85, clase: ESTADOS_ASISTENCIA.tarde.clase, texto: "De 85 % a 94 %" },
  { min: 0, clase: ESTADOS_ASISTENCIA.falta.clase, texto: "Menos de 85 %" },
];
const tonoDe = (p: number) => TONOS.find((t) => p >= t.min)!;

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

export function CalendarioReporte({ reporte, veTodo, puedeCorregir }: { reporte: ReporteAsistencia; veTodo: boolean; puedeCorregir: boolean }) {
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

  return (
    <div className="flex flex-col gap-4" data-testid="calendario-reporte">
      {meses.map(({ anio, mes }) => {
        const clave = `${anio}-${String(mes).padStart(2, "0")}`;
        const semanas = cuadriculaMes(anio, mes)
          .map((s) => s.slice(0, 5))
          .filter((s) => s.some((f) => f.startsWith(clave) && enRango(f)));
        return (
          <Card key={clave}>
            <CardContent className="flex flex-col gap-3">
              <h3 id={`mes-${clave}`} className="text-titulo-2 first-letter:uppercase">{nombreMes(anio, mes)}</h3>
              <table className="w-full table-fixed border-separate border-spacing-1" aria-labelledby={`mes-${clave}`}>
                <thead>
                  <tr>
                    {DIAS.map((d) => (
                      <th key={d.largo} scope="col" className="pb-1 text-center text-etiqueta text-muted-foreground">
                        <abbr title={d.largo} className="no-underline">{d.corto}</abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {semanas.map((semana) => (
                    <tr key={semana[0]}>
                      {semana.map((fecha) => {
                        if (!fecha.startsWith(clave) || !enRango(fecha)) return <td key={fecha} aria-hidden className="h-16 sm:h-20" />;
                        const dia = Number(fecha.slice(8, 10));
                        const contenido = individual
                          ? <CeldaAlumno dia={dia} fecha={fecha} d={individual.get(fecha)} />
                          : <CeldaGrupo dia={dia} fecha={fecha} d={agregado!.get(fecha)} />;
                        const href = (individual?.has(fecha) || agregado?.has(fecha)) ? enlaceDia(fecha) : null;
                        return (
                          <td key={fecha} className="h-16 p-0 align-top sm:h-20">
                            {href ? (
                              <Link href={href} className="block h-full rounded-md outline-offset-2 transition-[filter] hover:brightness-95">{contenido}</Link>
                            ) : contenido}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
      <Leyenda individual={Boolean(individual)} />
    </div>
  );
}

/** Día de un alumno: estado con ícono + palabra y la hora; los días sin dato hábil (feriado, fin de rango) quedan atenuados. */
function CeldaAlumno({ dia, fecha, d }: { dia: number; fecha: string; d?: DetalleDia }) {
  if (!d) return <Vacia dia={dia} texto="No hábil" fecha={fecha} />;
  if (!d.estado) return <Vacia dia={dia} texto="Sin registro" fecha={fecha} borde />;
  const info = ESTADOS_ASISTENCIA[d.estado];
  const extra = d.estado === "falta" ? (d.justificada ? "Justificada" : d.enRevision ? "En revisión" : null) : d.hora ? hora12(d.hora) : null;
  return (
    <div className={cn("flex h-full flex-col justify-between rounded-md border border-current/20 p-1.5 sm:p-2", info.clase)}>
      <span className="text-xs font-semibold tabular-nums">{dia}</span>
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 text-xs font-semibold leading-tight">
          <info.Icono className="size-4 shrink-0 sm:size-3.5" strokeWidth={2} aria-hidden />
          <span className="hidden truncate sm:inline" aria-hidden>{info.palabra}</span>
        </span>
        {extra && <span className="hidden truncate text-[11px] leading-tight opacity-80 sm:block">{extra}</span>}
      </span>
      <span className="sr-only">{fechaLarga(fecha)}: {info.palabra}{extra ? `, ${extra}` : ""}</span>
    </div>
  );
}

/** Día de un salón o del colegio: asistieron / con registro, % y faltas del día. */
function CeldaGrupo({ dia, fecha, d }: { dia: number; fecha: string; d?: DiaAgregado }) {
  if (!d) return <Vacia dia={dia} texto="No hábil" fecha={fecha} />;
  if (d.porcentaje === null) return <Vacia dia={dia} texto="Sin registro" fecha={fecha} borde />;
  const asistieron = d.llego + d.tarde;
  const conRegistro = asistieron + d.falta + d.problema;
  return (
    <div className={cn("flex h-full flex-col justify-between rounded-md border border-current/20 p-1.5 sm:p-2", tonoDe(d.porcentaje).clase)}>
      <span className="flex items-baseline justify-between gap-1">
        <span className="text-xs font-semibold tabular-nums">{dia}</span>
        <span className="hidden text-[11px] font-semibold tabular-nums sm:inline">{d.porcentaje} %</span>
      </span>
      <span className="text-sm font-semibold tabular-nums leading-tight">{asistieron}/{conRegistro}</span>
      <span className={cn("flex items-center gap-1 text-[11px] leading-tight tabular-nums", d.falta === 0 && "opacity-60")}>
        <CircleAlert className="size-3 shrink-0" strokeWidth={2} aria-hidden />
        {d.falta} {d.falta === 1 ? "falta" : "faltas"}
      </span>
      <span className="sr-only">
        {fechaLarga(fecha)}: asistieron {asistieron} de {conRegistro} con registro ({d.porcentaje} %), {d.falta} {d.falta === 1 ? "falta" : "faltas"}
        {d.faltasJustificadas ? `, ${d.faltasJustificadas} justificadas` : ""}{d.sinRegistro ? `, ${d.sinRegistro} sin registro` : ""}
      </span>
    </div>
  );
}

function Vacia({ dia, texto, fecha, borde = false }: { dia: number; texto: string; fecha: string; borde?: boolean }) {
  return (
    <div className={cn("flex h-full flex-col justify-between rounded-md p-1.5 text-muted-foreground sm:p-2", borde ? "border bg-card" : "bg-muted/40")}>
      <span className="text-xs font-semibold tabular-nums">{dia}</span>
      <span className="hidden text-[11px] leading-tight sm:block" aria-hidden>{texto}</span>
      <span className="sr-only">{fechaLarga(fecha)}: {texto.toLowerCase()}</span>
    </div>
  );
}

function Leyenda({ individual }: { individual: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm" aria-label="Leyenda">
      {individual
        ? (["llego", "tarde", "falta", "problema"] as const).map((e) => {
            const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[e];
            return (
              <li key={e} className="flex items-center gap-1.5">
                <span className={`flex size-6 items-center justify-center rounded-sm ${clase}`}><Icono className="size-4" strokeWidth={2} aria-hidden /></span>
                {palabra}
              </li>
            );
          })
        : TONOS.map((t) => (
            <li key={t.texto} className="flex items-center gap-1.5">
              <span aria-hidden className={`size-6 rounded-sm ${t.clase}`} /> {t.texto} de asistencia
            </li>
          ))}
      <li className="flex items-center gap-1.5 text-muted-foreground"><span aria-hidden className="size-6 rounded-sm border bg-card" /> Sin registro</li>
      <li className="flex items-center gap-1.5 text-muted-foreground"><span aria-hidden className="size-6 rounded-sm bg-muted/40" /> No hábil</li>
      {!individual && <li className="text-muted-foreground">Cada día: asistieron / alumnos con registro.</li>}
    </ul>
  );
}
