import Link from "next/link";
import { BookOpen, BriefcaseBusiness, Clock3, FileArchive, GraduationCap, Star, Trash2, Users } from "lucide-react";
import type { Rol } from "@/generated/prisma/enums";
import { puedeEntrarSeccion, type SeccionDocumentos } from "@/lib/documentos";
import { cn } from "@/lib/utils";

const secciones = [
  { id: "materiales", nombre: "Materiales de clase", icono: GraduationCap },
  { id: "gestion", nombre: "Gestión académica", icono: BriefcaseBusiness },
  { id: "biblioteca", nombre: "Biblioteca del colegio", icono: BookOpen },
  { id: "borradores", nombre: "Mis borradores", icono: FileArchive },
  { id: "compartido", nombre: "Compartido conmigo", icono: Users },
  { id: "recientes", nombre: "Recientes", icono: Clock3 },
  { id: "destacados", nombre: "Destacados", icono: Star },
  { id: "papelera", nombre: "Papelera", icono: Trash2 },
] as const;

export function NavegacionDocumentos({ rol, activa }: { rol: Rol; activa: SeccionDocumentos }) {
  return <nav aria-label="Secciones de documentos" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
    {secciones.filter((s) => puedeEntrarSeccion(rol, s.id)).map(({ id, nombre, icono: Icon }) => <Link key={id} href={`/documentos?seccion=${id}`} aria-current={activa === id ? "page" : undefined} className={cn("flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:rounded-lg md:px-3", activa === id ? "bg-sec-suave text-sec-tinta" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden />{nombre}</Link>)}
  </nav>;
}
