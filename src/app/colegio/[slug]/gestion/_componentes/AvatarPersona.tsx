import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Avatar con las iniciales de nombres y apellidos (sin foto: no guardamos fotos de personas). Toma el color de su sección. */
export function AvatarPersona({ nombres, apellidos, grande = false }: { nombres: string; apellidos: string; grande?: boolean }) {
  const iniciales = `${nombres.trim()[0] ?? ""}${apellidos.trim()[0] ?? ""}`.toUpperCase();
  return (
    <Avatar size={grande ? "lg" : "default"} className={cn(grande && "size-16")} aria-hidden>
      <AvatarFallback className={cn("bg-sec-suave font-semibold text-sec-tinta", grande && "text-xl")}>{iniciales}</AvatarFallback>
    </Avatar>
  );
}
