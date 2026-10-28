"use client";

import { AlertOctagon, Info, Sparkles, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NOMBRE_NIVEL } from "@/lib/anuncios-plataforma";
import { cn } from "@/lib/utils";

type Nivel = keyof typeof NOMBRE_NIVEL;
export type AnuncioFranja = { id: string; titulo: string; cuerpo: string; nivel: Nivel };

const ESTILO = {
  urgente: { Icono: AlertOctagon, clase: "border-falta/30 bg-falta-fondo text-falta" },
  mantenimiento: { Icono: Wrench, clase: "border-tarde/30 bg-tarde-fondo text-tarde" },
  novedad: { Icono: Sparkles, clase: "border-turquesa/40 bg-turquesa/10 text-foreground [&_svg]:text-turquesa" },
  info: { Icono: Info, clase: "border-border bg-muted text-foreground" },
} satisfies Record<Nivel, unknown>;

/** Una franja de anuncio: ícono + palabra del nivel (nunca solo color). Sirve también como vista previa en la plataforma. */
export function FranjaAnuncio({ anuncio, onCerrar }: { anuncio: Omit<AnuncioFranja, "id"> & { id?: string }; onCerrar?: () => void }) {
  const { Icono, clase } = ESTILO[anuncio.nivel];
  return (
    <div role={anuncio.nivel === "urgente" ? "alert" : "status"} data-testid="anuncio-plataforma" className={cn("flex items-start gap-3 border-b px-4 py-2.5 text-cuerpo-sm", clase)}>
      <Icono className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{NOMBRE_NIVEL[anuncio.nivel]} · {anuncio.titulo}.</span> <span>{anuncio.cuerpo}</span>
      </p>
      {onCerrar && (
        <button type="button" onClick={onCerrar} aria-label={`Cerrar anuncio: ${anuncio.titulo}`} className="-m-1.5 grid size-9 shrink-0 place-items-center rounded-md hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}

const CLAVE = "khipu:anuncios-cerrados";

function leerCerrados(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Franja de anuncios de Khipu bajo la barra superior del colegio; cada persona puede cerrarlos (se recuerda por id en este navegador). */
export function AnunciosPlataforma({ anuncios }: { anuncios: AnuncioFranja[] }) {
  const [cerrados, setCerrados] = useState<string[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setCerrados(leerCerrados()), 0);
    return () => clearTimeout(t);
  }, []);
  if (cerrados === null || anuncios.length === 0) return null;
  const visibles = anuncios.filter((a) => !cerrados.includes(a.id));
  if (visibles.length === 0) return null;
  function cerrar(id: string) {
    const nuevos = [...new Set([...leerCerrados(), id])].slice(-100);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevos));
    } catch {
      // Sin almacenamiento: se cierra solo en esta visita.
    }
    setCerrados((c) => [...(c ?? []), id]);
  }
  return (
    <div data-testid="anuncios-plataforma">
      {visibles.map((a) => (
        <FranjaAnuncio key={a.id} anuncio={a} onCerrar={() => cerrar(a.id)} />
      ))}
    </div>
  );
}
