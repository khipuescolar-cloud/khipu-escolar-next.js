"use client";

import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { EstadoAsistencia, ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { VistaPreviaAviso } from "@/components/VistaPreviaAviso";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";
import { hora12 } from "@/lib/fechas";
import { esErrorDeRed } from "@/lib/registro-offline";
import { resumenAvisosLista, textoResumenAvisos } from "@/lib/resumen-avisos-lista";
import { guardarListaAction, type EstadoGuardarLista } from "./actions";
import { colaListas } from "./colaListas";

const ORDEN: Estado[] = ["llego", "tarde", "falta", "problema"];

export type AlumnoLista = {
  id: string;
  nombres: string;
  apellidos: string;
  registro: { estado: Estado; hora: string; nota: string | null } | null;
  /** Familias que recibirán el aviso de este alumno. */
  familiasConAviso: number;
  /** Su llegada ya se avisó hoy (portería u otra lista): no se repite. */
  llegadaAvisada: boolean;
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
  const [guardadaSinConexion, setGuardadaSinConexion] = useState(false);
  const [guardando, iniciar] = useTransition();

  const conteo = useMemo(() => {
    const c: Record<Estado, number> = { llego: 0, tarde: 0, falta: 0, problema: 0 };
    for (const m of Object.values(marcas)) c[m.estado]++;
    return c;
  }, [marcas]);
  const avisos = useMemo(
    () => resumenAvisosLista(alumnos, Object.fromEntries(Object.entries(marcas).map(([id, m]) => [id, m.estado]))),
    [alumnos, marcas],
  );

  function marcar(id: string, estado: Estado) {
    setMarcas((m) => ({ ...m, [id]: { ...m[id], estado } }));
    setPreviaDe(id);
    setResultado(null);
  }

  function guardar() {
    iniciar(async () => {
      setGuardadaSinConexion(false);
      const registros = alumnos.map((a) => ({
        alumnoId: a.id,
        estado: marcas[a.id].estado,
        ...(marcas[a.id].estado === "problema" && marcas[a.id].nota.trim() ? { nota: marcas[a.id].nota.trim() } : {}),
      }));
      const guardarSinConexion = async () => {
        const ahora = new Date().toISOString();
        await colaListas.guardar({ id: `${salonId}:${ambito}`, creadoAt: ahora, registradoAt: ahora, slug, salonId, ambito, registros });
        setResultado(null);
        setGuardadaSinConexion(true);
        toast.warning("Lista guardada en este dispositivo. Se enviará sola cuando vuelva la conexión.");
      };
      if (!navigator.onLine) return guardarSinConexion();
      try {
        const r = await guardarListaAction(slug, { salonId, ambito, registros });
        setResultado(r);
        if (r.ok) {
          toast.success("Asistencia guardada");
          router.refresh();
        }
      } catch (error) {
        if (esErrorDeRed(error, navigator.onLine)) return guardarSinConexion();
        throw error;
      }
    });
  }

  const alumnoPrevia = alumnos.find((a) => a.id === previaDe) ?? alumnos[0];
  const previa = alumnoPrevia ? previas[marcas[alumnoPrevia.id].estado] : null;

  const botonGuardar = (className: string) => (
    <Boton type="button" tamano="lg" onClick={guardar} disabled={guardando || alumnos.length === 0} className={className}>
      {guardando ? <Loader2 className="size-5 animate-spin" strokeWidth={2} aria-hidden /> : <Send className="size-5" strokeWidth={2} aria-hidden />}
      {guardando ? "Guardando…" : "Guardar y avisar a los padres"}
    </Boton>
  );
  const resumenConteo = (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
        {ORDEN.map((e) => (
          <li key={e} className="flex items-center gap-1 text-sm">
            <EstadoAsistencia estado={e} /> <span className="font-semibold">{conteo[e]}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-1.5 text-sm" data-testid="resumen-avisos">
        <Mail className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
        <span>
          {textoResumenAvisos(avisos)}
          {avisos.llegadasYaAvisadas > 0 && (
            <span className="text-muted-foreground">
              {" "}
              {avisos.llegadasYaAvisadas === 1 ? "La llegada de 1 alumno ya se avisó hoy." : `La llegada de ${avisos.llegadasYaAvisadas} alumnos ya se avisó hoy.`}
            </span>
          )}
        </span>
      </p>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Hora actual: <strong className="text-foreground">{hora12(horaActual)}</strong> · {alumnos.length} alumnos
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMarcas((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, estado: "llego" as Estado }])));
              setResultado(null);
            }}
          >
            <CheckCircle2 strokeWidth={2} aria-hidden /> Marcar a todos «Llegó»
          </Button>
        </div>

        <div aria-live="polite">
          {resultado?.ok && (
            <Alerta tipo="exito">
              Lista guardada. {resultado.familiasAvisadas === 1 ? "Se avisó a 1 familia." : `Se avisó a ${resultado.familiasAvisadas} familias.`}
            </Alerta>
          )}
          {resultado && !resultado.ok && <Alerta tipo="error">{resultado.error}</Alerta>}
          {guardadaSinConexion && (
            <Alerta tipo="aviso">Sin conexión: la lista quedó guardada en este dispositivo y se enviará sola al volver la conexión. Las familias recibirán el aviso entonces.</Alerta>
          )}
        </div>

        <ul className="flex flex-col gap-3">
          {alumnos.map((a) => {
            const marca = marcas[a.id];
            return (
              <li key={a.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-heading font-semibold">
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
                            className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-base font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                              activo ? `${clase} border-current` : "border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                          >
                            <Icono className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                            {palabra}
                          </button>
                        );
                      })}
                    </div>
                    {marca.estado === "problema" && (
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium">Nota para la familia (opcional)</span>
                        <Input
                          maxLength={300}
                          value={marca.nota}
                          onChange={(e) => setMarcas((m) => ({ ...m, [a.id]: { ...m[a.id], nota: e.target.value } }))}
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>

        {/* Barra de acción fija abajo en móvil y tableta; en escritorio el botón vive en el panel lateral. */}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
          {resumenConteo}
          {botonGuardar("w-full")}
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="font-heading font-semibold">Resumen</h2>
            {resumenConteo}
            {botonGuardar("mt-1 w-full max-lg:hidden")}
            <p className="text-xs text-muted-foreground max-lg:hidden">Al guardar, las familias de los presentes, tardanzas, faltas y problemas reciben el aviso por correo y notificación. La llegada se avisa una sola vez al día.</p>
          </CardContent>
        </Card>

        {alumnoPrevia && previa && (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="font-heading font-semibold">Vista previa del correo</h2>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Familia de</span>
                <NativeSelect className="w-full" value={alumnoPrevia.id} onChange={(e) => setPreviaDe(e.target.value)}>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombres} {a.apellidos}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <VistaPreviaAviso asunto={previa.asunto} html={previa.html} alumno={alumnoPrevia.nombres.split(" ")[0]} />
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
