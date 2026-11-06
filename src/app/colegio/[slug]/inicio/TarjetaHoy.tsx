import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AhoraDespues } from "@/components/horario/AhoraDespues";
import { InsigniaAhora } from "@/components/horario/Insignias";
import { rango } from "@/lib/horario";
import { horarioDeHoy } from "@/lib/server/horario";
import type { TenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";

/** Tarjeta «Hoy» del inicio (specs/34): bloques de hoy del profesor, del alumno o de cada hijo, con «Ahora» y «Después». */
export async function TarjetaHoy({ ctx }: { ctx: TenantContext }) {
  const hoy = await horarioDeHoy(ctx);
  // Sin clases hoy (o el colegio aún no arma horarios): no se muestra, para no ocupar el inicio.
  if (!hoy || hoy.grupos.every((g) => g.bloques.length === 0)) return null;
  const esProfesor = ctx.rol === "profesor";
  return (
    <section aria-labelledby="titulo-hoy" className="flex w-full flex-col gap-3 rounded-xl border border-borde-sutil bg-superficie p-5" data-testid="tarjeta-hoy">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-hoy" className="inline-flex items-center gap-2 font-titulo text-cuerpo font-semibold">
          <CalendarClock className="size-5 text-primary" strokeWidth={2} aria-hidden />Hoy
        </h2>
        <Link href="/horario" className="inline-flex min-h-10 items-center gap-1 text-cuerpo-sm enlace">
          {esProfesor || ctx.rol === "alumno" ? "Mi horario" : "Ver horario"}<ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>
      <div className={cn("grid gap-4", hoy.grupos.length > 1 && "md:grid-cols-2")}>
        {hoy.grupos.map((g) => (
          <div key={g.clave} className="flex flex-col gap-2">
            {g.etiqueta && <h3 className="text-cuerpo-sm font-semibold">{g.etiqueta}</h3>}
            <AhoraDespues ahora={g.ahora} despues={g.despues} hayClasesHoy={g.bloques.length > 0} conSalon={esProfesor} />
            {g.bloques.length > 0 && (
              <ol className="flex flex-col divide-y divide-borde-sutil">
                {g.bloques.map((b) => (
                  <li key={b.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-cuerpo-sm", b.id === g.ahora?.id && "bg-primary/5")}>
                    <span className="w-24 text-muted-foreground tabular-nums">{rango(b)}</span>
                    <span className={cn("font-medium", !b.cursoId && "text-turquesa")}>{b.titulo}</span>
                    {esProfesor && <span className="text-muted-foreground">{b.salonNombre}</span>}
                    {b.id === g.ahora?.id && <InsigniaAhora />}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
