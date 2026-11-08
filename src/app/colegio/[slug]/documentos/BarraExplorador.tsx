"use client";

import { useEffect, useState } from "react";
import { Grid2X2, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDENES_DOCUMENTO } from "@/lib/documentos";

export type ModoExplorador = "lista" | "cuadricula";

const CLAVE_MODO = "documentos-modo";

/** Vista lista/cuadrícula compartida por todas las secciones de Documentos (se recuerda en el navegador). */
export function useModoExplorador() {
  const [modo, setModo] = useState<ModoExplorador>("lista");
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_MODO) ?? localStorage.getItem("materiales-modo");
      if (guardado === "cuadricula") queueMicrotask(() => setModo("cuadricula"));
    } catch { /* sin almacenamiento */ }
  }, []);
  const cambiarModo = (valor: ModoExplorador) => {
    setModo(valor);
    try { localStorage.setItem(CLAVE_MODO, valor); localStorage.removeItem("materiales-modo"); } catch { /* sin almacenamiento */ }
  };
  return [modo, cambiarModo] as const;
}

export function BarraExplorador({ q, orden, modo, campos, conservarOrden = false, onOrden, onModo }: {
  q: string;
  orden: string;
  modo: ModoExplorador;
  campos: Record<string, string | null | undefined>;
  conservarOrden?: boolean;
  onOrden: (orden: string) => void;
  onModo: (modo: ModoExplorador) => void;
}) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">
    <form method="get" action="/documentos" role="search" className="relative min-w-0 flex-1 basis-full sm:basis-56">
      {Object.entries(campos).map(([nombre, valor]) => valor ? <input key={nombre} type="hidden" name={nombre} value={valor} /> : null)}
      {conservarOrden && orden !== "recientes" && <input type="hidden" name="orden" value={orden} />}
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} aria-hidden />
      <Input type="search" name="q" defaultValue={q} key={q} aria-label="Buscar por nombre" placeholder="Buscar por nombre" className="pl-9" />
    </form>
    <Select value={orden} onValueChange={valor => { if (valor) onOrden(valor); }} items={Object.fromEntries(Object.entries(ORDENES_DOCUMENTO)) as Record<string, string>}>
      <SelectTrigger aria-label="Ordenar por" className="min-w-0 flex-1 sm:w-44 sm:flex-none"><SelectValue /></SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">{Object.entries(ORDENES_DOCUMENTO).map(([valor, nombre]) => <SelectItem key={valor} value={valor}>{nombre}</SelectItem>)}</SelectContent>
    </Select>
    <div role="group" aria-label="Tipo de vista" className="flex rounded-lg border border-input bg-superficie-elevada p-0.5">
      <Button variant={modo === "lista" ? "secondary" : "ghost"} size="icon-sm" className="min-h-11 min-w-11" aria-label="Vista de lista" aria-pressed={modo === "lista"} onClick={() => onModo("lista")}><List aria-hidden /></Button>
      <Button variant={modo === "cuadricula" ? "secondary" : "ghost"} size="icon-sm" className="min-h-11 min-w-11" aria-label="Vista de cuadrícula" aria-pressed={modo === "cuadricula"} onClick={() => onModo("cuadricula")}><Grid2X2 aria-hidden /></Button>
    </div>
  </div>;
}
