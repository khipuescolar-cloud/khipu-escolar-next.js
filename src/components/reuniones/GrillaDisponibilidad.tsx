"use client";

import { Ban, CalendarOff, Check, Clock, Moon, Users, type LucideIcon } from "lucide-react";
import type { EstadoCelda } from "@/lib/disponibilidad";
import type { Disponibilidad, FranjaVista } from "@/lib/server/disponibilidad";

const ESTADO: Record<EstadoCelda, { Icono: LucideIcon; texto: string; clase: string }> = {
  libre: { Icono: Check, texto: "Libre", clase: "bg-llego-fondo text-llego" },
  ocupado: { Icono: Ban, texto: "Ocupado", clase: "bg-falta-fondo text-falta" },
  fuera_de_horario: { Icono: Moon, texto: "Fuera de horario", clase: "bg-muted text-muted-foreground" },
  no_lectivo: { Icono: CalendarOff, texto: "No lectivo", clase: "bg-muted text-muted-foreground" },
};

type Props = {
  datos: Disponibilidad;
  /** Familias invitadas («Familias del salón»…): no tienen calendario, aparecen como «Pendiente de confirmar». */
  familias: string | null;
  onElegir: (franja: FranjaVista) => void;
};

const fechaCorta = (iso: string) => new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/** Tramos seguidos con el mismo estado (para la vista de lista en móvil). */
function tramos(d: Disponibilidad, celdas: Disponibilidad["personas"][number]["celdas"]) {
  const salida: { desde: string; hasta: string; estado: EstadoCelda; etiqueta: string | null }[] = [];
  celdas.forEach((c, i) => {
    const ultimo = salida.at(-1);
    const hasta = d.celdas[i + 1]?.hora ?? "fin";
    if (ultimo && ultimo.estado === c.estado && ultimo.etiqueta === c.etiqueta) ultimo.hasta = hasta;
    else salida.push({ desde: d.celdas[i].hora, hasta, estado: c.estado, etiqueta: c.etiqueta });
  });
  return salida;
}

/** Cuadrícula de disponibilidad por persona (specs/40), estilo asistente de programación. En móvil, lista por persona. */
export function GrillaDisponibilidad({ datos, familias, onElegir }: Props) {
  const p = datos.preferida;
  const enPreferida = (i: number) => datos.celdas[i].hora >= p.hora && datos.celdas[i].hora < p.horaFin;
  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-start gap-2 rounded-lg p-3 text-cuerpo-sm ${p.libre ? "bg-llego-fondo text-llego" : "bg-tarde-fondo text-tarde"}`} role="status">
        {p.libre ? <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden /> : <Clock className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />}
        <div>
          <p className="font-medium">
            {p.libre ? "La franja elegida está libre para todos los requeridos." : "La franja elegida no está libre para todos."} ({fechaCorta(p.fecha)}, {p.hora}–{p.horaFin})
          </p>
          {p.conflictos.map((c) => <p key={c.nombre}>{c.nombre}: {c.etiqueta}</p>)}
          {p.fueraDeHorario && <p>Está fuera de la jornada laboral o en un día no lectivo.</p>}
        </div>
      </div>

      <ul className="flex flex-wrap gap-3 text-cuerpo-sm" aria-label="Leyenda">
        {(Object.keys(ESTADO) as EstadoCelda[]).map((e) => {
          const { Icono, texto, clase } = ESTADO[e];
          return <li key={e} className="inline-flex items-center gap-1.5"><span className={`inline-flex size-5 items-center justify-center rounded ${clase}`}><Icono className="size-3" strokeWidth={2} aria-hidden /></span>{texto}</li>;
        })}
      </ul>

      {/* Escritorio: cuadrícula */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-0.5 text-etiqueta">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 bg-background pr-2 text-left font-medium">Persona</th>
              {datos.celdas.map((c, i) => (
                <th key={c.inicio} scope="col" className={`min-w-7 font-normal text-muted-foreground ${enPreferida(i) ? "text-primary" : ""}`}>
                  {c.hora.endsWith(":00") ? c.hora.slice(0, 2) : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.personas.map((persona) => (
              <tr key={persona.membershipId}>
                <th scope="row" className="sticky left-0 max-w-48 truncate bg-background pr-2 text-left font-medium">
                  {persona.propia ? `${persona.nombre} (tú)` : persona.nombre}
                  <span className="block font-normal text-muted-foreground">{persona.requerido ? "Requerido" : "Opcional"}</span>
                </th>
                {persona.celdas.map((c, i) => {
                  const { Icono, texto, clase } = ESTADO[c.estado];
                  const etiqueta = `${datos.celdas[i].hora}: ${c.etiqueta ?? texto}`;
                  return (
                    <td key={datos.celdas[i].inicio} title={etiqueta} aria-label={etiqueta} className={`h-8 rounded text-center ${clase} ${enPreferida(i) ? "ring-2 ring-primary" : ""}`}>
                      <Icono className="mx-auto size-3" strokeWidth={2} aria-hidden />
                    </td>
                  );
                })}
              </tr>
            ))}
            {familias && (
              <tr>
                <th scope="row" className="sticky left-0 bg-background pr-2 text-left font-medium">
                  {familias}
                  <span className="block font-normal text-muted-foreground">Pendiente de confirmar</span>
                </th>
                <td colSpan={datos.celdas.length} className="rounded bg-muted px-2 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" strokeWidth={2} aria-hidden />Las familias no tienen calendario en Khipu: confirmarán al recibir la invitación.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Móvil: lista por persona */}
      <ul className="flex flex-col gap-3 md:hidden">
        {datos.personas.map((persona) => (
          <li key={persona.membershipId} className="rounded-lg border p-3">
            <p className="font-medium">{persona.propia ? `${persona.nombre} (tú)` : persona.nombre} <span className="font-normal text-muted-foreground">· {persona.requerido ? "Requerido" : "Opcional"}</span></p>
            <ul className="mt-2 flex flex-col gap-1 text-cuerpo-sm">
              {tramos(datos, persona.celdas).filter((t) => t.estado !== "fuera_de_horario").map((t) => {
                const { Icono, texto, clase } = ESTADO[t.estado];
                return (
                  <li key={t.desde} className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${clase}`}><Icono className="size-3" strokeWidth={2} aria-hidden />{t.etiqueta ?? texto}</span>
                    <span className="text-muted-foreground">{t.desde}–{t.hasta}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
        {familias && <li className="rounded-lg border p-3 text-cuerpo-sm text-muted-foreground">{familias}: pendiente de confirmar.</li>}
      </ul>

      <section aria-labelledby="alternativas" className="flex flex-col gap-2">
        <h3 id="alternativas" className="font-titulo text-cuerpo font-semibold">Franjas libres para todos los requeridos</h3>
        {datos.alternativas.length === 0 ? (
          <p className="text-cuerpo-sm text-muted-foreground">No encontramos franjas libres en los próximos días. Prueba otra fecha o una duración menor.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {datos.alternativas.map((a) => (
              <button key={a.inicio} type="button" onClick={() => onElegir(a)} className="rounded-pildora border px-3 py-1.5 text-cuerpo-sm hover:bg-accent">
                <span className="first-letter:uppercase">{fechaCorta(a.fecha)}</span> · {a.hora}–{a.horaFin}
                {a.opcionalesLibres > 0 && <span className="text-muted-foreground"> · {a.opcionalesLibres} opcional{a.opcionalesLibres === 1 ? "" : "es"} libre{a.opcionalesLibres === 1 ? "" : "s"}</span>}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
