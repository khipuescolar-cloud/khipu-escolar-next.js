"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Camera, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EjercicioPublico, Respuesta } from "@/lib/nudito/contratos";

const CAMPO =
  "h-11 w-full rounded-[var(--radio-md)] border border-input bg-background px-3 text-cuerpo outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

function contarPalabras(t: string): number {
  return t.trim() ? t.trim().split(/\s+/).length : 0;
}

/** Opción grande y accesible (radio nativo, visible al foco). */
function Opcion({ name, value, checked, disabled, onChange, children }: { name: string; value: string; checked: boolean; disabled: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radio-md)] border px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${checked ? "border-indigo bg-indigo/10" : "border-border bg-superficie hover:bg-muted"} ${disabled ? "cursor-default opacity-70" : ""}`}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} className="size-4 shrink-0 accent-[var(--indigo)]" />
      <span className="text-cuerpo">{children}</span>
    </label>
  );
}

/** Subida de foto del cuaderno (solo si el colegio activó las fotos). Devuelve la transcripción o un mensaje amable. */
export type SubirFoto = (foto: File) => Promise<{ ok: true; archivoId: string; transcripcion: string } | { ok: false; error: string }>;

const TIPOS_CON_FOTO = new Set<EjercicioPublico["tipo"]>(["numerico", "fraccion", "texto_corto", "escritura_rubrica"]);

/**
 * Entrada por tipo de ejercicio. Arma una `Respuesta` del contrato y la envía. Mantiene lo escrito al reintentar
 * (el componente sigue montado mientras el ejercicio no cambie).
 */
export function EntradaRespuesta({
  ejercicio,
  deshabilitado,
  ocupado,
  onEnviar,
  subirFoto,
}: {
  ejercicio: EjercicioPublico;
  deshabilitado: boolean;
  ocupado: boolean;
  onEnviar: (r: Respuesta, extra?: { fotoArchivoId?: string }) => void;
  subirFoto?: SubirFoto;
}) {
  const base = useId();
  const inputFoto = useRef<HTMLInputElement>(null);
  const [fotoId, setFotoId] = useState<string | undefined>(undefined);
  const [fotoMensaje, setFotoMensaje] = useState<{ tono: "ok" | "aviso"; texto: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [opcion, setOpcion] = useState("");
  const [numero, setNumero] = useState("");
  const [num, setNum] = useState("");
  const [den, setDen] = useState("");
  const [texto, setTexto] = useState("");
  const [lectura, setLectura] = useState<Record<string, string>>({});
  const [pares, setPares] = useState<Record<string, string>>({});
  const [vf, setVf] = useState<Record<string, boolean>>({});
  const bloqueado = deshabilitado || ocupado || subiendo;

  async function alElegirFoto(archivo: File | undefined) {
    if (!archivo || !subirFoto) return;
    setSubiendo(true);
    setFotoMensaje(null);
    try {
      const r = await subirFoto(archivo);
      if (!r.ok) {
        setFotoId(undefined);
        setFotoMensaje({ tono: "aviso", texto: r.error });
        return;
      }
      setFotoId(r.archivoId);
      const t = r.transcripcion.trim();
      if (ejercicio.tipo === "numerico") setNumero(t.slice(0, 30));
      else if (ejercicio.tipo === "fraccion") {
        const [n = "", d = ""] = t.split("/").map((x) => x.trim());
        setNum(n.slice(0, 12));
        setDen(d.slice(0, 12));
      } else setTexto(t.slice(0, ejercicio.tipo === "texto_corto" ? ejercicio.maxCaracteres : 3000));
      setFotoMensaje({ tono: "ok", texto: "Leí tu foto. Revisa que esté bien antes de comprobar." });
    } catch {
      setFotoMensaje({ tono: "aviso", texto: "No se pudo leer la foto. Escríbelo aquí." });
    } finally {
      setSubiendo(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  let respuesta: Respuesta | null = null;
  let cuerpo: ReactNode = null;

  switch (ejercicio.tipo) {
    case "opcion_multiple":
      respuesta = opcion ? { tipo: "opcion", opcionId: opcion } : null;
      cuerpo = (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Elige una opción</legend>
          {ejercicio.opciones.map((o) => (
            <Opcion key={o.id} name={`${base}-om`} value={o.id} checked={opcion === o.id} disabled={bloqueado} onChange={() => setOpcion(o.id)}>
              {o.texto}
            </Opcion>
          ))}
        </fieldset>
      );
      break;
    case "numerico":
      respuesta = numero.trim() ? { tipo: "numero", valor: numero.trim() } : null;
      cuerpo = (
        <div className="flex items-center gap-2">
          <label htmlFor={`${base}-num`} className="sr-only">
            Tu respuesta
          </label>
          <input id={`${base}-num`} inputMode="decimal" autoComplete="off" maxLength={30} value={numero} disabled={bloqueado} onChange={(e) => setNumero(e.target.value)} className={`${CAMPO} max-w-48 text-lg`} placeholder="Tu respuesta" />
          {ejercicio.unidad && <span className="text-cuerpo text-muted-foreground">{ejercicio.unidad}</span>}
        </div>
      );
      break;
    case "fraccion":
      respuesta = num.trim() && den.trim() ? { tipo: "fraccion", num: num.trim(), den: den.trim() } : null;
      cuerpo = (
        <div className="flex flex-col items-start gap-2">
          <div className="flex w-24 flex-col items-stretch gap-1" role="group" aria-label="Fracción">
            <input aria-label="Numerador" inputMode="numeric" autoComplete="off" maxLength={12} value={num} disabled={bloqueado} onChange={(e) => setNum(e.target.value)} className={`${CAMPO} text-center text-lg`} />
            <span className="h-0.5 rounded bg-tinta" aria-hidden />
            <input aria-label="Denominador" inputMode="numeric" autoComplete="off" maxLength={12} value={den} disabled={bloqueado} onChange={(e) => setDen(e.target.value)} className={`${CAMPO} text-center text-lg`} />
          </div>
          {ejercicio.pideSimplificar && <p className="text-cuerpo-sm text-muted-foreground">Escríbela simplificada.</p>}
        </div>
      );
      break;
    case "texto_corto":
      respuesta = texto.trim() ? { tipo: "texto", texto: texto.trim() } : null;
      cuerpo = (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${base}-tc`} className="sr-only">
            Tu respuesta
          </label>
          <input id={`${base}-tc`} autoComplete="off" maxLength={ejercicio.maxCaracteres} value={texto} disabled={bloqueado} onChange={(e) => setTexto(e.target.value)} className={CAMPO} placeholder="Escribe tu respuesta" />
          <span className="self-end text-etiqueta text-muted-foreground">
            {texto.length}/{ejercicio.maxCaracteres}
          </span>
        </div>
      );
      break;
    case "lectura": {
      const completo = ejercicio.preguntas.every((q) => (lectura[q.id] ?? "").trim());
      respuesta = completo ? { tipo: "lectura", respuestas: Object.fromEntries(ejercicio.preguntas.map((q) => [q.id, (lectura[q.id] ?? "").trim()])) } : null;
      cuerpo = (
        <div className="flex flex-col gap-4">
          <article className="rounded-[var(--radio-lg)] bg-superficie-2 p-4 text-cuerpo leading-7 whitespace-pre-line">{ejercicio.texto}</article>
          <ol className="flex flex-col gap-4">
            {ejercicio.preguntas.map((q, i) => (
              <li key={q.id}>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 font-semibold">
                    {i + 1}. {q.enunciado}
                  </legend>
                  {q.opciones ? (
                    q.opciones.map((o) => (
                      <Opcion key={o.id} name={`${base}-${q.id}`} value={o.id} checked={lectura[q.id] === o.id} disabled={bloqueado} onChange={() => setLectura((l) => ({ ...l, [q.id]: o.id }))}>
                        {o.texto}
                      </Opcion>
                    ))
                  ) : (
                    <input aria-label={`Respuesta a la pregunta ${i + 1}`} autoComplete="off" maxLength={600} value={lectura[q.id] ?? ""} disabled={bloqueado} onChange={(e) => setLectura((l) => ({ ...l, [q.id]: e.target.value }))} className={CAMPO} />
                  )}
                </fieldset>
              </li>
            ))}
          </ol>
        </div>
      );
      break;
    }
    case "escritura_rubrica": {
      const palabras = contarPalabras(texto);
      const enRango = palabras >= ejercicio.minPalabras && palabras <= ejercicio.maxPalabras;
      respuesta = texto.trim() ? { tipo: "texto", texto: texto.trim() } : null;
      cuerpo = (
        <div className="flex flex-col gap-2">
          <p className="text-cuerpo font-semibold">{ejercicio.consigna}</p>
          <ul className="flex flex-wrap gap-2" aria-label="Lo que se revisará">
            {ejercicio.criteriosVisibles.map((c) => (
              <li key={c} className="rounded-full bg-superficie-2 px-2 py-0.5 text-etiqueta">
                {c}
              </li>
            ))}
          </ul>
          <label htmlFor={`${base}-esc`} className="sr-only">
            Tu texto
          </label>
          <textarea id={`${base}-esc`} rows={7} maxLength={3000} value={texto} disabled={bloqueado} onChange={(e) => setTexto(e.target.value)} className="w-full rounded-[var(--radio-md)] border border-input bg-background p-3 text-cuerpo outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-describedby={`${base}-contador`} />
          <p id={`${base}-contador`} aria-live="polite" className={`self-end text-etiqueta ${enRango ? "text-llego" : "text-muted-foreground"}`}>
            {palabras} palabras · entre {ejercicio.minPalabras} y {ejercicio.maxPalabras}
          </p>
        </div>
      );
      break;
    }
    case "relacionar": {
      const completo = ejercicio.izquierda.every((i) => pares[i.id]);
      respuesta = completo ? { tipo: "relacionar", pares } : null;
      cuerpo = (
        <ul className="flex flex-col gap-3">
          {ejercicio.izquierda.map((i) => (
            <li key={i.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <label htmlFor={`${base}-rel-${i.id}`} className="font-semibold sm:w-1/3">
                {i.texto}
              </label>
              <select id={`${base}-rel-${i.id}`} value={pares[i.id] ?? ""} disabled={bloqueado} onChange={(e) => setPares((p) => ({ ...p, [i.id]: e.target.value }))} className={`${CAMPO} sm:flex-1`}>
                <option value="">Elige…</option>
                {ejercicio.derecha.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.texto}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      );
      break;
    }
    case "verdadero_falso": {
      const completo = ejercicio.afirmaciones.every((a) => a.id in vf);
      respuesta = completo ? { tipo: "vf", valores: vf } : null;
      cuerpo = (
        <ul className="flex flex-col gap-3">
          {ejercicio.afirmaciones.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 rounded-[var(--radio-md)] border border-border bg-superficie p-3">
              <span id={`${base}-vf-${a.id}`}>{a.texto}</span>
              <div className="flex gap-2" role="group" aria-labelledby={`${base}-vf-${a.id}`}>
                {([true, false] as const).map((valor) => (
                  <Button
                    key={String(valor)}
                    type="button"
                    variant={vf[a.id] === valor ? "default" : "outline"}
                    className="min-h-11 flex-1"
                    aria-pressed={vf[a.id] === valor}
                    disabled={bloqueado}
                    onClick={() => setVf((v) => ({ ...v, [a.id]: valor }))}
                  >
                    {valor ? <Check strokeWidth={2} aria-hidden /> : <X strokeWidth={2} aria-hidden />}
                    {valor ? "Verdadero" : "Falso"}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      );
      break;
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (respuesta && !bloqueado) onEnviar(respuesta, fotoId ? { fotoArchivoId: fotoId } : undefined);
      }}
    >
      {cuerpo}
      {subirFoto && !deshabilitado && TIPOS_CON_FOTO.has(ejercicio.tipo) && (
        <div className="flex flex-col gap-2">
          <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => alElegirFoto(e.target.files?.[0])} data-testid="nudito-foto-input" />
          <Button type="button" variant="outline" className="min-h-11 self-start" disabled={bloqueado} onClick={() => inputFoto.current?.click()}>
            <Camera strokeWidth={2} aria-hidden />
            {subiendo ? "Leyendo tu foto…" : "Foto de mi cuaderno"}
          </Button>
          {fotoMensaje && (
            <p role="status" className={`rounded-[var(--radio-md)] px-3 py-2 text-cuerpo-sm ${fotoMensaje.tono === "ok" ? "bg-llego-fondo text-llego" : "bg-tarde-fondo text-tarde"}`}>
              {fotoMensaje.texto}
            </p>
          )}
        </div>
      )}
      {!deshabilitado && (
        <Button type="submit" size="lg" className="min-h-11 self-start" disabled={!respuesta || ocupado}>
          <Check strokeWidth={2} aria-hidden />
          Comprobar
        </Button>
      )}
    </form>
  );
}
