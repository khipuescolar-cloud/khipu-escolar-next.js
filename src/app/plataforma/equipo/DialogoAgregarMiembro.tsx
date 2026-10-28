"use client";

import { Loader2, UserPlus } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { EstadoFormulario } from "../actions";

/** «Agregar miembro» al equipo Khipu: nunca se muestra una contraseña; llega por documento o por enlace al correo. */
export function DialogoAgregarMiembro({ accion }: { accion: (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario> }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const r = await accion(previo, datos);
    if (r?.ok) {
      toast.success(r.ok);
      setAbierto(false);
    }
    return r;
  }, null);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={buttonVariants()}>
        <UserPlus strokeWidth={2} aria-hidden /> Agregar miembro
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Agregar miembro al equipo</DialogTitle>
          <DialogDescription>
            Tendrá acceso a toda la plataforma. Con documento, su contraseña inicial es ese número; sin documento, le enviamos un enlace
            al correo para crearla. En ambos casos deberá cambiarla al entrar.
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
          <Campo etiqueta="Correo" name="email" type="email" required autoComplete="off" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombres" name="nombres" required maxLength={80} />
            <Campo etiqueta="Apellidos" name="apellidos" required maxLength={80} />
          </div>
          <Campo etiqueta="Documento (opcional)" name="documento" maxLength={12} inputMode="text" ayuda="DNI de 8 dígitos o carné de extranjería." />
          {estado?.error && <Alerta tipo="error">{estado.error}</Alerta>}
          <DialogFooter>
            <Boton type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
              Agregar al equipo
            </Boton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
