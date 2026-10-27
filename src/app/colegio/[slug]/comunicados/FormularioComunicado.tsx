"use client";

import { Loader2, Megaphone, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { CamposAdjuntos } from "@/components/adjuntos/CamposAdjuntos";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CLASE_CAMPO, Selector } from "@/components/ui/Selector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { AdjuntoVista } from "@/lib/adjuntos";
import { editarComunicadoAction, publicarComunicadoAction } from "./actions";

type Salon = { id: string; nombre: string };

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
          <DialogTitle className="text-lg">Publicar un comunicado</DialogTitle>
          <DialogDescription>Las familias recibirán el aviso en cuanto lo publiques.</DialogDescription>
        </DialogHeader>
        <form
          action={(datos) => iniciar(async () => { await publicarComunicadoAction(datos); })}
          className="flex flex-col gap-4"
        >
          <Selector etiqueta="Para quién" name="salonId" defaultValue={esDireccion ? "" : undefined} required={!esDireccion}>
            {esDireccion && <option value="">Todo el colegio</option>}
            {salones.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </Selector>
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
          <DialogTitle className="text-lg">Editar comunicado</DialogTitle>
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
