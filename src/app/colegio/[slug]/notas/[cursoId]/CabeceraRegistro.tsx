"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BookMarked, CheckCircle2, ChevronDown, FileSpreadsheet, FileText, Lock, Plus, Wrench } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fechaLima } from "@/lib/fechas";
import { Elegir, type Datos } from "./comun";

export function CabeceraRegistro({ datos, gestionar, botonPeriodo, onNueva, onInforme, onArchivos }: {
  datos: Datos; gestionar: boolean; botonPeriodo?: ReactNode; onNueva: () => void; onInforme: () => void; onArchivos: () => void;
}) {
  const router = useRouter();
  const { curso, periodo, cierre } = datos;
  const nivel = curso.salon.nivel[0].toUpperCase() + curso.salon.nivel.slice(1);
  const cerrado = !!periodo?.cerrado || !!cierre;
  const estado = periodo?.cerrado ? "Periodo cerrado" : cierre ? "Enviado / Cerrado" : "Abierto";
  return (
    <>
      <EncabezadoPagina
        seccion="academico"
        titulo={`${curso.nombre} — ${curso.salon.nombre} ${nivel}`}
        descripcion={datos.soloLectura ? "Registro de notas · solo lectura (tutoría del salón)" : "Registro de notas"}
        acciones={datos.puedeEditar && <Button onClick={onNueva}><Plus aria-hidden />Nueva calificación</Button>}
      />
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3" role="toolbar" aria-label="Herramientas del registro">
        <div className="space-y-1">
          <span className="text-sm font-medium">Periodo</span>
          <Elegir
            value={periodo?.id ?? ""}
            onChange={(v) => router.push(`/notas/${curso.id}?periodo=${v}`)}
            opciones={datos.periodos.map((p) => ({ value: p.id, label: `${p.nombre} ${p.anio}` }))}
            etiqueta="Periodo"
          />
        </div>
        <div className="flex min-h-11 flex-wrap items-center gap-2" data-testid="estado-cierre">
          <p className="flex items-center gap-1.5 text-sm">
            {cerrado ? <Lock className="size-4 text-muted-foreground" aria-hidden /> : <CheckCircle2 className="size-4 text-llego" aria-hidden />}
            <span className="text-muted-foreground">Notas del curso:</span><span className="font-semibold">{estado}</span>
            {cierre && !periodo?.cerrado && <span className="hidden text-muted-foreground lg:inline">· {cierre.por}, {fechaLima(cierre.cerradoAt)}</span>}
          </p>
        </div>
        {periodo && (
          <>
            <div className="hidden flex-wrap gap-2 sm:flex">
              <Button variant="outline" onClick={onInforme}><FileText aria-hidden />Informe de progreso</Button>
              <Button variant="outline" onClick={onArchivos}><FileSpreadsheet aria-hidden />Importar / Exportar</Button>
              {botonPeriodo}
              {gestionar && <Button variant="outline" render={<Link href={`/notas/competencias?curso=${curso.id}`} />}><BookMarked aria-hidden />Competencias</Button>}
            </div>
            <div className="flex gap-2 sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}><Wrench aria-hidden />Herramientas<ChevronDown aria-hidden /></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem className="min-h-11" onClick={onInforme}><FileText aria-hidden />Informe de progreso</DropdownMenuItem>
                  <DropdownMenuItem className="min-h-11" onClick={onArchivos}><FileSpreadsheet aria-hidden />Importar / Exportar</DropdownMenuItem>
                  {gestionar && <DropdownMenuItem className="min-h-11" render={<Link href={`/notas/competencias?curso=${curso.id}`} />}><BookMarked aria-hidden />Competencias</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
              {botonPeriodo}
            </div>
          </>
        )}
        {datos.soloLectura && <p className="flex items-center gap-1.5 pb-3 text-sm text-muted-foreground"><Lock className="size-4" aria-hidden />Este curso lo dicta otro profesor.</p>}
      </div>
    </>
  );
}
