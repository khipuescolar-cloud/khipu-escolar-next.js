"use client";

import { usePathname } from "next/navigation";
import { PestanasLinea } from "@/components/shell/PestanasPagina";

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
  const items = [{ href: "/gestion", texto: "Gestión" }, ...(soloAlumnosFamilias ? SECCIONES_ADMINISTRATIVO : SECCIONES)].map((s) => ({
    ...s,
    activo: s.href !== "/gestion" && (ruta === s.href || ruta.startsWith(`${s.href}/`)),
  }));
  return <PestanasLinea etiqueta="Secciones de gestión" items={items} desplazable />;
}
