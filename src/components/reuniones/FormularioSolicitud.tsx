"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Textarea } from "@/components/ui/textarea";
import type { Resultado } from "@/lib/resultado";
import type { FranjaVista } from "@/lib/server/disponibilidad";

type Hijo = { id: string; nombre: string; salon: string; docentes: { id: string; nombre: string; detalle: string }[] };

type Props = {
  hijos: Hijo[];
  fechaMinima: string;
  franjas: (alumnoId: string, docenteId: string) => Promise<FranjaVista[] | null>;
  solicitar: (entrada: unknown) => Promise<Resultado & { id?: string }>;
};

const dia = (iso: string) => new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/** La familia pide una reunión al tutor o a un profesor del salón de su hijo (specs/40). Solo ve franjas ofrecidas. */
export function FormularioSolicitud({ hijos, fechaMinima, franjas, solicitar }: Props) {
  const router = useRouter();
  const [alumnoId, setAlumnoId] = useState(hijos[0]?.id ?? "");
  const hijo = hijos.find((h) => h.id === alumnoId);
  const [docenteId, setDocenteId] = useState(hijo?.docentes[0]?.id ?? "");
  const [ofrecidas, setOfrecidas] = useState<FranjaVista[] | null>(null);
  const [elegida, setElegida] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    if (!alumnoId || !docenteId) return;
    let vigente = true;
    franjas(alumnoId, docenteId).then((f) => {
      if (!vigente) return;
      setOfrecidas(f ?? []);
      setElegida("");
    });
    return () => {
      vigente = false;
    };
  }, [alumnoId, docenteId, franjas]);

  function enviar(form: FormData) {
    setError(null);
    const f = ofrecidas?.find((x) => x.inicio === elegida);
    iniciar(async () => {
      const r = await solicitar({
        alumnoId, docenteId, motivo: form.get("motivo"),
        fecha: f ? f.fecha : form.get("fecha"), hora: f ? f.hora : form.get("hora"),
      });
      if (r.ok) {
        toast.success(r.mensaje ?? "Solicitud enviada.");
        router.push(r.id ? `/reuniones/${r.id}` : "/reuniones");
      } else setError(r.error);
    });
  }

  if (hijos.length === 0) return <Alerta tipo="info">No encontramos hijos activos vinculados a tu cuenta.</Alerta>;

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Tarjeta className="grid gap-4 sm:grid-cols-2">
        <Selector etiqueta="¿Sobre quién?" value={alumnoId} onChange={(e) => { setAlumnoId(e.target.value); setDocenteId(hijos.find((h) => h.id === e.target.value)?.docentes[0]?.id ?? ""); }}>
          {hijos.map((h) => <option key={h.id} value={h.id}>{h.nombre} · {h.salon}</option>)}
        </Selector>
        <Selector etiqueta="¿Con quién?" value={docenteId} onChange={(e) => setDocenteId(e.target.value)}>
          {hijo?.docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre} · {d.detalle}</option>)}
        </Selector>
        <div className="sm:col-span-2">
          <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">Motivo</span><Textarea name="motivo" required minLength={5} maxLength={500} rows={3} placeholder="Por ejemplo: quiero conversar sobre sus avances en lectura." /></label>
        </div>
      </Tarjeta>
      <Tarjeta className="flex flex-col gap-3">
        <h2 className="font-titulo text-cuerpo font-semibold">¿Cuándo?</h2>
        {ofrecidas === null ? (
          <p className="inline-flex items-center gap-2 text-cuerpo-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />Buscando horarios…</p>
        ) : ofrecidas.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-cuerpo-sm text-muted-foreground">Horarios de atención libres del docente (30 minutos):</legend>
            <div className="flex flex-wrap gap-2">
              {ofrecidas.map((f) => (
                <label key={f.inicio} className={`cursor-pointer rounded-pildora border px-3 py-1.5 text-cuerpo-sm ${elegida === f.inicio ? "border-primary bg-accent" : ""}`}>
                  <input type="radio" name="franja" value={f.inicio} checked={elegida === f.inicio} onChange={() => setElegida(f.inicio)} className="sr-only" required />
                  <span className="first-letter:uppercase">{dia(f.fecha)}</span> · {f.hora}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="text-cuerpo-sm text-muted-foreground sm:col-span-2">El docente aún no publicó su horario de atención. Propón una fecha y hora; te confirmará o te propondrá otra.</p>
            <Campo etiqueta="Fecha" name="fecha" type="date" min={fechaMinima} required />
            <Campo etiqueta="Hora" name="hora" type="time" step={900} required />
          </div>
        )}
      </Tarjeta>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <button type="submit" disabled={pendiente || !docenteId} className={`${buttonVariants()} self-start`}>
        {pendiente ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : <Send strokeWidth={2} aria-hidden />}Enviar solicitud
      </button>
    </form>
  );
}
