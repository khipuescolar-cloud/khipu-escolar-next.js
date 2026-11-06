import { ArrowLeft, CalendarClock, Coffee, DoorClosed, DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { requireFeature } from "@/lib/server/plan";
import { listarPlantillas } from "@/lib/server/plantillas-horario";
import { requireTenantContext } from "@/lib/server/tenant";
import { eliminarPlantillaAction } from "./actions";

export const metadata: Metadata = { title: "Plantillas de horario" };

/** Plantillas de horario (specs/34): dirección y secretaría las crean y las asignan a los salones. */
export default async function PlantillasPage({ params }: PageProps<"/colegio/[slug]/horario/plantillas">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  requireFeature(ctx, "horario");
  const plantillas = await listarPlantillas(ctx);
  const nueva = (
    <Link href="/horario/plantillas/nueva" className={buttonVariants()}>
      <Plus strokeWidth={2} aria-hidden />Nueva plantilla
    </Link>
  );

  return (
    <div data-seccion="dia" className="flex flex-col gap-4">
      {ctx.rol === "direccion" && (
        <Link href="/horario" className="inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace"><ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Horarios</Link>
      )}
      <EncabezadoPagina
        seccion="dia"
        titulo="Plantillas de horario"
        descripcion="La entrada, los recreos y la salida de cada jornada. Khipu calcula las horas de clase; cada salón usa una plantilla y su entrada marca la tardanza en portería."
        acciones={plantillas.length > 0 ? nueva : undefined}
      />
      {plantillas.length === 0 ? (
        <EstadoVacio icono={CalendarClock} titulo="Aún no hay plantillas" descripcion="Crea la primera: por ejemplo «Primaria mañana», con entrada a las 7:45, dos recreos y salida a la 1:15." accion={nueva} />
      ) : (
        <ul className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
          {plantillas.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 py-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold"><span aria-hidden className="size-2.5 rounded-full bg-sec-nudo" />{p.nombre}</h2>
                  <span className="text-cuerpo-sm text-muted-foreground">{p.salones.length === 0 ? "Sin salones" : p.salones.length === 1 ? "1 salón" : `${p.salones.length} salones`}</span>
                </div>
                <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-cuerpo-sm">
                  <div className="flex items-center gap-2"><DoorOpen className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden /><dt className="sr-only">Entrada</dt><dd><span className="text-muted-foreground">Entrada </span><span className="font-medium tabular-nums">{p.horaEntrada}</span></dd></div>
                  <div className="flex items-center gap-2"><DoorClosed className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden /><dt className="sr-only">Salida</dt><dd><span className="text-muted-foreground">Salida </span><span className="font-medium tabular-nums">{p.horaSalida}</span></dd></div>
                  <div className="flex items-center gap-2">
                    <Coffee className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden />
                    <dt className="sr-only">Recreos</dt>
                    <dd className="tabular-nums">{p.recreos.length === 0 ? "Sin recreos" : p.recreos.map((r) => `${r.horaInicio}–${r.horaFin}`).join(" · ")}</dd>
                  </div>
                </dl>
                <p className="text-cuerpo-sm text-muted-foreground"><span className="sr-only">Clases: </span>{p.clases} horas de clase de {p.duracionClase} min · falta desde las <span className="tabular-nums">{p.horaLimiteFalta}</span></p>
                {p.salones.length > 0 && (
                  <p className="text-cuerpo-sm"><span className="text-muted-foreground">Salones: </span>{p.salones.map((s) => s.nombre).join(" · ")}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/horario/plantillas/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil strokeWidth={2} aria-hidden />Editar<span className="sr-only"> {p.nombre}</span>
                </Link>
                {p.salones.length === 0 && (
                  <BotonConfirmar
                    etiqueta={<><Trash2 strokeWidth={2} aria-hidden />Eliminar</>}
                    titulo={`¿Eliminar la plantilla «${p.nombre}»?`}
                    descripcion="Ningún salón la usa. Esto no se puede deshacer."
                    confirmar="Eliminar"
                    accion={eliminarPlantillaAction.bind(null, slug, p.id)}
                    peligro
                    variante="ghost"
                    tamano="sm"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
