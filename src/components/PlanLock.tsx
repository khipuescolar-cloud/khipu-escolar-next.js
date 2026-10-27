import { Lock } from "lucide-react";
import type { Plan } from "@/generated/prisma/enums";
import { NOMBRE_PLAN } from "@/lib/planes";

/** Indicador de función no incluida en el plan del colegio (ícono + texto). */
export function PlanLock({ planMinimo }: { planMinimo: Plan }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-2 py-0.5 text-xs font-medium text-pizarra">
      <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
      Plan {NOMBRE_PLAN[planMinimo]}
    </span>
  );
}
