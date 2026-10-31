"use client";

import { Loader2, Megaphone, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { CamposAdjuntos } from "@/components/adjuntos/CamposAdjuntos";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CLASE_CAMPO, Selector } from "@/components/ui/Selector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Nivel } from "@/generated/prisma/enums";
import type { AdjuntoVista } from "@/lib/adjuntos";
import { ORDEN_NIVELES, ordenarNiveles, textoGradoComunicado, valorGrado } from "@/lib/audiencia-comunicado";
import { ETIQUETA_NIVEL } from "@/lib/cneb/catalogo";
import { editarComunicadoAction, publicarComunicadoAction } from "./actions";

type Salon = { id: string; nombre: string; nivel: Nivel; grado: number | null };
type Destino = "colegio" | "niveles" | "grado" | "salon";

const OPCIONES_DESTINO: { valor: Destino; texto: string; ayuda: string }[] = [
  { valor: "colegio", texto: "Todo el colegio", ayuda: "Todas las familias." },
  { valor: "niveles", texto: "Por nivel", ayuda: "Inicial, primaria o secundaria (uno o varios)." },
  { valor: "grado", texto: "Un grado", ayuda: "Todas las secciones de ese grado." },
  { valor: "salon", texto: "Un salón", ayuda: "Solo una sección." },
];

/**
 * «Para quién». Dirección y administrativo eligen todo el colegio, niveles, un grado o un salón (radios nativos en un `fieldset`,
 * accesibles con teclado y lector de pantalla); el profesor solo elige entre sus salones.
 */
function CamposDestino({ salones, esDireccion }: { salones: Salon[]; esDireccion: boolean }) {
  const [destino, setDestino] = useState<Destino>("colegio");
  if (!esDireccion) {
    return (
      <>
        <input type="hidden" name="destino" value="salon" />
        <Selector etiqueta="Para quién" name="salonId" required>
          {salones.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Selector>
      </>
    );
  }
  const niveles = ordenarNiveles(salones.map((s) => s.nivel));
  const grados = ORDEN_NIVELES.map((nivel) => ({
    nivel,
    grados: [...new Set(salones.filter((s) => s.nivel === nivel && s.grado !== null).map((s) => s.grado as number))].sort((a, b) => a - b),
  })).filter((g) => g.grados.length > 0);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium text-foreground">Para quién</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPCIONES_DESTINO.map((o) => (
          <label key={o.valor} className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50">
            <input type="radio" name="destino" value={o.valor} checked={destino === o.valor} onChange={() => setDestino(o.valor)} aria-label={o.texto} aria-describedby={`destino-${o.valor}-ayuda`} className="mt-0.5 size-4 accent-primary" />
            <span className="flex flex-col">
              <span className="font-medium">{o.texto}</span>
              <span id={`destino-${o.valor}-ayuda`} className="text-cuerpo-sm text-muted-foreground">{o.ayuda}</span>
            </span>
          </label>
        ))}
      </div>
      {destino === "niveles" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Niveles</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {niveles.map((n) => (
              <label key={n} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="niveles" value={n} className="size-4 accent-primary" /> {ETIQUETA_NIVEL[n]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {destino === "grado" && (
        <Selector etiqueta="Grado" name="grado" required defaultValue="">
          <option value="" disabled>Elige un grado</option>
          {grados.map((g) => (
            <optgroup key={g.nivel} label={ETIQUETA_NIVEL[g.nivel]}>
              {g.grados.map((n) => (
                <option key={n} value={valorGrado(g.nivel, n)}>{textoGradoComunicado(g.nivel, n)}</option>
              ))}
            </optgroup>
          ))}
        </Selector>
      )}
      {destino === "salon" && (
        <Selector etiqueta="Salón" name="salonId" required defaultValue="">
          <option value="" disabled>Elige un salón</option>
          {salones.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Selector>
      )}
    </fieldset>
  );
}

/** Publicar un comunicado nuevo (Dialog). Al terminar la acción la página se recarga con `?ok=` y el diálogo se cierra al remontarse. */
export function DialogoPublicar({ salones, esDireccion }: { salones: Salon[]; esDireccion: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button />}>
        <Megaphone strokeWidth={2} aria-hidden /> Publicar un comunicado
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-titulo-2">Publicar un comunicado</DialogTitle>
          <DialogDescription>Las familias recibirán el aviso en cuanto lo publiques.</DialogDescription>
        </DialogHeader>
        <form
          action={(datos) => iniciar(async () => { await publicarComunicadoAction(datos); })}
          className="flex flex-col gap-4"
        >
          <CamposDestino salones={salones} esDireccion={esDireccion} />
          <Campo etiqueta="Título" name="titulo" maxLength={120} required />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Mensaje</span>
            <textarea name="cuerpo" rows={5} maxLength={5000} required className={CLASE_CAMPO} />
          </label>
          <CamposAdjuntos id="adjuntos-nuevo-comunicado" />
          <DialogFooter>
            <Boton type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />} Publicar y avisar
            </Boton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Editar título y mensaje de un comunicado (primeras 24 h). */
export function DialogoEditar({ id, titulo, cuerpo, adjuntos }: { id: string; titulo: string; cuerpo: string; adjuntos: AdjuntoVista[] }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Pencil strokeWidth={2} aria-hidden /> Editar
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-titulo-2">Editar comunicado</DialogTitle>
          <DialogDescription>Puedes editarlo o borrarlo durante las primeras 24 horas.</DialogDescription>
        </DialogHeader>
        <form
          action={(datos) => iniciar(async () => { await editarComunicadoAction(datos); })}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="id" value={id} />
          <Campo etiqueta="Título" name="titulo" defaultValue={titulo} maxLength={120} required />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Mensaje</span>
            <textarea name="cuerpo" rows={5} maxLength={5000} defaultValue={cuerpo} required className={CLASE_CAMPO} />
          </label>
          <CamposAdjuntos id={`adjuntos-${id}`} existentes={adjuntos} />
          <DialogFooter>
            <Boton type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />} Guardar cambios
            </Boton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
