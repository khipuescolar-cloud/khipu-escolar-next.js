// Piezas visuales compartidas del tutor Nudito (specs/41): burbuja con la voz de Nudito (Nunito), etiqueta de estado de
// dominio (ícono + palabra) y estilos por área. Sin lógica de datos.
import type { ReactNode } from "react";
import { Atom, BookOpen, Calculator, CircleCheck, CircleDashed, Hourglass, type LucideIcon, Repeat, Sparkles, Trophy } from "lucide-react";
import type { AreaNudito, EstadoDominio } from "@/lib/nudito/contratos";
import type { EstadoNudito } from "@/lib/nudito/estado";
import { NuditoMascota } from "./NuditoMascota";

export type NivelVista = "primaria" | "secundaria";

/** Entrada suave de cada paso; sin movimiento si el sistema pide reducirlo. */
export const ENTRADA_PASO = "motion-safe:animate-[nd-entra_320ms_ease-out_both]";

/** Keyframes del tutor (una sola vez en la conversación). */
export const ESTILOS_TUTOR = `
@keyframes nd-entra { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
`;

export const AREA_VISUAL: Record<AreaNudito, { icono: LucideIcon; etiqueta: string; fondo: string; tinta: string; borde: string }> = {
  matematica: { icono: Calculator, etiqueta: "Matemática", fondo: "bg-indigo/10", tinta: "text-indigo dark:text-indigo-cielo", borde: "border-indigo/30" },
  comunicacion: { icono: BookOpen, etiqueta: "Comunicación", fondo: "bg-cochinilla/10", tinta: "text-cochinilla", borde: "border-cochinilla/30" },
  "ciencia-tecnologia": { icono: Atom, etiqueta: "Ciencia y Tecnología", fondo: "bg-turquesa/10", tinta: "text-turquesa", borde: "border-turquesa/30" },
};

const ESTADO_VISUAL: Record<EstadoDominio, { icono: LucideIcon; palabra: string; clase: string }> = {
  no_iniciado: { icono: Sparkles, palabra: "Nuevo", clase: "bg-superficie-2 text-pizarra" },
  en_progreso: { icono: Hourglass, palabra: "Practicando", clase: "bg-indigo/10 text-indigo dark:text-indigo-cielo" },
  en_comprobacion: { icono: CircleDashed, palabra: "Comprobando", clase: "bg-maiz/20 text-tinta" },
  dominado: { icono: Trophy, palabra: "Dominado", clase: "bg-llego-fondo text-llego" },
  reforzar: { icono: Repeat, palabra: "Para repasar", clase: "bg-tarde-fondo text-tarde" },
};

export function EtiquetaEstado({ estado }: { estado: EstadoDominio }) {
  const v = ESTADO_VISUAL[estado];
  const Icono = v.icono;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-etiqueta ${v.clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden />
      {v.palabra}
    </span>
  );
}

export function EtiquetaListo({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-llego-fondo px-2 py-0.5 text-etiqueta text-llego">
      <CircleCheck className="size-3.5" strokeWidth={2} aria-hidden />
      {children}
    </span>
  );
}

/** Lo que dice Nudito: mascota + burbuja en Nunito (la única fuente de Nudito). */
export function VozNudito({ estado = "reposo", children, tamano = 48 }: { estado?: EstadoNudito; children: ReactNode; tamano?: number }) {
  return (
    <div className="flex items-start gap-3">
      <NuditoMascota tamano={tamano} estado={estado} className="shrink-0" />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-cochinilla/20 bg-superficie px-4 py-3 font-nudito text-voz-nudito text-tinta shadow-sm">
        {children}
      </div>
    </div>
  );
}

/** Título de un paso: recibe el foco al aparecer (lectores de pantalla y teclado). */
export function TituloPaso({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} tabIndex={-1} className="font-titulo text-titulo-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {children}
    </h2>
  );
}
