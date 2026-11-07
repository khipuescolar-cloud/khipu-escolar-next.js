import { ClipboardList, Clock3 } from "lucide-react";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import type { SolicitudVista } from "@/lib/server/solicitudes/index";

export function PanelSolicitudes({ solicitudes, direccion }: { solicitudes: SolicitudVista[]; direccion: boolean }) {
  if (!solicitudes.length) return <EstadoVacio icono={ClipboardList} titulo={direccion ? "Todavía no hay solicitudes" : "No tienes solicitudes pendientes"} descripcion={direccion ? "Las solicitudes que publique dirección aparecerán aquí." : "Cuando dirección solicite un documento, lo encontrarás aquí."} />;
  return <div className="space-y-3">{solicitudes.map((s) => <article key={s.id} className="rounded-xl border border-borde-sutil p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-semibold">{s.titulo}</h2><span className="text-sm text-sec-tinta">{s.estado}</span></div>{s.instrucciones && <p className="mt-2 text-sm text-muted-foreground">{s.instrucciones}</p>}<p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" aria-hidden />{s.fechaLimite ? `Plazo: ${new Intl.DateTimeFormat("es-PE").format(s.fechaLimite)}` : "Sin plazo"} · {s.resumen.aprobadas} aprobadas de {s.resumen.destinatarios}</p></article>)}</div>;
}
