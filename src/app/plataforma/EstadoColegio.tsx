import { Ban, CheckCircle2, FlaskConical } from "lucide-react";
import type { EstadoTenant } from "@/generated/prisma/enums";

const CONFIG = {
  activo: { Icono: CheckCircle2, palabra: "Activo", clase: "bg-llego-fondo text-llego" },
  piloto: { Icono: FlaskConical, palabra: "Piloto", clase: "bg-tarde-fondo text-tarde" },
  suspendido: { Icono: Ban, palabra: "Suspendido", clase: "bg-falta-fondo text-falta" },
} satisfies Record<EstadoTenant, unknown>;

export const NOMBRE_ESTADO: Record<EstadoTenant, string> = { activo: "Activo", piloto: "Piloto", suspendido: "Suspendido" };

/** Estado del colegio con ícono + palabra (nunca solo color). */
export function EstadoColegio({ estado }: { estado: EstadoTenant }) {
  const { Icono, palabra, clase } = CONFIG[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-xs font-semibold ${clase}`}>
      <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {palabra}
    </span>
  );
}

export const porcentaje = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`);

export const fechaHora = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" }).format(d) : "Nunca";

export const fechaSimple = (d: Date) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "medium" }).format(d);
