"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { EstadoAsistencia, ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { VistaPreviaAviso } from "@/components/VistaPreviaAviso";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";
import { hora12 } from "@/lib/fechas";
import { guardarListaAction, type EstadoGuardarLista } from "./actions";

const ORDEN: Estado[] = ["llego", "tarde", "falta", "problema"];

export type AlumnoLista = {
  id: string;
  nombres: string;
  apellidos: string;
  registro: { estado: Estado; hora: string; nota: string | null } | null;
};

export function ListaAsistencia({
  slug,
  salonId,
  ambito,
  alumnos,
  horaActual,
  previas,
}: {
  slug: string;
  salonId: string;
  ambito: string;
  alumnos: AlumnoLista[];
  horaActual: string;
  previas: Record<Estado, { asunto: string; html: string }>;
}) {
  const router = useRouter();
  const [marcas, setMarcas] = useState<Record<string, { estado: Estado; nota: string }>>(() =>
    Object.fromEntries(alumnos.map((a) => [a.id, { estado: a.registro?.estado ?? "llego", nota: a.registro?.nota ?? "" }])),
  );
  const [previaDe, setPreviaDe] = useState(alumnos[0]?.id ?? "");
  const [resultado, setResultado] = useState<EstadoGuardarLista | null>(null);
  const [guardando, iniciar] = useTransition();

  const conteo = useMemo(() => {
    const c: Record<Estado, number> = { llego: 0, tarde: 0, falta: 0, problema: 0 };
    for (const m of Object.values(marcas)) c[m.estado]++;
    return c;
  }, [marcas]);

  function marcar(id: string, estado: Estado) {
    setMarcas((m) => ({ ...m, [id]: { ...m[id], estado } }));
    setPreviaDe(id);
    setResultado(null);
  }

  function guardar() {
    iniciar(async () => {
      const r = await guardarListaAction(slug, {
        salonId,
        ambito,
        registros: alumnos.map((a) => ({
          alumnoId: a.id,
          estado: marcas[a.id].estado,
          ...(marcas[a.id].estado === "problema" && marcas[a.id].nota.trim() ? { nota: marcas[a.id].nota.trim() } : {}),
        })),
      });
      setResultado(r);
      if (r.ok) router.refresh();
    });
  }

  const alumnoPrevia = alumnos.find((a) => a.id === previaDe) ?? alumnos[0];
  const previa = alumnoPrevia ? previas[marcas[alumnoPrevia.id].estado] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-pizarra">
            Hora actual: <strong className="text-tinta">{hora12(horaActual)}</strong> · {alumnos.length} alumnos
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-acento hover:underline"
            onClick={() => setMarcas((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, estado: "llego" as Estado }])))}
          >
            Marcar a todos «Llegó»
          </button>
        </div>

        <ul className="flex flex-col gap-3">
          {alumnos.map((a) => {
            const marca = marcas[a.id];
            return (
              <li key={a.id} className="rounded-lg border border-arena bg-superficie p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {a.apellidos}, {a.nombres}
                  </p>
                  {a.registro && <EstadoAsistencia estado={a.registro.estado} hora={hora12(a.registro.hora)} />}
                </div>
                <div role="group" aria-label={`Asistencia de ${a.nombres}`} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ORDEN.map((estado) => {
                    const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[estado];
                    const activo = marca.estado === estado;
                    return (
                      <button
                        key={estado}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => marcar(a.id, estado)}
                        className={`flex min-h-14 items-center justify-center gap-2 rounded-md border-2 px-3 py-3 text-base font-semibold transition ${
                          activo ? `${clase} border-current` : "border-arena bg-superficie text-pizarra hover:bg-superficie-2"
                        }`}
                      >
                        <Icono className="h-5 w-5" strokeWidth={2} aria-hidden />
                        {palabra}
                      </button>
                    );
                  })}
                </div>
                {marca.estado === "problema" && (
                  <label className="mt-3 flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Nota para la familia (opcional)</span>
                    <input
                      maxLength={300}
                      value={marca.nota}
                      onChange={(e) => setMarcas((m) => ({ ...m, [a.id]: { ...m[a.id], nota: e.target.value } }))}
                      className="rounded-md border border-arena bg-superficie px-3 py-2 text-base"
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border border-arena bg-superficie p-4">
          <h2 className="mb-2 font-titulo font-semibold">Resumen</h2>
          <ul className="flex flex-wrap gap-2">
            {ORDEN.map((e) => (
              <li key={e} className="flex items-center gap-1 text-sm">
                <EstadoAsistencia estado={e} /> <span className="font-semibold">{conteo[e]}</span>
              </li>
            ))}
          </ul>
          <Boton type="button" onClick={guardar} disabled={guardando || alumnos.length === 0} className="mt-4 w-full py-3 text-base">
            <Send className="h-5 w-5" strokeWidth={2} aria-hidden />
            {guardando ? "Guardando…" : "Guardar y avisar a los padres"}
          </Boton>
          <div className="mt-3" aria-live="polite">
            {resultado?.ok && (
              <Alerta tipo="exito">
                Lista guardada. {resultado.familiasAvisadas === 1 ? "Se avisó a 1 familia." : `Se avisó a ${resultado.familiasAvisadas} familias.`}
              </Alerta>
            )}
            {resultado && !resultado.ok && <Alerta tipo="error">{resultado.error}</Alerta>}
          </div>
        </div>

        {alumnoPrevia && previa && (
          <div className="rounded-lg border border-arena bg-superficie p-4">
            <h2 className="mb-2 font-titulo font-semibold">Vista previa del correo</h2>
            <label className="mb-3 flex flex-col gap-1.5 text-sm">
              <span className="text-pizarra">Familia de</span>
              <select
                value={alumnoPrevia.id}
                onChange={(e) => setPreviaDe(e.target.value)}
                className="rounded-md border border-arena bg-superficie px-2 py-2"
              >
                {alumnos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombres} {a.apellidos}
                  </option>
                ))}
              </select>
            </label>
            <VistaPreviaAviso asunto={previa.asunto} html={previa.html} alumno={alumnoPrevia.nombres.split(" ")[0]} />
          </div>
        )}
      </aside>
    </div>
  );
}
