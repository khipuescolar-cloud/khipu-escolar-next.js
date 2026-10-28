"use client";

import { LifeBuoy, Loader2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoFormulario } from "../actions";

type Accion = (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

/** «Entrar como soporte» (specs/16): pide el motivo (obligatorio) y la duración; la action redirige al colegio. */
export function DialogoSoporte({ tenantId, nombre, accion }: { tenantId: string; nombre: string; accion: Accion }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(accion, null);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>
        <LifeBuoy strokeWidth={2} aria-hidden /> Entrar como soporte
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Entrar a {nombre} como soporte</DialogTitle>
          <DialogDescription>
            Verás el colegio como dirección, en solo lectura. No podrás ver chats, notas, libretas ni Nudito. Tu ingreso y cada página
            que abras quedan registrados en la auditoría del colegio.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            startTransition(() => enviar(datos));
          }}
        >
          <input type="hidden" name="tenantId" value={tenantId} />
          <label htmlFor="motivo-soporte" className="flex flex-col gap-1.5 text-cuerpo-sm">
            <span className="font-medium text-foreground">Motivo</span>
            <Textarea id="motivo-soporte" name="motivo" required minLength={5} maxLength={300} rows={3} placeholder="P. ej. La directora reporta que no ve la asistencia de 3.° B." />
          </label>
          <Selector etiqueta="Duración" name="minutos" defaultValue="30">
            <option value="30">30 minutos</option>
            <option value="60">1 hora</option>
            <option value="120">2 horas</option>
          </Selector>
          {estado?.error && <Alerta tipo="error">{estado.error}</Alerta>}
          <DialogFooter>
            <Boton type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
              Entrar en solo lectura
            </Boton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
