"use client";

import { FilePlus2, FolderPlus, Loader2, Pencil } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CLASE_CAMPO, Selector } from "@/components/ui/Selector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ACCEPT_ADJUNTOS, MAX_BYTES_ADJUNTO, TIPOS_ADJUNTO_TEXTO } from "@/lib/adjuntos";
import { ETIQUETA_DESTINO, ROLES_DESTINO, ROLES_DESTINO_PROFESOR } from "@/lib/documentos";
import {
  crearCarpetaAction, editarCarpetaAction, editarDocumentoAction, subirDocumentoAction,
} from "./actions";


export type OpcionCarpeta = { id: string; ruta: string; parentId: string | null };
type Salon = { id: string; nombre: string };

/** Ids de una carpeta y todas sus descendientes (no se puede mover dentro de ellas). */
function conDescendientes(opciones: OpcionCarpeta[], id: string): Set<string> {
  const salida = new Set([id]);
  let crecio = true;
  while (crecio) {
    crecio = false;
    for (const o of opciones) if (o.parentId && salida.has(o.parentId) && !salida.has(o.id)) { salida.add(o.id); crecio = true; }
  }
  return salida;
}

/** Casillas de destinatarios. Sin ninguna marcada = solo dirección (documentos) o sin restricción (carpetas). */
function CamposDestino({ roles, marcados = [], ayuda }: { roles: string[]; marcados?: string[]; ayuda: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">¿Quién lo ve?</legend>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {roles.map((r) => (
          <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-borde-sutil bg-card px-3 py-2 text-sm transition-colors has-[:checked]:border-sec-trazo has-[:checked]:bg-sec-suave">
            <input type="checkbox" name="visibleRoles" value={r} defaultChecked={marcados.includes(r)} className="size-5 accent-primary" />
            {ETIQUETA_DESTINO[r]}
          </label>
        ))}
      </div>
      <p className="text-cuerpo-sm text-muted-foreground">{ayuda}</p>
    </fieldset>
  );
}

function Pie({ pendiente, etiqueta }: { pendiente: boolean; etiqueta: string }) {
  return (
    <DialogFooter>
      <Boton type="submit" disabled={pendiente}>
        {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />} {etiqueta}
      </Boton>
    </DialogFooter>
  );
}

function Selectores({ opciones, carpetaId, salones, salonId, esProfesor, excluir }: {
  opciones: OpcionCarpeta[]; carpetaId: string | null; salones: Salon[]; salonId: string | null; esProfesor: boolean; excluir?: Set<string>;
}) {
  return (
    <>
      <Selector etiqueta="Carpeta" name="carpetaId" defaultValue={carpetaId ?? ""}>
        <option value="">Inicio de la biblioteca</option>
        {opciones.filter((o) => !excluir?.has(o.id)).map((o) => <option key={o.id} value={o.id}>{o.ruta}</option>)}
      </Selector>
      <Selector etiqueta={esProfesor ? "Salón" : "Salón (opcional)"} name="salonId" defaultValue={salonId ?? ""} required={esProfesor}>
        {!esProfesor && <option value="">Todo el colegio</option>}
        {esProfesor && <option value="" disabled>Elige tu salón</option>}
        {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </Selector>
    </>
  );
}

function Dialogo({ disparador, titulo, descripcion, children }: { disparador: ReactNode; titulo: string; descripcion: string; children: (cerrar: () => void) => ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button variant="outline" />}>{disparador}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-titulo-2">{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {children(() => setAbierto(false))}
      </DialogContent>
    </Dialog>
  );
}

export function DialogoNuevaCarpeta({ parentId, volver }: { parentId: string | null; volver: string | null }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialogo disparador={<><FolderPlus strokeWidth={2} aria-hidden /> Nueva carpeta</>} titulo="Nueva carpeta" descripcion={parentId ? "Se crea dentro de la carpeta actual." : "Se crea al inicio de la biblioteca."}>
      {() => (
        <form action={(d) => iniciar(async () => { await crearCarpetaAction(d); })} className="flex flex-col gap-4">
          <input type="hidden" name="parentId" value={parentId ?? ""} />
          <input type="hidden" name="volver" value={volver ?? ""} />
          <Campo etiqueta="Nombre de la carpeta" name="nombre" maxLength={80} required />
          <CamposDestino roles={ROLES_DESTINO} ayuda="Si no marcas ninguno, todos los que usan documentos ven la carpeta. Los documentos de dentro siguen sus propios permisos." />
          <Pie pendiente={pendiente} etiqueta="Crear carpeta" />
        </form>
      )}
    </Dialogo>
  );
}

export function DialogoEditarCarpeta({ carpeta, opciones, volver }: {
  carpeta: { id: string; nombre: string; visibleRoles: string[]; parentId: string | null }; opciones: OpcionCarpeta[]; volver: string | null;
}) {
  const [pendiente, iniciar] = useTransition();
  const excluir = conDescendientes(opciones, carpeta.id);
  return (
    <Dialogo disparador={<><Pencil strokeWidth={2} aria-hidden /> Editar<span className="sr-only"> carpeta {carpeta.nombre}</span></>} titulo="Editar carpeta" descripcion="Cambia el nombre, quién la ve o dónde está.">
      {() => (
        <form action={(d) => iniciar(async () => { await editarCarpetaAction(d); })} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={carpeta.id} />
          <input type="hidden" name="volver" value={volver ?? ""} />
          <Campo etiqueta="Nombre de la carpeta" name="nombre" defaultValue={carpeta.nombre} maxLength={80} required />
          <Selector etiqueta="Dentro de" name="parentId" defaultValue={carpeta.parentId ?? ""}>
            <option value="">Inicio de la biblioteca</option>
            {opciones.filter((o) => !excluir.has(o.id)).map((o) => <option key={o.id} value={o.id}>{o.ruta}</option>)}
          </Selector>
          <CamposDestino roles={ROLES_DESTINO} marcados={carpeta.visibleRoles} ayuda="Si no marcas ninguno, todos los que usan documentos ven la carpeta." />
          <Pie pendiente={pendiente} etiqueta="Guardar cambios" />
        </form>
      )}
    </Dialogo>
  );
}

function CampoArchivo({ requerido, id }: { requerido: boolean; id: string }) {
  const [problema, setProblema] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id} className="font-medium">{requerido ? "Archivo" : "Reemplazar el archivo (opcional)"}</label>
      <input
        id={id} type="file" name="archivo" accept={ACCEPT_ADJUNTOS} required={requerido}
        onChange={(e) => {
          const f = e.target.files?.[0];
          setProblema(f && f.size > MAX_BYTES_ADJUNTO ? `«${f.name}» pesa más de 10 MB.` : null);
        }}
        className="min-h-10 text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-semibold"
      />
      <p className="text-cuerpo-sm text-muted-foreground">{TIPOS_ADJUNTO_TEXTO}, hasta 10 MB.{!requerido && " El archivo anterior se reemplaza."}</p>
      {problema && <p role="alert" className="text-cuerpo-sm text-destructive">{problema}</p>}
    </div>
  );
}

export function DialogoSubir({ carpetaId, volver, opciones, salones, esProfesor, hayFamilias }: {
  carpetaId: string | null; volver: string | null; opciones: OpcionCarpeta[]; salones: Salon[]; esProfesor: boolean; hayFamilias: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button />}><FilePlus2 strokeWidth={2} aria-hidden /> Subir documento</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-titulo-2">Subir un documento</DialogTitle>
          <DialogDescription>{esProfesor ? "Lo verán las familias, alumnos y profesores de tu salón." : "Elige quién puede verlo. Sin ninguna casilla, solo lo ve dirección."}</DialogDescription>
        </DialogHeader>
        <form action={(d) => iniciar(async () => { await subirDocumentoAction(d); })} className="flex flex-col gap-4">
          <input type="hidden" name="volver" value={volver ?? ""} />
          <Campo etiqueta="Título" name="titulo" maxLength={150} required />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Descripción (opcional)</span>
            <textarea name="descripcion" rows={2} maxLength={600} className={CLASE_CAMPO} />
          </label>
          <CampoArchivo requerido id="archivo-nuevo" />
          <Selectores opciones={opciones} carpetaId={carpetaId} salones={salones} salonId={null} esProfesor={esProfesor} />
          <CamposDestino roles={esProfesor ? ROLES_DESTINO_PROFESOR : ROLES_DESTINO} marcados={esProfesor ? ["apoderado", "alumno"] : []} ayuda="Además de las casillas, cada carpeta puede limitar quién entra." />
          {hayFamilias && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-borde-sutil bg-card px-3 py-2 text-sm">
              <input type="checkbox" name="avisar" className="size-5 accent-primary" />
              <span>Avisar a las familias <span className="text-cuerpo-sm text-muted-foreground">(correo y notificación, solo si marcaste «Familias»)</span></span>
            </label>
          )}
          <Pie pendiente={pendiente} etiqueta="Publicar documento" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogoEditarDocumento({ doc, opciones, salones, esProfesor, volver }: {
  doc: { id: string; titulo: string; descripcion: string | null; carpetaId: string | null; salonId: string | null; visibleRoles: string[] };
  opciones: OpcionCarpeta[]; salones: Salon[]; esProfesor: boolean; volver: string | null;
}) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialogo disparador={<><Pencil strokeWidth={2} aria-hidden /> Editar<span className="sr-only"> {doc.titulo}</span></>} titulo="Editar documento" descripcion="Cambia los datos, quién lo ve o reemplaza el archivo.">
      {() => (
        <form action={(d) => iniciar(async () => { await editarDocumentoAction(d); })} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="volver" value={volver ?? ""} />
          <Campo etiqueta="Título" name="titulo" defaultValue={doc.titulo} maxLength={150} required />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Descripción (opcional)</span>
            <textarea name="descripcion" rows={2} maxLength={600} defaultValue={doc.descripcion ?? ""} className={CLASE_CAMPO} />
          </label>
          <CampoArchivo requerido={false} id={`archivo-${doc.id}`} />
          <Selectores opciones={opciones} carpetaId={doc.carpetaId} salones={salones} salonId={doc.salonId} esProfesor={esProfesor} />
          <CamposDestino roles={esProfesor ? ROLES_DESTINO_PROFESOR : ROLES_DESTINO} marcados={doc.visibleRoles} ayuda="Editar no vuelve a avisar a las familias." />
          <Pie pendiente={pendiente} etiqueta="Guardar cambios" />
        </form>
      )}
    </Dialogo>
  );
}
