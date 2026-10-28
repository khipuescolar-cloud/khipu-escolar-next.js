import { Lock } from "lucide-react";
import type { Plan } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { NOMBRE_PLAN } from "@/lib/planes";

/** Indicador de función no incluida en el plan del colegio (ícono + texto). */
export function PlanLock({ planMinimo }: { planMinimo: Plan }) {
  return (
    <Badge variant="secondary" className="h-6 rounded-pildora px-2 text-etiqueta text-muted-foreground">
      <Lock className="size-3" strokeWidth={2} aria-hidden />
      Plan {NOMBRE_PLAN[planMinimo]}
    </Badge>
  );
}
