"use client";

import { useState } from "react";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  salones: { id: string; nombre: string }[];
  alumnos: { id: string; nombre: string; salon: string }[];
  puedeColegio: boolean;
  fechaInicial: string;
};

/** Campos del formulario «Convocar reunión»: el selector de salón o alumno depende del alcance elegido. */
export function CamposConvocatoria({ salones, alumnos, puedeColegio, fechaInicial }: Props) {
  const [alcance, setAlcance] = useState<"colegio" | "salon" | "individual">(puedeColegio ? "colegio" : "salon");
  return (
    <>
      <div className="sm:col-span-2"><Campo etiqueta="Título" name="titulo" required maxLength={150} placeholder="Reunión de padres de familia" /></div>
      <Selector etiqueta="¿A quién convocas?" name="alcance" value={alcance} onChange={(e) => setAlcance(e.target.value as typeof alcance)}>
        {puedeColegio && <option value="colegio">A todo el colegio</option>}
        <option value="salon">A un salón</option>
        <option value="individual">A la familia de un alumno</option>
      </Selector>
      {alcance === "salon" && (
        <Selector etiqueta="Salón" name="salonId" required>
          {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Selector>
      )}
      {alcance === "individual" && (
        <Selector etiqueta="Alumno" name="alumnoId" required>
          {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {a.salon}</option>)}
        </Selector>
      )}
      <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={fechaInicial} />
      <Campo etiqueta="Hora de inicio" name="hora" type="time" required defaultValue="18:00" />
      <Campo etiqueta="Hora de fin (opcional)" name="horaFin" type="time" />
      <Campo etiqueta="Lugar" name="lugar" maxLength={200} placeholder="Aula 3.° B" />
      <div className="sm:col-span-2"><Campo etiqueta="Enlace de videollamada" name="enlace" type="url" maxLength={500} placeholder="https://meet.google.com/…" ayuda="Indica el lugar, el enlace o ambos." /></div>
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">Descripción (opcional)</span>
        <Textarea name="descripcion" rows={3} maxLength={1000} placeholder="Temas que se tratarán." />
      </label>
    </>
  );
}
