import { Check, ChevronRight, Clock, HelpCircle, Mail, MailCheck, MailX, School, CircleAlert } from "lucide-react";
import Link from "next/link";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Card, CardContent } from "@/components/ui/card";
import { tieneFeature } from "@/lib/server/plan";
import { resumenAsistenciaHoy, resumenAvisosHoy } from "@/lib/server/resumen-direccion";
import type { TenantContext } from "@/lib/server/tenant";

type Dato = { palabra: string; valor: number; Icono: typeof Clock; clase: string };

/** Asistencia de hoy por salón para el inicio de dirección (specs/10): una tarjeta por salón con stat tiles. */
export async function ResumenDireccion({ ctx }: { ctx: TenantContext }) {
  const [salones, avisos] = await Promise.all([
    resumenAsistenciaHoy(ctx),
    tieneFeature(ctx, "avisos") ? resumenAvisosHoy(ctx) : Promise.resolve(null),
  ]);
  return (
    <>
    <section aria-labelledby="resumen-hoy" className="flex flex-col gap-3">
      <h2 id="resumen-hoy" className="text-titulo-2">Asistencia de hoy</h2>
      {salones.length === 0 ? (
        <EstadoVacio icono={School} titulo="Aún no hay salones creados" descripcion="Crea los grados y salones en Gestión para ver la asistencia del día." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {salones.map((s) => {
            const datos: Dato[] = [
              { palabra: "Llegaron", valor: s.llego, Icono: Check, clase: "bg-llego-fondo text-llego" },
              { palabra: "Tarde", valor: s.tarde, Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
              { palabra: "No llegaron", valor: s.falta, Icono: CircleAlert, clase: "bg-falta-fondo text-falta" },
              { palabra: "Sin registrar", valor: s.sinRegistrar, Icono: HelpCircle, clase: "bg-muted text-muted-foreground" },
            ];
            return (
              <li key={s.salonId}>
                <Card className="h-full gap-3 shadow-none">
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-cuerpo font-semibold">
                      {s.salon} <span className="font-sans text-cuerpo-sm font-normal text-muted-foreground">· {s.total} alumnos</span>
                    </p>
                    <ul className="grid grid-cols-2 gap-2">
                      {datos.map(({ palabra, valor, Icono, clase }) => (
                        <li key={palabra} className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 ${clase}`}>
                          <span className="inline-flex items-center gap-1 text-etiqueta">
                            <Icono className="size-3.5 shrink-0" strokeWidth={2} aria-hidden /> {palabra}
                          </span>
                          <span className="font-heading text-titulo-2 leading-none">{valor}</span>
                        </li>
                      ))}
                    </ul>
                    {s.problema > 0 && <p className="text-etiqueta text-problema">Con aviso: {s.problema}</p>}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
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
