import { CheckCircle2, Clock, HelpCircle, XCircle } from "lucide-react";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { resumenAsistenciaHoy } from "@/lib/server/resumen-direccion";
import type { TenantContext } from "@/lib/server/tenant";

/** Asistencia de hoy por salón para el inicio de dirección (specs/10). */
export async function ResumenDireccion({ ctx }: { ctx: TenantContext }) {
  const salones = await resumenAsistenciaHoy(ctx);
  return (
    <section aria-labelledby="resumen-hoy">
      <h2 id="resumen-hoy" className="mb-3 text-lg font-semibold">Asistencia de hoy</h2>
      {salones.length === 0 ? (
        <Tarjeta className="text-sm text-pizarra">Aún no hay salones creados.</Tarjeta>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {salones.map((s) => (
            <li key={s.salonId}>
              <Tarjeta className="flex flex-col gap-2 p-4">
                <p className="font-semibold">{s.salon} <span className="font-normal text-pizarra">· {s.total} alumnos</span></p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  <li className="inline-flex items-center gap-1 text-llego"><CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden /> Llegaron {s.llego}</li>
                  <li className="inline-flex items-center gap-1 text-tarde"><Clock className="h-4 w-4" strokeWidth={2} aria-hidden /> Tarde {s.tarde}</li>
                  <li className="inline-flex items-center gap-1 text-falta"><XCircle className="h-4 w-4" strokeWidth={2} aria-hidden /> Faltas {s.falta}</li>
                  <li className="inline-flex items-center gap-1 text-pizarra"><HelpCircle className="h-4 w-4" strokeWidth={2} aria-hidden /> Sin registrar {s.sinRegistrar}</li>
                </ul>
                {s.problema > 0 && <p className="text-xs text-problema">Con problema: {s.problema}</p>}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
