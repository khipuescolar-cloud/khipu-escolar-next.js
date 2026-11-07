"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Info, Loader2, ShieldCheck, ShieldX, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fechaLima } from "@/lib/fechas";
import type { EstadoNspCelda } from "@/lib/server/notas";
import { decidirRecuperacionAction } from "../actions";
import { registrarRecuperacionAction } from "./actions";
import { Elegir, opcionesDeNota, valorDe, type Datos } from "./comun";

export type CeldaNsp = { evaluacionId: string; alumnoId: string };

const corta = (iso: string) => new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Texto corto, ícono y explicación del estado de un NSP, para la celda de la tabla y para el diálogo. */
export function describirNsp(e: EstadoNspCelda | undefined, valor: string): { corto: string; largo: string; icono: typeof Clock; tono: string } {
  if (valor !== "NSP") return { corto: "Recuperado", largo: e?.fechaRecuperacion ? `Recuperación rendida el ${corta(e.fechaRecuperacion)}.` : "Nota puesta tras una recuperación.", icono: ShieldCheck, tono: "text-llego" };
  if (!e) return { corto: "Sin justificar", largo: "No se presentó: la asistencia lo marcó como falta.", icono: Clock, tono: "text-muted-foreground" };
  if (e.recuperacion === "autorizada") return { corto: "Recup. aprobada", largo: "Recuperación autorizada: pon la nota con la fecha en que la rindió.", icono: ShieldCheck, tono: "text-llego" };
  if (e.recuperacion === "denegada") return { corto: "Recup. denegada", largo: "No autorizaste la recuperación: el NSP se mantiene.", icono: ShieldX, tono: "text-falta" };
  if (e.justificacion === "aceptada") return { corto: "Recup. pendiente", largo: "Falta justificada: decide si autorizas la recuperación.", icono: CheckCircle2, tono: "text-llego" };
  if (e.justificacion === "pendiente") return { corto: "En revisión", largo: "La justificación de la familia está en revisión del tutor.", icono: Clock, tono: "text-muted-foreground" };
  if (e.justificacion === "rechazada") return { corto: "Rechazada", largo: "El tutor rechazó la justificación.", icono: XCircle, tono: "text-falta" };
  return { corto: "Sin justificar", largo: e.plazoVencido ? "Sin justificar: el plazo de la familia venció." : `Sin justificar: la familia puede hacerlo hasta el ${corta(e.venceEl)}.`, icono: Clock, tono: "text-muted-foreground" };
}

/**
 * NSP de una celda: su estado y, para el profesor del curso, la decisión sobre la recuperación y el registro de su nota
 * con la fecha. Se conserva la actividad original (specs/37): no se crea ninguna evaluación nueva.
 */
export function DialogoNsp({ celda, datos, slug, onCerrar, onCambio }: {
  celda: CeldaNsp | null; datos: Datos; slug: string; onCerrar: () => void; onCambio: () => void;
}) {
  const evaluacion = celda ? datos.evaluaciones.find((e) => e.id === celda.evaluacionId) : undefined;
  const alumno = celda ? datos.alumnos.find((a) => a.id === celda.alumnoId) : undefined;
  const nota = evaluacion?.notas.find((n) => n.alumnoId === celda?.alumnoId);
  const estado = celda ? datos.estadosNsp[`${celda.evaluacionId}:${celda.alumnoId}`] : undefined;
  const valor = valorDe(nota);
  const info = describirNsp(estado, valor);
  const Icono = info.icono;
  const [pendiente, transicion] = useTransition();
  const [valorNuevo, setValorNuevo] = useState("");
  const [fecha, setFecha] = useState(() => fechaLima(new Date()));
  const [error, setError] = useState("");
  const cerrar = () => { setError(""); setValorNuevo(""); onCerrar(); };

  const decidir = (decision: "autorizada" | "denegada") => {
    if (!celda) return;
    setError("");
    transicion(async () => {
      const r = await decidirRecuperacionAction(slug, celda.evaluacionId, celda.alumnoId, decision);
      if (!r.ok) { setError(r.error); return; }
      toast.success(r.mensaje ?? "Decisión registrada.");
      onCambio();
    });
  };
  const registrar = () => {
    if (!celda || !valorNuevo) return;
    setError("");
    transicion(async () => {
      const r = await registrarRecuperacionAction(slug, celda.evaluacionId, celda.alumnoId, valorNuevo, fecha);
      if (!r.ok) { setError(r.error); return; }
      toast.success("Recuperación registrada.");
      cerrar();
      onCambio();
    });
  };

  const esNsp = valor === "NSP";
  const puedeDecidir = datos.puedeEditar && esNsp && estado?.justificacion === "aceptada" && estado.recuperacion === null;
  const puedeRegistrar = datos.puedeEditar && esNsp && estado?.recuperacion === "autorizada";
  return (
    <Dialog open={!!celda && !!evaluacion && !!alumno} onOpenChange={(v) => { if (!v) cerrar(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esNsp ? "NSP · No se presentó" : "Recuperación registrada"}</DialogTitle>
          <DialogDescription>{alumno?.apellidos}, {alumno?.nombres} · {evaluacion?.titulo}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <p className={`flex items-start gap-2 text-sm ${info.tono}`} data-testid="estado-nsp"><Icono className="mt-0.5 size-4 shrink-0" aria-hidden /><span><strong>{info.corto}.</strong> {info.largo}</span></p>
          {estado?.incidencia && <p className="flex items-start gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />La falta viene de una incidencia o retiro anticipado.</p>}
          {!esNsp && nota && <p className="text-sm">Nota: <strong>{valor}</strong>. La actividad conserva su fecha original; el historial guarda el NSP.</p>}
          {esNsp && !puedeDecidir && !puedeRegistrar && estado?.recuperacion !== "denegada" && estado?.justificacion !== "aceptada" && (
            <p className="text-sm text-muted-foreground">La recuperación se decide cuando el tutor aprueba la justificación de la falta.</p>
          )}
          {esNsp && !datos.puedeEditar && estado?.justificacion === "aceptada" && estado.recuperacion === null && <p className="text-sm text-muted-foreground">Solo el profesor del curso decide la recuperación.</p>}
          {puedeDecidir && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={pendiente} onClick={() => decidir("autorizada")}>{pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}Autorizar recuperación</Button>
              <Button variant="outline" disabled={pendiente} onClick={() => decidir("denegada")}><ShieldX aria-hidden />No autorizar</Button>
            </div>
          )}
          {puedeRegistrar && (
            <form className="grid gap-3" onSubmit={(ev) => { ev.preventDefault(); registrar(); }}>
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">Nota de la recuperación</span>
                <Elegir value={valorNuevo || "pendiente"} onChange={(v) => setValorNuevo(v === "pendiente" ? "" : v)} opciones={opcionesDeNota(datos.escala).map((o) => (o.value === "pendiente" ? { ...o, label: "Elegir nota" } : o))} etiqueta="Nota de la recuperación" className="w-40" />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="fecha-recuperacion" className="text-sm font-medium">Fecha en que la rindió</label>
                <Input id="fecha-recuperacion" type="date" required max={fechaLima(new Date())} value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-44" />
              </div>
              <Button type="submit" disabled={pendiente || !valorNuevo || !fecha} className="justify-self-start">{pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}Registrar recuperación</Button>
            </form>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
