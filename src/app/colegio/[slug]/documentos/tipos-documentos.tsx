import { File, FileSpreadsheet, FileText, Folder, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Vista = "biblioteca" | "unidad" | "compartido" | "recientes" | "destacados" | "papelera";
export type Persona = { id: string; nombre: string; email: string; rol: string };
export type Salon = { id: string; nombre: string };
export type ArchivoItem = { id: string; nombre: string; mimeType: string; bytes: number };
export type Item = {
  tipo: "carpeta" | "documento"; id: string; nombre: string; propietario: string; modificado: Date; creado: Date;
  tamano: number | null; archivo?: ArchivoItem | null; gestionable: boolean; destacado: boolean; descripcion?: string | null;
  carpetaId?: string | null; visibleRoles?: string[]; salonId?: string | null; ambito: "biblioteca" | "unidad"; elementos?: number;
};

export const ETIQUETA_ROL: Record<string, string> = { direccion: "Dirección", administrativo: "Administrativo", profesor: "Profesor", apoderado: "Familia", alumno: "Alumno" };
export const GRUPOS_ROL: { rol: "apoderado" | "alumno" | "profesor" | "administrativo"; plural: string }[] = [
  { rol: "apoderado", plural: "Familias" }, { rol: "alumno", plural: "Alumnos" }, { rol: "profesor", plural: "Profesores" }, { rol: "administrativo", plural: "Personal administrativo" },
];
export const fecha = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" });
export const fechaHora = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

export function iniciales(nombre: string) {
  const partes = nombre.replace(/[·()]/g, " ").trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toLocaleUpperCase("es");
}

export function tipoLegible(item: Pick<Item, "tipo" | "archivo">) {
  if (item.tipo === "carpeta") return "Carpeta";
  const m = item.archivo?.mimeType ?? "";
  if (m === "application/pdf") return "Documento PDF";
  if (m.startsWith("image/")) return `Imagen ${m.split("/")[1]?.toUpperCase().replace("JPEG", "JPG")}`;
  if (m.includes("wordprocessingml")) return "Documento de Word";
  if (m.includes("spreadsheetml") || m.includes("excel")) return "Hoja de Excel";
  return "Archivo";
}

/** Ícono por tipo de archivo. */
export function Icono({ item, className }: { item: Pick<Item, "tipo" | "archivo">; className?: string }) {
  const clase = cn("size-5 shrink-0 text-sec-trazo", className);
  if (item.tipo === "carpeta") return <Folder className={cn(clase, "fill-sec-suave")} strokeWidth={2} aria-hidden />;
  const m = item.archivo?.mimeType ?? "";
  if (m === "application/pdf") return <FileText className={clase} strokeWidth={2} aria-hidden />;
  if (m.startsWith("image/")) return <ImageIcon className={clase} strokeWidth={2} aria-hidden />;
  if (m.includes("sheet") || m.includes("excel")) return <FileSpreadsheet className={clase} strokeWidth={2} aria-hidden />;
  return <File className={clase} strokeWidth={2} aria-hidden />;
}
