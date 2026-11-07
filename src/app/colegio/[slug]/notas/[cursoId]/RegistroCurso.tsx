"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ClipboardList, PenLine, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import type { registroDelCurso } from "@/lib/server/registro-notas";
import { asignarCompetenciaAction, crearCalificacionAction, editarCeldaAction } from "./actions";

type Datos = Awaited<ReturnType<typeof registroDelCurso>>;
const uuidCliente = () => { const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128; const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; };
const fechaIso = (d: Date) => d.toISOString().slice(0, 10);
const fechaCorta = (d: Date) => new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" }).format(d);
const valorDe = (n?: Datos["evaluaciones"][number]["notas"][number]) => n?.marca === "nsp" ? "NSP" : n?.marca === "no_entrego" ? "NE" : n?.valorLiteral ?? (n?.valorNumerico == null ? "" : String(n.valorNumerico));
function Elegir({ value, onChange, opciones, etiqueta, className }: { value: string; onChange: (v: string) => void; opciones: { value: string; label: string }[]; etiqueta: string; className?: string }) {
  return <Select value={value} onValueChange={(v) => onChange(String(v ?? ""))} items={Object.fromEntries(opciones.map((o) => [o.value, o.label]))}>
    <SelectTrigger aria-label={etiqueta} className={className}><SelectValue placeholder="Elegir" /></SelectTrigger>
    <SelectContent>{opciones.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
  </Select>;
}
export function RegistroCurso({ datos, slug, gestionar }: { datos: Datos; slug: string; gestionar: boolean }) {
  const router = useRouter();
  const [pendiente, transicion] = useTransition();
  const [nuevo, setNuevo] = useState(false);
  const [detalle, setDetalle] = useState<Datos["evaluaciones"][number] | null>(null);
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(fechaIso(new Date()));
  const [periodoId, setPeriodoId] = useState(datos.periodo?.id ?? "");
  const [competenciaId, setCompetenciaId] = useState("");
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [clave, setClave] = useState(() => uuidCliente());
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [resaltar, setResaltar] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const opcionesNota = [{ value: "pendiente", label: "— Pendiente" }, ...(datos.escala === "literal" ? ["AD", "A", "B", "C"].map((v) => ({ value: v, label: v })) : Array.from({ length: 21 }, (_, i) => ({ value: String(20 - i), label: String(20 - i) })) )];
  const bloques = useMemo(() => {
    const mapa = new Map<string, { nombre: string; evaluaciones: Datos["evaluaciones"] }>();
    for (const c of datos.competencias) mapa.set(c.id, { nombre: c.nombre, evaluaciones: [] });
    for (const e of datos.evaluaciones) {
      const k = e.competenciaId ?? "sin";
      if (!mapa.has(k)) mapa.set(k, { nombre: e.competencia?.nombre ?? "Sin competencia", evaluaciones: [] });
      mapa.get(k)!.evaluaciones.push(e);
    }
    return [...mapa.entries()].map(([id, b]) => ({ id, ...b }));
  }, [datos]);
  const columnas = bloques.flatMap((b) => b.evaluaciones);
  const periodoOpciones = datos.periodos.map((p) => ({ value: p.id, label: `${p.nombre} ${p.anio}` }));
  const editar = (e: Datos["evaluaciones"][number], alumnoId: string, previo: string, nuevoValor: string) => {
    if (!datos.puedeEditar || !datos.periodo || datos.periodo.cerrado) return;
    const motivo = previo || e.estado === "publicada" ? window.prompt("Motivo de la corrección (mínimo 8 caracteres)") : undefined;
    if ((previo || e.estado === "publicada") && (!motivo || motivo.trim().length < 8)) return;
    setError("");
    transicion(async () => {
      const r = await editarCeldaAction(slug, e.id, alumnoId, nuevoValor, motivo ?? undefined);
      if (r.ok) { setValores((v) => ({ ...v, [`${e.id}:${alumnoId}`]: nuevoValor })); setEditando(null); router.refresh(); }
      else setError(r.error);
    });
  };
  const guardar = () => {
    setError("");
    transicion(async () => {
      const r = await crearCalificacionAction(slug, { cursoId: datos.curso.id, periodoId, competenciaId, claveIdempotencia: clave, nombre, descripcion, fecha, notas: datos.alumnos.map((a) => ({ alumnoId: a.id, valor: notas[a.id] ?? "" })) });
      if (!r.ok) { setError(r.error); return; }
      setNuevo(false); setExito("Calificación guardada."); toast.success("Calificación guardada."); setResaltar(r.evaluacionId ?? null); setNombre(""); setDescripcion(""); setNotas({}); setPaso(1); setCompetenciaId(""); setClave(uuidCliente()); router.refresh();
    });
  };
  return <div className="space-y-5">
    <EncabezadoPagina seccion="academico" titulo={`${datos.curso.nombre} — ${datos.curso.salon.nombre} ${datos.curso.salon.nivel[0].toUpperCase() + datos.curso.salon.nivel.slice(1)}`} descripcion="Registro de notas" acciones={<div className="flex flex-wrap gap-2">{datos.puedeEditar && <Button onClick={() => setNuevo(true)}><Plus aria-hidden />Nueva calificación</Button>}{gestionar && <Button variant="outline" render={<Link href={`/notas/competencias?curso=${datos.curso.id}`} />}>Competencias</Button>}</div>} />
    <div className="flex flex-wrap items-end gap-3"><div className="space-y-1"><label className="text-sm font-medium">Periodo</label><Elegir value={datos.periodo?.id ?? ""} onChange={(v) => router.push(`/notas/${datos.curso.id}?periodo=${v}`)} opciones={periodoOpciones} etiqueta="Periodo" /></div><details className="relative"><summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"><MoreHorizontal className="size-4" aria-hidden />Más</summary><div className="absolute right-0 z-10 mt-1 min-w-56 rounded-md border bg-popover p-2 shadow-md"><Link className="block rounded px-2 py-2 hover:bg-accent" href={`/notas?vista=anterior&curso=${datos.curso.id}&periodo=${datos.periodo?.id}&seccion=periodo`}>Calificación del periodo</Link><Link className="block rounded px-2 py-2 hover:bg-accent" href={`/notas?vista=anterior&curso=${datos.curso.id}&periodo=${datos.periodo?.id}&seccion=informe`}>Informe de progreso</Link><Link className="block rounded px-2 py-2 hover:bg-accent" href={`/notas?vista=anterior&curso=${datos.curso.id}&periodo=${datos.periodo?.id}&seccion=excel`}>Importar/Exportar</Link></div></details></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{exito && <p role="status" className="text-sm text-primary">{exito}</p>}
    <div className="overflow-x-auto rounded-lg border border-borde-sutil" role="region" aria-label="Calificaciones por competencia" tabIndex={0}>
      <table className="w-max min-w-full border-collapse text-sm tabular-nums" onKeyDown={(ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLButtonElement) || !target.dataset.celda) return;
        const delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[ev.key];
        if (!delta) return;
        ev.preventDefault();
        const fila = Number(target.dataset.row) + delta[0];
        const columna = Number(target.dataset.col) + delta[1];
        ev.currentTarget.querySelector<HTMLButtonElement>(`[data-celda][data-row="${fila}"][data-col="${columna}"]`)?.focus();
      }}><thead><tr className="bg-superficie-2"><th rowSpan={2} scope="col" className="sticky left-0 z-20 min-w-56 border-r border-b bg-superficie-2 px-3 text-left">Alumno</th>{bloques.filter((b) => b.evaluaciones.length).map((b) => <th key={b.id} colSpan={b.evaluaciones.length} scope="colgroup" className="border-r border-b px-3 py-2 text-left font-semibold">{b.nombre}</th>)}</tr><tr className="bg-superficie-2">{columnas.map((e) => <th key={e.id} scope="col" className={`w-36 border-r border-b p-0 text-left font-medium ${resaltar === e.id ? "bg-accent" : ""}`}><button className="flex min-h-14 w-full flex-col justify-center px-3 text-left focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setDetalle(e)} title={e.titulo}><span className="max-w-32 truncate">{e.titulo}</span><span className="flex items-center gap-1 text-xs text-muted-foreground">{e.tareaId ? <ClipboardList className="size-3" aria-label="Tarea" /> : <PenLine className="size-3" aria-label="Manual" />}{e.tareaId ? "Tarea" : "Manual"} · {fechaCorta(e.fecha)}</span></button></th>)}</tr></thead>
      <tbody>{datos.alumnos.map((a, fila) => <tr key={a.id} className="hover:bg-accent/40"><th scope="row" className="sticky left-0 z-10 border-r border-b bg-superficie px-3 text-left font-medium">{a.apellidos}, {a.nombres}</th>{columnas.map((e, columna) => { const n = e.notas.find((x) => x.alumnoId === a.id); const actual = valores[`${e.id}:${a.id}`] ?? valorDe(n); const key = `${e.id}:${a.id}`; return <td key={e.id} className={`border-r border-b text-center ${resaltar === e.id ? "bg-accent/50" : ""}`}>{editando === key ? <Elegir value={actual || "pendiente"} onChange={(v) => editar(e, a.id, valorDe(n), v === "pendiente" ? "" : v)} opciones={opcionesNota} etiqueta={`Nota de ${a.nombres} en ${e.titulo}`} className="w-28" /> : <button data-celda data-row={fila} data-col={columna} disabled={!datos.puedeEditar || pendiente} onClick={() => setEditando(key)} className="min-h-11 w-full px-2 font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default" aria-label={`${a.nombres}, ${e.titulo}: ${actual || "pendiente"}`}>{actual || <span className="text-muted-foreground/60">—</span>}</button>}</td>; })}</tr>)}</tbody></table>
    </div>
    {bloques.filter((b) => !b.evaluaciones.length).length > 0 && <p className="text-sm text-muted-foreground">Sin calificaciones: {bloques.filter((b) => !b.evaluaciones.length).map((b) => b.nombre).join(" · ")}</p>}
    <Sheet open={!!detalle} onOpenChange={(v) => { if (!v) setDetalle(null); }}><SheetContent className="sm:max-w-lg"><SheetHeader><SheetTitle>{detalle?.titulo}</SheetTitle><SheetDescription>Detalle de la calificación</SheetDescription></SheetHeader>{detalle && <div className="space-y-3 px-4"><p>{detalle.descripcion || "Sin descripción"}</p><dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2"><dt>Actividad</dt><dd>{fechaIso(detalle.fecha)}</dd><dt>Registrada el</dt><dd>{detalle.creadaAt.toLocaleString("es-PE")}</dd><dt>Registró</dt><dd>{detalle.creadaPor?.user ? `${detalle.creadaPor.user.nombres} ${detalle.creadaPor.user.apellidos}` : "Sin dato"}</dd><dt>Última modificación</dt><dd>{detalle.actualizadaAt.toLocaleString("es-PE")}</dd><dt>Competencia</dt><dd>{detalle.competencia?.nombre ?? "Sin competencia"}</dd><dt>Origen</dt><dd>{detalle.tareaId ? "Tarea" : "Manual"}</dd></dl>{detalle.tareaId && <Link className="underline" href={`/tareas/${detalle.tareaId}`}>Abrir tarea</Link>}{detalle.tareaId && !detalle.competenciaId && datos.puedeEditar && <div className="grid gap-2"><label className="font-medium">Asignar competencia</label><Elegir value={competenciaId} onChange={setCompetenciaId} opciones={datos.competencias.map((c) => ({ value: c.id, label: c.nombre }))} etiqueta="Competencia de la tarea" className="w-full" /><Button disabled={!competenciaId || pendiente} onClick={() => transicion(async () => { const r = await asignarCompetenciaAction(slug, detalle.id, competenciaId); if (r.ok) { setDetalle(null); router.refresh(); } else setError(r.error); })}>Asignar competencia</Button></div>}</div>}</SheetContent></Sheet>
    <Sheet open={nuevo} onOpenChange={setNuevo}><SheetContent className="sm:!max-w-2xl"><SheetHeader><SheetTitle>Nueva calificación</SheetTitle><SheetDescription>Paso {paso} de 2 · {paso === 1 ? "Actividad y notas" : "Competencia"}</SheetDescription></SheetHeader><div className="flex-1 space-y-4 overflow-y-auto px-4">{paso === 1 ? <><label className="grid gap-1 font-medium">Nombre<Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} required /></label><label className="grid gap-1 font-medium">Descripción (opcional)<Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 font-medium">Fecha de la actividad<Input type="date" value={fecha} onChange={(e) => { const v = e.target.value; setFecha(v); const p = datos.periodos.find((p) => fechaIso(p.inicio) <= v && fechaIso(p.fin) >= v && !p.cerrado); if (p) setPeriodoId(p.id); }} /></label><div className="grid gap-1 font-medium"><span>Periodo</span><Elegir value={periodoId} onChange={setPeriodoId} opciones={periodoOpciones} etiqueta="Periodo de la actividad" className="w-full" /></div></div><div className="divide-y rounded-md border"><div className="flex items-center justify-between px-3 py-2 font-medium"><span>Alumnos</span><Button variant="ghost" size="sm" onClick={() => setNotas(Object.fromEntries(datos.alumnos.map((a) => [a.id, datos.escala === "literal" ? "A" : "20"])))}>Todos {datos.escala === "literal" ? "A" : "20"}</Button></div>{datos.alumnos.map((a) => <div key={a.id} className="flex min-h-12 items-center justify-between gap-2 px-3"><span>{a.apellidos}, {a.nombres}</span><Elegir value={notas[a.id] || "pendiente"} onChange={(v) => setNotas((prev) => ({ ...prev, [a.id]: v === "pendiente" ? "" : v }))} opciones={opcionesNota} etiqueta={`Nota de ${a.nombres}`} className="w-32" /></div>)}</div></> : <><h3 className="font-heading text-lg font-semibold">¿A qué competencia corresponde esta calificación?</h3><p className="text-muted-foreground">Elige una competencia activa de {datos.curso.nombre}.</p><div className="grid gap-2">{datos.competencias.map((c) => <button key={c.id} onClick={() => setCompetenciaId(c.id)} className={`min-h-12 rounded-md border px-4 text-left focus-visible:outline-2 focus-visible:outline-ring ${competenciaId === c.id ? "border-primary bg-accent font-semibold" : "border-borde-sutil"}`}>{c.nombre}</button>)}</div></>}{error && <p role="alert" className="text-destructive">{error}</p>}</div><SheetFooter>{paso === 2 && <Button variant="outline" onClick={() => setPaso(1)}>Atrás</Button>}<Button disabled={pendiente || (paso === 2 && !competenciaId)} onClick={() => { if (paso === 1) { if (!nombre.trim()) { setError("Escribe el nombre de la actividad."); return; } setError(""); setPaso(2); } else guardar(); }}>{pendiente ? "Guardando…" : paso === 1 ? "Continuar" : "Guardar calificación"}</Button></SheetFooter></SheetContent></Sheet>
  </div>;
}
