"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ACCEPT_ADJUNTOS, TIPOS_ADJUNTO_TEXTO } from "@/lib/adjuntos";
import { crearCarpetaAction } from "./actions";

/** Botón «Nuevo» (como en Drive): Nueva carpeta y Subir archivo. */
export function NuevoDocumento({ carpetaId, vista, onSubir, className }: { carpetaId: string | null; vista: string; onSubir: (archivos: File[]) => void; className?: string }) {
  const [modal, setModal] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const selector = useRef<HTMLInputElement>(null);
  const ambito = vista === "unidad" || vista === "compartido" ? "unidad" : "biblioteca";
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button className={className ?? "min-h-11"} />}><Plus strokeWidth={2} aria-hidden /> Nuevo</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuItem className="min-h-11" onClick={() => setModal(true)}><FolderPlus strokeWidth={2} aria-hidden /> Nueva carpeta</DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onClick={() => selector.current?.click()}><FileUp strokeWidth={2} aria-hidden /> Subir archivo</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <input ref={selector} type="file" multiple accept={ACCEPT_ADJUNTOS} className="sr-only" tabIndex={-1} aria-label="Elegir archivos para subir" data-testid="subir-archivos" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) onSubir(f); }} />
    <Dialog open={modal} onOpenChange={setModal}>
      <DialogContent>
        <form action={(d) => iniciar(async () => crearCarpetaAction(d))} className="grid gap-4">
          <DialogHeader><DialogTitle>Nueva carpeta</DialogTitle><DialogDescription>Se creará en la ubicación actual. Los archivos admitidos son {TIPOS_ADJUNTO_TEXTO}, hasta 10 MB.</DialogDescription></DialogHeader>
          <input type="hidden" name="parentId" value={carpetaId ?? ""} /><input type="hidden" name="volver" value={carpetaId ?? ""} />
          <input type="hidden" name="vista" value={vista} /><input type="hidden" name="ambito" value={ambito} />
          <label className="block space-y-1.5 text-sm font-medium">Nombre de la carpeta<Input name="nombre" required maxLength={80} autoFocus placeholder="Carpeta sin título" /></label>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit" loading={pendiente}>Crear</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
