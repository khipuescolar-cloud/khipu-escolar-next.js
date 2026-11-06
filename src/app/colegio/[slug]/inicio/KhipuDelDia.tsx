import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import type { Pendiente } from "@/lib/server/inicio-tablero";
import { cn } from "@/lib/utils";
import { CheckCheck } from "lucide-react";

/**
 * «Lo que te toca hoy» como un khipu: una cuerda vertical de la que cuelga un nudo por pendiente, con su cantidad,
 * en el color de su sección, y la acción que lo resuelve. Primero las tareas; al final lo informativo del día.
 */
export function KhipuDelDia({ pendientes }: { pendientes: Pendiente[] }) {
  const tareas = pendientes.filter((p) => !p.informativo);
  const informativos = pendientes.filter((p) => p.informativo);
  return (
    <section aria-labelledby="titulo-toca-hoy" className="flex flex-col gap-3">
      <h2 id="titulo-toca-hoy" className="text-titulo-2">Lo que te toca hoy</h2>
      {tareas.length === 0 ? (
        <EstadoVacio icono={CheckCheck} nudito titulo="Todo al día por ahora" descripcion="No tienes pendientes en tus módulos. Si llega algo nuevo, aparecerá aquí." />
      ) : (
        <ol className="relative before:absolute before:top-4 before:bottom-4 before:left-[19px] before:w-0.5 before:rounded-full before:bg-borde-sutil">
          {tareas.map((p, i) => <Fila key={p.clave} p={p} principal={i === 0} />)}
        </ol>
      )}
      {informativos.length > 0 && (
        <ul className="flex flex-wrap gap-x-6 gap-y-2 pl-1 text-cuerpo-sm text-muted-foreground" aria-label="Para tener en cuenta hoy">
          {informativos.map((p) => (
            <li key={p.clave} data-seccion={p.seccion} className="inline-flex items-center gap-2">
              <span aria-hidden className="size-2 rounded-full bg-sec-nudo" />
              <Link href={p.href} className="underline-offset-4 hover:text-foreground hover:underline">{p.titulo}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Fila({ p, principal }: { p: Pendiente; principal: boolean }) {
  return (
    <li data-seccion={p.seccion} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-borde-sutil py-4 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
      {/* El nudo: la cantidad, en el color de la sección; el anillo de fondo corta la cuerda. */}
      <span
        aria-hidden
        data-testid={p.clave === "mensajes" ? "contador-mensajes" : undefined}
        className="relative grid size-10 place-items-center rounded-full bg-sec-suave font-heading text-cuerpo font-bold text-sec-tinta tabular-nums ring-2 ring-sec-nudo ring-offset-[3px] ring-offset-background"
      >
        {p.cantidad > 99 ? "99+" : p.cantidad}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-pretty">{p.titulo}</p>
        {p.detalle && <p className="truncate text-cuerpo-sm text-muted-foreground">{p.detalle}</p>}
      </div>
      <Link
        href={p.href}
        className={cn(buttonVariants({ variant: principal ? "default" : "outline", size: "sm" }), "col-start-2 w-fit sm:col-start-auto")}
        aria-label={`${p.accion}: ${p.titulo}`}
      >
        {p.accion}
        <ArrowRight strokeWidth={2} aria-hidden />
      </Link>
    </li>
  );
}
