"use client";

import { Eye, Loader2, MoreHorizontal, Pencil, RotateCcw, Send, UserRoundX, UserPlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Fragment, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Resultado } from "@/lib/resultado";
import { PanelFormulario } from "./PanelFormulario";

const ICONOS = { ver: Eye, editar: Pencil, reactivar: RotateCcw, retirar: UserRoundX, enviar: Send, vincular: UserPlus, borrar: Trash2 } as const;
type Icono = keyof typeof ICONOS;

export type ItemFila =
  | { tipo: "enlace"; texto: string; href: string; icono?: Icono }
  | { tipo: "panel"; texto: string; icono?: Icono; titulo: string; descripcion?: ReactNode; contenido: ReactNode; panel?: "dialog" | "sheet" }
  | {
      tipo: "confirmar"; texto: string; icono?: Icono; titulo: string; descripcion: ReactNode; confirmar: string; peligro?: boolean;
      accion: (datos: FormData) => Promise<Resultado | void>; campos?: Record<string, string>;
    };

function Confirmacion({ item, abierto, onCambio }: { item: Extract<ItemFila, { tipo: "confirmar" }>; abierto: boolean; onCambio: (v: boolean) => void }) {
  const [pendiente, iniciar] = useTransition();
  const ejecutar = () =>
    iniciar(async () => {
      const datos = new FormData();
      for (const [k, v] of Object.entries(item.campos ?? {})) datos.set(k, v);
      const r = await item.accion(datos);
      if (r && !r.ok) toast.error(r.error);
      else if (r?.mensaje) toast.success(r.mensaje);
      onCambio(false);
    });
  return (
    <AlertDialog open={abierto} onOpenChange={onCambio}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{item.titulo}</AlertDialogTitle>
          <AlertDialogDescription>{item.descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <button type="button" onClick={ejecutar} disabled={pendiente} className={buttonVariants({ variant: item.peligro ? "destructive" : "default" })}>
            {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
            {item.confirmar}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Menú de acciones por fila (botón `MoreHorizontal`): enlaces, formularios en panel y acciones con confirmación. */
export function AccionesFila({ etiqueta, items }: { etiqueta: string; items: ItemFila[] }) {
  const [abierto, setAbierto] = useState<number | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={etiqueta} className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <MoreHorizontal strokeWidth={2} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-52">
          {items.map((it, i) => {
            const Icono = it.icono ? ICONOS[it.icono] : null;
            const contenido = (
              <>
                {Icono && <Icono className="size-4" strokeWidth={2} aria-hidden />} {it.texto}
              </>
            );
            const peligro = it.tipo === "confirmar" && it.peligro;
            return (
              <Fragment key={i}>
                {peligro && i > 0 && <DropdownMenuSeparator />}
                {it.tipo === "enlace" ? (
                  <DropdownMenuItem className="min-h-10" render={<Link href={it.href} />}>{contenido}</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="min-h-10" variant={peligro ? "destructive" : "default"} onClick={() => setAbierto(i)}>{contenido}</DropdownMenuItem>
                )}
              </Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {items.map((it, i) =>
        it.tipo === "panel" ? (
          <PanelFormulario key={i} tipo={it.panel ?? "dialog"} titulo={it.titulo} descripcion={it.descripcion} abierto={abierto === i} onCambio={(v) => setAbierto(v ? i : null)}>
            {it.contenido}
          </PanelFormulario>
        ) : it.tipo === "confirmar" ? (
          <Confirmacion key={i} item={it} abierto={abierto === i} onCambio={(v) => setAbierto(v ? i : null)} />
        ) : null,
      )}
    </>
  );
}
