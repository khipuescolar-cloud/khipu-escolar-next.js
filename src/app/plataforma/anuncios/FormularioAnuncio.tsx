"use client";

import { Loader2, Megaphone, Pencil } from "lucide-react";
import { startTransition, useActionState, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FranjaAnuncio } from "@/components/AnunciosPlataforma";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { buttonVariants } from "@/components/ui/button";
import { Selector } from "@/components/ui/Selector";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { NOMBRE_AUDIENCIA, NOMBRE_NIVEL } from "@/lib/anuncios-plataforma";
import type { Plan } from "@/generated/prisma/enums";
import type { EstadoFormulario } from "../actions";

export type AnuncioEditable = {
  id: string;
  titulo: string;
  cuerpo: string;
  nivel: keyof typeof NOMBRE_NIVEL;
  audiencia: keyof typeof NOMBRE_AUDIENCIA;
  planes: Plan[];
  /** «AAAA-MM-DDTHH:mm» en hora de Lima. */
  desde: string;
  hasta: string;
};

/** Crear o editar un anuncio (Sheet) con vista previa de cómo lo verá el colegio. */
export function FormularioAnuncio({
  accion, anuncio, nombresPlanes, desdePorDefecto, hastaPorDefecto,
}: {
  accion: (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;
  anuncio?: AnuncioEditable;
  /** Nombre comercial de cada plan (catálogo). */
  nombresPlanes: Record<Plan, string>;
  desdePorDefecto: string;
  hastaPorDefecto: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState(anuncio?.titulo ?? "");
  const [cuerpo, setCuerpo] = useState(anuncio?.cuerpo ?? "");
  const [nivel, setNivel] = useState<keyof typeof NOMBRE_NIVEL>(anuncio?.nivel ?? "info");
  const [estado, enviar, pendiente] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const r = await accion(previo, datos);
    if (r?.ok) {
      toast.success(r.ok);
      setAbierto(false);
      if (!anuncio) {
        setTitulo("");
        setCuerpo("");
        setNivel("info");
      }
    }
    return r;
  }, null);
  const gatillo: ReactNode = anuncio ? (
    <>
      <Pencil strokeWidth={2} aria-hidden /> Editar
    </>
  ) : (
    <>
      <Megaphone strokeWidth={2} aria-hidden /> Nuevo anuncio
    </>
  );
  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger className={buttonVariants(anuncio ? { variant: "outline", size: "sm" } : {})}>{gatillo}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-lg">{anuncio ? "Editar anuncio" : "Nuevo anuncio"}</SheetTitle>
          <SheetDescription>Se muestra como una franja bajo la barra superior de los colegios, entre las fechas que elijas (hora de Lima).</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-col gap-4 px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            startTransition(() => enviar(datos));
          }}
        >
          {anuncio && <input type="hidden" name="id" value={anuncio.id} />}
          <Campo etiqueta="Título" name="titulo" required minLength={3} maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <label htmlFor={`cuerpo-${anuncio?.id ?? "nuevo"}`} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Mensaje</span>
            <Textarea id={`cuerpo-${anuncio?.id ?? "nuevo"}`} name="cuerpo" required minLength={3} maxLength={600} rows={3} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Selector etiqueta="Nivel" name="nivel" value={nivel} onChange={(e) => setNivel(e.target.value as keyof typeof NOMBRE_NIVEL)}>
              {Object.entries(NOMBRE_NIVEL).map(([v, n]) => (
                <option key={v} value={v}>{n}</option>
              ))}
            </Selector>
            <Selector etiqueta="Quién lo ve" name="audiencia" defaultValue={anuncio?.audiencia ?? "direccion"}>
              {Object.entries(NOMBRE_AUDIENCIA).map(([v, n]) => (
                <option key={v} value={v}>{n}</option>
              ))}
            </Selector>
          </div>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1 font-medium text-foreground">Planes</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {Object.entries(nombresPlanes).map(([v, n]) => (
                <label key={v} className="inline-flex min-h-8 items-center gap-2">
                  <input type="checkbox" name="planes" value={v} defaultChecked={anuncio?.planes.includes(v as "basico")} className="size-4 accent-[var(--acento)]" /> {n}
                </label>
              ))}
            </div>
            <span className="text-muted-foreground">Sin marcar ninguno: todos los planes.</span>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Desde" name="desde" type="datetime-local" required defaultValue={anuncio?.desde ?? desdePorDefecto} />
            <Campo etiqueta="Hasta" name="hasta" type="datetime-local" required defaultValue={anuncio?.hasta ?? hastaPorDefecto} />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-foreground">Vista previa</p>
            <div className="overflow-hidden rounded-lg border" data-testid="vista-previa-anuncio">
              <FranjaAnuncio anuncio={{ titulo: titulo || "Título del anuncio", cuerpo: cuerpo || "Aquí irá el mensaje.", nivel }} onCerrar={() => {}} />
            </div>
          </div>
          {estado?.error && <Alerta tipo="error">{estado.error}</Alerta>}
          <SheetFooter className="px-0">
            <Boton type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
              {anuncio ? "Guardar cambios" : "Publicar anuncio"}
            </Boton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
