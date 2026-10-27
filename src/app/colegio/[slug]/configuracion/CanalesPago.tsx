import { CheckCircle2, MessageCircle, Smartphone, XCircle } from "lucide-react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { guardarCanalesPagoAction } from "./actions";

type Props = { whatsappActivo: boolean; smsActivo: boolean; credenciales: { whatsapp: boolean; sms: boolean } };

const fila = "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border bg-card px-3 py-3 text-sm transition-colors hover:bg-accent/40 has-[:checked]:border-primary/40";

function Estado({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 font-medium text-llego"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden /> Configurado</span>
  ) : (
    <span className="inline-flex items-center gap-1 font-medium text-tarde"><XCircle className="size-4" strokeWidth={2} aria-hidden /> Falta configurar en el servidor</span>
  );
}

/** Interruptores de WhatsApp y SMS (canales con costo por mensaje). Muestra si el servidor tiene credenciales, nunca sus valores. */
export function CanalesPago({ whatsappActivo, smsActivo, credenciales }: Props) {
  return (
    <form action={guardarCanalesPagoAction} className="flex flex-col gap-3">
      <Alerta tipo="aviso">
        WhatsApp y SMS tienen un costo por cada mensaje (aproximadamente US$ 0.01 a 0.02 por WhatsApp y US$ 0.05 a 0.10 por SMS en Perú; revisa la tarifa vigente).
        Solo se envían a las familias y al personal que los elijan, y tienen un tope diario.
      </Alerta>
      <label className={fila}>
        <input type="checkbox" name="whatsappActivo" defaultChecked={whatsappActivo} className="mt-0.5 size-5 shrink-0 accent-primary" />
        <span className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 font-medium"><MessageCircle className="size-4" strokeWidth={2} aria-hidden /> Avisos por WhatsApp</span>
          <span className="text-muted-foreground">Asistencia, comunicados, mensajes y libreta, con plantillas aprobadas por Meta.</span>
          <span data-testid="estado-whatsapp"><Estado ok={credenciales.whatsapp} /></span>
        </span>
      </label>
      <label className={fila}>
        <input type="checkbox" name="smsActivo" defaultChecked={smsActivo} className="mt-0.5 size-5 shrink-0 accent-primary" />
        <span className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 font-medium"><Smartphone className="size-4" strokeWidth={2} aria-hidden /> Avisos por mensaje de texto (SMS)</span>
          <span className="text-muted-foreground">Mensaje corto con el nombre de pila del alumno, sin más datos.</span>
          <span data-testid="estado-sms"><Estado ok={credenciales.sms} /></span>
        </span>
      </label>
      <Boton type="submit" className="self-start">Guardar canales</Boton>
    </form>
  );
}
