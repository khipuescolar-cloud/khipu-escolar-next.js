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
  /** `grado`: clave del grado del salón; con un grado elegido, solo se listan sus salones. */
  salones: { id: string; nombre: string; grado?: string | null }[];
  /** Grados (todas sus secciones); `clave` = «primaria-3». */
  grados?: { clave: string; nombre: string }[];
  alumnos: { id: string; nombres: string; apellidos: string; salonId: string }[];
  /** Profesor: cursos que puede ver (los que dicta y todos los de su tutoría); `grado` = clave del grado del salón. */
  cursos?: { id: string; nombre: string; salonId: string; salon: string; grado: string | null }[];
  /** Profesor: salones de su tutoría. */
  tutorias?: string[];
};

/** Valor de «Mis cursos» / «Todos los cursos» (igual a `MIS_CURSOS` de `@/lib/reportes-asistencia`). */
const MIS = "mis";
type Atajo = { texto: string; desde: string; hasta: string };

/**
 * Filtro del reporte en un panel lateral (specs/27): primero el salón, dentro del salón la lista de
 * sus alumnos (o «Todo el salón») y al final el rango de fechas. Abre el reporte en su propia vista (`ver/`).
 * Profesor: además el filtro «Curso». En su tutoría, «Asistencia al colegio», «Todos los cursos» o un curso; en otro
 * salón, grado o sin filtro, «Mis cursos» o uno de sus cursos.
 */
export function FiltroReporte({
  opciones, inicial, atajos, hoy, activos, vista,
}: {
  opciones: Opciones;
  inicial: { salonId?: string; alumnoId?: string; grado?: { nivel: string; grado: number }; cursoId?: string; desde: string; hasta: string };
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
  const gradoDeSalon = (id: string) => opciones.salones.find((s) => s.id === id)?.grado ?? "";
  const [grado, setGrado] = useState(inicial.grado ? `${inicial.grado.nivel}-${inicial.grado.grado}` : gradoDeSalon(inicial.salonId ?? ""));
  const salones = grado ? opciones.salones.filter((s) => s.grado === grado) : opciones.salones;
  const grados = opciones.grados ?? [];
  const esProfesor = opciones.cursos !== undefined && opciones.tutorias !== undefined && (opciones.cursos.length > 0 || opciones.tutorias.length > 0);
  const esTutoria = (id: string) => !!id && (opciones.tutorias ?? []).includes(id);
  /** Curso por defecto: en su tutoría, la asistencia al colegio (""); fuera de ella, «Mis cursos». */
  const cursoPorDefecto = (salon: string) => (!esProfesor || esTutoria(salon) ? "" : MIS);
  const [cursoId, setCursoId] = useState(inicial.cursoId ?? cursoPorDefecto(inicial.salonId ?? ""));
  const cursos = (opciones.cursos ?? []).filter((c) => (salonId ? c.salonId === salonId : !grado || c.grado === grado));
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
    // Un curso entero (sin alumno): su historial, con la matriz alumnos × clases y las descargas.
    if (esProfesor && cursoId && cursoId !== MIS && !alumnoId) {
      setAbierto(false);
      router.push(`/asistencia/reportes/curso/${cursoId}?${new URLSearchParams({ desde, hasta }).toString()}`);
      return;
    }
    const q = new URLSearchParams();
    if (salonId) q.set("salon", salonId);
    if (salonId && alumnoId) q.set("alumno", alumnoId);
    if (!salonId && grado) q.set("grado", grado);
    if (esProfesor && cursoId) q.set("curso", cursoId);
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
          <SheetDescription>
            {esProfesor
              ? "Elige un grado, uno de sus salones y el curso; dentro del salón, un alumno; luego las fechas."
              : "Elige un grado (todas sus secciones) o uno de sus salones y, dentro del salón, un alumno; luego las fechas."}
          </SheetDescription>
        </SheetHeader>
        <form
          id="filtro-reporte"
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            verReporte();
          }}
        >
          {grados.length > 0 && (
            <Selector
              etiqueta="Grado"
              value={grado}
              onChange={(e) => {
                const nuevo = e.target.value;
                setGrado(nuevo);
                // El salón elegido se queda si es de ese grado; si no, vuelve a «Todos los salones» del grado.
                const queda = salonId && (!nuevo || gradoDeSalon(salonId) === nuevo) ? salonId : "";
                if (queda !== salonId) {
                  setSalonId("");
                  setAlumnoId("");
                  setBusqueda("");
                }
                setCursoId(cursoPorDefecto(queda));
              }}
            >
              <option value="">Todos los grados</option>
              {grados.map((g) => <option key={g.clave} value={g.clave}>{g.nombre}</option>)}
            </Selector>
          )}
          <Selector
            etiqueta="Salón"
            value={salonId}
            onChange={(e) => {
              setSalonId(e.target.value);
              if (e.target.value) setGrado(gradoDeSalon(e.target.value));
              setAlumnoId("");
              setBusqueda("");
              setCursoId(cursoPorDefecto(e.target.value));
            }}
          >
            <option value="">{grado ? "Todos los salones del grado" : "Todos los salones"}</option>
            {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Selector>

          {esProfesor && (
            <Selector etiqueta="Curso" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
              {esTutoria(salonId) && <option value="">Asistencia al colegio</option>}
              <option value={MIS}>{esTutoria(salonId) ? "Todos los cursos" : "Mis cursos"}</option>
              {cursos.map((c) => <option key={c.id} value={c.id}>{salonId ? c.nombre : `${c.nombre} · ${c.salon}`}</option>)}
            </Selector>
          )}

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
