"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatoTamano } from "@/lib/adjuntos";
import { cn } from "@/lib/utils";
import { MenuContextual, BotonOpciones, type Accion } from "./AccionesItem";
import { Icono, fecha, tipoLegible, type Item } from "./tipos-documentos";

type Props = {
  items: Item[];
  modo: "lista" | "cuadricula";
  seleccion: string[];
  onSeleccion: (ids: string[]) => void;
  onAbrir: (i: Item) => void;
  accionesDe: (i: Item) => Accion[];
  onTecla: (e: React.KeyboardEvent, i: Item) => void;
  onMenuMovil: (i: Item) => void;
  nuevos: string[];
};

function Estrella({ item }: { item: Item }) { return item.destacado ? <Star className="size-4 shrink-0 fill-sec-suave text-sec-trazo" strokeWidth={2} aria-label="Destacado" /> : null; }

export function ListaContenido({ items, modo, seleccion, onSeleccion, onAbrir, accionesDe, onTecla, onMenuMovil, nuevos }: Props) {
  const resaltado = (item: Item) => nuevos.includes(item.id) && "bg-sec-suave ring-2 ring-sec-trazo";
  const marcar = (id: string, v: boolean) => onSeleccion(v ? [...seleccion, id] : seleccion.filter((x) => x !== id));
  const todos = items.length > 0 && items.every((i) => seleccion.includes(i.id));
  const algunos = seleccion.length > 0 && !todos;

  if (modo === "lista") return <section aria-label="Archivos y carpetas" className="overflow-hidden rounded-xl border border-borde-sutil bg-card">
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12 pl-4"><Checkbox aria-label="Seleccionar todo" checked={todos} indeterminate={algunos} onCheckedChange={(v) => onSeleccion(v ? items.map((i) => i.id) : [])} /></TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead className="hidden lg:table-cell">Propietario</TableHead>
          <TableHead className="hidden md:table-cell">Última modificación</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Tamaño</TableHead>
          <TableHead className="w-14"><span className="sr-only">Opciones</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const acciones = accionesDe(item);
          const marcado = seleccion.includes(item.id);
          return <MenuContextual key={`${item.tipo}-${item.id}`} acciones={acciones} render={<TableRow data-documento-id={item.id} data-state={marcado ? "selected" : undefined} className={cn("transition-[background-color,box-shadow] duration-700 motion-reduce:transition-none", resaltado(item))} onKeyDown={(e) => onTecla(e, item)} />}>
            <TableCell className="w-12 pl-4"><Checkbox aria-label={`Seleccionar ${item.nombre}`} checked={marcado} onCheckedChange={(v) => marcar(item.id, v === true)} /></TableCell>
            <TableCell className="max-w-0 w-full min-w-48 whitespace-normal">
              <button type="button" data-documento-abrir onClick={() => onAbrir(item)} className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Icono item={item} />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.nombre}</span><span className="block truncate text-xs text-muted-foreground sm:hidden">{item.propietario} · {fecha.format(item.modificado)}{item.tamano !== null && ` · ${formatoTamano(item.tamano)}`}</span></span>
                <Estrella item={item} />
              </button>
            </TableCell>
            <TableCell className="hidden truncate text-muted-foreground lg:table-cell">{item.propietario}</TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">{fecha.format(item.modificado)}</TableCell>
            <TableCell className="hidden text-right text-muted-foreground sm:table-cell">{item.tamano === null ? "—" : formatoTamano(item.tamano)}</TableCell>
            <TableCell className="w-14 pr-2"><BotonOpciones item={item} acciones={acciones} alAbrirMovil={onMenuMovil} /></TableCell>
          </MenuContextual>;
        })}
      </TableBody>
    </Table>
  </section>;

  const carpetas = items.filter((i) => i.tipo === "carpeta");
  const archivos = items.filter((i) => i.tipo === "documento");
  const miniatura = (i: Item) => i.archivo?.mimeType.startsWith("image/") && i.archivo.bytes < 1_500_000;
  return <div className="space-y-6">
    {carpetas.length > 0 && <section aria-label="Carpetas" className="space-y-2"><h2 className="text-sm font-semibold text-muted-foreground">Carpetas</h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{carpetas.map((item) => {
        const acciones = accionesDe(item);
        const marcado = seleccion.includes(item.id);
        return <MenuContextual key={item.id} acciones={acciones} render={<div data-documento-id={item.id} onKeyDown={(e) => onTecla(e, item)} className={cn("flex min-h-14 items-center gap-1 rounded-xl border bg-card pr-1 pl-3 transition-[background-color,box-shadow] duration-700 motion-reduce:transition-none", marcado ? "border-sec-trazo bg-sec-suave" : "border-borde-sutil", resaltado(item))} />}>
          <Checkbox aria-label={`Seleccionar ${item.nombre}`} checked={marcado} onCheckedChange={(v) => marcar(item.id, v === true)} />
          <button type="button" data-documento-abrir onClick={() => onAbrir(item)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icono item={item} /><span className="truncate font-medium">{item.nombre}</span><Estrella item={item} /></button>
          <BotonOpciones item={item} acciones={acciones} alAbrirMovil={onMenuMovil} />
        </MenuContextual>;
      })}</div></section>}
    {archivos.length > 0 && <section aria-label="Archivos" className="space-y-2"><h2 className="text-sm font-semibold text-muted-foreground">Archivos</h2>
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">{archivos.map((item) => {
        const acciones = accionesDe(item);
        const marcado = seleccion.includes(item.id);
        return <MenuContextual key={item.id} acciones={acciones} render={<div data-documento-id={item.id} onKeyDown={(e) => onTecla(e, item)} className={cn("min-w-0 overflow-hidden rounded-xl border bg-card transition-[background-color,box-shadow] duration-700 motion-reduce:transition-none", marcado ? "border-sec-trazo" : "border-borde-sutil", resaltado(item))} />}>
          <button type="button" data-documento-abrir onClick={() => onAbrir(item)} aria-label={`Abrir ${item.nombre}`} className="relative flex h-32 w-full items-center justify-center bg-sec-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            {miniatura(item) ? <Image unoptimized fill alt="" src={`/archivos/${item.archivo!.id}?vista=1`} className="object-cover" sizes="320px" /> : <Icono item={item} className="size-10" />}
          </button>
          <div className="flex items-center gap-1 border-t border-borde-sutil py-1 pr-1 pl-3">
            <Checkbox aria-label={`Seleccionar ${item.nombre}`} checked={marcado} onCheckedChange={(v) => marcar(item.id, v === true)} />
            <div className="min-w-0 flex-1 px-2"><p className="flex items-start gap-1.5 text-sm font-medium"><span className="line-clamp-2 break-words">{item.nombre}</span><Estrella item={item} /></p><p className="truncate text-xs text-muted-foreground">{tipoLegible(item)}</p><p className="truncate text-xs tabular-nums text-muted-foreground">{fecha.format(item.modificado)}</p></div>
            <BotonOpciones item={item} acciones={acciones} alAbrirMovil={onMenuMovil} />
          </div>
        </MenuContextual>;
      })}</div></section>}
  </div>;
}
