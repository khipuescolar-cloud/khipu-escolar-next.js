"use client";

import { Lock, LogOut, Plus, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { fechaCorta, hora12 } from "@/lib/fechas";
import type { IncidenciaVista } from "@/lib/server/incidencias";

const TIPOS_INCIDENCIA = ["accidente", "salud", "otro"] as const;
const NOMBRE_TIPO_INCIDENCIA = {
  accidente: "Accidente",
  salud: "Malestar o salud",
  otro: "Otra incidencia",
} as const;
import {
  cursosParaIncidenciaDrawerAction,
  registrarIncidenciaDrawerAction,
} from "./actions";

type Alumno = {
  id: string;
  nombres: string;
  apellidos: string;
  salon: { nombre: string };
};
type Curso = {
  id: string;
  nombre: string;
  sugerido: boolean;
  hora: string | null;
};

export function PanelIncidencias({
  alumnos,
  incidencias,
  fechaInicial,
  horaInicial,
  alumnoInicial,
  hoy,
}: {
  alumnos: Alumno[];
  incidencias: IncidenciaVista[];
  fechaInicial: string;
  horaInicial: string;
  alumnoInicial: string;
  hoy: string;
}) {
  const router = useRouter();
  const [crear, setCrear] = useState(false);
  const [detalle, setDetalle] = useState<IncidenciaVista | null>(null);
  const [paso, setPaso] = useState(1);
  const [alumnoId, setAlumnoId] = useState(
    alumnos.some((a) => a.id === alumnoInicial) ? alumnoInicial : "",
  );
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState(horaInicial);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState("");
  const [nuevoId, setNuevoId] = useState("");
  const titulo = useRef<HTMLHeadingElement>(null);
  const alumno = alumnos.find((a) => a.id === alumnoId);
  useEffect(() => {
    if (nuevoId) {
      const t = setTimeout(() => setNuevoId(""), 5000);
      return () => clearTimeout(t);
    }
  }, [nuevoId]);

  async function continuar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!alumnoId) {
      setError("Elige al alumno.");
      return;
    }
    setPendiente(true);
    try {
      setCursos(await cursosParaIncidenciaDrawerAction(alumnoId, fecha, hora));
      setPaso(2);
    } catch {
      setError("No se pudieron cargar los cursos. Vuelve a intentarlo.");
    } finally {
      setPendiente(false);
    }
  }
  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPendiente(true);
    const datos = new FormData(e.currentTarget);
    datos.set("alumnoId", alumnoId);
    datos.set("fecha", fecha);
    datos.set("hora", hora);
    try {
      const r = await registrarIncidenciaDrawerAction(datos);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCrear(false);
      setPaso(1);
      setNuevoId(String(datos.get("descripcion")));
      toast.success(r.mensaje);
      router.refresh();
    } catch {
      setError("No se pudo registrar la incidencia. Vuelve a intentarlo.");
    } finally {
      setPendiente(false);
    }
  }
  const campoError = (nombre: string) =>
    error &&
    (nombre === "alumno"
      ? /alumno/i.test(error)
      : nombre === "descripcion"
        ? /descripci[oó]n|qué pasó|describe/i.test(error)
        : nombre === "horaRetiro"
          ? /hora del retiro/i.test(error)
          : nombre === "fecha"
            ? /fecha|día que aún/i.test(error)
            : false);

  return (
    <>
      <EncabezadoPagina
        titulo="Incidencias"
        seccion="dia"
        descripcion="Accidentes, malestares y retiros anticipados registrados en el colegio."
        acciones={
          alumnos.length > 0 && (
            <Button
              onClick={() => {
                setError("");
                setPaso(1);
                setCrear(true);
              }}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden /> Registrar
              incidencia
            </Button>
          )
        }
      />
      {incidencias.length > 0 && (
        <ul className="divide-y divide-borde-sutil border-y border-borde-sutil sm:hidden">
          {incidencias.map((i) => (
            <li
              key={i.id}
              className={`flex flex-col gap-2 py-4 ${i.descripcion === nuevoId ? "bg-sec-suave" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{i.alumno}</p>
                  <p className="text-sm text-muted-foreground">
                    {i.salon} · {fechaCorta(i.fecha)}, {hora12(i.hora)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Ver incidencia de ${i.alumno}`}
                  onClick={() => setDetalle(i)}
                >
                  Ver
                </Button>
              </div>
              <p className="inline-flex items-center gap-1 text-sm">
                <TriangleAlert className="size-4 text-sec-trazo" />
                {NOMBRE_TIPO_INCIDENCIA[i.tipo]}
              </p>
              <p className="line-clamp-2 text-sm">
                {i.descripcion ?? "Detalle reservado"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {incidencias.length === 0 ? (
        <EstadoVacio
          icono={TriangleAlert}
          titulo="Sin incidencias registradas"
          descripcion="Cuando registres una incidencia, aparecerá aquí."
        />
      ) : (
        <div className="hidden overflow-x-auto rounded-[14px] border border-borde-sutil bg-superficie sm:block">
          <Table densidad="compacta">
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Salón</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidencias.map((i) => (
                <TableRow
                  key={i.id}
                  className={i.descripcion === nuevoId ? "bg-sec-suave" : ""}
                >
                  <TableCell className="font-medium">{i.alumno}</TableCell>
                  <TableCell>{i.salon}</TableCell>
                  <TableCell>
                    {fechaCorta(i.fecha)}, {hora12(i.hora)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <TriangleAlert
                        className="size-4 text-sec-trazo"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {NOMBRE_TIPO_INCIDENCIA[i.tipo]}
                    </span>
                  </TableCell>
                  <TableCell
                    className="max-w-64 truncate"
                    title={i.descripcion ?? "Detalle reservado"}
                  >
                    {i.descripcion ?? "Detalle reservado"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Ver incidencia de ${i.alumno}`}
                      onClick={() => setDetalle(i)}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Sheet open={crear} onOpenChange={setCrear} modal="trap-focus">
        <SheetContent
          className="sm:max-w-lg"
          movil="abajo"
          initialFocus={titulo}
        >
          <SheetHeader>
            <SheetTitle ref={titulo} tabIndex={-1}>
              Registrar incidencia
            </SheetTitle>
            <SheetDescription>
              Paso {paso} de 2 ·{" "}
              {paso === 1
                ? "Alumno y momento"
                : "Qué ocurrió y clases afectadas"}
            </SheetDescription>
          </SheetHeader>
          {paso === 1 ? (
            <form onSubmit={continuar} className="flex min-h-0 flex-1 flex-col">
              <SheetBody className="pb-4">
                <div className="grid gap-1.5">
                  <label htmlFor="incidencia-alumno" className="font-medium">
                    Alumno
                  </label>
                  <Select
                    modal={false}
                    value={alumnoId}
                    onValueChange={(v) => setAlumnoId(v ?? "")}
                  >
                    <SelectTrigger
                      id="incidencia-alumno"
                      className="w-full"
                      aria-invalid={!!campoError("alumno")}
                    >
                      <SelectValue placeholder="Elige al alumno" />
                    </SelectTrigger>
                    <SelectContent>
                      {alumnos.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.apellidos}, {a.nombres} · {a.salon.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {campoError("alumno") && (
                    <p role="alert" className="text-falta">
                      {error}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 font-medium">
                    Fecha
                    <Input
                      type="date"
                      value={fecha}
                      max={hoy}
                      required
                      onChange={(e) => setFecha(e.target.value)}
                      aria-invalid={!!campoError("fecha")}
                    />
                    {campoError("fecha") && (
                      <span role="alert" className="text-falta">
                        {error}
                      </span>
                    )}
                  </label>
                  <label className="grid gap-1.5 font-medium">
                    Hora
                    <Input
                      type="time"
                      value={hora}
                      required
                      onChange={(e) => setHora(e.target.value)}
                    />
                  </label>
                </div>
                {error && !campoError("alumno") && !campoError("fecha") && (
                  <p role="alert" className="text-falta">
                    {error}
                  </p>
                )}
              </SheetBody>
              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCrear(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={pendiente || !alumnoId}
                  aria-busy={pendiente}
                >
                  {pendiente ? "Cargando…" : "Continuar"}
                </Button>
              </SheetFooter>
            </form>
          ) : (
            <form onSubmit={guardar} className="flex min-h-0 flex-1 flex-col">
              <SheetBody className="pb-4">
                <p className="rounded-xl bg-sec-suave px-4 py-3 text-sec-tinta">
                  <strong>
                    {alumno?.apellidos}, {alumno?.nombres}
                  </strong>{" "}
                  · {alumno?.salon.nombre} · {fechaCorta(fecha)}, {hora12(hora)}
                </p>
                <div className="grid gap-1.5">
                  <label htmlFor="incidencia-tipo" className="font-medium">
                    Tipo
                  </label>
                  <Select modal={false} name="tipo" defaultValue="accidente">
                    <SelectTrigger id="incidencia-tipo" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_INCIDENCIA.map((t) => (
                        <SelectItem key={t} value={t}>
                          {NOMBRE_TIPO_INCIDENCIA[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="grid gap-1.5 font-medium">
                  Qué pasó
                  <Textarea
                    name="descripcion"
                    rows={4}
                    maxLength={1000}
                    required
                    aria-invalid={!!campoError("descripcion")}
                  />
                  <span className="flex items-start gap-1.5 text-sm font-normal text-muted-foreground">
                    <Lock
                      className="mt-0.5 size-4 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />{" "}
                    Solo lo ven dirección, el tutor y quien la registró. No
                    escribas diagnósticos médicos.
                  </span>
                  {campoError("descripcion") && (
                    <span role="alert" className="text-falta">
                      {error}
                    </span>
                  )}
                </label>
                <fieldset className="grid gap-2">
                  <legend className="mb-2 font-medium">Retiro</legend>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      name="retiro"
                      className="size-5 accent-primary"
                    />{" "}
                    Se retiró antes del colegio
                  </label>
                  <label className="grid gap-1.5 font-medium">
                    Hora del retiro
                    <Input
                      name="horaRetiro"
                      type="time"
                      defaultValue={hora}
                      aria-invalid={!!campoError("horaRetiro")}
                    />
                    {campoError("horaRetiro") && (
                      <span role="alert" className="text-falta">
                        {error}
                      </span>
                    )}
                  </label>
                </fieldset>
                <fieldset className="grid gap-1">
                  <legend className="mb-2 font-medium">
                    Clases que se perdió
                  </legend>
                  {cursos.length === 0 && (
                    <p className="text-muted-foreground">
                      Su salón no tiene cursos.
                    </p>
                  )}
                  {cursos.map((c) => (
                    <label
                      key={c.id}
                      className="flex min-h-11 items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        name="cursoIds"
                        value={c.id}
                        defaultChecked={c.sugerido}
                        className="size-5 accent-primary"
                      />
                      {c.nombre}
                      {c.hora && (
                        <span className="text-muted-foreground">
                          · {hora12(c.hora)}
                        </span>
                      )}
                    </label>
                  ))}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cada clase marcada queda con falta a clase y sus actividades
                    con NSP.
                  </p>
                </fieldset>
                {error &&
                  !campoError("descripcion") &&
                  !campoError("horaRetiro") && (
                    <p role="alert" className="text-falta">
                      {error}
                    </p>
                  )}
              </SheetBody>
              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaso(1)}
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  disabled={pendiente}
                  aria-busy={pendiente}
                >
                  {pendiente ? "Registrando…" : "Registrar incidencia"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
      <Sheet
        open={!!detalle}
        modal="trap-focus"
        onOpenChange={(v) => {
          if (!v) setDetalle(null);
        }}
      >
        <SheetContent className="sm:max-w-lg" movil="abajo">
          <SheetHeader>
            <SheetTitle>{detalle?.alumno}</SheetTitle>
            <SheetDescription>{detalle?.salon} · incidencia</SheetDescription>
          </SheetHeader>
          {detalle && (
            <>
              <SheetBody className="pb-4 text-sm">
                <dl className="grid gap-4">
                  <div>
                    <dt className="text-muted-foreground">Tipo</dt>
                    <dd className="mt-1 inline-flex items-center gap-1">
                      <TriangleAlert className="size-4 text-sec-trazo" />
                      {NOMBRE_TIPO_INCIDENCIA[detalle.tipo]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Fecha y hora</dt>
                    <dd>
                      {fechaCorta(detalle.fecha)}, {hora12(detalle.hora)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Qué pasó</dt>
                    <dd className="mt-1 whitespace-pre-wrap">
                      {detalle.descripcion ?? (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="size-4" /> Detalle reservado para
                          dirección, el tutor y quien registró la incidencia.
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Retiro</dt>
                    <dd>
                      {detalle.retiro ? (
                        <span className="inline-flex items-center gap-1">
                          <LogOut className="size-4" /> Sí
                          {detalle.horaRetiro
                            ? `, a las ${hora12(detalle.horaRetiro)}`
                            : ""}
                        </span>
                      ) : (
                        "No"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Clases perdidas</dt>
                    <dd>
                      {detalle.cursos.length
                        ? detalle.cursos.join(", ")
                        : "Ninguna"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registró</dt>
                    <dd>{detalle.registradoPor}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registrado el</dt>
                    <dd>
                      {new Intl.DateTimeFormat("es-PE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "America/Lima",
                      }).format(new Date(detalle.registradaAt))}
                    </dd>
                  </div>
                </dl>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" onClick={() => setDetalle(null)}>
                  Cerrar
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
