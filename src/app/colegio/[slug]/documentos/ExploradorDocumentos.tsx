"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock3, Copy, Download, Folder, FolderOpen, Grid2X2, Info, List, Pencil, RotateCcw, Search, Share2, Star, StarOff, Trash2, Users, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Notificar } from "@/components/shell/Notificar";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogMedia } from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDENES_DOCUMENTO } from "@/lib/documentos";
import type { Rol, CategoriaBiblioteca } from "@/generated/prisma/enums";
import type { Contenido, CarpetaOpcion } from "@/lib/server/documentos";
import { cn } from "@/lib/utils";
import { archivarDocumentoAction, borrarCarpetaAction, borrarDocumentoAction, destacarDocumentoAction, eliminarDefinitivoDocumentoAction, papeleraLoteDocumentoAction, registrarAccesoDocumentoAction, restaurarDocumentoAction } from "./actions";
import { HojaAcciones, type Accion } from "./AccionesItem";
import { DialogoCompartir } from "./DialogoCompartir";
import { DialogoMover, DialogoRenombrar, VistaPrevia } from "./DialogosDocumentos";
import { DialogoEditarDocumento, DialogoSubir } from "./FormulariosDocumentos";
import { ListaContenido } from "./ListaContenido";
import { NuevoDocumento } from "./NuevoDocumento";
import { PanelDetalles } from "./PanelDetalles";
import { PanelSubidas, useSubidas } from "./Subidas";
import { NavegacionDocumentos } from "./NavegacionDocumentos";
import { PanelBorradores } from "./PanelBorradores";
import type { Item, Persona, Salon, Vista } from "./tipos-documentos";

const vistas: { id: Vista; nombre: string; icono: typeof FolderOpen }[] = [
  { id: "unidad", nombre: "Mis borradores", icono: FolderOpen }, { id: "compartido", nombre: "Compartido conmigo", icono: Users },
  { id: "biblioteca", nombre: "Biblioteca del colegio", icono: Folder }, { id: "recientes", nombre: "Recientes", icono: Clock3 },
  { id: "destacados", nombre: "Destacados", icono: Star }, { id: "papelera", nombre: "Papelera", icono: Trash2 },
];
const vacios: Record<Vista, { titulo: string; detalle: string }> = {
  unidad: { titulo: "Tus borradores están vacíos", detalle: "Crea una carpeta o sube tus archivos con el botón Nuevo, o arrástralos aquí." },
  compartido: { titulo: "Nada compartido contigo todavía", detalle: "Cuando alguien comparta una carpeta o un archivo contigo, aparecerá aquí." },
  biblioteca: { titulo: "Esta carpeta está vacía", detalle: "Aquí verás los documentos del colegio que puedes consultar." },
  recientes: { titulo: "Todavía no hay archivos recientes", detalle: "Los archivos y carpetas que abras aparecerán aquí." },
  destacados: { titulo: "Todavía no tienes destacados", detalle: "Marca con la estrella lo que quieras encontrar rápido." },
  papelera: { titulo: "La papelera está vacía", detalle: "Lo que elimines se queda aquí 30 días antes de borrarse para siempre." },
};
const ordenes = Object.fromEntries(Object.entries(ORDENES_DOCUMENTO)) as Record<string, string>;
const aArchivo = (d: Contenido["documentos"][number]): Item => ({ tipo: "documento", id: d.id, nombre: d.titulo, propietario: d.autor, modificado: d.updatedAt, creado: d.createdAt, tamano: d.archivo?.bytes ?? null, archivo: d.archivo, gestionable: d.gestionable, destacado: d.destacado, descripcion: d.descripcion, carpetaId: d.carpetaId, visibleRoles: d.visibleRoles, salonId: d.salonId, ambito: d.ambito, categoria: d.categoria, oficial: d.oficial, archivado: d.archivado });

export function ExploradorDocumentos({ archivoInicial, nuevos, contenido, vista, carpetaId, carpetaDeCreacion, carpetaCompartida, q, orden, opciones, salones, personas, esProfesor, rol, puedeCrear, categoria, archivados, usadoBorradores, ok, error }: { archivoInicial: string | null; nuevos: string; contenido: Contenido; vista: Vista; carpetaId: string | null; carpetaDeCreacion: string | null; carpetaCompartida: boolean; q: string; orden: string; opciones: CarpetaOpcion[]; salones: Salon[]; personas: Persona[]; esProfesor: boolean; rol: Rol; puedeCrear: boolean; categoria?: CategoriaBiblioteca; archivados: boolean; usadoBorradores: number | null; ok?: string; error?: string }) {
  const router = useRouter();
  const enlaceAbierto = useRef<string | null>(null);
  const navegacion = useRef<HTMLElement>(null);
  const [modo, setModo] = useState<"lista" | "cuadricula">("lista");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [resaltados, setResaltados] = useState<string[]>([]);
  const [vistaPrevia, setVistaPrevia] = useState<Item | null>(null);
  const [detalles, setDetalles] = useState<Item | null>(null);
  const [compartir, setCompartir] = useState<Item | null>(null);
  const [renombrar, setRenombrar] = useState<Item | null>(null);
  const [mover, setMover] = useState<Item[]>([]);
  const [menuMovil, setMenuMovil] = useState<Item | null>(null);
  const [eliminar, setEliminar] = useState<Item | null>(null);
  const [, iniciar] = useTransition();
  const refrescar = useCallback(() => router.refresh(), [router]);
  const urlCreacion = carpetaCompartida && carpetaDeCreacion ? `/documentos?seccion=compartido&carpeta=${carpetaDeCreacion}` : `/documentos?seccion=borradores${carpetaDeCreacion ? `&carpeta=${carpetaDeCreacion}` : ""}`;
  const mostrarCreados = (ids: string[]) => router.push(`${urlCreacion}&nuevo=${ids.join(",")}`);
  const { subidas, subir, cerrar } = useSubidas((ids) => {
    if (!ids.length) return;
    toast.success(`${ids.length === 1 ? "Archivo subido" : `${ids.length} archivos subidos`} ${carpetaCompartida ? "en la carpeta compartida" : "a Mi unidad"}.`);
    mostrarCreados(ids);
  });
  const volver = carpetaId ?? "";
  const nombreVista = vistas.find((v) => v.id === vista)?.nombre ?? "";

  useEffect(() => { try { if (localStorage.getItem("documentos-modo") === "cuadricula") queueMicrotask(() => setModo("cuadricula")); } catch { /* sin almacenamiento */ } }, []);
  const cambiarModo = (m: "lista" | "cuadricula") => { setModo(m); try { localStorage.setItem("documentos-modo", m); } catch { /* sin almacenamiento */ } };
  // En móvil la navegación interna se desplaza: deja a la vista la sección activa.
  useEffect(() => { navegacion.current?.querySelector("[aria-current=page]")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [vista]);
  // Al cambiar de carpeta o de sección se limpia la selección.
  useEffect(() => { queueMicrotask(() => setSeleccion([])); }, [vista, carpetaId, q]);

  const items: Item[] = [
    ...contenido.carpetas.map((c) => ({ tipo: "carpeta" as const, id: c.id, nombre: c.nombre, propietario: c.propietario, modificado: c.updatedAt, creado: c.createdAt, tamano: null, gestionable: c.gestionable, destacado: c.destacado, visibleRoles: c.visibleRoles, salonId: c.salonId, carpetaId: c.parentId, ambito: c.ambito, elementos: c.elementos, archivado: c.archivado })),
    ...contenido.documentos.map(aArchivo),
  ];
  useEffect(() => {
    const ids = nuevos.split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!ids.length) return;
    const primero = ids.find((id) => contenido.carpetas.some((c) => c.id === id) || contenido.documentos.some((d) => d.id === id));
    if (!primero) return;
    const fotograma = requestAnimationFrame(() => {
      setResaltados(ids);
      const elemento = document.querySelector(`[data-documento-id="${primero}"]`);
      elemento?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
      (elemento?.querySelector("[data-documento-abrir]") as HTMLButtonElement | null)?.focus({ preventScroll: true });
    });
    const temporizador = setTimeout(() => {
      setResaltados([]);
      router.replace(`${location.pathname}${location.search.replace(/([?&])nuevo=[^&]*&?/, "$1").replace(/[?&]$/, "")}`);
    }, 4000);
    return () => { cancelAnimationFrame(fotograma); clearTimeout(temporizador); };
  }, [nuevos, contenido.carpetas, contenido.documentos, router]);
  const seleccionados = items.filter((i) => seleccion.includes(i.id));

  useEffect(() => {
    const d = contenido.documentos.find((x) => x.id === archivoInicial);
    if (!d || enlaceAbierto.current === d.id) return;
    enlaceAbierto.current = d.id;
    queueMicrotask(() => setVistaPrevia(aArchivo(d)));
  }, [archivoInicial, contenido.documentos]);

  const ir = (id: string) => { void registrarAccesoDocumentoAction("carpeta", id); router.push(`/documentos?seccion=${vista === "unidad" ? "borradores" : vista}&carpeta=${id}`); };
  const abrir = (item: Item) => {
    if (vista === "papelera") { toast("Restaura el elemento para abrirlo."); return; }
    if (item.tipo === "carpeta") ir(item.id);
    else { setVistaPrevia(item); void registrarAccesoDocumentoAction("documento", item.id); }
  };
  const enlace = (item: Item) => item.tipo === "carpeta" ? `/documentos?vista=${vista}&carpeta=${item.id}` : `/documentos?vista=${vista}${item.carpetaId && vista !== "compartido" ? `&carpeta=${item.carpetaId}` : ""}&archivo=${item.id}`;
  const copiar = (item: Item) => { void navigator.clipboard.writeText(`${location.origin}${enlace(item)}`).then(() => toast.success("Enlace copiado. Quien lo abra necesita iniciar sesión y tener permiso.")).catch(() => toast.error("No se pudo copiar el enlace.")); };
  const enviar = (fn: (d: FormData) => Promise<unknown>, item: Item, extra: Record<string, string> = {}) => { const d = new FormData(); d.set("id", item.id); d.set("tipo", item.tipo); d.set("vista", vista); d.set("volver", volver); for (const [k, v] of Object.entries(extra)) d.set(k, v); iniciar(async () => { await fn(d); }); };
  const papelera = (item: Item) => enviar(item.tipo === "carpeta" ? borrarCarpetaAction : borrarDocumentoAction, item);
  const descargar = (archivos: Item[]) => { for (const item of archivos) if (item.archivo) { const a = document.createElement("a"); a.href = `/archivos/${item.archivo.id}`; a.download = item.archivo.nombre; document.body.append(a); a.click(); a.remove(); } };
  const subirAqui = (archivos: File[]) => void subir(archivos, { carpetaId: carpetaDeCreacion, ambito: "unidad" });

  const accionesDe = (item: Item): Accion[] => {
    if (vista === "papelera") return [
      { id: "restaurar", etiqueta: "Restaurar", icono: RotateCcw, alElegir: () => enviar(restaurarDocumentoAction, item) },
      { id: "eliminar", etiqueta: "Eliminar para siempre", icono: Trash2, destructiva: true, separadorAntes: true, alElegir: () => setEliminar(item) },
    ];
    const a: Accion[] = [{ id: "abrir", etiqueta: "Abrir", icono: FolderOpen, alElegir: () => abrir(item) }];
    if (item.archivo) a.push({ id: "descargar", etiqueta: "Descargar", icono: Download, alElegir: () => descargar([item]) });
    if (item.gestionable) a.push({ id: "compartir", etiqueta: "Compartir", icono: Share2, alElegir: () => setCompartir(item) });
    a.push({ id: "enlace", etiqueta: "Copiar enlace", icono: Copy, alElegir: () => copiar(item) });
    if (item.gestionable) {
      a.push({ id: "renombrar", etiqueta: "Renombrar", icono: Pencil, separadorAntes: true, alElegir: () => setRenombrar(item) });
      a.push({ id: "mover", etiqueta: "Mover a…", icono: Folder, alElegir: () => setMover([item]) });
    }
    a.push({ id: "destacar", etiqueta: item.destacado ? "Quitar de destacados" : "Destacar", icono: item.destacado ? StarOff : Star, alElegir: () => enviar(destacarDocumentoAction, item, { destacar: String(!item.destacado) }) });
    a.push({ id: "detalles", etiqueta: "Detalles", icono: Info, alElegir: () => setDetalles(item) });
    if (item.tipo === "documento" && item.ambito === "biblioteca" && item.gestionable && (!item.oficial || rol === "direccion")) a.push({ id: "archivar", etiqueta: item.archivado ? "Desarchivar" : "Archivar", icono: Folder, alElegir: () => enviar(archivarDocumentoAction, item, { archivar: String(!item.archivado) }) });
    if (item.gestionable && !item.oficial) a.push({ id: "papelera", etiqueta: "Mover a la papelera", icono: Trash2, destructiva: true, separadorAntes: true, alElegir: () => papelera(item) });
    return a;
  };
  const teclas = (e: React.KeyboardEvent, item: Item) => {
    if ((e.target as HTMLElement).closest("input, textarea, [role=checkbox]") && e.key !== "Delete" && e.key !== "F2") return;
    if (e.key === "Delete" && item.gestionable && vista !== "papelera") { e.preventDefault(); papelera(item); }
    if (e.key === "F2" && item.gestionable && vista !== "papelera") { e.preventDefault(); setRenombrar(item); }
  };
  const lotePapelera = () => { const d = new FormData(); d.set("vista", vista); d.set("volver", volver); seleccionados.filter((i) => i.gestionable).forEach((i) => d.append("recursos", `${i.tipo}:${i.id}`)); iniciar(async () => papeleraLoteDocumentoAction(d)); };

  const rutaBase = `/documentos?seccion=${vista === "unidad" ? "borradores" : vista}`;
  return <div>
    <Notificar ok={ok} error={error} />
    <EncabezadoPagina titulo="Documentos" seccion="comunicacion" descripcion="Organiza, comparte y consulta los archivos del colegio." />
    <div className="grid min-w-0 gap-4 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-3">
        {puedeCrear && <NuevoDocumento carpetaId={carpetaDeCreacion} onCreada={(id) => { toast.success(`Carpeta creada ${carpetaCompartida ? "en la carpeta compartida" : "en Mi unidad"}.`); mostrarCreados([id]); }} onSubir={subirAqui} className="h-12 w-full justify-start px-5 md:w-auto" />}
        {vista === "biblioteca" && (rol === "direccion" || rol === "administrativo") && <DialogoSubir carpetaId={carpetaId} volver={carpetaId} opciones={opciones.filter((o) => o.ambito === "biblioteca")} salones={salones} esProfesor={false} esDireccion={rol === "direccion"} hayFamilias />}
        <div ref={navegacion as React.RefObject<HTMLDivElement>}><NavegacionDocumentos rol={rol} activa={vista === "unidad" ? "borradores" : vista} /></div>
      </aside>
      <div className={cn("relative min-w-0 rounded-xl pb-24 md:pb-8", arrastrando && "outline-2 outline-dashed outline-offset-4 outline-sec-trazo")} onDragOver={(e) => { if (puedeCrear && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setArrastrando(true); } }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastrando(false); }} onDrop={(e) => { if (!puedeCrear) return; e.preventDefault(); setArrastrando(false); const f = Array.from(e.dataTransfer.files); if (f.length) subirAqui(f); }}>
        {usadoBorradores !== null && <PanelBorradores usado={usadoBorradores} />}
        <nav aria-label="Ruta de carpetas" className="mb-3 flex min-w-0 flex-wrap items-center gap-0.5 text-sm">
          <Link href={rutaBase} className={cn("inline-flex min-h-9 items-center rounded-md px-2 font-medium", contenido.ruta.length === 0 ? "text-foreground" : "text-primary hover:underline")} aria-current={contenido.ruta.length === 0 ? "page" : undefined}>{nombreVista}</Link>
          {contenido.ruta.map((r, i) => <span key={r.id} className="inline-flex min-w-0 items-center gap-0.5"><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /><Link href={`${rutaBase}&carpeta=${r.id}`} aria-current={i === contenido.ruta.length - 1 ? "page" : undefined} className={cn("inline-flex min-h-9 max-w-48 items-center truncate rounded-md px-2", i === contenido.ruta.length - 1 ? "font-medium text-foreground" : "text-primary hover:underline")}>{r.nombre}</Link></span>)}
        </nav>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <form method="get" action="/documentos" role="search" className="relative min-w-0 flex-1 basis-full sm:basis-56"><input type="hidden" name="seccion" value={vista === "unidad" ? "borradores" : vista} />{carpetaId && <input type="hidden" name="carpeta" value={carpetaId} />}{categoria && <input type="hidden" name="categoria" value={categoria} />}{archivados && <input type="hidden" name="archivados" value="1" />}
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} aria-hidden />
            <Input type="search" name="q" defaultValue={q} aria-label="Buscar por nombre" placeholder="Buscar por nombre" className="pl-9" />
          </form>
          <Select value={orden} onValueChange={(v) => router.push(`${rutaBase}${carpetaId ? `&carpeta=${carpetaId}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}&orden=${v}`)} items={ordenes}>
            <SelectTrigger aria-label="Ordenar por" className="min-w-0 flex-1 sm:w-44 sm:flex-none"><SelectValue /></SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">{Object.entries(ORDENES_DOCUMENTO).map(([v, n]) => <SelectItem key={v} value={v}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <div role="group" aria-label="Tipo de vista" className="flex rounded-lg border border-input bg-superficie-elevada p-0.5">
            <Button variant={modo === "lista" ? "secondary" : "ghost"} size="icon-sm" aria-label="Vista de lista" aria-pressed={modo === "lista"} onClick={() => cambiarModo("lista")}><List aria-hidden /></Button>
            <Button variant={modo === "cuadricula" ? "secondary" : "ghost"} size="icon-sm" aria-label="Vista de cuadrícula" aria-pressed={modo === "cuadricula"} onClick={() => cambiarModo("cuadricula")}><Grid2X2 aria-hidden /></Button>
          </div>
        </div>
        {vista === "biblioteca" && <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select value={categoria ?? "todas"} onValueChange={(v) => router.push(`${rutaBase}${v === "todas" ? "" : `&categoria=${v}`}${archivados ? "&archivados=1" : ""}`)} items={{ todas: "Todas las categorías", reglamento: "Reglamento", convivencia: "Convivencia", protocolo: "Protocolo", calendario: "Calendario", formato: "Formato", oficial: "Oficial", otro: "Otro" }}><SelectTrigger aria-label="Filtrar por categoría" className="min-w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas las categorías</SelectItem><SelectItem value="reglamento">Reglamento</SelectItem><SelectItem value="convivencia">Convivencia</SelectItem><SelectItem value="protocolo">Protocolo</SelectItem><SelectItem value="calendario">Calendario</SelectItem><SelectItem value="formato">Formato</SelectItem><SelectItem value="oficial">Oficial</SelectItem><SelectItem value="otro">Otro</SelectItem></SelectContent></Select>
          <Link href={`${rutaBase}${categoria ? `&categoria=${categoria}` : ""}${archivados ? "" : "&archivados=1"}`} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-primary hover:underline">{archivados ? "Ver activos" : "Ver archivados"}</Link>
        </div>}
        {arrastrando && <p role="status" className="mb-3 flex min-h-14 items-center justify-center gap-2 rounded-lg bg-sec-suave p-4 text-center text-sm font-medium text-sec-tinta"><Upload className="size-4" strokeWidth={2} aria-hidden /> Suelta los archivos para subirlos {carpetaDeCreacion ? "a esta carpeta" : "a Mi unidad"}</p>}
        {vista === "papelera" && items.length > 0 && <p className="mb-3 text-sm text-muted-foreground">Los elementos de la papelera se eliminan solos a los 30 días.</p>}
        {seleccionados.length > 0 && <div role="toolbar" aria-label="Acciones de la selección" className="sticky top-2 z-20 mb-3 flex min-h-12 flex-wrap items-center gap-1 rounded-lg border border-borde-sutil bg-sec-suave py-1 pr-2 pl-1 text-sm shadow-sombra-1">
          <Button variant="ghost" size="icon" aria-label="Quitar selección" onClick={() => setSeleccion([])}><X aria-hidden /></Button>
          <span className="mr-1 font-medium tabular-nums">{seleccionados.length} {seleccionados.length === 1 ? "seleccionado" : "seleccionados"}</span>
          {vista !== "papelera" && <>
            {seleccionados.some((i) => i.archivo) && <Button variant="ghost" size="sm" onClick={() => descargar(seleccionados)}><Download aria-hidden /> Descargar</Button>}
            {seleccionados.every((i) => i.gestionable) && <Button variant="ghost" size="sm" onClick={() => setMover(seleccionados)}><Folder aria-hidden /> Mover a…</Button>}
            {seleccionados.every((i) => i.gestionable) && <Button variant="ghost" size="sm" onClick={lotePapelera}><Trash2 aria-hidden /> Papelera</Button>}
          </>}
        </div>}
        {items.length === 0
          ? <EstadoVacio icono={vista === "papelera" ? Trash2 : vista === "compartido" ? Users : vista === "recientes" ? Clock3 : vista === "destacados" ? Star : FolderOpen} titulo={q ? "No encontramos nada con ese nombre" : carpetaId && vista !== "papelera" ? "Esta carpeta está vacía" : vacios[vista].titulo} descripcion={q ? "Prueba con otro nombre o cambia de sección." : puedeCrear && (carpetaId || vista === "unidad" || vista === "biblioteca") ? "Sube archivos o crea una carpeta con el botón Nuevo, o arrastra los archivos aquí." : vacios[vista].detalle} />
          : <ListaContenido items={items} modo={modo} seleccion={seleccion} onSeleccion={setSeleccion} onAbrir={abrir} accionesDe={accionesDe} onTecla={teclas} onMenuMovil={setMenuMovil} nuevos={resaltados} />}
      </div>
    </div>

    <PanelSubidas subidas={subidas} onCerrar={cerrar} />
    <HojaAcciones item={menuMovil} acciones={menuMovil ? accionesDe(menuMovil) : []} onCerrar={() => setMenuMovil(null)} />
    <VistaPrevia item={vistaPrevia} onCerrar={() => setVistaPrevia(null)} />
    <PanelDetalles item={detalles} opciones={opciones} onCerrar={() => setDetalles(null)} onCompartir={(i) => { setDetalles(null); setCompartir(i); }} extra={detalles?.tipo === "documento" && detalles.gestionable ? <DialogoEditarDocumento doc={{ id: detalles.id, titulo: detalles.nombre, descripcion: detalles.descripcion ?? null, carpetaId: detalles.carpetaId ?? null, salonId: detalles.salonId ?? null, visibleRoles: detalles.visibleRoles ?? [] }} opciones={opciones} salones={salones} esProfesor={esProfesor} volver={carpetaId} /> : undefined} />
    <DialogoCompartir item={compartir} onCerrar={() => { setCompartir(null); refrescar(); }} personas={personas} salones={salones} esProfesor={esProfesor} onCopiar={copiar} />
    <DialogoRenombrar item={renombrar} onCerrar={() => setRenombrar(null)} onListo={refrescar} />
    <DialogoMover items={mover} opciones={opciones} onCerrar={() => setMover([])} onListo={() => { setSeleccion([]); refrescar(); }} />
    <AlertDialog open={!!eliminar} onOpenChange={(v) => { if (!v) setEliminar(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-falta-fondo text-falta"><Trash2 strokeWidth={2} aria-hidden /></AlertDialogMedia>
          <AlertDialogTitle>¿Eliminar «{eliminar?.nombre}» para siempre?</AlertDialogTitle>
          <AlertDialogDescription>{eliminar?.tipo === "carpeta" ? "Se borrará la carpeta con todo lo que contiene." : "Se borrará el archivo."} No se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <button type="button" className={buttonVariants({ variant: "destructive" })} onClick={() => { const i = eliminar; setEliminar(null); if (i) enviar(eliminarDefinitivoDocumentoAction, i); }}>Eliminar para siempre</button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
