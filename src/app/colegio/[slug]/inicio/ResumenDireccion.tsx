import { CheckCircle2, Clock, HelpCircle, School, XCircle } from "lucide-react";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Card, CardContent } from "@/components/ui/card";
import { resumenAsistenciaHoy } from "@/lib/server/resumen-direccion";
import type { TenantContext } from "@/lib/server/tenant";

type Dato = { palabra: string; valor: number; Icono: typeof Clock; clase: string };

/** Asistencia de hoy por salón para el inicio de dirección (specs/10): una tarjeta por salón con stat tiles. */
export async function ResumenDireccion({ ctx }: { ctx: TenantContext }) {
  const salones = await resumenAsistenciaHoy(ctx);
  return (
    <section aria-labelledby="resumen-hoy" className="flex flex-col gap-3">
      <h2 id="resumen-hoy" className="text-xl font-semibold">Asistencia de hoy</h2>
      {salones.length === 0 ? (
        <EstadoVacio icono={School} titulo="Aún no hay salones creados" descripcion="Crea los grados y salones en Gestión para ver la asistencia del día." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {salones.map((s) => {
            const datos: Dato[] = [
              { palabra: "Llegaron", valor: s.llego, Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
              { palabra: "Tarde", valor: s.tarde, Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
              { palabra: "Faltas", valor: s.falta, Icono: XCircle, clase: "bg-falta-fondo text-falta" },
              { palabra: "Sin registrar", valor: s.sinRegistrar, Icono: HelpCircle, clase: "bg-muted text-muted-foreground" },
            ];
            return (
              <li key={s.salonId}>
                <Card className="h-full gap-3">
                  <CardContent className="flex flex-col gap-3">
                    <p className="font-heading font-semibold">
                      {s.salon} <span className="font-sans text-sm font-normal text-muted-foreground">· {s.total} alumnos</span>
                    </p>
                    <ul className="grid grid-cols-2 gap-2">
                      {datos.map(({ palabra, valor, Icono, clase }) => (
                        <li key={palabra} className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 ${clase}`}>
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            <Icono className="size-3.5 shrink-0" strokeWidth={2} aria-hidden /> {palabra}
                          </span>
                          <span className="font-heading text-2xl leading-none font-bold">{valor}</span>
                        </li>
                      ))}
                    </ul>
                    {s.problema > 0 && <p className="text-xs font-medium text-problema">Con problema: {s.problema}</p>}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
