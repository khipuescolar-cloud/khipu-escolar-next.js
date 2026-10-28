"use client";

import { Loader2, Pencil } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Plan } from "@/generated/prisma/enums";
import type { Resultado } from "@/lib/resultado";

export type DatosPlan = {
  plan: Plan;
  nombre: string;
  descripcion: string | null;
  precioPorAlumno: number | null;
  precioMinimoMensual: number | null;
  maxAlumnos: number | null;
  activo: boolean;
};

/** Edición de un plan del catálogo en un `Sheet` (formulario largo, specs/18 §8). */
export function HojaEditarPlan({ datos, accion }: { datos: DatosPlan; accion: (p: Resultado | null, f: FormData) => Promise<Resultado> }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(async (previo: Resultado | null, f: FormData) => {
    const r = await accion(previo, f);
    if (r.ok) {
      toast.success(r.mensaje ?? "Listo");
      setAbierto(false);
    }
    return r;
  }, null);
  const id = (c: string) => `${datos.plan}-${c}`;

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={`Editar el plan ${datos.nombre}`}>
        <Pencil strokeWidth={2} aria-hidden /> Editar
      </SheetTrigger>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-titulo-2">Editar plan {datos.nombre}</SheetTitle>
          <SheetDescription>Los precios son referenciales: el precio real de cada colegio va en su suscripción.</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            startTransition(() => enviar(f));
          }}
        >
          <input type="hidden" name="plan" value={datos.plan} />
          <Campo id={id("nombre")} etiqueta="Nombre comercial" name="nombre" defaultValue={datos.nombre} required maxLength={40} />
          <label htmlFor={id("descripcion")} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Descripción</span>
            <Textarea id={id("descripcion")} name="descripcion" defaultValue={datos.descripcion ?? ""} maxLength={300} rows={3} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={id("precio")} etiqueta="Precio por alumno al mes (S/)" name="precioPorAlumno" inputMode="decimal" defaultValue={datos.precioPorAlumno ?? ""} ayuda="Vacío: a convenir." />
            <Campo id={id("minimo")} etiqueta="Mínimo mensual (S/)" name="precioMinimoMensual" inputMode="decimal" defaultValue={datos.precioMinimoMensual ?? ""} />
          </div>
          <Campo id={id("tope")} etiqueta="Tope de alumnos" name="maxAlumnos" inputMode="numeric" defaultValue={datos.maxAlumnos ?? ""} ayuda="Vacío: sin tope." />
          <label className="flex min-h-10 items-center gap-2 text-cuerpo-sm font-medium">
            <input type="checkbox" name="activo" defaultChecked={datos.activo} className="size-4 accent-[var(--primary)]" />
            Plan activo (se ofrece a colegios nuevos)
          </label>
          {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
          <Boton type="submit" disabled={pendiente} className="self-start">
            {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
            Guardar plan
          </Boton>
        </form>
      </SheetContent>
    </Sheet>
  );
}
