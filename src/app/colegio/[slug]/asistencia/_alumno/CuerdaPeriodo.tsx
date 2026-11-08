import { ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { fechaLarga, hora12 } from "@/lib/fechas";
import { textoJustificacion, type DetalleDia } from "@/lib/reportes-asistencia";
import { cn } from "@/lib/utils";

// El periodo como un khipu (DESIGN.md): cada mes es una cuerda principal, cada semana una cuerda que cuelga de ella y
// cada día de clase un nudo con el ícono de su estado. Se lee de un vistazo dónde hubo faltas o tardanzas.

const DIAS = ["L", "M", "M", "J", "V"];
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes"];

type Semana = { clave: string; dias: (DetalleDia | null)[] };
type Mes = { clave: string; nombre: string; semanas: Semana[] };

/** Lunes (AAAA-MM-DD) de la semana de una fecha y su índice de lunes (0) a viernes (4). */
function lunesDe(iso: string): { lunes: string; indice: number } {
  const fecha = new Date(`${iso}T12:00:00Z`);
  const indice = (fecha.getUTCDay() + 6) % 7;
  fecha.setUTCDate(fecha.getUTCDate() - indice);
  return { lunes: fecha.toISOString().slice(0, 10), indice };
}

function agrupar(detalle: DetalleDia[]): Mes[] {
  const meses = new Map<string, Mes>();
  for (const d of [...detalle].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const claveMes = d.fecha.slice(0, 7);
    const mes = meses.get(claveMes) ?? {
      clave: claveMes,
      nombre: new Intl.DateTimeFormat("es-PE", { month: "long", timeZone: "UTC" }).format(new Date(`${claveMes}-15T12:00:00Z`)),
      semanas: [],
    };
    const { lunes, indice } = lunesDe(d.fecha);
    if (indice > 4) continue;
    let semana = mes.semanas.find((s) => s.clave === lunes);
    if (!semana) {
      semana = { clave: lunes, dias: [null, null, null, null, null] };
      mes.semanas.push(semana);
    }
    semana.dias[indice] = d;
    meses.set(claveMes, mes);
  }
  return [...meses.values()];
}

function textoNudo(d: DetalleDia): string {
  const dia = fechaLarga(d.fecha);
  if (!d.estado) return `${dia}: ${d.conPermiso ? "con permiso" : "sin registro"}`;
  const { palabra } = ESTADOS_ASISTENCIA[d.estado];
  const hora = d.estado !== "falta" && d.hora ? `, ${hora12(d.hora)}` : "";
  const justificacion = textoJustificacion(d);
  return `${dia}: ${palabra}${hora}${justificacion ? ` (${justificacion.toLowerCase()})` : ""}`;
}

export function CuerdaPeriodo({ detalle, hoy, titulo }: { detalle: DetalleDia[]; hoy: string; titulo: string }) {
  const meses = agrupar(detalle);
  if (meses.length === 0) return null;
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">{titulo}</figcaption>
      <div className="flex flex-wrap gap-x-8 gap-y-6">
        {meses.map((mes, i) => (
          <div key={mes.clave} className="flex gap-2">
            {/* Rótulos de los días: solo en el primer mes de cada fila visual (en celular, en todos). */}
            <ol aria-hidden className={cn("mt-8 flex flex-col gap-1.5", i > 0 && "sm:hidden")}>
              {DIAS.map((d, j) => <li key={DIAS_LARGOS[j]} className="flex h-6 items-center text-xs text-muted-foreground">{d}</li>)}
            </ol>
            <section aria-label={mes.nombre} className="flex flex-col">
              <h3 className="text-cuerpo-sm font-semibold first-letter:uppercase">{mes.nombre}</h3>
              {/* Cuerda principal del mes. */}
              <span aria-hidden className="mt-1.5 h-0.5 rounded-full bg-sec-trazo" />
              <ol className="flex gap-1.5">
                {mes.semanas.map((semana) => (
                  <li key={semana.clave} className="relative flex flex-col items-center">
                    {/* Cuerda colgante de la semana. */}
                    <span aria-hidden className="absolute top-0 bottom-5 left-1/2 w-px -translate-x-1/2 bg-borde-sutil" />
                    <ol className="relative mt-1.5 flex flex-col gap-1.5">
                      {semana.dias.map((d, j) => (
                        <li key={DIAS_LARGOS[j]} className="flex size-6 items-center justify-center">
                          <Nudo dia={d} hoy={hoy} />
                        </li>
                      ))}
                    </ol>
                    <span aria-hidden className="mt-1 text-xs text-muted-foreground tabular-nums">{Number(semana.clave.slice(8))}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ))}
      </div>
    </figure>
  );
}

function Nudo({ dia, hoy }: { dia: DetalleDia | null; hoy: string }) {
  // Día sin clases (feriado o fuera del periodo): un punto pequeño sobre la cuerda.
  if (!dia) return <span aria-hidden className="size-1.5 rounded-full bg-borde-sutil" />;
  const esHoy = dia.fecha === hoy;
  const texto = textoNudo(dia);
  if (!dia.estado) {
    return (
      <span title={texto} className={cn("size-4 rounded-full border border-dashed border-muted-foreground/50 bg-fondo", esHoy && "ring-2 ring-indigo-cielo ring-offset-2 ring-offset-fondo")}>
        <span className="sr-only">{texto}</span>
      </span>
    );
  }
  const { Icono, clase } = ESTADOS_ASISTENCIA[dia.estado];
  return (
    <span
      title={texto}
      className={cn(
        "flex size-6 items-center justify-center rounded-full border border-current/25",
        clase,
        esHoy && "ring-2 ring-indigo-cielo ring-offset-2 ring-offset-fondo",
      )}
    >
      <Icono className="size-3.5" strokeWidth={2.25} aria-hidden />
      <span className="sr-only">{texto}</span>
    </span>
  );
}
