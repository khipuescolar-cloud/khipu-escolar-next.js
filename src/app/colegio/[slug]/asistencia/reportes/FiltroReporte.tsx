"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { CLASE_CAMPO, Selector } from "@/components/ui/Selector";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Opciones = {
  salones: { id: string; nombre: string }[];
  alumnos: { id: string; nombres: string; apellidos: string; salonId: string }[];
};
type Atajo = { texto: string; desde: string; hasta: string };

/**
 * Filtro del reporte en un panel lateral (specs/27): primero el salón, dentro del salón la lista de
 * sus alumnos (o «Todo el salón») y al final el rango de fechas. Abre el reporte en su propia vista (`ver/`).
 */
export function FiltroReporte({
  opciones, inicial, atajos, hoy, activos, vista,
}: {
  opciones: Opciones;
  inicial: { salonId?: string; alumnoId?: string; desde: string; hasta: string };
  atajos: Atajo[];
  hoy: string;
  activos: number;
  /** Vista elegida en el reporte filtrado («tabla» o «calendario»); se conserva al cambiar el filtro. */
  vista?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [salonId, setSalonId] = useState(inicial.salonId ?? "");
  const [alumnoId, setAlumnoId] = useState(inicial.alumnoId ?? "");
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [busqueda, setBusqueda] = useState("");

  const alumnos = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return opciones.alumnos
      .filter((a) => a.salonId === salonId)
      .filter((a) => !q || `${a.apellidos} ${a.nombres}`.toLocaleLowerCase("es").includes(q));
  }, [opciones.alumnos, salonId, busqueda]);

  function verReporte() {
    const q = new URLSearchParams();
    if (salonId) q.set("salon", salonId);
    if (salonId && alumnoId) q.set("alumno", alumnoId);
    q.set("desde", desde);
    q.set("hasta", hasta);
    if (vista) q.set("vista", vista);
    setAbierto(false);
    router.push(`/asistencia/reportes/ver?${q.toString()}`);
  }

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger className={buttonVariants({ variant: "default" })}>
        <SlidersHorizontal className="size-4" strokeWidth={2} aria-hidden /> Filtrar reporte
        {activos > 0 && <span className="ml-1 rounded-pildora bg-primary-foreground/20 px-2 text-etiqueta tabular-nums">{activos}</span>}
      </SheetTrigger>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-titulo-2">Filtrar reporte</SheetTitle>
          <SheetDescription>Elige un salón, un alumno de ese salón y las fechas que quieres ver.</SheetDescription>
        </SheetHeader>
        <form
          id="filtro-reporte"
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            verReporte();
          }}
        >
          <Selector
            etiqueta="Salón"
            value={salonId}
            onChange={(e) => {
              setSalonId(e.target.value);
              setAlumnoId("");
              setBusqueda("");
            }}
          >
            <option value="">Todos los salones</option>
            {opciones.salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Selector>

          {salonId && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium text-foreground">Alumno</legend>
              {opciones.alumnos.filter((a) => a.salonId === salonId).length > 8 && (
                <input
                  type="search"
                  aria-label="Buscar alumno"
                  placeholder="Buscar por nombre o apellido"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={CLASE_CAMPO}
                />
              )}
              <ul className="flex max-h-72 flex-col overflow-y-auto rounded-md border">
                <OpcionAlumno nombre="Todo el salón" marcado={alumnoId === ""} onElegir={() => setAlumnoId("")} />
                {alumnos.map((a) => (
                  <OpcionAlumno key={a.id} nombre={`${a.apellidos}, ${a.nombres}`} marcado={alumnoId === a.id} onElegir={() => setAlumnoId(a.id)} />
                ))}
                {alumnos.length === 0 && <li className="px-3 py-2.5 text-sm text-muted-foreground">Ningún alumno coincide.</li>}
              </ul>
            </fieldset>
          )}

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5 text-sm font-medium text-foreground">Fechas</legend>
            <div className="flex flex-wrap gap-2">
              {atajos.map((a) => {
                const activo = a.desde === desde && a.hasta === hasta;
                return (
                  <button
                    key={a.texto}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => {
                      setDesde(a.desde);
                      setHasta(a.hasta);
                    }}
                    className={buttonVariants({ variant: activo ? "secondary" : "outline", size: "sm" })}
                  >
                    {activo && <Check className="size-4" strokeWidth={2} aria-hidden />} {a.texto}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Desde" id="filtro-desde" type="date" value={desde} max={hoy} onChange={(e) => setDesde(e.target.value)} required />
              <Campo etiqueta="Hasta" id="filtro-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
            </div>
          </fieldset>
        </form>
        <SheetFooter className="border-t">
          <Boton type="submit" form="filtro-reporte">Ver reporte</Boton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function OpcionAlumno({ nombre, marcado, onElegir }: { nombre: string; marcado: boolean; onElegir: () => void }) {
  return (
    <li className="border-b last:border-b-0">
      <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted", marcado && "bg-muted font-medium")}>
        <input type="radio" name="alumno" checked={marcado} onChange={onElegir} className="size-4 accent-primary" />
        {nombre}
      </label>
    </li>
  );
}
