import { File, FileImage, FileSpreadsheet, FileText } from "lucide-react";
import { categoriaMime } from "@/lib/adjuntos";

/** Ícono por tipo de archivo (PDF, imagen, hoja de cálculo, documento). */
export function IconoAdjunto({ mimeType, nombre, className = "size-5 shrink-0 text-muted-foreground" }: { mimeType: string; nombre?: string; className?: string }) {
  const categoria = categoriaMime(mimeType, nombre);
  const Icono = categoria === "pdf" ? FileText : categoria === "imagen" ? FileImage : categoria === "hoja" ? FileSpreadsheet : File;
  return <Icono className={className} strokeWidth={2} aria-hidden />;
}
