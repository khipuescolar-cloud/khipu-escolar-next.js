"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Download, Eye, FileImage, FileSpreadsheet, FileText, Folder, FolderOpen, MoreVertical, Pencil, Plus, Share2, Trash2, Upload } from "lucide-react";
import type { Rol } from "@/generated/prisma/enums";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IconoAdjunto } from "@/components/adjuntos/IconoAdjunto";
import { formatoTamano } from "@/lib/adjuntos";
import type { AdjuntoVista } from "@/lib/adjuntos";
import { subirDirecto } from "@/lib/subida-directa";
import type { ArbolMateriales, MaterialVista } from "@/lib/server/materiales";
import { NavegacionDocumentos } from "../NavegacionDocumentos";
import { VistaPrevia } from "../DialogosDocumentos";
import type { Item } from "../tipos-documentos";
import { BarraExplorador, type ModoExplorador } from "../BarraExplorador";
import { actualizarMaterialAction, compartirMaterialAction, confirmarSubidaMaterialAction, crearMaterialAction, crearSubcarpetaMaterialAction, iniciarSubidaMaterialAction, moverMaterialACarpetaAction, moverMaterialAPapeleraAction, nuevaVersionMaterialAction, restaurarMaterialAction } from "./actions";

type Curso = { id: string; nombre: string; profesorId: string | null; salon: string; anio: number; grado: number | null; nivel: string; archivado: boolean };
type Carpeta = { id: string; cursoId: string; parentId: string | null; nombre: string };
const href = (cursoId?: string, carpetaId?: string) => `/documentos?seccion=materiales${cursoId ? `&curso=${cursoId}` : ""}${carpetaId ? `&subcarpeta=${carpetaId}` : ""}`;
const nombreCurso = (c: Curso) => `${c.nombre} · ${c.salon}`;
const iconoArchivo = (nombre?: string) => /\.(png|jpe?g|webp|gif)$/i.test(nombre ?? "") ? FileImage : /\.(xlsx?|csv)$/i.test(nombre ?? "") ? FileSpreadsheet : FileText;

export function PanelMateriales({ slug, rol, arbol, cursos, cursoId, carpetaId, carpetas, q, orden }: { slug: string; rol: Rol; arbol: ArbolMateriales; cursos: Curso[]; cursoId: string | null; carpetaId: string | null; carpetas: Carpeta[]; q: string; orden: "recientes" | "antiguos" | "titulo" }) {
  const router = useRouter();
  const [modo, setModo] = useState<ModoExplorador>("lista");
  useEffect(() => { try { if (localStorage.getItem("materiales-modo") === "cuadricula") queueMicrotask(() => setModo("cuadricula")); } catch { /* sin almacenamiento */ } }, []);
  const cambiarModo = (valor: ModoExplorador) => { setModo(valor); try { localStorage.setItem("materiales-modo", valor); } catch { /* sin almacenamiento */ } };
  const [subir, setSubir] = useState(false);
  const [nuevaCarpeta, setNuevaCarpeta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [pendiente, iniciar] = useTransition();
  const [progreso, setProgreso] = useState<Record<string, number>>({});
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<MaterialVista | null>(null);
  const [previa, setPrevia] = useState<Item | null>(null);
  const [compartir, setCompartir] = useState<MaterialVista | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [elegidos, setElegidos] = useState<File[]>([]);
  const selector = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState<MaterialVista | null>(null);
  const [renombrar, setRenombrar] = useState<MaterialVista | null>(null);
  const [mover, setMover] = useState<MaterialVista | null>(null);
  const [destino, setDestino] = useState("");
  const curso = cursos.find(c => c.id === cursoId);
  const gemelos = compartir ? cursos.filter(c => c.profesorId === compartir.profesorId && c.nombre.trim().toLocaleLowerCase("es") === compartir.secciones[0]?.curso.trim().toLocaleLowerCase("es") && c.id !== compartir.origenCursoId && !c.archivado) : [];
  const abrirPrevia = (a: AdjuntoVista) => setPrevia({ tipo: "documento", id: a.id, nombre: a.nombre, propietario: "", modificado: new Date(), creado: new Date(), tamano: a.bytes, archivo: a, gestionable: false, destacado: false, ambito: "unidad" });
  const abrirCompartir = (m: MaterialVista) => { setCompartir(m); setSeleccion(m.secciones.map(s => s.cursoId)); };
  const guardarCompartir = () => iniciar(async () => {
    if (!compartir) return;
    const r = await compartirMaterialAction(slug, compartir.id, seleccion);
    if (!r.ok) { toast.error(r.error); return; }
    const nuevos = cursos.filter(c => seleccion.includes(c.id) && !compartir.secciones.some(s => s.cursoId === c.id));
    setCompartir(null); setDetalle(null);
    toast.success(nuevos.length ? `Compartido con ${nuevos.map(c => c.salon).join(", ")}.` : "Salones actualizados."); router.refresh();
  });
  const actual = carpetas.find(c => c.id === carpetaId);
  const ancestros: Carpeta[] = [];
  let paso = actual;
  while (paso) { const id = paso.id; if (ancestros.some(a => a.id === id)) break; ancestros.unshift(paso); const parentId: string | null = paso.parentId; paso = carpetas.find(c => c.id === parentId); }
  const consulta = q.trim().toLocaleLowerCase("es-PE");
  const comparar = (a: { nombre: string; fecha?: Date }, b: { nombre: string; fecha?: Date }) => orden === "titulo" || !a.fecha || !b.fecha ? a.nombre.localeCompare(b.nombre, "es-PE") : orden === "antiguos" ? a.fecha.getTime() - b.fecha.getTime() : b.fecha.getTime() - a.fecha.getTime();
  const descendientes = (id: string | null, vistos = new Set<string>()): string[] => carpetas.filter(c => c.parentId === id && !vistos.has(c.id)).flatMap(c => { vistos.add(c.id); return [c.id, ...descendientes(c.id, vistos)]; });
  const idsBusqueda = consulta ? new Set([carpetaId, ...descendientes(carpetaId)]) : new Set([carpetaId]);
  const rutaCarpeta = (id: string | null) => { const ruta: string[] = []; let actual = carpetas.find(c => c.id === id); while (actual) { ruta.unshift(actual.nombre); actual = carpetas.find(c => c.id === actual?.parentId); } return ruta.join(" › "); };
  const hijas = carpetas.filter(c => (consulta ? idsBusqueda.has(c.id) : c.parentId === carpetaId) && (!consulta || c.nombre.toLocaleLowerCase("es-PE").includes(consulta))).sort((a,b) => comparar({ nombre: a.nombre }, { nombre: b.nombre }));
  const materiales = curso ? arbol.anios.flatMap(a => a.cursos.flatMap(c => c.secciones.flatMap(s => s.cursoId === curso.id ? s.materiales : []))).filter(m => (m.origenCursoId !== curso.id ? carpetaId === null : idsBusqueda.has(m.carpetaId)) && (!consulta || m.titulo.toLocaleLowerCase("es-PE").includes(consulta))).sort((a,b) => comparar({ nombre: a.titulo, fecha: new Date(a.actualizadoAt) }, { nombre: b.titulo, fecha: new Date(b.actualizadoAt) })) : [];
  const docentes = rol === "profesor";
  const actuales = cursos.filter(c => !c.archivado && c.anio === Math.max(...cursos.map(x => x.anio)));
  const crearCarpeta = () => iniciar(async () => {
    if (!curso) return;
    const r = await crearSubcarpetaMaterialAction(slug, { cursoId: curso.id, parentId: carpetaId, nombre });
    if (!r.ok) { toast.error(r.error); return; }
    setNuevaCarpeta(false); setNombre(""); toast.success("Carpeta creada."); router.refresh();
  });
  const subirArchivos = async (f: FormData) => {
    const archivos = f.getAll("archivos").filter((v): v is File => v instanceof File && v.size > 0);
    if (!archivos.length) throw new Error("Elige al menos un archivo.");
    if (archivos.length > 5 || archivos.some(a => a.size > 25 * 1024 * 1024)) throw new Error("Admite hasta 5 archivos de 25 MB cada uno.");
    f.delete("archivos");
    for (const archivo of archivos) {
      const r = await subirDirecto(archivo, {
        iniciar: () => iniciarSubidaMaterialAction(slug, { nombre: archivo.name, bytes: archivo.size, mimeDeclarado: archivo.type || "application/octet-stream" }),
        confirmar: async id => { await confirmarSubidaMaterialAction(slug, id); return { subidaId: id }; },
        onProgreso: p => setProgreso(prev => ({ ...prev, [archivo.name]: p })),
      });
      f.append("subidaIds", r.subidaId);
    }
  };
  const crear = (f: FormData) => iniciar(async () => {
    if (!curso) return;
    f.set("cursoIds", curso.id); if (carpetaId) f.set("carpetaId", carpetaId);
    try { await subirArchivos(f); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo."); return; }
    const r = await crearMaterialAction(slug, f);
    if (!r.ok) { toast.error(r.error); return; }
    setSubir(false); setElegidos([]); setProgreso({}); setResaltado(r.id || null);
    toast.success(`Material subido a ${nombreCurso(curso)}.`); router.refresh();
  });
  const nuevaVersion = (f: FormData) => iniciar(async () => {
    if (!version) return;
    try { await subirArchivos(f); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo."); return; }
    const r = await nuevaVersionMaterialAction(slug, version.id, f);
    if (!r.ok) { toast.error(r.error); return; }
    setVersion(null); setProgreso({}); toast.success("Nueva versión guardada."); router.refresh();
  });
  const cambiarNombre = (f: FormData) => iniciar(async () => {
    if (!renombrar) return;
    for (const s of renombrar.secciones) f.append("cursoIds", s.cursoId);
    const r = await actualizarMaterialAction(slug, renombrar.id, f);
    if (!r.ok) { toast.error(r.error); return; }
    setRenombrar(null); toast.success("Material renombrado."); router.refresh();
  });
  const moverMaterial = () => iniciar(async () => {
    if (!mover || !curso) return;
    const r = await moverMaterialACarpetaAction(slug, mover.id, curso.id, destino || null);
    if (!r.ok) { toast.error(r.error); return; }
    setMover(null); toast.success("Material movido."); router.refresh();
  });
  const papelera = (m: MaterialVista) => iniciar(async () => {
    const r = m.enPapelera ? await restaurarMaterialAction(slug, m.id) : await moverMaterialAPapeleraAction(slug, m.id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(m.enPapelera ? "Material restaurado." : "Material movido a la papelera."); router.refresh();
  });
  const grupos = (lista: Curso[]) => [...new Set(lista.map(c => c.anio))].sort((a,b) => orden === "antiguos" ? a-b : b-a).map(anio => <section key={anio} className="space-y-3"><h3 className="text-sm font-semibold text-muted-foreground">{anio}</h3>{(rol === "direccion" ? [...new Set(lista.filter(c => c.anio === anio).map(c => `${c.nivel}|${c.grado ?? 0}`))].sort() : [""]).map(grupo => { const filtrados = lista.filter(c => c.anio === anio && (!grupo || `${c.nivel}|${c.grado ?? 0}` === grupo)); return <div key={grupo} className="space-y-2">{grupo && <h4 className="text-sm font-medium">{filtrados[0]?.grado}.° · {filtrados[0]?.nivel}</h4>}<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{filtrados.sort((a,b) => comparar({ nombre: nombreCurso(a) }, { nombre: nombreCurso(b) })).map(c => <Link key={c.id} href={href(c.id)} className="flex min-h-16 items-center gap-3 rounded-xl border border-borde-sutil bg-card px-4 py-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Folder className="size-5 shrink-0 text-sec-trazo" aria-hidden /><span>{nombreCurso(c)}</span></Link>)}</div></div>; })}</section>);
  return <div className="grid min-w-0 gap-4 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
    <aside className="min-w-0 space-y-3">
      {docentes && <DropdownMenu><DropdownMenuTrigger render={<Button className="h-12 w-full justify-start px-5 md:w-auto" />}><Plus aria-hidden /> Nuevo <ChevronDown aria-hidden /></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem disabled={!curso} onClick={() => setSubir(true)}><Upload aria-hidden /> Subir material{!curso && <span className="sr-only">. Entra a la carpeta de un salón</span>}</DropdownMenuItem><DropdownMenuItem disabled={!curso} onClick={() => setNuevaCarpeta(true)}><Folder aria-hidden /> Nueva carpeta{!curso && <span className="sr-only">. Entra a la carpeta de un salón</span>}</DropdownMenuItem>{!curso && <p className="px-3 py-2 text-xs text-muted-foreground">Entra a la carpeta de un salón</p>}</DropdownMenuContent></DropdownMenu>}
      <NavegacionDocumentos rol={rol} activa="materiales" />
    </aside>
    <section className="min-w-0 space-y-5"><h2 className="text-xl font-semibold">Materiales de clase</h2>
      {curso && <nav aria-label="Ruta de materiales" className="flex flex-wrap items-center gap-1 text-sm"><Link href={href()} className="min-h-11 content-center text-primary hover:underline">Materiales de clase</Link><ChevronRight className="size-4" aria-hidden /><Link href={href(curso.id)} className="min-h-11 content-center text-primary hover:underline">{nombreCurso(curso)}</Link>{ancestros.map(c => <span key={c.id} className="flex items-center gap-1"><ChevronRight className="size-4" aria-hidden /><Link href={href(curso.id,c.id)} className="min-h-11 content-center hover:underline">{c.nombre}</Link></span>)}</nav>}
      <BarraExplorador q={q} orden={orden} modo={modo} campos={{ seccion: "materiales", curso: cursoId, subcarpeta: carpetaId }} conservarOrden onOrden={valor => { const params = new URLSearchParams({ seccion: "materiales", orden: valor }); if (cursoId) params.set("curso", cursoId); if (carpetaId) params.set("subcarpeta", carpetaId); if (q) params.set("q", q); router.push(`/documentos?${params}`); }} onModo={cambiarModo} />
      {!curso ? <>{!cursos.length ? <EstadoVacio icono={FolderOpen} titulo={q ? "No encontramos nada con ese nombre" : "Todavía no hay salones"} descripcion={q ? "Prueba con otro nombre." : "Las carpetas aparecerán cuando tengas cursos asignados."} /> : (() => { const visibles = cursos.filter(c => !consulta || nombreCurso(c).toLocaleLowerCase("es-PE").includes(consulta)); if (!visibles.length) return <EstadoVacio icono={FolderOpen} titulo="No encontramos nada con ese nombre" descripcion="Prueba con otro nombre." />; const recientes = visibles.filter(c => actuales.includes(c)); const pasados = visibles.filter(c => !actuales.includes(c)); return <div className="space-y-6">{grupos(recientes)}{!!pasados.length && <details open={!!consulta || undefined} className="rounded-xl border border-borde-sutil p-4"><summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">Años anteriores</summary><div className="mt-4 space-y-5">{grupos(pasados)}</div></details>}</div>; })()}</> : <>
        {hijas.length === 0 && materiales.length === 0 ? <EstadoVacio icono={FolderOpen} titulo={q ? "No encontramos nada con ese nombre" : "Esta carpeta está vacía"} descripcion={q ? "Prueba con otro nombre." : docentes ? "Usa Nuevo para subir un material o crear una carpeta." : "Los materiales del salón aparecerán aquí."} /> : <ul className={modo === "cuadricula" ? "grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-borde-sutil overflow-hidden rounded-xl border border-borde-sutil bg-card"}>
          {hijas.map(c => <li key={c.id} className={modo === "cuadricula" ? "rounded-xl border border-borde-sutil bg-card" : ""}><Link href={href(curso.id,c.id)} className="flex min-h-16 min-w-0 items-center gap-3 px-4 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Folder className="size-5 shrink-0 text-sec-trazo" aria-hidden /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.nombre}</span>{consulta && <span className="block truncate text-xs text-muted-foreground">{rutaCarpeta(c.parentId)}</span>}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /></Link></li>)}
          {materiales.map(m => { const Icono = iconoArchivo(m.archivos[0]?.nombre); return <li key={m.id} data-material-id={m.id} className={`min-w-0 ${modo === "cuadricula" ? "overflow-hidden rounded-xl border border-borde-sutil bg-card" : ""} ${resaltado === m.id ? "bg-sec-suave ring-2 ring-inset ring-sec-trazo" : ""}`}><div className={modo === "cuadricula" ? "flex h-full min-w-0 flex-col" : "flex min-h-16 min-w-0 items-center gap-3 px-4 py-2"}>{modo === "cuadricula" ? <button type="button" aria-label={`Abrir ${m.titulo}`} onClick={() => setDetalle(m)} className="flex h-28 w-full items-center justify-center bg-sec-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><Icono className="size-10 text-sec-trazo" aria-hidden /></button> : <Icono className="size-5 shrink-0 text-sec-trazo" aria-hidden />}<div className={modo === "cuadricula" ? "flex min-w-0 flex-1 items-center gap-1 border-t border-borde-sutil py-2 pr-1 pl-3" : "flex min-w-0 flex-1 items-center gap-2"}><button type="button" onClick={() => setDetalle(m)} className="min-h-11 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block truncate font-medium">{m.titulo}</span><span className="block truncate text-xs text-muted-foreground">{new Intl.DateTimeFormat("es-PE").format(m.actualizadoAt)} · v{m.versionActual} · {formatoTamano(m.archivos.reduce((n,a) => n+a.bytes,0))}</span>{consulta && <span className="block truncate text-xs text-muted-foreground">{rutaCarpeta(m.carpetaId)}</span>}</button><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Acciones de ${m.titulo}`} />}><MoreVertical aria-hidden /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setDetalle(m)}>Abrir detalle</DropdownMenuItem>{m.archivos[0] && <><DropdownMenuItem onClick={() => abrirPrevia(m.archivos[0])}><Eye aria-hidden /> Ver</DropdownMenuItem><DropdownMenuItem render={<a href={`/archivos/${m.archivos[0].id}`} download={m.archivos[0].nombre} />}><Download aria-hidden /> Descargar</DropdownMenuItem></>}{m.compartible && <DropdownMenuItem onClick={() => abrirCompartir(m)}><Share2 aria-hidden /> Compartir con otros salones</DropdownMenuItem>}{m.gestionable && <><DropdownMenuItem onClick={() => setVersion(m)}>Nueva versión</DropdownMenuItem><DropdownMenuItem onClick={() => setRenombrar(m)}><Pencil aria-hidden /> Renombrar</DropdownMenuItem>{m.secciones.length === 1 && <DropdownMenuItem onClick={() => { setMover(m); setDestino(m.carpetaId || ""); }}><Folder aria-hidden /> Mover a subcarpeta</DropdownMenuItem>}<DropdownMenuItem onClick={() => papelera(m)}><Trash2 aria-hidden /> Papelera</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div></div></li>; })}
        </ul>}
      </>}
    </section>
    <Dialog open={nuevaCarpeta} onOpenChange={setNuevaCarpeta}><DialogContent><DialogHeader><DialogTitle>Nueva carpeta</DialogTitle><DialogDescription>Se creará dentro de {actual?.nombre || (curso && nombreCurso(curso))}.</DialogDescription></DialogHeader><form action={crearCarpeta} className="space-y-4"><label className="grid gap-2 text-sm font-medium">Nombre<Input value={nombre} onChange={e => setNombre(e.target.value)} required maxLength={100} /></label><DialogFooter><Button type="button" variant="outline" onClick={() => setNuevaCarpeta(false)}>Cancelar</Button><Button type="submit" disabled={pendiente || !nombre.trim()}>Crear</Button></DialogFooter></form></DialogContent></Dialog>
    <Sheet open={subir} onOpenChange={setSubir}><SheetContent movil="abajo"><SheetHeader><SheetTitle>Subir material</SheetTitle><SheetDescription>{curso && nombreCurso(curso)}{actual ? ` › ${actual.nombre}` : ""}</SheetDescription></SheetHeader><form action={crear} className="flex min-h-0 flex-1 flex-col"><SheetBody><label className="grid gap-2 text-sm font-medium">Título<Input name="titulo" required maxLength={150} /></label><label className="grid gap-2 text-sm font-medium">Descripción (opcional)<Input name="descripcion" maxLength={600} /></label><label className="grid gap-2 text-sm font-medium">Unidad o tema (opcional)<Input name="unidadTema" maxLength={120} /></label><div className="grid gap-2 text-sm font-medium"><label htmlFor="archivos-material">Archivos</label><input ref={selector} id="archivos-material" name="archivos" type="file" multiple required className="sr-only peer" onChange={e => setElegidos(Array.from(e.target.files ?? []))} /><Button type="button" variant="outline" className="w-fit peer-focus-visible:ring-2 peer-focus-visible:ring-ring" onClick={() => selector.current?.click()}><Upload className="size-4" aria-hidden /> Elegir archivos</Button>{elegidos.length > 0 && <ul className="space-y-1 text-sm font-normal">{elegidos.map((a, i) => <li key={i} className="break-all">{a.name} · {formatoTamano(a.size)}</li>)}</ul>}</div>{Object.entries(progreso).map(([nombre,p]) => <p key={nombre} role="status" className="text-sm">{nombre}: {p}%</p>)}<p className="text-xs text-muted-foreground">Hasta 5 archivos de 25 MB cada uno.</p><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="publicar" defaultChecked className="size-5 accent-primary" />Publicar ahora</label></SheetBody><SheetFooter><Button type="button" variant="outline" onClick={() => setSubir(false)}>Cancelar</Button><Button type="submit" disabled={pendiente}>{pendiente ? "Subiendo…" : "Subir material"}</Button></SheetFooter></form></SheetContent></Sheet>
    <Sheet open={!!detalle} onOpenChange={open => !open && setDetalle(null)}><SheetContent movil="abajo"><SheetHeader><SheetTitle>{detalle?.titulo}</SheetTitle><SheetDescription>Versión {detalle?.versionActual} · {detalle?.estado}</SheetDescription></SheetHeader><SheetBody className="space-y-5">{detalle?.descripcion && <p>{detalle.descripcion}</p>}{detalle && <section aria-label="Archivos" className="space-y-3"><h3 className="text-sm font-semibold">Archivos</h3>{detalle.archivos.map(a => <div key={a.id} className="space-y-2 rounded-xl border border-borde-sutil p-3"><div className="flex min-w-0 items-center gap-2"><IconoAdjunto mimeType={a.mimeType} nombre={a.nombre} /><span className="min-w-0 flex-1 break-all text-sm font-medium">{a.nombre}</span><span className="text-xs text-muted-foreground">{formatoTamano(a.bytes)}</span></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => abrirPrevia(a)}><Eye className="size-4" aria-hidden /> Ver</Button><a className={buttonVariants({ variant: "outline" })} href={`/archivos/${a.id}`} download={a.nombre}><Download className="size-4" aria-hidden /> Descargar</a></div></div>)}</section>}</SheetBody>{detalle?.compartible && <SheetFooter><Button variant="outline" onClick={() => abrirCompartir(detalle)}><Share2 className="size-4" aria-hidden /> Compartir con otros salones</Button></SheetFooter>}</SheetContent></Sheet>
    <VistaPrevia item={previa} onCerrar={() => setPrevia(null)} />
    <Dialog open={!!compartir} onOpenChange={open => !open && setCompartir(null)}><DialogContent><DialogHeader><DialogTitle>Compartir con otros salones</DialogTitle><DialogDescription>{compartir?.titulo} · {compartir?.secciones[0]?.curso}. El salón de origen permanece seleccionado.</DialogDescription></DialogHeader><div className="max-h-[45dvh] space-y-1 overflow-y-auto">{compartir && <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 text-sm"><Checkbox checked disabled /><span className="min-w-0"><span className="block font-medium">{cursos.find(c => c.id === compartir.origenCursoId)?.salon ?? "Salón de origen"} <span className="font-normal text-muted-foreground">· origen</span></span><span className="block text-muted-foreground">{cursos.find(c => c.id === compartir.origenCursoId)?.nombre ?? compartir.secciones[0]?.curso}</span></span></label>}{gemelos.length ? gemelos.map(c => <label key={c.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"><Checkbox checked={seleccion.includes(c.id)} onCheckedChange={v => setSeleccion(prev => v ? [...prev, c.id] : prev.filter(id => id !== c.id))} /><span className="min-w-0"><span className="block font-medium">{c.salon}</span><span className="block text-muted-foreground">{c.nombre}</span></span></label>) : <p className="text-sm text-muted-foreground">Solo dictas este curso en un salón</p>}</div><DialogFooter><Button variant="outline" onClick={() => setCompartir(null)}>Cancelar</Button><Button onClick={guardarCompartir} disabled={pendiente || !gemelos.length}>Guardar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!version} onOpenChange={open => !open && setVersion(null)}><DialogContent><DialogHeader><DialogTitle>Nueva versión</DialogTitle><DialogDescription>Conservaremos las versiones anteriores.</DialogDescription></DialogHeader><form action={nuevaVersion} className="space-y-4"><label className="grid gap-2">Archivos<input name="archivos" type="file" multiple required /></label>{Object.entries(progreso).map(([n,p]) => <p key={n} role="status">{n}: {p}%</p>)}<DialogFooter><Button type="button" variant="outline" onClick={() => setVersion(null)}>Cancelar</Button><Button type="submit" disabled={pendiente}>Guardar versión</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={!!renombrar} onOpenChange={open => !open && setRenombrar(null)}><DialogContent><DialogHeader><DialogTitle>Renombrar material</DialogTitle></DialogHeader><form action={cambiarNombre} className="space-y-4"><label className="grid gap-2">Título<Input name="titulo" defaultValue={renombrar?.titulo} required /></label><input type="hidden" name="descripcion" value={renombrar?.descripcion || ""} /><input type="hidden" name="unidadTema" value={renombrar?.unidadTema || ""} /><DialogFooter><Button type="button" variant="outline" onClick={() => setRenombrar(null)}>Cancelar</Button><Button type="submit" disabled={pendiente}>Guardar</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={!!mover} onOpenChange={open => !open && setMover(null)}><DialogContent><DialogHeader><DialogTitle>Mover a subcarpeta</DialogTitle><DialogDescription>Elige la carpeta de destino de este salón.</DialogDescription></DialogHeader><div className="space-y-2"><label className="flex min-h-11 items-center gap-2"><input type="radio" checked={!destino} onChange={() => setDestino("")} />Raíz del salón</label>{carpetas.map(c => <label key={c.id} className="flex min-h-11 items-center gap-2"><input type="radio" checked={destino === c.id} onChange={() => setDestino(c.id)} />{c.nombre}</label>)}</div><DialogFooter><Button variant="outline" onClick={() => setMover(null)}>Cancelar</Button><Button onClick={moverMaterial} disabled={pendiente}>Mover</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
