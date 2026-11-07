"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Elegir, type Datos } from "./comun";

export function CabeceraRegistro({ datos, gestionar, onNueva }: { datos: Datos; gestionar: boolean; onNueva: () => void }) {
  const router = useRouter();
  const { curso, periodo } = datos;
  const nivel = curso.salon.nivel[0].toUpperCase() + curso.salon.nivel.slice(1);
  const enlace = (seccion: string) => `/notas?vista=anterior&curso=${curso.id}&periodo=${periodo?.id}&seccion=${seccion}`;
  return (
    <>
      <EncabezadoPagina
        seccion="academico"
        titulo={`${curso.nombre} — ${curso.salon.nombre} ${nivel}`}
        descripcion={datos.soloLectura ? "Registro de notas · solo lectura (tutoría del salón)" : "Registro de notas"}
        acciones={
          <div className="flex flex-wrap gap-2">
            {datos.puedeEditar && <Button onClick={onNueva}><Plus aria-hidden />Nueva calificación</Button>}
            {gestionar && <Button variant="outline" render={<Link href={`/notas/competencias?curso=${curso.id}`} />}>Competencias</Button>}
          </div>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="text-sm font-medium">Periodo</span>
          <Elegir
            value={periodo?.id ?? ""}
            onChange={(v) => router.push(`/notas/${curso.id}?periodo=${v}`)}
            opciones={datos.periodos.map((p) => ({ value: p.id, label: `${p.nombre} ${p.anio}` }))}
            etiqueta="Periodo"
          />
        </div>
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"><MoreHorizontal className="size-4" aria-hidden />Más</summary>
          <div className="absolute right-0 z-30 mt-1 min-w-56 rounded-md border bg-popover p-2 shadow-md">
            <Link className="block rounded px-2 py-2 hover:bg-accent" href={enlace("periodo")}>Calificación del periodo</Link>
            <Link className="block rounded px-2 py-2 hover:bg-accent" href={enlace("informe")}>Informe de progreso</Link>
            <Link className="block rounded px-2 py-2 hover:bg-accent" href={enlace("excel")}>Importar/Exportar</Link>
          </div>
        </details>
        {datos.soloLectura && <p className="flex items-center gap-1.5 pb-3 text-sm text-muted-foreground"><Lock className="size-4" aria-hidden />Este curso lo dicta otro profesor.</p>}
      </div>
    </>
  );
}
