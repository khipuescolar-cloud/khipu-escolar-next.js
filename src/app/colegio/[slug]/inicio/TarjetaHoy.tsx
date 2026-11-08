import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AhoraDespues } from "@/components/horario/AhoraDespues";
import { InsigniaAhora } from "@/components/horario/Insignias";
import { rango } from "@/lib/horario";
import { horarioDeHoy } from "@/lib/server/horario";
import type { TenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { TituloBloque } from "@/components/shell/TituloBloque";

/** Horario de hoy (specs/34) en la columna lateral del inicio: «Ahora» y «Después» y los bloques del día como línea de tiempo. */
export async function TarjetaHoy({ ctx }: { ctx: TenantContext }) {
  const hoy = await horarioDeHoy(ctx);
  // Sin clases hoy (o el colegio aún no arma horarios): no se muestra, para no ocupar el inicio.
  if (!hoy || hoy.grupos.every((g) => g.bloques.length === 0)) return null;
  const esProfesor = ctx.rol === "profesor";
  return (
    <section aria-labelledby="titulo-hoy" data-seccion="dia" className="flex flex-col gap-3" data-testid="tarjeta-hoy">
      <TituloBloque id="titulo-hoy" accion={
        <Link href="/agenda/horario" className="inline-flex min-h-10 items-center gap-0.5 text-cuerpo-sm enlace">
          {esProfesor || ctx.rol === "alumno" ? "Mi horario" : "Ver horario"}<ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </Link>
      }>Tu horario de hoy</TituloBloque>
      <div className="flex flex-col gap-5">
        {hoy.grupos.map((g) => (
          <div key={g.clave} className="flex flex-col gap-2.5">
            {g.etiqueta && <h3 className="text-cuerpo-sm font-semibold">{g.etiqueta}</h3>}
            <AhoraDespues ahora={g.ahora} despues={g.despues} hayClasesHoy={g.bloques.length > 0} conSalon={esProfesor} />
            {g.bloques.length > 0 && (
              <ol className="flex flex-col border-l-2 border-borde-sutil">
                {g.bloques.map((b) => {
                  const ahora = b.id === g.ahora?.id;
                  return (
                    <li key={b.id} className={cn("relative flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 pl-4 text-cuerpo-sm", ahora && "rounded-r-[10px] bg-sec-suave")}>
                      <span aria-hidden className={cn("absolute top-1/2 -left-[5px] size-2 -translate-y-1/2 rounded-full", ahora ? "bg-sec-nudo" : "bg-borde-sutil")} />
                      <span className="w-[5.5rem] shrink-0 text-muted-foreground tabular-nums">{rango(b)}</span>
                      <span className={cn("font-medium", !b.cursoId && "text-turquesa")}>{b.titulo}</span>
                      {esProfesor && <span className="text-muted-foreground">{b.salonNombre}</span>}
                      {ahora && <InsigniaAhora />}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
