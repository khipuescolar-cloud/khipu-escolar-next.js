"use client";

import { CalendarCheck, Check, Info, Loader2, Mail, Send } from "lucide-react";
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
import { textoHorasPermiso } from "@/lib/permisos-asistencia";
import { esErrorDeRed } from "@/lib/registro-offline";
import { ingresoAlColegio } from "@/lib/asistencia-por-curso";
import { notasResumenAvisos, resumenAvisosLista, textoResumenAvisos } from "@/lib/resumen-avisos-lista";
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
  /** Solo listas de curso: ingreso al colegio de ese día (portería o lista del día). */
  ingreso: { estado: Estado; hora: string } | null;
  /** Permiso de asistencia vigente ese día (specs/04). */
  permiso?: { todoElDia: boolean; horaDesde: string | null; horaHasta: string | null } | null;
};

/** Dirección corrige una lista (desde los reportes): solo se envían los alumnos que cambió. */
export type ModoCorregir = { fecha: string; avisa: boolean };

export function ListaAsistencia({
  slug,
  salonId,
  ambito,
  alumnos,
  horaActual,
  previas,
  esCurso = false,
  exigeIngreso = false,
  corregir = null,
}: {
  slug: string;
  salonId: string;
  ambito: string;
  alumnos: AlumnoLista[];
  horaActual: string;
  /** null: ese estado no se avisa (llegada en un curso, o corrección de un día pasado). */
  previas: Record<Estado, { asunto: string; html: string } | null>;
  esCurso?: boolean;
  /** Control de ingreso (specs/05): en la lista de un curso, quien no ingresó al colegio hoy solo puede quedar con falta. */
  exigeIngreso?: boolean;
  corregir?: ModoCorregir | null;
}) {
  const bloqueado = (a: AlumnoLista) => exigeIngreso && !ingresoAlColegio(a.ingreso);
  const router = useRouter();
  // Al pasar lista, «Llegó» por defecto. Al corregir, solo lo ya registrado: un alumno sin registro queda sin marcar.
  const [marcas, setMarcas] = useState<Record<string, { estado: Estado | null; nota: string }>>(() =>
    Object.fromEntries(
      alumnos.map((a) => [
        a.id,
        { estado: bloqueado(a) ? "falta" : (a.registro?.estado ?? (corregir ? null : "llego")), nota: a.registro?.nota ?? "" },
      ]),
    ),
  );
  const [previaDe, setPreviaDe] = useState(alumnos[0]?.id ?? "");
  const [resultado, setResultado] = useState<EstadoGuardarLista | null>(null);
  const [guardadaSinConexion, setGuardadaSinConexion] = useState(false);
  const [guardando, iniciar] = useTransition();

  const conteo = useMemo(() => {
    const c: Record<Estado, number> = { llego: 0, tarde: 0, falta: 0, problema: 0 };
    for (const m of Object.values(marcas)) if (m.estado) c[m.estado]++;
    return c;
  }, [marcas]);
  const avisos = useMemo(
    () => resumenAvisosLista(alumnos, Object.fromEntries(Object.entries(marcas).map(([id, m]) => [id, m.estado])), esCurso),
    [alumnos, marcas, esCurso],
  );
  const avisa = !corregir || corregir.avisa;

  function marcar(id: string, estado: Estado) {
    setMarcas((m) => ({ ...m, [id]: { ...m[id], estado } }));
    setPreviaDe(id);
    setResultado(null);
  }

  function guardar() {
    iniciar(async () => {
      setGuardadaSinConexion(false);
      const registros = alumnos.flatMap((a) => {
        const { estado, nota } = marcas[a.id];
        if (!estado) return [];
        // Al corregir solo se envía lo que cambió (estado o nota del aviso).
        if (corregir && a.registro?.estado === estado && (estado !== "problema" || (a.registro.nota ?? "") === nota.trim())) return [];
        return [{ alumnoId: a.id, estado, ...(estado === "problema" && nota.trim() ? { nota: nota.trim() } : {}) }];
      });
      if (registros.length === 0) {
        setResultado({ ok: false, error: "No hay cambios para guardar." });
        return;
      }
      if (corregir) {
        // Dirección corrige en línea: sin cola sin conexión (la corrección puede ser de otro día).
        try {
          const r = await guardarListaAction(slug, { salonId, ambito, registros, fecha: corregir.fecha });
          setResultado(r);
          if (r.ok) {
            toast.success("Corrección guardada");
            router.refresh();
          }
        } catch (error) {
          if (!esErrorDeRed(error, navigator.onLine)) throw error;
          setResultado({ ok: false, error: "Sin conexión: vuelve a intentarlo cuando tengas internet." });
        }
        return;
      }
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
  const estadoPrevia = alumnoPrevia ? marcas[alumnoPrevia.id].estado : null;
  const previa = estadoPrevia ? previas[estadoPrevia] : null;
  // Falta a clase de un alumno sin ingreso al colegio: no se avisa aparte (specs/04).
  const faltaSinIngreso = esCurso && estadoPrevia === "falta" && !ingresoAlColegio(alumnoPrevia?.ingreso);
  const sinAvisoPrevia = !avisa
    ? "Es la corrección de un día pasado: se guarda sin avisar a las familias."
    : !estadoPrevia
      ? "Elige un estado para ver el aviso."
      : esCurso && estadoPrevia === "llego"
        ? "En las listas de curso no se avisa la llegada: la familia ya recibe el aviso de ingreso al colegio."
        : faltaSinIngreso
          ? `${alumnoPrevia?.nombres.split(" ")[0]} no registra ingreso al colegio hoy: su familia recibe el aviso de la asistencia del día y esta falta no se avisa aparte.`
          : null;
  const textoGuardar = corregir ? (avisa ? "Guardar corrección y avisar" : "Guardar corrección") : "Guardar y avisar a los padres";

  const botonGuardar = (className: string) => (
    <Boton type="button" tamano="lg" onClick={guardar} disabled={guardando || alumnos.length === 0} className={className}>
      {guardando ? <Loader2 className="size-5 animate-spin" strokeWidth={2} aria-hidden /> : <Send className="size-5" strokeWidth={2} aria-hidden />}
      {guardando ? "Guardando…" : textoGuardar}
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
          {avisa ? textoResumenAvisos(avisos) : "Corrección de un día pasado: no se envían avisos."}
          {avisa && notasResumenAvisos(avisos).map((n) => (
            <span key={n} className="text-muted-foreground"> {n}</span>
          ))}
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
          {!corregir && <Button
            type="button"
            variant="outline"
            onClick={() => {
              const sinIngreso = new Set(alumnos.filter(bloqueado).map((a) => a.id));
              setMarcas((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, estado: (sinIngreso.has(k) ? "falta" : "llego") as Estado }])));
              setResultado(null);
            }}
          >
            <Check strokeWidth={2} aria-hidden /> Marcar a todos «Llegó»
          </Button>}
        </div>

        <div aria-live="polite">
          {resultado?.ok && (
            <Alerta tipo="exito">
              {corregir ? "Corrección guardada." : "Lista guardada."} {resultado.familiasAvisadas === 1 ? "Se avisó a 1 familia." : `Se avisó a ${resultado.familiasAvisadas} familias.`}
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
            const sinIngreso = bloqueado(a);
            return (
              <li key={a.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-cuerpo font-semibold">
                        {a.apellidos}, {a.nombres}
                      </p>
                      <span className="flex flex-wrap items-center gap-2">
                        {a.permiso && (
                          <span className="inline-flex items-center gap-1 rounded-pildora bg-muted px-2 py-0.5 text-etiqueta">
                            <CalendarCheck className="size-3.5" strokeWidth={2} aria-hidden /> Con permiso · {textoHorasPermiso(a.permiso, hora12)}
                          </span>
                        )}
                        {esCurso && (
                          <span className="text-cuerpo-sm text-muted-foreground">
                            {ingresoAlColegio(a.ingreso) ? `Ingresó ${hora12(a.ingreso!.hora)}` : "Sin ingreso al colegio"}
                          </span>
                        )}
                        {a.registro ? (
                          <EstadoAsistencia estado={a.registro.estado} hora={hora12(a.registro.hora)} />
                        ) : (
                          corregir && <span className="text-cuerpo-sm text-muted-foreground">Sin registro</span>
                        )}
                      </span>
                    </div>
                    {sinIngreso && (
                      <p id={`sin-ingreso-${a.id}`} className="text-cuerpo-sm text-muted-foreground">
                        No pasó por portería hoy, así que queda con falta. Si ya llegó, pide a portería que registre su ingreso.
                      </p>
                    )}
                    <div
                      role="group"
                      aria-label={`Asistencia de ${a.nombres}`}
                      aria-describedby={sinIngreso ? `sin-ingreso-${a.id}` : undefined}
                      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    >
                      {ORDEN.map((estado) => {
                        const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[estado];
                        const activo = marca.estado === estado;
                        const deshabilitado = sinIngreso && estado !== "falta";
                        return (
                          <button
                            key={estado}
                            type="button"
                            aria-pressed={activo}
                            disabled={deshabilitado}
                            onClick={() => marcar(a.id, estado)}
                            className={`flex min-h-12 items-center justify-center gap-2 rounded-md border-2 px-3 py-2.5 text-cuerpo font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 ${
                              activo ? `${clase} border-current` : "border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:hover:bg-card disabled:hover:text-muted-foreground"
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

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-titulo-2">Resumen</h2>
            {resumenConteo}
            {botonGuardar("mt-1 w-full max-lg:hidden")}
            <p className="text-cuerpo-sm text-muted-foreground max-lg:hidden">
              {!avisa
                ? "Se guarda y queda en la auditoría. No se avisa a las familias porque no es el día de hoy."
                : esCurso
                  ? "Al guardar, las familias reciben el aviso de tardanzas, faltas a clase y problemas. La llegada a clase no se avisa; la falta solo si el alumno ingresó al colegio."
                  : "Al guardar, las familias de los presentes, tardanzas, faltas y problemas reciben el aviso por correo y notificación. La llegada se avisa una sola vez al día."}
            </p>
          </CardContent>
        </Card>

        {alumnoPrevia && (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-titulo-2">Vista previa del correo</h2>
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
              {previa && !sinAvisoPrevia ? (
                <VistaPreviaAviso
                  asunto={previa.asunto}
                  html={previa.html}
                  alumno={alumnoPrevia.nombres.split(" ")[0]}
                  horaIngreso={esCurso && alumnoPrevia.ingreso ? alumnoPrevia.ingreso.hora : undefined}
                />
              ) : (
                <p className="flex items-start gap-2 text-cuerpo-sm text-muted-foreground" data-testid="sin-aviso">
                  <Info className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
                  {sinAvisoPrevia ?? "Este estado no se avisa a la familia."}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
