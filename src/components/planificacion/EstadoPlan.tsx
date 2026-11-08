import { Archive, CircleCheck, CircleDot, Clock3, MessageCircleWarning, Send } from "lucide-react";
import type { EstadoPlanAnual } from "@/generated/prisma/enums";
const config = {
  borrador: { texto: "Borrador", Icono: CircleDot },
  en_revision: { texto: "En revisión", Icono: Clock3 },
  con_observaciones: { texto: "Con observaciones", Icono: MessageCircleWarning },
  aprobado: { texto: "Aprobado", Icono: CircleCheck },
  publicado: { texto: "Publicado", Icono: Send },
  archivado: { texto: "Archivado", Icono: Archive },
};
export function EstadoPlan({ estado }: { estado: EstadoPlanAnual }) {
  const { texto, Icono } = config[estado];
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-sec-suave px-3 py-1 text-sm font-medium text-sec-tinta"><Icono aria-hidden className="size-4" strokeWidth={2} />{texto}</span>;
}
