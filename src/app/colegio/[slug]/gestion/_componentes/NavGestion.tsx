"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECCIONES = [
  { href: "/gestion/profesores", texto: "Profesores" },
  { href: "/gestion/personal", texto: "Personal" },
  { href: "/gestion/salones", texto: "Grados y salones" },
  { href: "/gestion/alumnos", texto: "Alumnos" },
  { href: "/gestion/apoderados", texto: "Familias" },
  { href: "/gestion/carnets", texto: "Carnets" },
  { href: "/gestion/carga-masiva", texto: "Carga masiva" },
];

/** El personal administrativo solo gestiona alumnos y familias. */
const SECCIONES_ADMINISTRATIVO = SECCIONES.filter((s) => ["/gestion/alumnos", "/gestion/apoderados", "/gestion/carga-masiva"].includes(s.href));

/** Pestañas de las secciones de gestión (la activa, con su nudo y el color de la sección). En el hub (`/gestion`) no se muestran. */
export function NavGestion({ soloAlumnosFamilias = false }: { soloAlumnosFamilias?: boolean }) {
  const ruta = usePathname();
  if (ruta === "/gestion") return null;
  return (
    <nav aria-label="Secciones de gestión" className="-mb-2 overflow-x-auto border-b border-borde-sutil print:hidden">
      <ul className="flex min-w-max gap-1">
        {[{ href: "/gestion", texto: "Gestión" }, ...(soloAlumnosFamilias ? SECCIONES_ADMINISTRATIVO : SECCIONES)].map((s) => {
          const activa = s.href !== "/gestion" && (ruta === s.href || ruta.startsWith(`${s.href}/`));
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  activa ? "border-sec-trazo bg-sec-suave/60 font-semibold text-sec-tinta" : "border-transparent text-muted-foreground",
                )}
              >
                {activa && <span aria-hidden className="size-2 rounded-full bg-sec-nudo" />}
                {s.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
