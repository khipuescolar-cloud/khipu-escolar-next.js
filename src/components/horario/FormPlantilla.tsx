"use client";

import { Coffee, DoorClosed, DoorOpen, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Input } from "@/components/ui/input";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { minutos, type Intervalo } from "@/lib/horario";
import { faltaSugerida, generarPeriodos, sumarMinutos, validarPlantilla, DURACION_MAXIMA, DURACION_MINIMA } from "@/lib/plantillas-horario";
import type { Resultado } from "@/lib/resultado";
import { cn } from "@/lib/utils";

export type ValoresPlantilla = { nombre: string; horaEntrada: string; horaSalida: string; duracionClase: number; horaLimiteFalta: string; recreos: Intervalo[] };
type SalonOpcion = { id: string; nombre: string; nivel: string; plantillaNombre: string | null; enEsta: boolean };
type Recreo = Intervalo & { clave: number };

let contador = 0;

const duracionTexto = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`);

/**
 * Formulario de plantilla de horario (specs/34): entrada, duración de la hora de clase, recreos, salida y hora límite de
 * falta, con la vista previa de las horas que Khipu calcula. Abajo, los salones que la usarán.
 */
export function FormPlantilla({ inicial, salones, accion, esNueva }: {
  inicial: ValoresPlantilla;
  salones: SalonOpcion[];
  accion: (previo: Resultado | null, datos: FormData) => Promise<Resultado & { id?: string }>;
  esNueva: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(inicial);
  const [recreos, setRecreos] = useState<Recreo[]>(() => inicial.recreos.map((r) => ({ ...r, clave: ++contador })));
  // La hora de falta sigue a la entrada (una hora después) hasta que la dirección la cambie a mano.
  const [faltaManual, setFaltaManual] = useState(!esNueva);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(salones.filter((s) => s.enEsta).map((s) => s.id)));
  const [estado, enviar, pendiente] = useActionState(async (previo: Resultado | null, datos: FormData) => {
    const r = await accion(previo, datos);
    if (r.ok) {
      if (r.mensaje) toast.success(r.mensaje);
      router.push("/horario/plantillas");
    }
    return r;
  }, null);

  const datos = { ...v, recreos };
  const error = validarPlantilla(datos);
  const { periodos, sobrantes } = generarPeriodos(datos);
  const clases = periodos.filter((p) => p.tipo === "clase");
  const cambiar = (campo: keyof ValoresPlantilla, valor: string | number) =>
    setV((x) => {
      const n = { ...x, [campo]: valor };
      if (campo === "horaEntrada" && !faltaManual) n.horaLimiteFalta = faltaSugerida(String(valor));
      return n;
    });
  const agregarRecreo = () =>
    setRecreos((rs) => {
      const ultimo = rs.at(-1);
      const base = ultimo ? sumarMinutos(ultimo.horaFin, 60) : sumarMinutos(v.horaEntrada || "08:00", Math.round((minutos(v.horaSalida || "13:00") - minutos(v.horaEntrada || "08:00")) / 2));
      return [...rs, { clave: ++contador, horaInicio: base, horaFin: sumarMinutos(base, 20) }];
    });
  const porNivel = new Map<string, SalonOpcion[]>();
  for (const s of salones) porNivel.set(s.nivel, [...(porNivel.get(s.nivel) ?? []), s]);

  return (
    <form action={enviar} className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <input type="hidden" name="recreos" value={JSON.stringify(recreos.map(({ horaInicio, horaFin }) => ({ horaInicio, horaFin })))} />
      <input type="hidden" name="salonIds" value={JSON.stringify(salones.filter((s) => marcados.has(s.id) && !s.enEsta).map((s) => s.id))} />

      <div className="flex flex-col divide-y divide-borde-sutil rounded-xl border border-borde-sutil bg-card">
        <section className="flex flex-col gap-4 p-4 sm:p-6" aria-labelledby="bloque-jornada">
          <Titulo id="bloque-jornada">Jornada</Titulo>
          <Campo etiqueta="Nombre de la plantilla" name="nombre" value={v.nombre} onChange={(e) => cambiar("nombre", e.target.value)} maxLength={60} required placeholder="Primaria mañana" ayuda="Para reconocerla al asignarla a los salones." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Hora de entrada" name="horaEntrada" type="time" value={v.horaEntrada} onChange={(e) => cambiar("horaEntrada", e.target.value)} required ayuda="Desde esta hora, la llegada en portería es tardanza." />
            <Campo etiqueta="Hora de salida" name="horaSalida" type="time" value={v.horaSalida} onChange={(e) => cambiar("horaSalida", e.target.value)} required />
            <Campo
              etiqueta="Duración de cada hora de clase (minutos)"
              name="duracionClase"
              type="number"
              inputMode="numeric"
              min={DURACION_MINIMA}
              max={DURACION_MAXIMA}
              value={Number.isNaN(v.duracionClase) ? "" : v.duracionClase}
              onChange={(e) => cambiar("duracionClase", e.target.valueAsNumber)}
              required
            />
            <Campo
              etiqueta="Hora límite de falta"
              name="horaLimiteFalta"
              type="time"
              value={v.horaLimiteFalta}
              onChange={(e) => { setFaltaManual(true); cambiar("horaLimiteFalta", e.target.value); }}
              required
              ayuda="Si a esta hora no registró ingreso, se le pone falta y se avisa a la familia."
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 p-4 sm:p-6" aria-labelledby="bloque-recreos">
          <div>
            <Titulo id="bloque-recreos">Recreos</Titulo>
            <p className="text-cuerpo-sm text-muted-foreground">{recreos.length === 0 ? "Sin recreos. Agrega los que tenga la jornada." : recreos.length === 1 ? "1 recreo." : `${recreos.length} recreos.`}</p>
          </div>
          {recreos.length > 0 && (
            <ul className="flex flex-col gap-2">
              {recreos.map((r, i) => (
                <li key={r.clave}>
                  <fieldset className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                    <legend className="sr-only">Recreo {i + 1}</legend>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">Recreo{recreos.length > 1 ? ` ${i + 1}` : ""} · desde</span>
                      <Input type="time" value={r.horaInicio} required onChange={(e) => setRecreos((rs) => rs.map((x) => (x.clave === r.clave ? { ...x, horaInicio: e.target.value } : x)))} />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">hasta</span>
                      <Input type="time" value={r.horaFin} required onChange={(e) => setRecreos((rs) => rs.map((x) => (x.clave === r.clave ? { ...x, horaFin: e.target.value } : x)))} />
                    </label>
                    <button type="button" onClick={() => setRecreos((rs) => rs.filter((x) => x.clave !== r.clave))} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={`Quitar el recreo ${i + 1}`}>
                      <Trash2 strokeWidth={2} aria-hidden />
                    </button>
                  </fieldset>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={agregarRecreo} disabled={recreos.length >= 6} className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
            <Plus strokeWidth={2} aria-hidden />Agregar recreo
          </button>
        </section>

        <section className="flex flex-col gap-3 p-4 sm:p-6" aria-labelledby="bloque-salones">
          <div>
            <Titulo id="bloque-salones">Salones que la usan</Titulo>
            <p className="text-cuerpo-sm text-muted-foreground">Al marcar un salón, deja su plantilla actual y sus clases pasan a la misma hora de esta (la 1.ª hora a la 1.ª hora).</p>
          </div>
          {salones.length === 0 ? (
            <p className="text-cuerpo-sm text-muted-foreground">Aún no hay salones.</p>
          ) : (
            [...porNivel.entries()].map(([nivel, lista]) => (
              <fieldset key={nivel} className="flex flex-col gap-2">
                <legend className="mb-1 text-cuerpo-sm font-semibold text-sec-tinta">{nivel}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {lista.map((s) => (
                    <label key={s.id} className={cn("flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm", marcados.has(s.id) && "border-sec-trazo/60 bg-sec-suave", s.enEsta && "opacity-80")}>
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--primary)]"
                        checked={marcados.has(s.id)}
                        disabled={s.enEsta}
                        onChange={(e) => setMarcados((m) => { const n = new Set(m); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{s.nombre}</span>
                        <span className="truncate text-etiqueta text-muted-foreground">{s.enEsta ? "Usa esta plantilla" : s.plantillaNombre ? `Ahora: ${s.plantillaNombre}` : "Sin plantilla"}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))
          )}
        </section>
      </div>

      <aside aria-labelledby="titulo-vista-previa" className="flex flex-col gap-3 lg:sticky lg:top-4">
        <Tarjeta className="flex flex-col gap-3">
          <div>
            <Titulo id="titulo-vista-previa">Vista previa</Titulo>
            <p className="text-cuerpo-sm text-muted-foreground">
              {error ? "Completa los datos para ver las horas." : `${clases.length} ${clases.length === 1 ? "hora" : "horas"} de clase de ${v.duracionClase} min · ${duracionTexto(clases.length * v.duracionClase)} de clase al día`}
            </p>
          </div>
          {!error && (
            <ol className="flex flex-col text-cuerpo-sm">
              <Hito icono={DoorOpen} texto="Entrada" hora={v.horaEntrada} />
              {periodos.map((p) => (
                <li
                  key={`${p.horaInicio}-${p.tipo}`}
                  className={cn("flex items-center justify-between gap-3 border-l-2 py-1.5 pl-4", p.tipo === "recreo" ? "border-maiz bg-[color-mix(in_oklab,var(--maiz)_14%,transparent)] font-medium" : "border-border")}
                >
                  <span className="inline-flex items-center gap-1.5">{p.tipo === "recreo" && <Coffee className="size-3.5" strokeWidth={2} aria-hidden />}{p.nombre}</span>
                  <span className="text-muted-foreground tabular-nums">{p.horaInicio} – {p.horaFin}</span>
                </li>
              ))}
              <Hito icono={DoorClosed} texto="Salida" hora={v.horaSalida} />
            </ol>
          )}
          {error && <Alerta tipo="aviso">{error}</Alerta>}
          {!error && sobrantes.length > 0 && (
            <p className="flex items-start gap-1.5 text-cuerpo-sm text-tarde">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
              <span>Quedan minutos sin clase: {sobrantes.map((s) => `${s.horaInicio}–${s.horaFin}`).join(", ")}. Ajusta la duración, los recreos o la salida si no es lo que quieres.</span>
            </p>
          )}
          {!error && <p className="text-cuerpo-sm text-muted-foreground">Tardanza desde las {v.horaEntrada} · falta desde las {v.horaLimiteFalta}.</p>}
        </Tarjeta>
        {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
        <button type="submit" disabled={pendiente || !!error} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {pendiente && <Loader2 className="animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden />}
          {esNueva ? "Crear plantilla" : "Guardar cambios"}
        </button>
      </aside>
    </form>
  );
}

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold">
      <span aria-hidden className="size-2.5 rounded-full bg-sec-nudo" />{children}
    </h2>
  );
}

function Hito({ icono: Icono, texto, hora }: { icono: typeof DoorOpen; texto: string; hora: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 font-semibold">
      <span className="inline-flex items-center gap-1.5"><Icono className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden />{texto}</span>
      <span className="tabular-nums">{hora}</span>
    </li>
  );
}
