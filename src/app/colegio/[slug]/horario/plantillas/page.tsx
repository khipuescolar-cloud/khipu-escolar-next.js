import { ArrowLeft, CalendarClock, Coffee, DoorClosed, DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Tarjeta } from "@/components/ui/Tarjeta";
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
    <div className="flex flex-col gap-4">
      {ctx.rol === "direccion" && (
        <Link href="/horario" className="inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace"><ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Horarios</Link>
      )}
      <EncabezadoPagina
        titulo="Plantillas de horario"
        descripcion="La entrada, los recreos y la salida de cada jornada. Khipu calcula las horas de clase; cada salón usa una plantilla y su entrada marca la tardanza en portería."
        acciones={plantillas.length > 0 ? nueva : undefined}
      />
      {plantillas.length === 0 ? (
        <EstadoVacio icono={CalendarClock} titulo="Aún no hay plantillas" descripcion="Crea la primera: por ejemplo «Primaria mañana», con entrada a las 7:45, dos recreos y salida a la 1:15." accion={nueva} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plantillas.map((p) => (
            <li key={p.id}>
              <Tarjeta className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-heading text-cuerpo font-semibold">{p.nombre}</h2>
                  <span className="shrink-0 rounded-pildora bg-muted px-2 py-0.5 text-etiqueta text-muted-foreground">
                    {p.salones.length === 0 ? "Sin salones" : p.salones.length === 1 ? "1 salón" : `${p.salones.length} salones`}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-cuerpo-sm">
                  <div className="flex items-center gap-2"><DoorOpen className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden /><dt className="sr-only">Entrada</dt><dd><span className="text-muted-foreground">Entrada </span><span className="font-medium tabular-nums">{p.horaEntrada}</span></dd></div>
                  <div className="flex items-center gap-2"><DoorClosed className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden /><dt className="sr-only">Salida</dt><dd><span className="text-muted-foreground">Salida </span><span className="font-medium tabular-nums">{p.horaSalida}</span></dd></div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Coffee className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />
                    <dt className="sr-only">Recreos</dt>
                    <dd className="tabular-nums">{p.recreos.length === 0 ? "Sin recreos" : p.recreos.map((r) => `${r.horaInicio}–${r.horaFin}`).join(" · ")}</dd>
                  </div>
                  <div className="col-span-2 text-muted-foreground"><dt className="sr-only">Clases</dt><dd>{p.clases} horas de clase de {p.duracionClase} min · falta desde las {p.horaLimiteFalta}</dd></div>
                </dl>
                {p.salones.length > 0 && (
                  <p className="flex flex-wrap gap-1.5">
                    {p.salones.map((s) => <span key={s.id} className="rounded-pildora border px-2 py-0.5 text-etiqueta">{s.nombre}</span>)}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
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
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
