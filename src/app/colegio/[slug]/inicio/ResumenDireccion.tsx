import { Check, ChevronRight, Clock, HelpCircle, Mail, MailCheck, MailX, School, CircleAlert } from "lucide-react";
import Link from "next/link";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { tieneFeature } from "@/lib/server/plan";
import { resumenAsistenciaHoy, resumenAvisosHoy } from "@/lib/server/resumen-direccion";
import type { TenantContext } from "@/lib/server/tenant";

type Dato = { palabra: string; valor: number; Icono: typeof Clock; clase: string };

/** Asistencia de hoy por salón para el inicio de dirección (specs/10): filas fáciles de comparar. */
export async function ResumenDireccion({ ctx }: { ctx: TenantContext }) {
  const [salones, avisos] = await Promise.all([
    resumenAsistenciaHoy(ctx),
    tieneFeature(ctx, "avisos") ? resumenAvisosHoy(ctx) : Promise.resolve(null),
  ]);
  const requierenAtencion = salones.filter((s) => s.falta > 0 || s.tarde > 0 || s.problema > 0 || s.sinRegistrar > 0);
  const visibles = (requierenAtencion.length ? requierenAtencion : salones).slice(0, 5);
  return (
    <>
    <section aria-labelledby="resumen-hoy" className="flex flex-col gap-3">
      <h2 id="resumen-hoy" className="text-titulo-2">Asistencia de hoy</h2>
      {salones.length === 0 ? (
        <EstadoVacio icono={School} titulo="Aún no hay salones creados" descripcion="Crea los grados y salones en Gestión para ver la asistencia del día." />
      ) : (
        <div>
        <ul className="divide-y divide-borde-sutil rounded-xl border border-borde-sutil bg-superficie px-4">
          {visibles.map((s) => {
            const datos: Dato[] = [
              { palabra: "Llegaron", valor: s.llego, Icono: Check, clase: "bg-llego-fondo text-llego" },
              { palabra: "Tarde", valor: s.tarde, Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
              { palabra: "No llegaron", valor: s.falta, Icono: CircleAlert, clase: "bg-falta-fondo text-falta" },
              { palabra: "Sin registrar", valor: s.sinRegistrar, Icono: HelpCircle, clase: "bg-muted text-muted-foreground" },
            ];
            return (
              <li key={s.salonId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <p className="min-w-40 text-cuerpo-sm font-semibold">
                      {s.salon} <span className="font-sans text-cuerpo-sm font-normal text-muted-foreground">· {s.total} alumnos</span>
                    </p>
                    <ul className="flex flex-wrap gap-x-4 gap-y-2">
                      {datos.map(({ palabra, valor, Icono, clase }) => (
                        <li key={palabra} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-etiqueta ${clase}`}>
                          <span className="inline-flex items-center gap-1 text-etiqueta">
                            <Icono className="size-3.5 shrink-0" strokeWidth={2} aria-hidden /> {palabra}
                          </span>
                          <strong className="tabular-nums">{valor}</strong>
                        </li>
                      ))}
                    </ul>
                    {s.problema > 0 && <p className="inline-flex items-center gap-1 text-etiqueta text-problema"><CircleAlert className="size-4" strokeWidth={2} aria-hidden />Con aviso: {s.problema}</p>}
              </li>
            );
          })}
        </ul>
        {salones.length > visibles.length && <Link href="/asistencia/reportes" className="mt-2 inline-flex min-h-10 items-center gap-1 text-cuerpo-sm enlace">Ver todos los salones <ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>}
        </div>
      )}
    </section>
    {avisos && <AvisosDeHoy avisos={avisos} />}
    </>
  );
}

function AvisosDeHoy({ avisos }: { avisos: { enviados: number; abiertos: number; conError: number } }) {
  const datos: Dato[] = [
    { palabra: "Enviados", valor: avisos.enviados, Icono: Mail, clase: "bg-muted text-foreground" },
    { palabra: "Abiertos", valor: avisos.abiertos, Icono: MailCheck, clase: "bg-llego-fondo text-llego" },
    { palabra: "Con error", valor: avisos.conError, Icono: MailX, clase: avisos.conError > 0 ? "bg-falta-fondo text-falta" : "bg-muted text-muted-foreground" },
  ];
  return (
    <section aria-labelledby="resumen-avisos" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="resumen-avisos" className="text-titulo-2">Avisos de hoy</h2>
        <Link href="/avisos" className="inline-flex min-h-10 items-center gap-1 text-cuerpo-sm enlace">
          Ver todos los avisos <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>
      <ul className="grid max-w-xl grid-cols-3 gap-2">
        {datos.map(({ palabra, valor, Icono, clase }) => (
          <li key={palabra} className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 ${clase}`}>
            <span className="inline-flex items-center gap-1 text-etiqueta">
              <Icono className="size-3.5 shrink-0" strokeWidth={2} aria-hidden /> {palabra}
            </span>
            <span className="font-heading text-titulo-2 leading-none">{valor}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
