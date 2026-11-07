"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardCheck, Clock, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ddmm } from "@/lib/calificacion-periodo";
import type { EstadoCalificacionPeriodo } from "@/lib/server/calificacion-periodo";
import { cn } from "@/lib/utils";
import { estadoBotonAction } from "./actions";

/**
 * Entrada a la calificación del periodo desde el registro del curso (specs/47). Consulta el estado en el servidor:
 * deshabilitado hasta que termine el periodo; luego «Pendiente» hasta que se envía; después «enviada · ver».
 * El tutor que no dicta el curso va al reporte del salón.
 */
export function BotonCalificacionPeriodo({ cursoId, periodoId, slug: slugProp }: { cursoId: string; periodoId: string; slug: string }) {
  const params = useParams<{ slug?: string }>();
  const slug = slugProp || params.slug || "";
  const clave = `${slug}:${cursoId}:${periodoId}`;
  const [leido, setLeido] = useState<{ clave: string; estado: EstadoCalificacionPeriodo | null } | null>(null);
  useEffect(() => {
    let vigente = true;
    estadoBotonAction(slug, cursoId, periodoId).then((e) => vigente && setLeido({ clave, estado: e }), () => vigente && setLeido({ clave, estado: null }));
    return () => { vigente = false; };
  }, [slug, cursoId, periodoId, clave]);
  const estado = leido?.clave === clave ? leido.estado : undefined;

  if (estado === null) return null;
  if (estado === undefined) return <span aria-hidden className="inline-block h-11 w-56 animate-pulse rounded-md bg-superficie-2" />;
  const clase = buttonVariants({ variant: "outline" });
  if (estado.estado === "no_disponible") {
    const texto = `Disponible desde el ${ddmm(estado.disponibleDesde)}`;
    return (
      <span title={`La calificación del periodo se envía cuando el periodo termina. ${texto}.`} className="inline-flex">
        <button type="button" disabled aria-disabled className={cn(clase, "cursor-not-allowed")}>
          <CalendarClock aria-hidden />Calificación del periodo · disponible desde el {ddmm(estado.disponibleDesde)}
        </button>
      </span>
    );
  }
  if (!estado.esPropio) {
    return <Link href={`/notas/salon/${estado.salonId}/periodo?periodo=${periodoId}`} className={clase}><ClipboardCheck aria-hidden />Reporte del periodo</Link>;
  }
  const enlace = `/notas/${cursoId}/periodo?periodo=${periodoId}`;
  if (estado.estado === "enviada") {
    return <Link href={enlace} className={clase}><CheckCircle2 aria-hidden />Calificación enviada · ver</Link>;
  }
  return (
    <Link href={enlace} className={clase}>
      <ClipboardCheck aria-hidden />Calificación del periodo
      {estado.periodoCerrado ? (
        <span className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-2 py-0.5 text-etiqueta text-muted-foreground"><Lock className="size-3.5" aria-hidden />Periodo cerrado</span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-pildora bg-tarde-fondo px-2 py-0.5 text-etiqueta text-tarde"><Clock className="size-3.5" aria-hidden />Pendiente</span>
      )}
    </Link>
  );
}
