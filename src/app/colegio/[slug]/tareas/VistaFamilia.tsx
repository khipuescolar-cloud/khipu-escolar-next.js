import { ArrowRight, CheckCircle2, ChevronRight, Clock, Users } from "lucide-react";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import type { ItemTareaFamilia, TareasDeHijo } from "@/lib/server/tareas";
import { EstadoEntrega, FechaEntrega } from "./insignias";

// Tareas del alumno o de la familia (specs/39): «Vence pronto» arriba, pestañas Pendientes · Entregadas · No entregadas
// con su cantidad y, dentro, las tareas agrupadas por curso.

type Pestana = "pendientes" | "entregadas" | "vencidas";

const ordenEs = (a: string, b: string) => a.localeCompare(b, "es", { numeric: true });
const porPlazo = (x: ItemTareaFamilia, y: ItemTareaFamilia) => (x.limite?.getTime() ?? Infinity) - (y.limite?.getTime() ?? Infinity);

/** Reparte las tareas de un hijo en las tres pestañas y en «Vence pronto» (hoy, mañana o devueltas). */
function clasificar(h: TareasDeHijo) {
  const pendientes = [...h.grupos.manana, ...h.grupos.semana, ...h.grupos.despues, ...h.grupos.sinFecha];
  return {
    porVencer: [...h.grupos.manana].sort(porPlazo),
    pendientes: pendientes.sort(porPlazo),
    entregadas: h.historial.filter((t) => t.estado === "entregada" || t.estado === "revisada"),
    vencidas: h.historial.filter((t) => t.estado === "asignada" || t.estado === "en_proceso"),
  };
}

/** Nudo del estado de la tarea: color + forma (relleno o anillo); la palabra va en la insignia de al lado. */
function Nudo({ t }: { t: ItemTareaFamilia }) {
  const entregada = t.estado === "entregada" || t.estado === "revisada";
  const clase = entregada
    ? "bg-llego border-llego"
    : t.vencida ? "bg-falta border-falta" : t.estado === "devuelta" ? "bg-tarde border-tarde" : "border-sec-trazo bg-superficie";
  return <span aria-hidden className={`mt-1.5 size-3 shrink-0 rounded-full border-2 ${clase}`} />;
}

function FilaTarea({ t, alumnoId }: { t: ItemTareaFamilia; alumnoId: string }) {
  const entregada = t.estado === "entregada" || t.estado === "revisada";
  return (
    <li>
      <Link
        href={`/tareas/${t.id}?alumno=${alumnoId}`}
        className="group/fila flex min-h-16 items-start gap-3 rounded-lg px-3 py-3 outline-none transition-colors duration-150 hover:bg-sec-suave/70 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
      >
        <Nudo t={t} />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-cuerpo font-medium text-pretty">{t.titulo}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {entregada ? <EstadoEntrega estado={t.estado} tarde={t.tarde} /> : <FechaEntrega fecha={t.fechaEntrega} conHora={t.conHora} vencida={t.vencida} />}
            {t.estado === "devuelta" && <EstadoEntrega estado={t.estado} />}
          </span>
        </span>
        {t.calificacion ? (
          <span className="flex shrink-0 flex-col items-center gap-0.5">
            <span className="flex size-11 items-center justify-center rounded-lg bg-sec-suave font-heading text-base font-bold tabular-nums text-sec-tinta">{t.calificacion}</span>
            <span className="text-etiqueta text-muted-foreground">Nota</span>
          </span>
        ) : (
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/fila:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
        )}
      </Link>
    </li>
  );
}

/** Tareas agrupadas por curso, en dos columnas en escritorio. */
function PorCurso({ tareas, alumnoId, palabra }: { tareas: ItemTareaFamilia[]; alumnoId: string; palabra: [string, string] }) {
  const cursos = new Map<string, { docente: string | null; tareas: ItemTareaFamilia[] }>();
  for (const t of tareas) {
    const c = cursos.get(t.curso) ?? { docente: t.docente, tareas: [] };
    c.tareas.push(t);
    cursos.set(t.curso, c);
  }
  return (
    <div className="gap-x-8 lg:columns-2">
      {[...cursos.entries()].sort(([a], [b]) => ordenEs(a, b)).map(([curso, c]) => (
        <section key={curso} aria-label={curso} className="mb-6 break-inside-avoid rounded-2xl border border-borde-sutil bg-superficie p-2">
          <header className="flex items-baseline justify-between gap-3 px-3 pt-2 pb-1">
            <span className="flex min-w-0 flex-col">
              <h3 className="flex items-center gap-2 font-heading text-base font-semibold"><span aria-hidden className="size-2 shrink-0 rounded-full bg-sec-nudo" />{curso}</h3>
              {c.docente && <span className="pl-4 text-cuerpo-sm text-muted-foreground">{c.docente}</span>}
            </span>
            <span className="shrink-0 text-cuerpo-sm tabular-nums text-muted-foreground">{c.tareas.length} {c.tareas.length === 1 ? palabra[0] : palabra[1]}</span>
          </header>
          <ul className="flex flex-col divide-y divide-borde-sutil">{c.tareas.map((t) => <FilaTarea key={t.id} t={t} alumnoId={alumnoId} />)}</ul>
        </section>
      ))}
    </div>
  );
}

export function VistaFamilia({ hijos, esAlumno, alumnoElegido, pestana }: { hijos: TareasDeHijo[]; esAlumno: boolean; alumnoElegido?: string; pestana?: string }) {
  if (hijos.length === 0) {
    return (
      <div>
        <EncabezadoPagina seccion="academico" titulo="Tareas" />
        <EstadoVacio icono={Users} titulo="No encontramos hijos vinculados a tu cuenta" descripcion="Si crees que es un error, avisa al colegio." />
      </div>
    );
  }
  const h = hijos.find((x) => x.alumno.id === alumnoElegido) ?? hijos[0];
  const ver: Pestana = pestana === "entregadas" || pestana === "vencidas" ? pestana : "pendientes";
  const c = clasificar(h);
  const url = (p: Pestana) => `/tareas?${hijos.length > 1 ? `alumno=${h.alumno.id}&` : ""}ver=${p}`;
  const pestanas: { id: Pestana; titulo: string; n: number }[] = [
    { id: "pendientes", titulo: "Pendientes", n: c.pendientes.length },
    { id: "entregadas", titulo: "Entregadas", n: c.entregadas.length },
    { id: "vencidas", titulo: "Sin entregar", n: c.vencidas.length },
  ];
  const lista = ver === "pendientes" ? c.pendientes : ver === "entregadas" ? c.entregadas : c.vencidas;
  const nombre = h.alumno.nombres.split(" ")[0];

  return (
    <div data-seccion="academico" className="flex flex-col gap-8">
      <EncabezadoPagina
        seccion="academico"
        titulo="Tareas"
        descripcion={esAlumno ? "Lo que tienes que entregar y lo que ya entregaste." : hijos.length > 1 ? "Lo que tus hijos tienen que entregar y lo que ya entregaron." : `Lo que ${nombre} tiene que entregar y lo que ya entregó.`}
      />

      {hijos.length > 1 && (
        <nav aria-label="Elegir hijo" className="-mt-2 flex flex-wrap gap-2">
          {hijos.map((x) => {
            const n = clasificar(x).pendientes.length;
            const activo = x.alumno.id === h.alumno.id;
            return (
              <Link key={x.alumno.id} href={`/tareas?alumno=${x.alumno.id}`} aria-current={activo ? "page" : undefined} className={buttonVariants({ variant: activo ? "default" : "outline" })}>
                {x.alumno.nombres.split(" ")[0]}
                <span className={`rounded-pildora px-2 py-0.5 text-etiqueta tabular-nums ${activo ? "bg-primary-foreground/20" : "bg-muted"}`}>{n}<span className="sr-only"> pendientes</span></span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Vence pronto: lo urgente (hoy, mañana o devuelto para corregir), siempre visible. */}
      {c.porVencer.length > 0 && (
        <section aria-labelledby="vence-pronto" className="flex flex-col gap-3 rounded-2xl bg-sec-suave p-4 sm:p-5">
          <h2 id="vence-pronto" className="flex items-center gap-2 font-heading text-lg font-semibold text-sec-tinta">
            <Clock className="size-5" strokeWidth={2} aria-hidden />Vence pronto
            <span className="rounded-pildora bg-superficie px-2 py-0.5 text-etiqueta tabular-nums">{c.porVencer.length}</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {c.porVencer.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tareas/${t.id}?alumno=${h.alumno.id}`}
                  className="group/card flex h-full flex-col gap-2 rounded-xl bg-superficie p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] outline-none transition-shadow duration-150 hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_8px_20px_-8px_rgb(0_0_0/0.18)] focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
                >
                  <span className="text-cuerpo-sm font-medium text-sec-tinta">{t.curso}</span>
                  <span className="text-cuerpo font-semibold text-pretty">{t.titulo}</span>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                    {t.estado === "devuelta" ? <EstadoEntrega estado={t.estado} /> : <FechaEntrega fecha={t.fechaEntrega} conHora={t.conHora} vencida={t.vencida} />}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Entregar<ArrowRight className="size-4 transition-transform duration-150 group-hover/card:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Tareas por estado" className="flex flex-col gap-5">
        <nav aria-label="Ver tareas" className="grid grid-cols-3 border-b border-borde-sutil sm:flex sm:gap-1">
          {pestanas.map((p) => (
            <Link
              key={p.id}
              href={url(p.id)}
              aria-current={ver === p.id ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 items-center justify-center gap-1 border-b-2 px-1 text-sm font-medium whitespace-nowrap sm:justify-start sm:gap-2 sm:px-3 transition-colors duration-150 motion-reduce:transition-none ${ver === p.id ? "border-sec-nudo text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {p.titulo}
              <span className={`rounded-pildora px-1.5 py-0.5 text-etiqueta tabular-nums sm:px-2 ${ver === p.id ? "bg-sec-suave text-sec-tinta" : "bg-muted"}`}>{p.n}</span>
            </Link>
          ))}
        </nav>

        {lista.length === 0 ? (
          <p className="flex items-center gap-2 py-6 text-cuerpo text-muted-foreground">
            <CheckCircle2 className="size-5 text-llego" strokeWidth={2} aria-hidden />
            {ver === "pendientes" ? (esAlumno ? "Estás al día: no tienes tareas pendientes." : `${nombre} está al día: no tiene tareas pendientes.`) : ver === "entregadas" ? "Todavía no hay tareas entregadas." : "No hay tareas sin entregar. ¡Bien!"}
          </p>
        ) : (
          <PorCurso tareas={lista} alumnoId={h.alumno.id} palabra={ver === "pendientes" ? ["pendiente", "pendientes"] : ver === "entregadas" ? ["entregada", "entregadas"] : ["sin entregar", "sin entregar"]} />
        )}
      </section>
    </div>
  );
}
