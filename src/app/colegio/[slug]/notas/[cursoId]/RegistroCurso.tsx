"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { editarCeldaAction } from "./actions";
import { CabeceraRegistro } from "./CabeceraRegistro";
import type { Datos, Evaluacion } from "./comun";
import { DetalleActividad } from "./DetalleActividad";
import { DialogoCorreccion, type Correccion } from "./DialogoCorreccion";
import { NuevaCalificacion } from "./NuevaCalificacion";
import { TablaRegistro } from "./TablaRegistro";

export function RegistroCurso({ datos, slug, gestionar }: { datos: Datos; slug: string; gestionar: boolean }) {
  const router = useRouter();
  const [pendiente, transicion] = useTransition();
  const [nueva, setNueva] = useState(false);
  const [detalle, setDetalle] = useState<Evaluacion | null>(null);
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
      <CabeceraRegistro datos={datos} gestionar={gestionar} onNueva={() => setNueva(true)} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <TablaRegistro datos={datos} valores={valores} editando={editando} ocupado={pendiente} resaltar={resaltar} onDetalle={setDetalle} onEditar={setEditando} onCambio={cambiarCelda} />
      <DetalleActividad evaluacion={detalle} datos={datos} slug={slug} onCerrar={() => setDetalle(null)} onAsignada={() => { setDetalle(null); router.refresh(); }} />
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
