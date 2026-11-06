"use client";

import { Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { EstadoJustificacion } from "@/generated/prisma/enums";
import { EstadoPildora } from "./EstadoPildora";
import { RevisionJustificacion } from "./RevisionJustificacion";

/** Datos ya formateados en el servidor (fechas en zona del colegio). */
export type DetalleVista = {
  alumno: string;
  salon: string;
  falta: string;
  motivo: string;
  estado: EstadoJustificacion;
  enviada: string;
  apoderado: string;
  adjuntoUrl: string | null;
  adjuntoTipo: string | null;
  revisadoPor: string | null;
  revisadaEl: string | null;
  comentarioRevision: string | null;
};

/**
 * Panel lateral (abajo en móvil) con el detalle completo de una justificación. Si está pendiente, trae el comentario
 * opcional y Aceptar/Rechazar; al decidir se cierra y la tabla se actualiza.
 */
export function DetalleJustificacion({ j, revisar }: { j: DetalleVista; revisar?: (datos: FormData) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  // Foco inicial en el motivo (no en el comentario): en móvil no abre el teclado de golpe.
  const motivo = useRef<HTMLElement>(null);
  const pendiente = j.estado === "pendiente" && !!revisar;

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger
        render={<Button variant={pendiente ? "outline" : "ghost"} size="sm" className={pendiente ? undefined : "-ml-2 text-muted-foreground"} />}
        aria-label={`${pendiente ? "Revisar" : "Ver"} la justificación de ${j.alumno}`}
      >
        {pendiente ? "Revisar" : "Ver"}
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg" initialFocus={motivo}>
        <SheetHeader>
          <SheetTitle>{j.alumno}</SheetTitle>
          <SheetDescription>
            {j.salon} · falta del {j.falta}
          </SheetDescription>
          <div className="pt-2"><EstadoPildora estado={j.estado} /></div>
        </SheetHeader>

        <SheetBody className="pb-4">
          <Bloque titulo="Motivo" refBloque={motivo}>
            <p className="text-cuerpo whitespace-pre-line text-pretty">{j.motivo}</p>
            {j.adjuntoUrl && (
              <a href={j.adjuntoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-10 w-fit items-center gap-1.5 text-cuerpo-sm enlace">
                <Paperclip className="size-4" strokeWidth={2} aria-hidden /> Ver adjunto ({j.adjuntoTipo})
              </a>
            )}
          </Bloque>

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-borde-sutil py-3 text-cuerpo-sm">
            <dt className="text-muted-foreground">Enviada por</dt>
            <dd>{j.apoderado}</dd>
            <dt className="text-muted-foreground">Enviada el</dt>
            <dd className="tabular-nums">{j.enviada}</dd>
            {j.revisadoPor && (
              <>
                <dt className="text-muted-foreground">Revisada por</dt>
                <dd>{j.revisadoPor}</dd>
              </>
            )}
            {j.revisadaEl && (
              <>
                <dt className="text-muted-foreground">Revisada el</dt>
                <dd className="tabular-nums">{j.revisadaEl}</dd>
              </>
            )}
          </dl>

          {j.comentarioRevision && (
            <Bloque titulo="Comentario para la familia">
              <p className="text-cuerpo-sm whitespace-pre-line">{j.comentarioRevision}</p>
            </Bloque>
          )}
        </SheetBody>

        {pendiente && (
          <SheetFooter className="block">
            <RevisionJustificacion revisar={revisar} alumno={j.alumno} alTerminar={() => setAbierto(false)} />
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Bloque({ titulo, children, refBloque }: { titulo: string; children: React.ReactNode; refBloque?: React.Ref<HTMLElement> }) {
  return (
    <section ref={refBloque} tabIndex={refBloque ? -1 : undefined} className="flex flex-col gap-1.5 outline-none">
      <h3 className="text-etiqueta font-semibold text-muted-foreground">{titulo}</h3>
      {children}
    </section>
  );
}
