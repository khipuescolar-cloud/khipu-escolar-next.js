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
];

/** Pestañas de las secciones de gestión. En el hub (`/gestion`) no se muestran: ahí están las tarjetas. */
export function NavGestion() {
  const ruta = usePathname();
  if (ruta === "/gestion") return null;
  return (
    <nav aria-label="Secciones de gestión" className="-mb-2 overflow-x-auto border-b print:hidden">
      <ul className="flex min-w-max gap-1">
        {[{ href: "/gestion", texto: "Gestión" }, ...SECCIONES].map((s) => {
          const activa = s.href !== "/gestion" && (ruta === s.href || ruta.startsWith(`${s.href}/`));
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  activa ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground",
                )}
              >
                {s.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
