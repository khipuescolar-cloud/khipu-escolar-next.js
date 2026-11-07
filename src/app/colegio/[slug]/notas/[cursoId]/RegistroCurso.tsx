"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { editarCeldaAction } from "./actions";
import { CabeceraRegistro } from "./CabeceraRegistro";
import type { Datos, Evaluacion } from "./comun";
import { DetalleActividad } from "./DetalleActividad";
import { DialogoCorreccion, type Correccion } from "./DialogoCorreccion";
import { DialogoObservacion, type CeldaObservacion } from "./DialogoObservacion";
import { ImportarExportar } from "./ImportarExportar";
import { InformeProgreso } from "./InformeProgreso";
import { NuevaCalificacion } from "./NuevaCalificacion";
import { TablaRegistro } from "./TablaRegistro";

export function RegistroCurso({ datos, slug, gestionar, botonPeriodo }: { datos: Datos; slug: string; gestionar: boolean; botonPeriodo?: ReactNode }) {
  const router = useRouter();
  const [pendiente, transicion] = useTransition();
  const [nueva, setNueva] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const detalle = datos.evaluaciones.find((e) => e.id === detalleId) ?? null;
  const [observacion, setObservacion] = useState<CeldaObservacion | null>(null);
  const [informe, setInforme] = useState(false);
  const [archivos, setArchivos] = useState(false);
  const [correccion, setCorreccion] = useState<Correccion | null>(null);
  const [errorCorreccion, setErrorCorreccion] = useState("");
  const [error, setError] = useState("");
  const [resaltar, setResaltar] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});

  const guardarCelda = (evaluacionId: string, alumnoId: string, nuevo: string, motivo?: string) => {
    setError(""); setErrorCorreccion("");
    transicion(async () => {
      const r = await editarCeldaAction(slug, evaluacionId, alumnoId, nuevo, motivo);
      if (r.ok) {
        setValores((v) => ({ ...v, [`${evaluacionId}:${alumnoId}`]: nuevo }));
        setEditando(null); setCorreccion(null); router.refresh();
      } else if (motivo) setErrorCorreccion(r.error);
      else setError(r.error);
    });
  };
  // El motivo se pide solo si la celda ya tenía valor o la actividad está publicada.
  const cambiarCelda = (e: Evaluacion, alumnoId: string, previo: string, nuevo: string) => {
    if (!datos.puedeEditar) return;
    if (!previo && e.estado !== "publicada") { guardarCelda(e.id, alumnoId, nuevo); return; }
    const a = datos.alumnos.find((x) => x.id === alumnoId);
    setErrorCorreccion("");
    setCorreccion({ evaluacionId: e.id, actividad: e.titulo, alumno: a ? `${a.apellidos}, ${a.nombres}` : "", alumnoId, previo, nuevo });
  };

  return (
    <div className="space-y-5">
      <CabeceraRegistro datos={datos} gestionar={gestionar} botonPeriodo={botonPeriodo} onNueva={() => setNueva(true)} onInforme={() => setInforme(true)} onArchivos={() => setArchivos(true)} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <TablaRegistro datos={datos} valores={valores} editando={editando} ocupado={pendiente} resaltar={resaltar} onDetalle={(e) => setDetalleId(e.id)} onEditar={setEditando} onCambio={cambiarCelda} onObservacion={setObservacion} />
      <DetalleActividad evaluacion={detalle} datos={datos} slug={slug} onCerrar={() => setDetalleId(null)} onAsignada={() => { setDetalleId(null); router.refresh(); }} />
      <DialogoObservacion celda={observacion} slug={slug} editable={datos.puedeEditar} onCerrar={() => { setObservacion(null); setEditando(null); }} onGuardada={() => { setObservacion(null); setEditando(null); toast.success("Observación guardada."); router.refresh(); }} />
      <InformeProgreso abierto={informe} onCerrar={() => setInforme(false)} datos={datos} slug={slug} />
      <ImportarExportar abierto={archivos} onCerrar={() => setArchivos(false)} datos={datos} slug={slug} onImportada={(id) => { setArchivos(false); setResaltar(id); router.refresh(); }} />
      <NuevaCalificacion datos={datos} slug={slug} abierto={nueva} onCerrar={() => setNueva(false)} onGuardada={(id) => { setNueva(false); setResaltar(id); toast.success("Calificación guardada."); router.refresh(); }} />
      <DialogoCorreccion
        key={correccion ? `${correccion.evaluacionId}:${correccion.alumnoId}` : "cerrado"}
        correccion={correccion} guardando={pendiente} errorServidor={errorCorreccion}
        onCancelar={() => { setCorreccion(null); setEditando(null); }}
        onGuardar={(motivo) => correccion && guardarCelda(correccion.evaluacionId, correccion.alumnoId, correccion.nuevo, motivo)}
      />
    </div>
  );
}
