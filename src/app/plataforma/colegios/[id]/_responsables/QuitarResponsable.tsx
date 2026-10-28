"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Selector } from "@/components/ui/Selector";
import { quitarResponsableAction } from "../_acciones";

/**
 * Quitar un responsable. Si es el principal pide elegir quién lo reemplaza; si tiene acceso al sistema
 * ofrece también desactivar su membresía (por defecto no: puede seguir siendo dirección del colegio).
 */
export function QuitarResponsable({
  tenantId, id, nombre, principal, tieneAcceso, otros,
}: { tenantId: string; id: string; nombre: string; principal: boolean; tieneAcceso: boolean; otros: { id: string; nombre: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  const [reemplazo, setReemplazo] = useState("");
  const [desactivar, setDesactivar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const sinReemplazo = principal && otros.length === 0;

  const quitar = () =>
    iniciar(async () => {
      const f = new FormData();
      f.set("tenantId", tenantId);
      f.set("id", id);
      if (principal) f.set("reemplazoId", reemplazo);
      if (desactivar) f.set("desactivarAcceso", "on");
      const r = await quitarResponsableAction(f);
      if (r.ok) {
        toast.success(r.mensaje ?? "Responsable quitado.");
        setAbierto(false);
      } else toast.error(r.error);
    });

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <Trash2 strokeWidth={2} aria-hidden /> Quitar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">¿Quitar a {nombre}?</DialogTitle>
          <DialogDescription>Deja de aparecer como responsable del colegio ante Khipu. Queda constancia en la auditoría.</DialogDescription>
        </DialogHeader>
        {principal && (
          sinReemplazo ? (
            <p className="text-cuerpo-sm text-muted-foreground">Es el responsable principal y el único. Agrega otro responsable antes de quitarlo.</p>
          ) : (
            <Selector etiqueta="Es el principal: ¿quién lo reemplaza?" value={reemplazo} onChange={(e) => setReemplazo(e.target.value)}>
              <option value="">Elige a una persona</option>
              {otros.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </Selector>
          )
        )}
        {tieneAcceso && (
          <label className="flex min-h-10 cursor-pointer items-start gap-2.5 text-cuerpo-sm">
            <input type="checkbox" checked={desactivar} onChange={(e) => setDesactivar(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
            <span>
              <span className="font-medium">También desactivar su acceso al sistema</span>
              <span className="block text-muted-foreground">Su membresía de dirección pasa a inactiva. Sin marcar, sigue pudiendo entrar al colegio.</span>
            </span>
          </label>
        )}
        <DialogFooter>
          <Boton type="button" variante="secundario" onClick={() => setAbierto(false)} disabled={pendiente}>Cancelar</Boton>
          <Boton type="button" variante="peligro" onClick={quitar} disabled={pendiente || sinReemplazo || (principal && !reemplazo)}>
            {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
            Quitar responsable
          </Boton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
