"use client";

import { useState, useTransition } from "react";
import { FileUp, FolderPlus, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { ACCEPT_ADJUNTOS, TIPOS_ADJUNTO_TEXTO } from "@/lib/adjuntos";
import { crearCarpetaAction, subirDocumentoAction } from "./actions";

type Salon = { id: string; nombre: string };
export function NuevoDocumento({ carpetaId, vista, salones, esProfesor }: { carpetaId: string | null; vista: string; salones: Salon[]; esProfesor: boolean }) {
  const [modal, setModal] = useState<"carpeta" | "archivo" | null>(null);
  const [pendiente, iniciar] = useTransition();
  const ambito = vista === "unidad" || vista === "compartido" ? "unidad" : "biblioteca";
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button className="min-h-11" />}><Plus strokeWidth={2} aria-hidden /> Nuevo</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem className="min-h-11" onClick={() => setModal("carpeta")}><FolderPlus strokeWidth={2} aria-hidden /> Nueva carpeta</DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onClick={() => setModal("archivo")}><FileUp strokeWidth={2} aria-hidden /> Subir archivo</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={modal === "carpeta"} onOpenChange={(v) => !v && setModal(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva carpeta</DialogTitle><DialogDescription>Se creará en la ubicación actual.</DialogDescription></DialogHeader>
        <form action={(d) => iniciar(async () => crearCarpetaAction(d))} className="space-y-4">
          <input type="hidden" name="parentId" value={carpetaId ?? ""} /><input type="hidden" name="volver" value={carpetaId ?? ""} />
          <input type="hidden" name="vista" value={vista} /><input type="hidden" name="ambito" value={ambito} />
          <label className="block space-y-1.5 text-sm font-medium">Nombre de la carpeta<input name="nombre" className={CLASE_CAMPO} required maxLength={80} autoFocus /></label>
          <div className="flex justify-end"><Button type="submit" disabled={pendiente}>{pendiente && <Loader2 className="animate-spin" aria-hidden />} Crear</Button></div>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={modal === "archivo"} onOpenChange={(v) => !v && setModal(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Subir archivo</DialogTitle><DialogDescription>{TIPOS_ADJUNTO_TEXTO}, hasta 10 MB.</DialogDescription></DialogHeader>
        <form action={(d) => iniciar(async () => subirDocumentoAction(d))} className="space-y-4">
          <input type="hidden" name="carpetaId" value={carpetaId ?? ""} /><input type="hidden" name="volver" value={carpetaId ?? ""} />
          <input type="hidden" name="vista" value={vista} /><input type="hidden" name="ambito" value={ambito} />
          <label className="block space-y-1.5 text-sm font-medium">Título<input name="titulo" className={CLASE_CAMPO} required maxLength={150} /></label>
          <label className="block space-y-1.5 text-sm font-medium">Archivo<input type="file" name="archivo" accept={ACCEPT_ADJUNTOS} required className="block min-h-11 w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-borde-sutil file:bg-card file:px-3" /></label>
          {esProfesor && ambito === "biblioteca" && <label className="block space-y-1.5 text-sm font-medium">Salón<select name="salonId" className={CLASE_CAMPO} required><option value="">Elige tu salón</option>{salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>}
          <fieldset className="space-y-2"><legend className="text-sm font-medium">Acceso general</legend><div className="grid gap-2 sm:grid-cols-2">{([ ["apoderado", "Familias"], ["alumno", "Alumnos"], ["profesor", "Profesores"], ["administrativo", "Personal administrativo"] ] as const).filter(([r]) => !esProfesor || r !== "administrativo").map(([r, label]) => <label key={r} className="flex min-h-11 items-center gap-2 rounded-md border border-borde-sutil px-3 text-sm"><input type="checkbox" name="visibleRoles" value={r} className="size-5 accent-primary" />{label}</label>)}</div></fieldset>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="avisar" className="size-5 accent-primary" /> Avisar a las familias</label>
          <div className="flex justify-end"><Button type="submit" disabled={pendiente}>{pendiente && <Loader2 className="animate-spin" aria-hidden />} Subir archivo</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
