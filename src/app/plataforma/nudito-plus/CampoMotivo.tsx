import { Textarea } from "@/components/ui/textarea";

/** Motivo obligatorio de una acción manual (queda en la auditoría). */
export function CampoMotivo({ ayuda, id }: { ayuda?: string; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">Motivo</span>
      <Textarea id={id} name="motivo" required minLength={5} maxLength={300} rows={3} />
      {ayuda && <span className="text-muted-foreground">{ayuda}</span>}
    </label>
  );
}
