"use client";

import { Check, GraduationCap, HeartHandshake, School } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { TONOS } from "./tonos";

const ROLES = [
  {
    valor: "direccion",
    tono: "indigo",
    Icono: School,
    nombre: "Dirección",
    foto: "/landing/fotos/foto-directora.jpg",
    fotoClase: "object-[62%_30%]",
    para: "Directores y promotores",
    titulo: "Todo el colegio en una pantalla",
    puntos: [
      "Ve si los avisos de asistencia llegaron a cada familia y cuántos se abrieron.",
      "Administra profesores, personal, grados y salones, alumnos y familias, y carga listas por CSV.",
      "Imprime los carnets con QR por salón y publica comunicados para todo el colegio o un salón.",
      "Cierra las notas de cada curso, publica la libreta y exporta los datos del colegio cuando lo necesite.",
    ],
  },
  {
    valor: "profesores",
    tono: "turquesa",
    Icono: GraduationCap,
    nombre: "Profesores",
    foto: "/landing/fotos/foto-profesora.jpg",
    fotoClase: "object-[82%_30%]",
    para: "Tutores y profesores de curso",
    titulo: "Menos tiempo avisando, más tiempo enseñando",
    puntos: [
      "Pasa lista en menos de un minuto, también desde el celular y sin conexión.",
      "Las familias reciben el aviso solas: ya no hay que escribir uno por uno.",
      "Conversa con las familias de sus salones sin dar su número de teléfono.",
      "Registra notas por competencias, publica tareas y revisa justificaciones en el mismo lugar.",
    ],
  },
  {
    valor: "familias",
    tono: "cochinilla",
    Icono: HeartHandshake,
    nombre: "Familias",
    foto: "/landing/fotos/foto-papa-app.jpg",
    fotoClase: "object-[50%_35%]",
    para: "Mamás, papás y apoderados",
    titulo: "Sabes cómo está tu hijo, el mismo día",
    puntos: [
      "Recibes un aviso cuando tu hijo llega, llega tarde o no llega al colegio.",
      "Justificas una falta en un minuto, desde el correo o desde Khipu.",
      "Escribes a la tutora sin compartir tu teléfono, y ves notas, tareas y comunicados.",
      "Con Nudito preguntas qué tareas hay o qué fechas vienen, con los datos reales del colegio.",
    ],
  },
] as const;

/**
 * «Para cada rol» (specs/25): tres pestañas grandes (quién es cada una) y un panel por rol con su tono.
 * Los tres paneles ocupan la misma celda de la rejilla: el bloque mide siempre lo del más alto y no salta al cambiar.
 */
export function PestanasRoles() {
  const [activo, setActivo] = useState(0);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  const teclado = (e: KeyboardEvent) => {
    const paso = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const destino = e.key === "Home" ? 0 : e.key === "End" ? ROLES.length - 1 : paso ? (activo + paso + ROLES.length) % ROLES.length : null;
    if (destino === null) return;
    e.preventDefault();
    setActivo(destino);
    botones.current[destino]?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Roles del colegio" className="grid gap-3 sm:grid-cols-3" onKeyDown={teclado}>
        {ROLES.map((r, i) => {
          const tono = TONOS[r.tono];
          const es = i === activo;
          return (
            <button
              key={r.valor}
              ref={(el) => {
                botones.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`rol-${r.valor}`}
              aria-selected={es}
              aria-controls={`panel-${r.valor}`}
              tabIndex={es ? 0 : -1}
              onClick={() => setActivo(i)}
              className={cn(
                "group flex min-h-16 items-center gap-3 rounded-lg border-2 p-3 text-left transition-[background-color,border-color,color,scale] duration-200 ease-out active:scale-[0.98]",
                es ? cn(tono.solido, "border-transparent") : cn("border-arena bg-superficie hover:border-current", tono.rotulo),
              )}
            >
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md transition-colors", es ? "bg-white/15" : tono.solido)}>
                <r.Icono className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className={cn("font-heading text-cuerpo font-semibold", !es && "text-foreground")}>{r.nombre}</span>
                <span className={cn("text-cuerpo-sm", es ? "opacity-85" : "text-muted-foreground")}>{r.para}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid">
        {ROLES.map((r, i) => {
          const tono = TONOS[r.tono];
          const es = i === activo;
          return (
            <div
              key={r.valor}
              role="tabpanel"
              id={`panel-${r.valor}`}
              aria-labelledby={`rol-${r.valor}`}
              inert={!es}
              className={cn(
                "grid overflow-hidden rounded-lg border border-arena bg-superficie transition-[opacity,translate] duration-300 ease-out [grid-area:1/1] md:grid-cols-[260px_1fr]",
                es ? "translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-2 opacity-0",
              )}
            >
              <div className={cn("relative isolate flex flex-col justify-between gap-6 overflow-hidden p-6 sm:p-8", tono.solido)}>
                {/* Foto en duotono (rediseño Jafet 2026-10-30): gris mezclado con el color del rol y degradado oscuro para el texto. */}
                <Image src={r.foto} alt="" fill sizes="(min-width: 768px) 260px, 100vw" className={cn("-z-10 object-cover opacity-30 mix-blend-luminosity", r.fotoClase)} />
                <span className="absolute inset-0 -z-10 bg-linear-to-t from-black/55 via-black/25 to-transparent" aria-hidden />
                <r.Icono className="size-10" strokeWidth={2} aria-hidden />
                <div className="flex flex-col gap-2">
                  <p className="text-cuerpo-sm opacity-85">{r.para}</p>
                  <h3 className="font-heading text-titulo-2 text-balance">{r.titulo}</h3>
                </div>
              </div>
              <ul className="grid content-center gap-5 p-6 sm:p-8 md:grid-cols-2">
                {r.puntos.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-cuerpo text-pretty">
                    <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", tono.solido)}>
                      <Check className="size-4" strokeWidth={2.5} aria-hidden />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
