"use client";
import type { registroDelCurso } from "@/lib/server/registro-notas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Datos = Awaited<ReturnType<typeof registroDelCurso>>;
export type Evaluacion = Datos["evaluaciones"][number];
export type NotaRegistrada = Evaluacion["notas"][number];

export function uuidCliente() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const fechaIso = (d: Date) => d.toISOString().slice(0, 10);
export const fechaCorta = (d: Date) => new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" }).format(d);
export const fechaHora = (d: Date) => new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short" }).format(d);

/** Texto de la nota de un alumno; vacío cuando está pendiente. */
export function valorDe(n?: NotaRegistrada) {
  if (n?.marca === "nsp") return "NSP";
  if (n?.marca === "no_entrego") return "NE";
  return n?.valorLiteral ?? (n?.valorNumerico == null ? "" : String(n.valorNumerico));
}

/** Origen de la columna: solo depende de `tareaId`. */
export const origenDe = (e: Pick<Evaluacion, "tareaId">) => (e.tareaId ? "Tarea" : "Manual");

export function opcionesDeNota(escala: Datos["escala"]) {
  const valores = escala === "literal" ? ["AD", "A", "B", "C"] : Array.from({ length: 21 }, (_, i) => String(20 - i));
  return [{ value: "pendiente", label: "— Pendiente" }, ...valores.map((v) => ({ value: v, label: v }))];
}

export function Elegir({ value, onChange, opciones, etiqueta, className }: {
  value: string; onChange: (v: string) => void; opciones: { value: string; label: string }[]; etiqueta: string; className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(String(v ?? ""))} items={Object.fromEntries(opciones.map((o) => [o.value, o.label]))}>
      <SelectTrigger aria-label={etiqueta} className={className}><SelectValue placeholder="Elegir" /></SelectTrigger>
      <SelectContent>{opciones.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
