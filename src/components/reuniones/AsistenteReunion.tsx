"use client";

import { ArrowLeft, ArrowRight, CalendarCheck, Loader2, Search, UserMinus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ModalidadReunion, TipoReunion } from "@/generated/prisma/enums";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Textarea } from "@/components/ui/textarea";
import { horaTexto, type Analisis, type Seleccion } from "@/lib/asistente-horario";
import { TEXTO_MODALIDAD, TEXTO_TIPO, familiasDelTipo } from "@/lib/reuniones";
import type { Disponibilidad } from "@/lib/server/disponibilidad";
import type { ResultadoReserva } from "@/lib/server/reuniones";
import { PasoHorario, fechaCorta } from "./PasoHorario";

type Persona = { id: string; nombre: string; rol: string; cargo: string | null };
type Opciones = {
  tipos: TipoReunion[];
  salones: { id: string; nombre: string; soyTutor: boolean }[];
  alumnos: { id: string; nombre: string; salon: string }[];
  personal: Persona[];
  puedeColegio: boolean;
  puedeForzarClase: boolean;
};

type Props = {
  opciones: Opciones;
  fechaInicial: string;
  hoy: string;
  consultar: (entrada: unknown) => Promise<Disponibilidad | { error: string }>;
  confirmar: (entrada: unknown) => Promise<ResultadoReserva>;
};

const ROL: Record<string, string> = { direccion: "Dirección", profesor: "Docente", administrativo: "Administrativo" };
const PASOS = ["Tipo y participantes", "Horario", "Detalles"];

/** Asistente de 3 pasos para programar una reunión con la disponibilidad del personal en un calendario (specs/40). */
export function AsistenteReunion({ opciones, fechaInicial, hoy, consultar, confirmar }: Props) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoReunion>(opciones.tipos[0]);
  const [busqueda, setBusqueda] = useState("");
  const [elegidos, setElegidos] = useState<Map<string, "requerido" | "opcional">>(new Map());
  const [alcance, setAlcance] = useState<"ninguno" | "individual" | "salon" | "colegio">(familiasDelTipo(opciones.tipos[0]) === "obligatorias" ? "individual" : "ninguno");
  const [salonId, setSalonId] = useState(opciones.salones[0]?.id ?? "");
  const [alumnoId, setAlumnoId] = useState(opciones.alumnos[0]?.id ?? "");

  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [duracion, setDuracion] = useState(30);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [fueraDeHorario, setFueraDeHorario] = useState(false);
  const [forzarClase, setForzarClase] = useState(false);

  const reglaFamilias = familiasDelTipo(tipo);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    if (q.length < 2) return [];
    return opciones.personal.filter((p) => !elegidos.has(p.id) && `${p.nombre} ${p.cargo ?? ""}`.toLocaleLowerCase("es").includes(q)).slice(0, 8);
  }, [busqueda, elegidos, opciones.personal]);
  const nombre = (id: string) => opciones.personal.find((p) => p.id === id)?.nombre ?? "";
  const ids = (rol: "requerido" | "opcional") => [...elegidos].filter(([, r]) => r === rol).map(([id]) => id);
  const familias = { ninguno: null, individual: "La familia del alumno", salon: "Familias del salón", colegio: "Todas las familias" }[alcance];

  function cambiarTipo(t: TipoReunion) {
    setTipo(t);
    const regla = familiasDelTipo(t);
    if (regla === "prohibidas") setAlcance("ninguno");
    if (regla === "obligatorias" && alcance === "ninguno") setAlcance("individual");
  }

  function elegir(id: string, rol: "requerido" | "opcional") {
    setElegidos(new Map(elegidos).set(id, rol));
    setBusqueda("");
  }

  function quitar(id: string) {
    const m = new Map(elegidos);
    m.delete(id);
    setElegidos(m);
  }

  const fecha = seleccion?.fecha ?? "";
  const hora = seleccion ? horaTexto(seleccion.inicio) : "";

  function seguirConHorario(a: Analisis) {
    setAnalisis(a);
    if (!a.fueraDeHorario) setFueraDeHorario(false);
    if (!a.soloClases) setForzarClase(false);
    setError(null);
    setPaso(2);
  }

  function enviar(form: FormData) {
    setError(null);
    iniciar(async () => {
      const r = await confirmar({
        tipo, titulo: form.get("titulo"), motivo: form.get("motivo"), modalidad: form.get("modalidad"), lugar: form.get("lugar"), enlace: form.get("enlace"),
        observaciones: form.get("observaciones"), fecha, hora, duracion, alcance,
        salonId: alcance === "salon" ? salonId : "", alumnoId: alcance === "individual" ? alumnoId : "",
        requeridos: ids("requerido"), opcionales: ids("opcional"), fueraDeHorario, forzarClase, motivoForzar: form.get("motivoForzar") ?? "",
      });
      if (r.ok) {
        toast.success(r.mensaje ?? "Reunión confirmada.");
        router.push(`/reuniones/${r.id}`);
        return;
      }
      setError(r.error);
      // La franja se ocupó: vuelve al calendario, que se recalcula con la agenda nueva.
      if (r.alternativas) setPaso(1);
    });
  }

  const puedeSeguir = paso !== 0 || elegidos.size > 0 || alcance !== "ninguno";

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-2 text-cuerpo-sm" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li key={p} aria-current={i === paso ? "step" : undefined} className={`rounded-pildora px-3 py-1 ${i === paso ? "bg-primary text-primary-foreground" : i < paso ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
            {i + 1}. {p}
          </li>
        ))}
      </ol>
      {error && <Alerta tipo="error">{error}</Alerta>}

      {paso === 0 && (
        <Tarjeta className="flex flex-col gap-4">
          <Selector etiqueta="Tipo de reunión" value={tipo} onChange={(e) => cambiarTipo(e.target.value as TipoReunion)}>
            {opciones.tipos.map((t) => <option key={t} value={t}>{TEXTO_TIPO[t]}</option>)}
          </Selector>
          <div className="flex flex-col gap-2">
            <label htmlFor="buscar-personal" className="text-sm font-medium">Personal del colegio</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} aria-hidden />
              <input id="buscar-personal" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribe al menos 2 letras del nombre" className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-cuerpo" />
            </div>
            {filtrados.length > 0 && (
              <ul className="flex flex-col divide-y rounded-lg border">
                {filtrados.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
                    <span>{p.nombre} <span className="text-muted-foreground">· {p.cargo ?? ROL[p.rol] ?? p.rol}</span></span>
                    <span className="flex gap-1">
                      <button type="button" onClick={() => elegir(p.id, "requerido")} className={buttonVariants({ size: "sm" })}>Requerido</button>
                      <button type="button" onClick={() => elegir(p.id, "opcional")} className={buttonVariants({ size: "sm", variant: "outline" })}>Opcional</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {elegidos.size > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Participantes elegidos">
                {[...elegidos].map(([id, rol]) => (
                  <li key={id} className="inline-flex items-center gap-1 rounded-pildora bg-accent px-3 py-1 text-cuerpo-sm text-accent-foreground">
                    {nombre(id)} · {rol === "requerido" ? "Requerido" : "Opcional"}
                    <button type="button" onClick={() => quitar(id)} aria-label={`Quitar a ${nombre(id)}`}><X className="size-3.5" strokeWidth={2} aria-hidden /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {reglaFamilias !== "prohibidas" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector etiqueta="Familias" value={alcance} onChange={(e) => setAlcance(e.target.value as typeof alcance)}>
                {reglaFamilias === "opcionales" && <option value="ninguno">Sin familias</option>}
                <option value="individual">La familia de un alumno</option>
                <option value="salon">Las familias de un salón</option>
                {opciones.puedeColegio && <option value="colegio">Todas las familias del colegio</option>}
              </Selector>
              {alcance === "salon" && (
                <Selector etiqueta="Salón" value={salonId} onChange={(e) => setSalonId(e.target.value)}>
                  {opciones.salones.filter((s) => tipo !== "tutoria" || s.soyTutor || opciones.puedeColegio).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </Selector>
              )}
              {alcance === "individual" && (
                <Selector etiqueta="Alumno" value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)}>
                  {opciones.alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {a.salon}</option>)}
                </Selector>
              )}
            </div>
          )}
        </Tarjeta>
      )}

      {paso === 1 && (
        <PasoHorario
          consultar={consultar}
          requeridos={ids("requerido")}
          opcionales={ids("opcional")}
          familias={familias}
          fechaInicial={fechaInicial}
          hoy={hoy}
          puedeForzarClase={opciones.puedeForzarClase}
          seleccion={seleccion}
          onSeleccion={setSeleccion}
          duracion={duracion}
          onDuracion={setDuracion}
          forzarClase={forzarClase}
          onForzarClase={setForzarClase}
          onSeguir={seguirConHorario}
        />
      )}

      {paso === 2 && (
        <form action={enviar} className="flex flex-col gap-4">
          <Tarjeta className="grid gap-4 sm:grid-cols-2">
            <p className="text-cuerpo-sm text-muted-foreground sm:col-span-2">
              {TEXTO_TIPO[tipo]} · <span className="first-letter:uppercase">{fecha && fechaCorta(fecha)}</span> · <span className="tabular-nums">{hora}–{seleccion ? horaTexto(seleccion.inicio + duracion) : ""}</span> · {duracion} minutos
            </p>
            <div className="sm:col-span-2"><Campo etiqueta="Título" name="titulo" required minLength={3} maxLength={150} placeholder="Reunión de coordinación" /></div>
            <div className="sm:col-span-2">
              <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">Motivo (opcional)</span><Textarea name="motivo" rows={2} maxLength={500} /></label>
            </div>
            <Selector etiqueta="Modalidad" name="modalidad" defaultValue="presencial">
              {(Object.keys(TEXTO_MODALIDAD) as ModalidadReunion[]).map((m) => <option key={m} value={m}>{TEXTO_MODALIDAD[m]}</option>)}
            </Selector>
            <Campo etiqueta="Lugar" name="lugar" maxLength={200} placeholder="Sala de profesores" />
            <div className="sm:col-span-2"><Campo etiqueta="Enlace externo (opcional)" name="enlace" type="url" maxLength={500} placeholder="https://…" ayuda="Indica el lugar, el enlace o ambos. Khipu no crea videollamadas." /></div>
            <div className="sm:col-span-2">
              <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">Observaciones (opcional)</span><Textarea name="observaciones" rows={2} maxLength={1000} /></label>
            </div>
            {analisis?.fueraDeHorario && (
              <label className="flex items-start gap-2 text-cuerpo-sm sm:col-span-2">
                <input type="checkbox" checked={fueraDeHorario} onChange={(e) => setFueraDeHorario(e.target.checked)} className="mt-1 size-4" />
                Programar igual fuera de la jornada laboral o en día no lectivo.
              </label>
            )}
            {opciones.puedeForzarClase && analisis?.soloClases && forzarClase && (
              <div className="sm:col-span-2"><Campo etiqueta="Motivo para usar la hora de clase" name="motivoForzar" required maxLength={300} ayuda="Programas sobre una clase: queda registrado con este motivo." /></div>
            )}
          </Tarjeta>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPaso(1)} className={buttonVariants({ variant: "outline" })}><ArrowLeft strokeWidth={2} aria-hidden />Volver</button>
            <button type="submit" disabled={pendiente} className={buttonVariants()}>
              {pendiente ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : <CalendarCheck strokeWidth={2} aria-hidden />}Confirmar reunión
            </button>
          </div>
        </form>
      )}

      {paso < 2 && (
        <div className="flex flex-wrap gap-2">
          {paso > 0 && <button type="button" onClick={() => setPaso(paso - 1)} className={buttonVariants({ variant: "outline" })}><ArrowLeft strokeWidth={2} aria-hidden />Volver</button>}
          {paso === 0 && <button type="button" disabled={!puedeSeguir} onClick={() => setPaso(1)} className={buttonVariants()}>Siguiente<ArrowRight strokeWidth={2} aria-hidden /></button>}
          {paso === 0 && elegidos.size > 0 && (
            <button type="button" onClick={() => setElegidos(new Map())} className={buttonVariants({ variant: "ghost" })}><UserMinus strokeWidth={2} aria-hidden />Quitar a todos</button>
          )}
        </div>
      )}
    </div>
  );
}
