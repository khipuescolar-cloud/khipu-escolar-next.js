"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Selector } from "@/components/ui/Selector";
import type { EstadoFormulario } from "../actions";

type Accion = (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

export function DialogoAgregarFeriado({ accion, colegios, anio }: { accion: Accion; colegios: { id: string; nombre: string }[]; anio: number }) {
  const [abierto, setAbierto] = useState(false);
  const [alcance, setAlcance] = useState("nacional");
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
        <CalendarPlus strokeWidth={2} aria-hidden /> Agregar día no laborable
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Agregar día no laborable</DialogTitle>
          <DialogDescription>Corre un día hábil los plazos para justificar faltas en los colegios que corresponda.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            startTransition(() => enviar(datos));
          }}
        >
          <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={`${anio}-01-01`} />
          <Campo etiqueta="Nombre" name="nombre" required minLength={3} maxLength={120} placeholder="P. ej. Día del Cusco o día no laborable decretado" />
          <Selector etiqueta="Alcance" name="alcance" value={alcance} onChange={(e) => setAlcance(e.target.value)}>
            <option value="nacional">Todo el país (decretado)</option>
            <option value="regional">Una región</option>
            <option value="colegio">Un colegio</option>
          </Selector>
          {alcance === "regional" && <Campo etiqueta="Región" name="region" required maxLength={60} ayuda="Debe coincidir con la ciudad del colegio (sin importar tildes ni mayúsculas)." />}
          {alcance === "colegio" && (
            <Selector etiqueta="Colegio" name="tenantId" required defaultValue="">
              <option value="" disabled>Elige un colegio</option>
              {colegios.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Selector>
          )}
          {estado?.error && <Alerta tipo="error">{estado.error}</Alerta>}
          <DialogFooter>
            <Boton type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
              Agregar
            </Boton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const HORAS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

export function FormularioHorarioNudito({ accion, inicio, fin }: { accion: Accion; inicio: string; fin: string }) {
  const [estado, enviar, pendiente] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const r = await accion(previo, datos);
    if (r?.ok) toast.success(r.ok);
    return r;
  }, null);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => enviar(datos));
      }}
    >
      <div className="grid max-w-md gap-4 sm:grid-cols-2">
        <Selector etiqueta="Despierta a las" name="inicio" defaultValue={inicio}>
          {HORAS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </Selector>
        <Selector etiqueta="Duerme a las" name="fin" defaultValue={fin}>
          {HORAS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </Selector>
      </div>
      {estado?.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <div>
        <Boton type="submit" disabled={pendiente}>
          {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
          Guardar horario
        </Boton>
      </div>
    </form>
  );
}
