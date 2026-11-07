"use client";

import { Ban, CalendarCheck, Clock, Plus, TriangleAlert } from "lucide-react";
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
import { textoHorasPermiso } from "@/lib/permisos-asistencia";
import {
  anularPermisoDrawerAction,
  registrarPermisoDrawerAction,
} from "./actions";

type Alumno = {
  id: string;
  nombres: string;
  apellidos: string;
  salon: { nombre: string };
};
type Permiso = {
  id: string;
  alumno: string;
  salon: string;
  desde: string;
  hasta: string;
  todoElDia: boolean;
  horaDesde: string | null;
  horaHasta: string | null;
  motivo: string;
  registradoPor: string;
  createdAt: string;
  anulado: { at: string; por: string; motivo: string | null } | null;
  puedeAnular: boolean;
};

function Dato({
  nombre,
  children,
}: {
  nombre: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{nombre}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words">{children}</dd>
    </div>
  );
}

export function PanelPermisos({
  alumnos,
  permisos,
  hoy,
  alumnoInicial,
}: {
  alumnos: Alumno[];
  permisos: Permiso[];
  hoy: string;
  alumnoInicial: string;
}) {
  const router = useRouter();
  const [crear, setCrear] = useState(false);
  const [detalle, setDetalle] = useState<Permiso | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState("");
  const [nuevoId, setNuevoId] = useState("");
  const [alumnoId, setAlumnoId] = useState(
    alumnos.some((a) => a.id === alumnoInicial) ? alumnoInicial : "",
  );
  const [alcance, setAlcance] = useState("dia");
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (nuevoId) {
      const t = setTimeout(() => setNuevoId(""), 5000);
      return () => clearTimeout(t);
    }
  }, [nuevoId]);

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    datos.set("alumnoId", alumnoId);
    setError("");
    setPendiente(true);
    try {
      const r = await registrarPermisoDrawerAction(datos);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCrear(false);
      setNuevoId(String(datos.get("motivo")));
      toast.success(r.mensaje);
      router.refresh();
    } catch {
      setError("No se pudo registrar el permiso. Vuelve a intentarlo.");
    } finally {
      setPendiente(false);
    }
  }
  async function anular(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPendiente(true);
    try {
      const r = await anularPermisoDrawerAction(new FormData(e.currentTarget));
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDetalle(null);
      setAnulando(false);
      toast.success(r.mensaje);
      router.refresh();
    } catch {
      setError("No se pudo anular el permiso. Vuelve a intentarlo.");
    } finally {
      setPendiente(false);
    }
  }
  const campoError = (nombre: string) =>
    error &&
    (nombre === "alumnoId"
      ? /alumno/i.test(error)
      : nombre === "hasta"
        ? /fecha final|60 días/i.test(error)
        : nombre === "horaHasta"
          ? /hora/i.test(error)
          : nombre === "motivo"
            ? /motivo/i.test(error)
            : false);

  return (
    <>
      <EncabezadoPagina
        titulo="Permisos"
        seccion="dia"
        descripcion="Autorizaciones del colegio para ausentarse un día o unas horas."
        acciones={
          alumnos.length > 0 && (
            <Button
              onClick={() => {
                setError("");
                setCrear(true);
              }}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden /> Nuevo
              permiso
            </Button>
          )
        }
      />
      {permisos.length > 0 && (
        <ul className="divide-y divide-borde-sutil border-y border-borde-sutil sm:hidden">
          {permisos.map((p) => (
            <li
              key={p.id}
              className={`flex flex-col gap-2 py-4 ${p.motivo === nuevoId ? "bg-sec-suave" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.alumno}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.salon} ·{" "}
                    {p.desde === p.hasta
                      ? fechaCorta(p.desde)
                      : `${fechaCorta(p.desde)}–${fechaCorta(p.hasta)}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Ver permiso de ${p.alumno}`}
                  onClick={() => {
                    setError("");
                    setAnulando(false);
                    setDetalle(p);
                  }}
                >
                  Ver
                </Button>
              </div>
              <p className="line-clamp-2 text-sm">{p.motivo}</p>
              <p className="text-sm">
                {p.anulado ? (
                  <span className="inline-flex items-center gap-1">
                    <Ban className="size-4" /> Anulado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-llego">
                    <CalendarCheck className="size-4" /> Vigente
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      {permisos.length === 0 ? (
        <EstadoVacio
          icono={CalendarCheck}
          titulo="Sin permisos registrados"
          descripcion="Cuando registres un permiso, aparecerá aquí."
        />
      ) : (
        <div className="hidden overflow-x-auto rounded-[14px] border border-borde-sutil bg-superficie sm:block">
          <Table densidad="compacta">
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Salón</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permisos.map((p) => (
                <TableRow
                  key={p.id}
                  className={p.motivo === nuevoId ? "bg-sec-suave" : ""}
                >
                  <TableCell className="font-medium">{p.alumno}</TableCell>
                  <TableCell>{p.salon}</TableCell>
                  <TableCell>
                    {p.desde === p.hasta
                      ? fechaCorta(p.desde)
                      : `${fechaCorta(p.desde)}–${fechaCorta(p.hasta)}`}
                  </TableCell>
                  <TableCell className="max-w-64 truncate" title={p.motivo}>
                    {p.motivo}
                  </TableCell>
                  <TableCell>
                    {p.anulado ? (
                      <span className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-2 py-1">
                        <Ban className="size-4" aria-hidden /> Anulado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-pildora bg-llego-fondo px-2 py-1 text-llego">
                        <CalendarCheck className="size-4" aria-hidden /> Vigente
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Ver permiso de ${p.alumno}`}
                      onClick={() => {
                        setError("");
                        setAnulando(false);
                        setDetalle(p);
                      }}
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
      {alumnos.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Puedes consultar los permisos de tus salones. Solo el tutor, dirección
          y administración pueden registrar o anular.
        </p>
      )}

      <Sheet open={crear} onOpenChange={setCrear} modal="trap-focus">
        <SheetContent
          className="sm:max-w-lg"
          movil="abajo"
          initialFocus={titulo}
        >
          <SheetHeader>
            <SheetTitle ref={titulo} tabIndex={-1}>
              Nuevo permiso
            </SheetTitle>
            <SheetDescription>
              Indica el alumno, la duración y el motivo.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={guardar} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="pb-4">
              <div className="grid gap-1.5">
                <label htmlFor="permiso-alumno" className="font-medium">
                  Alumno
                </label>
                <Select
                  modal={false}
                  name="alumnoId"
                  value={alumnoId}
                  onValueChange={(v) => setAlumnoId(v ?? "")}
                >
                  <SelectTrigger
                    id="permiso-alumno"
                    className="w-full"
                    aria-invalid={!!campoError("alumnoId")}
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
                {campoError("alumnoId") && (
                  <p className="text-falta" role="alert">
                    <TriangleAlert className="mr-1 inline size-4" />
                    {error}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 font-medium">
                  Desde
                  <Input name="desde" type="date" defaultValue={hoy} required />
                </label>
                <label className="grid gap-1.5 font-medium">
                  Hasta
                  <Input
                    name="hasta"
                    type="date"
                    defaultValue={hoy}
                    required
                    aria-invalid={!!campoError("hasta")}
                  />
                  {campoError("hasta") && (
                    <span className="text-falta" role="alert">
                      {error}
                    </span>
                  )}
                </label>
              </div>
              <fieldset className="grid gap-1">
                <legend className="mb-1 font-medium">Horario</legend>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="alcance"
                    value="dia"
                    checked={alcance === "dia"}
                    onChange={() => setAlcance("dia")}
                    className="size-5 accent-primary"
                  />{" "}
                  Todo el día
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="alcance"
                    value="horas"
                    checked={alcance === "horas"}
                    onChange={() => setAlcance("horas")}
                    className="size-5 accent-primary"
                  />{" "}
                  Solo unas horas
                </label>
              </fieldset>
              {alcance === "horas" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 font-medium">
                    Desde la hora
                    <Input name="horaDesde" type="time" required />
                  </label>
                  <label className="grid gap-1.5 font-medium">
                    Hasta la hora
                    <Input
                      name="horaHasta"
                      type="time"
                      required
                      aria-invalid={!!campoError("horaHasta")}
                    />
                    {campoError("horaHasta") && (
                      <span className="text-falta" role="alert">
                        {error}
                      </span>
                    )}
                  </label>
                </div>
              )}
              <label className="grid gap-1.5 font-medium">
                Motivo
                <Textarea
                  name="motivo"
                  rows={3}
                  maxLength={500}
                  required
                  aria-invalid={!!campoError("motivo")}
                />
                <span className="text-sm font-normal text-muted-foreground">
                  Lo ven dirección, administración y los profesores del salón.
                  No escribas diagnósticos médicos.
                </span>
                {campoError("motivo") && (
                  <span className="text-falta" role="alert">
                    {error}
                  </span>
                )}
              </label>
              {error &&
                !["alumnoId", "hasta", "horaHasta", "motivo"].some(
                  campoError,
                ) && (
                  <p className="text-falta" role="alert">
                    <TriangleAlert className="mr-1 inline size-4" />
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
                {pendiente ? "Registrando…" : "Registrar permiso"}
              </Button>
            </SheetFooter>
          </form>
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
            <SheetDescription>
              {detalle?.salon} · permiso de asistencia
            </SheetDescription>
          </SheetHeader>
          {detalle && (
            <>
              <SheetBody className="pb-4">
                <dl className="grid gap-4 text-sm">
                  <Dato nombre="Estado">
                    {detalle.anulado ? (
                      <span className="inline-flex items-center gap-1">
                        <Ban className="size-4" /> Anulado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-llego">
                        <CalendarCheck className="size-4" /> Vigente
                      </span>
                    )}
                  </Dato>
                  <Dato nombre="Fecha">
                    {detalle.desde === detalle.hasta
                      ? fechaCorta(detalle.desde)
                      : `Del ${fechaCorta(detalle.desde)} al ${fechaCorta(detalle.hasta)}`}
                  </Dato>
                  <Dato nombre="Horario">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-4" />
                      {textoHorasPermiso(detalle, hora12)}
                    </span>
                  </Dato>
                  <Dato nombre="Motivo">{detalle.motivo}</Dato>
                  <Dato nombre="Registró">{detalle.registradoPor}</Dato>
                  <Dato nombre="Registrado el">
                    {new Intl.DateTimeFormat("es-PE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "America/Lima",
                    }).format(new Date(detalle.createdAt))}
                  </Dato>
                  {detalle.anulado && (
                    <>
                      <Dato nombre="Anuló">{detalle.anulado.por}</Dato>
                      <Dato nombre="Anulado el">
                        {new Intl.DateTimeFormat("es-PE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "America/Lima",
                        }).format(new Date(detalle.anulado.at))}
                      </Dato>
                      <Dato nombre="Motivo de anulación">
                        {detalle.anulado.motivo}
                      </Dato>
                    </>
                  )}
                </dl>
                {anulando && (
                  <form
                    id="anular-permiso"
                    onSubmit={anular}
                    className="grid gap-3 border-t border-borde-sutil pt-4"
                  >
                    <input type="hidden" name="permisoId" value={detalle.id} />
                    <label className="grid gap-1.5 font-medium">
                      Motivo de la anulación
                      <Textarea
                        name="motivo"
                        rows={3}
                        maxLength={500}
                        required
                        aria-invalid={!!error}
                      />
                    </label>
                    <p className="text-sm text-muted-foreground">
                      El permiso quedará en el historial. Las faltas de esos
                      días podrían volver a figurar como NSP.
                    </p>
                    {error && (
                      <p role="alert" className="text-falta">
                        {error}
                      </p>
                    )}
                  </form>
                )}
              </SheetBody>
              <SheetFooter>
                {detalle.puedeAnular ? (
                  anulando ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setAnulando(false)}
                      >
                        Volver
                      </Button>
                      <Button
                        type="submit"
                        form="anular-permiso"
                        disabled={pendiente}
                        aria-busy={pendiente}
                      >
                        {pendiente ? "Anulando…" : "Confirmar anulación"}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setAnulando(true)}>
                      Anular permiso
                    </Button>
                  )
                ) : (
                  <Button variant="outline" onClick={() => setDetalle(null)}>
                    Cerrar
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
