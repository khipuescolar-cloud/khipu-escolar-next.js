"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatoTamano } from "@/lib/adjuntos";
import { subirDirecto } from "@/lib/subida-directa";
import { confirmarSubidaDocumentoAction, iniciarSubidaDocumentoAction } from "./actions";

export type Subida = { id: number; nombre: string; bytes: number; progreso: number; estado: "subiendo" | "listo" | "error"; error?: string };
type Destino = { carpetaId: string | null; ambito: "unidad" | "biblioteca"; salonId?: string };

async function enviar(archivo: File, destino: Destino, alProgreso: (p: number) => void): Promise<{ ok: boolean; id?: string; error?: string }> {
  const titulo = archivo.name.replace(/\.[^.]+$/, "");
  try {
    const r = await subirDirecto(archivo, {
      iniciar: () => iniciarSubidaDocumentoAction({ titulo, carpetaId: destino.carpetaId, ambito: destino.ambito, nombre: archivo.name, bytes: archivo.size, mimeDeclarado: archivo.type }),
      confirmar: (subidaId) => confirmarSubidaDocumentoAction({ titulo, carpetaId: destino.carpetaId, ambito: destino.ambito, subidaId }),
      onProgreso: alProgreso,
    });
    return { ok: true, id: r.id };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "No se pudo subir el archivo." }; }
}

/** Sube varios archivos de uno en uno con progreso y error por archivo. */
export function useSubidas(alTerminar: (ids: string[]) => void) {
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const contador = useRef(0);
  const subir = useCallback(async (archivos: File[], destino: Destino) => {
    const nuevas: Subida[] = archivos.map((a) => ({ id: ++contador.current, nombre: a.name, bytes: a.size, progreso: 0, estado: "subiendo" }));
    setSubidas((s) => [...s, ...nuevas]);
    const cambiar = (id: number, c: Partial<Subida>) => setSubidas((s) => s.map((x) => (x.id === id ? { ...x, ...c } : x)));
    const ids: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const r = await enviar(archivos[i], destino, (p) => cambiar(nuevas[i].id, { progreso: p }));
      cambiar(nuevas[i].id, r.ok ? { estado: "listo", progreso: 100 } : { estado: "error", error: r.error });
      if (r.id) ids.push(r.id);
    }
    alTerminar(ids);
    if (ids.length === archivos.length) setSubidas((s) => s.filter((x) => !nuevas.some((n) => n.id === x.id)));
  }, [alTerminar]);
  const cerrar = useCallback(() => setSubidas((s) => s.filter((x) => x.estado === "subiendo")), []);
  return { subidas, subir, cerrar };
}

export function PanelSubidas({ subidas, onCerrar }: { subidas: Subida[]; onCerrar: () => void }) {
  if (subidas.length === 0) return null;
  const activas = subidas.filter((s) => s.estado === "subiendo").length;
  return <section aria-label="Subidas" className="fixed inset-x-4 bottom-4 z-40 max-h-[50dvh] overflow-y-auto rounded-xl border border-borde-sutil bg-popover shadow-sombra-1 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96">
    <header className="sticky top-0 flex min-h-12 items-center justify-between gap-2 border-b border-borde-sutil bg-popover pr-1 pl-4">
      <h2 className="text-sm font-semibold" role="status">{activas > 0 ? `Subiendo ${activas} ${activas === 1 ? "archivo" : "archivos"}` : "Subidas terminadas"}</h2>
      <Button variant="ghost" size="icon" aria-label="Cerrar subidas" disabled={activas > 0} onClick={onCerrar}><X strokeWidth={2} aria-hidden /></Button>
    </header>
    <ul className="divide-y divide-borde-sutil">
      {subidas.map((s) => <li key={s.id} className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          {s.estado === "subiendo" ? <Loader2 className="size-4 shrink-0 animate-spin text-sec-trazo motion-reduce:animate-none" strokeWidth={2} aria-hidden /> : s.estado === "listo" ? <CheckCircle2 className="size-4 shrink-0 text-llego" strokeWidth={2} aria-hidden /> : <AlertCircle className="size-4 shrink-0 text-destructive" strokeWidth={2} aria-hidden />}
          <span className="min-w-0 flex-1 truncate font-medium">{s.nombre}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{s.estado === "subiendo" ? `${s.progreso}%` : s.estado === "listo" ? "Subido" : "Error"}</span>
        </div>
        {s.estado === "subiendo" && <div role="progressbar" aria-label={`Progreso de ${s.nombre}`} aria-valuenow={s.progreso} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 overflow-hidden rounded-full bg-sec-suave"><div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${s.progreso}%` }} /></div>}
        {s.estado === "error" && <p className="mt-1 text-destructive">{s.error}</p>}
        {s.estado === "listo" && <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatoTamano(s.bytes)}</p>}
      </li>)}
    </ul>
  </section>;
}
