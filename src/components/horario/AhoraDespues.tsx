import { ArrowRight, CircleDot, Moon } from "lucide-react";
import { textoAhora, textoDespues, type BloqueDelDia } from "@/lib/horario";

type Bloque = BloqueDelDia & { salonNombre?: string };

/** «Ahora: Matemática · 3.° B hasta las 10:30» y «Después: …». Sin bloques: frase en positivo. */
export function AhoraDespues({ ahora, despues, hayClasesHoy, conSalon = false }: { ahora: Bloque | null; despues: Bloque | null; hayClasesHoy: boolean; conSalon?: boolean }) {
  if (!hayClasesHoy) {
    return <p className="inline-flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground"><Moon className="size-4" strokeWidth={2} aria-hidden />Hoy no hay clases en el horario.</p>;
  }
  if (!ahora && !despues) {
    return <p className="inline-flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground"><Moon className="size-4" strokeWidth={2} aria-hidden />Terminaron las clases de hoy.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5 text-cuerpo-sm" data-testid="ahora-despues">
      {ahora && (
        <p className="inline-flex items-start gap-1.5">
          <CircleDot className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          <span><span className="font-semibold">Ahora:</span> {textoAhora(ahora, conSalon ? ahora.salonNombre : undefined)}</span>
        </p>
      )}
      {despues && (
        <p className="inline-flex items-start gap-1.5 text-muted-foreground">
          <ArrowRight className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
          <span><span className="font-semibold text-foreground">Después:</span> {textoDespues(despues, conSalon ? despues.salonNombre : undefined)}</span>
        </p>
      )}
    </div>
  );
}
