"use client";

import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Resultado } from "@/lib/resultado";

type Accion = "agregar" | "quitar" | "restablecer";

const TEXTO: Record<Accion, { boton: string; titulo: string; descripcion: string; confirmar: string }> = {
  agregar: {
    boton: "Agregar",
    titulo: "Agregar módulo al colegio",
    descripcion: "El colegio tendrá este módulo aunque su plan no lo incluya.",
    confirmar: "Agregar módulo",
  },
  quitar: {
    boton: "Quitar",
    titulo: "Quitar módulo del colegio",
    descripcion: "Nadie del colegio verá este módulo y sus páginas responderán «sin acceso». Los datos se conservan.",
    confirmar: "Quitar módulo",
  },
  restablecer: {
    boton: "Volver al plan",
    titulo: "Volver a lo que indica el plan",
    descripcion: "Se borra el ajuste de este colegio y el módulo queda como lo define su plan.",
    confirmar: "Volver al plan",
  },
};

/** Botón + `Dialog` con motivo para ajustar un módulo de un colegio (formulario corto, specs/18 §8). */
export function CambiarModuloColegio({
  tenantId, modulo, nombreModulo, accion, ejecutar,
}: {
  tenantId: string;
  modulo: string;
  nombreModulo: string;
  accion: Accion;
  ejecutar: (p: Resultado | null, f: FormData) => Promise<Resultado>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(async (previo: Resultado | null, f: FormData) => {
    const r = await ejecutar(previo, f);
    if (r.ok) {
      toast.success(r.mensaje ?? "Listo");
      setAbierto(false);
    }
    return r;
  }, null);
  const t = TEXTO[accion];

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        className={buttonVariants({ variant: accion === "quitar" ? "outline" : accion === "agregar" ? "secondary" : "ghost", size: "sm" })}
        aria-label={`${t.boton}: ${nombreModulo}`}
      >
        {t.boton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-titulo-2">{t.titulo}: {nombreModulo}</DialogTitle>
          <DialogDescription>{t.descripcion}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            startTransition(() => enviar(f));
          }}
        >
          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="modulo" value={modulo} />
          <input type="hidden" name="accion" value={accion} />
          <Campo
            id={`motivo-${modulo}`}
            etiqueta={accion === "restablecer" ? "Motivo (opcional)" : "Motivo"}
            name="motivo"
            required={accion !== "restablecer"}
            minLength={accion === "restablecer" ? undefined : 5}
            maxLength={200}
            placeholder={accion === "agregar" ? "p. ej. Piloto de notas hasta diciembre" : "p. ej. Pedido de la dirección"}
          />
          {estado && !estado.ok && <Alerta tipo="error">{estado.error}</Alerta>}
          <Boton type="submit" variante={accion === "quitar" ? "peligro" : "primario"} disabled={pendiente} className="self-end">
            {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
            {t.confirmar}
          </Boton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
