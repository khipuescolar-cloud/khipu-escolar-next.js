import { MessageCircle, Smartphone } from "lucide-react";
import Link from "next/link";
import { enmascararTelefono } from "@/lib/telefono";

export type OpcionesCanalesPago = { whatsappActivo: boolean; smsActivo: boolean; whatsapp: boolean; sms: boolean; telefono: string | null };

const fila = "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/40 has-[:checked]:border-primary/40";
const casilla = "size-5 shrink-0 accent-primary";

/** Casillas de WhatsApp y SMS: solo salen si el colegio activó el canal. Muestra el celular enmascarado o pide agregarlo en el perfil. */
export function CasillasCanalesPago({ opciones, enPerfil = false }: { opciones: OpcionesCanalesPago; enPerfil?: boolean }) {
  if (!opciones.whatsappActivo && !opciones.smsActivo) return null;
  return (
    <div className="flex flex-col gap-3" data-testid="canales-pago">
      {opciones.whatsappActivo && (
        <label className={fila}>
          <input type="checkbox" name="whatsapp" defaultChecked={opciones.whatsapp} className={casilla} />
          <MessageCircle className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden /> Recibir avisos por WhatsApp
        </label>
      )}
      {opciones.smsActivo && (
        <label className={fila}>
          <input type="checkbox" name="sms" defaultChecked={opciones.sms} className={casilla} />
          <Smartphone className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden /> Recibir avisos por mensaje de texto (SMS)
        </label>
      )}
      <p className="text-sm text-muted-foreground">
        {opciones.telefono ? (
          <>Los enviaremos al celular {enmascararTelefono(opciones.telefono)}. {enPerfil ? "Puedes cambiarlo abajo, en «Mi celular»." : <>Puedes cambiarlo en <Link href="/perfil#celular" className="font-medium text-primary underline">tu perfil</Link>.</>}</>
        ) : (
          <>Aún no tienes un celular guardado. {enPerfil ? "Agrégalo abajo, en «Mi celular»." : <><Link href="/perfil#celular" className="font-medium text-primary underline">Agrégalo en tu perfil</Link>.</>} Sin celular no podemos enviarte estos avisos.</>
        )}
      </p>
    </div>
  );
}
