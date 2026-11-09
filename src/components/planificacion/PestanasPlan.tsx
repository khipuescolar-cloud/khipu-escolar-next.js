"use client";
import { usePathname } from "next/navigation";
import { PestanasLinea } from "@/components/shell/PestanasPagina";
export function PestanasPlan({ planId }: { planId: string }) {
  const pathname = usePathname();
  const base = "/planificacion/" + planId;
  const items = [
    ["temas", "Temas"], ["revision", "Revisión"], ["reuniones", "Reuniones"],
    ["versiones", "Versiones"], ["materiales", "Materiales"], ["progreso", "Progreso"],
  ];
  return <PestanasLinea etiqueta="Secciones del plan" items={items.map(([ruta, texto]) => ({ href: base + "/" + ruta, texto, activo: pathname.startsWith(base + "/" + ruta) }))} />;
}
