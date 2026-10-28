import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Indicador de función no incluida en el plan del colegio (ícono + texto). `nombrePlan`: plan mínimo según el catálogo. */
export function PlanLock({ nombrePlan }: { nombrePlan: string }) {
  return (
    <Badge variant="secondary" className="h-6 rounded-pildora px-2 text-etiqueta text-muted-foreground">
      <Lock className="size-3" strokeWidth={2} aria-hidden />
      Plan {nombrePlan}
    </Badge>
  );
}
