"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Link2, Lock, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { NivelCompartidoDocumento, Rol } from "@/generated/prisma/enums";
import { accesoGeneralDirectoAction, cargarDetalleAccesosAction, compartirDirectoAction, quitarAccesoDirectoAction } from "./actions";
import { ETIQUETA_ROL, GRUPOS_ROL, iniciales, type Item, type Persona, type Salon } from "./tipos-documentos";

type Detalle = Awaited<ReturnType<typeof cargarDetalleAccesosAction>>;
type Destino = { clave: string; tipo: "persona" | "grupo"; etiqueta: string; detalle: string; membershipId?: string; rol?: Rol; salonId?: string };
const ETIQUETA_NIVEL: Record<NivelCompartidoDocumento, string> = { lector: "Lector", editor: "Editor" };
const soloLector = (rol: string | null | undefined) => rol === "apoderado" || rol === "alumno";
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es");

function Avatar({ nombre, grupo }: { nombre: string; grupo?: boolean }) {
  return <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sec-suave text-xs font-semibold text-sec-tinta">{grupo ? <Users className="size-4 text-sec-trazo" strokeWidth={2} /> : iniciales(nombre)}</span>;
}

/** Selector de nivel como menú (Lector / Editor, más «Quitar acceso» cuando se puede). */
function MenuNivel({ nivel, onCambiar, onQuitar, permiteEditor, deshabilitado, etiqueta }: { nivel: NivelCompartidoDocumento; onCambiar: (n: NivelCompartidoDocumento) => void; onQuitar?: () => void; permiteEditor: boolean; deshabilitado?: boolean; etiqueta: string }) {
  return <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="min-h-11 shrink-0 text-muted-foreground" disabled={deshabilitado} aria-label={`Nivel de acceso de ${etiqueta}: ${ETIQUETA_NIVEL[nivel]}`} />}>{ETIQUETA_NIVEL[nivel]}<ChevronDown className="size-4" strokeWidth={2} aria-hidden /></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-52">
      <DropdownMenuRadioGroup value={nivel} onValueChange={(v) => onCambiar(v as NivelCompartidoDocumento)}>
        <DropdownMenuRadioItem value="lector" className="min-h-11"><span className="flex flex-col"><span>Lector</span><span className="text-xs text-muted-foreground">Ve y descarga</span></span></DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="editor" disabled={!permiteEditor} className="min-h-11"><span className="flex flex-col"><span>Editor</span><span className="text-xs text-muted-foreground">{permiteEditor ? "Sube, renombra, mueve, comparte y borra" : "No disponible para familias ni alumnos"}</span></span></DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      {onQuitar && <><DropdownMenuSeparator /><DropdownMenuItem className="min-h-11" variant="destructive" onClick={onQuitar}>Quitar acceso</DropdownMenuItem></>}
    </DropdownMenuContent>
  </DropdownMenu>;
}

export function DialogoCompartir({ item, onCerrar, personas, salones, esProfesor, onCopiar }: { item: Item | null; onCerrar: () => void; personas: Persona[]; salones: Salon[]; esProfesor: boolean; onCopiar: (i: Item) => void }) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [problema, setProblema] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [enfocado, setEnfocado] = useState(false);
  const [activo, setActivo] = useState(0);
  const [chips, setChips] = useState<Destino[]>([]);
  const [nivelNuevo, setNivelNuevo] = useState<NivelCompartidoDocumento>("lector");
  const [avisar, setAvisar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [modoGeneral, setModoGeneral] = useState<"restringido" | "colegio">("restringido");
  const [rolesGenerales, setRolesGenerales] = useState<string[]>([]);
  const [salonGeneral, setSalonGeneral] = useState("");
  const [guardandoGeneral, setGuardandoGeneral] = useState(false);
  const idLista = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const itemId = item?.id;
  const itemTipo = item?.tipo;

  const cargar = useCallback(async () => {
    if (!itemId || !itemTipo) return;
    try {
      const d = await cargarDetalleAccesosAction(itemTipo, itemId);
      setDetalle(d);
      setProblema(false);
      return d;
    } catch { setProblema(true); }
  }, [itemId, itemTipo]);

  useEffect(() => {
    if (!itemId) return;
    queueMicrotask(() => {
      setDetalle(null); setChips([]); setConsulta(""); setAvisar(false); setNivelNuevo("lector"); setProblema(false);
      void cargar().then((d) => {
        if (!d) return;
        setRolesGenerales(d.general.roles);
        setSalonGeneral(d.general.salonId ?? "");
        setModoGeneral(d.general.roles.length > 0 || (d.general.ambito === "biblioteca" && itemTipo === "carpeta") ? "colegio" : "restringido");
      });
    });
  }, [itemId, itemTipo, cargar]);

  const yaTienen = useMemo(() => new Set((detalle?.entradas ?? []).map((e) => e.membershipId ? `p:${e.membershipId}` : `g:${e.rol}:${e.salonId ?? ""}`)), [detalle]);
  const opciones = useMemo(() => {
    const q = normalizar(consulta.trim());
    const lista: Destino[] = [];
    for (const p of personas) lista.push({ clave: `p:${p.id}`, tipo: "persona", etiqueta: p.nombre, detalle: `${ETIQUETA_ROL[p.rol] ?? p.rol} · ${p.email}`, membershipId: p.id, rol: p.rol as Rol });
    if (!esProfesor) for (const g of GRUPOS_ROL) lista.push({ clave: `g:${g.rol}:`, tipo: "grupo", etiqueta: g.plural, detalle: "Grupo · todo el colegio", rol: g.rol });
    for (const s of salones) for (const g of GRUPOS_ROL.filter((x) => x.rol !== "administrativo")) lista.push({ clave: `g:${g.rol}:${s.id}`, tipo: "grupo", etiqueta: `${g.plural} de ${s.nombre}`, detalle: "Grupo · salón", rol: g.rol, salonId: s.id });
    const libres = lista.filter((o) => !yaTienen.has(o.clave) && !chips.some((c) => c.clave === o.clave));
    // Sin texto: primero los grupos (lo más común en un colegio) y unas pocas personas.
    const base = q ? libres.filter((o) => normalizar(`${o.etiqueta} ${o.detalle}`).includes(q)) : [...libres.filter((o) => o.tipo === "grupo"), ...libres.filter((o) => o.tipo === "persona")];
    return base.slice(0, 8);
  }, [consulta, personas, salones, esProfesor, yaTienen, chips]);

  const agregar = (o: Destino) => { setChips((c) => [...c, o]); setConsulta(""); setActivo(0); setEnfocado(false); entrada.current?.focus(); };
  const permiteEditor = chips.every((c) => !(c.tipo === "persona" ? soloLector(c.rol) : soloLector(c.rol)));
  const nivelEfectivo: NivelCompartidoDocumento = permiteEditor ? nivelNuevo : "lector";
  const agregando = chips.length > 0;
  const mostrarLista = enfocado && opciones.length > 0;

  const enviar = async () => {
    if (!item || !agregando) return;
    setEnviando(true);
    const r = await compartirDirectoAction(item.tipo, item.id, chips.map((c) => ({ membershipId: c.membershipId, rol: c.tipo === "grupo" ? c.rol : undefined, salonId: c.salonId ?? null })), nivelEfectivo, avisar).catch(() => ({ ok: false as const, error: "No se pudo compartir. Inténtalo de nuevo." }));
    setEnviando(false);
    if (r.ok) { toast.success(r.mensaje ?? "Acceso compartido."); setChips([]); setAvisar(false); await cargar(); }
    else toast.error(r.error);
  };
  const cambiarNivel = async (e: Detalle["entradas"][number], nivel: NivelCompartidoDocumento) => {
    if (!item || e.nivel === nivel) return;
    const r = await compartirDirectoAction(item.tipo, item.id, [{ membershipId: e.membershipId ?? undefined, rol: e.membershipId ? undefined : (e.rol ?? undefined), salonId: e.salonId }], nivel, false).catch(() => ({ ok: false as const, error: "No se pudo cambiar el nivel." }));
    if (r.ok) await cargar(); else toast.error(r.error);
  };
  const quitar = async (e: Detalle["entradas"][number]) => {
    if (!item) return;
    const r = await quitarAccesoDirectoAction(item.tipo, item.id, e.id).catch(() => ({ ok: false as const, error: "No se pudo quitar el acceso." }));
    if (r.ok) { toast.success("Acceso quitado."); await cargar(); } else toast.error(r.error);
  };
  const guardarGeneral = async (roles: string[], salonId: string) => {
    if (!item) return;
    setGuardandoGeneral(true);
    const r = await accesoGeneralDirectoAction(item.tipo, item.id, roles as Rol[], salonId || null).catch(() => ({ ok: false as const, error: "No se pudo guardar el acceso general." }));
    setGuardandoGeneral(false);
    if (!r.ok) { toast.error(r.error); await cargar(); }
  };
  const cambiarModo = (m: "restringido" | "colegio") => {
    setModoGeneral(m);
    if (m === "restringido") { setRolesGenerales([]); setSalonGeneral(""); void guardarGeneral([], ""); }
  };
  const alternarRol = (rol: string, marcado: boolean) => {
    const roles = marcado ? [...rolesGenerales, rol] : rolesGenerales.filter((r) => r !== rol);
    setRolesGenerales(roles);
    if (!esProfesor || salonGeneral) void guardarGeneral(roles, salonGeneral);
  };
  const cambiarSalon = (id: string) => {
    setSalonGeneral(id);
    if (rolesGenerales.length > 0 || id === "") void guardarGeneral(rolesGenerales, id);
  };

  const teclas = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setEnfocado(true); setActivo((a) => Math.min(a + 1, opciones.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && mostrarLista) { e.preventDefault(); if (opciones[activo]) agregar(opciones[activo]); }
    else if (e.key === "Backspace" && consulta === "" && chips.length) setChips((c) => c.slice(0, -1));
    else if (e.key === "Escape" && (mostrarLista || consulta)) { e.stopPropagation(); setEnfocado(false); setConsulta(""); }
  };

  const salonesGenerales = salones;
  const rolesDisponibles = GRUPOS_ROL.filter((g) => !esProfesor || g.rol !== "administrativo");
  const esBibliotecaCarpeta = item?.ambito === "biblioteca" && item.tipo === "carpeta";

  return <Dialog open={!!item} onOpenChange={(v) => { if (!v) onCerrar(); }}>
    <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-xl" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle className="truncate">Compartir «{item?.nombre}»</DialogTitle>
        <DialogDescription>Elige quién puede ver o editar. El enlace no da acceso por sí solo.</DialogDescription>
      </DialogHeader>

      <div className="relative">
        <div className={cn("flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input bg-superficie-elevada px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20")}>
          {chips.map((c) => <span key={c.clave} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-sec-suave py-0.5 pr-1 pl-3 text-sm text-sec-tinta">{c.etiqueta}<button type="button" aria-label={`Quitar a ${c.etiqueta}`} onClick={() => setChips((x) => x.filter((y) => y.clave !== c.clave))} className="flex size-7 items-center justify-center rounded-full hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-3.5" strokeWidth={2} aria-hidden /></button></span>)}
          <input ref={entrada} role="combobox" aria-expanded={mostrarLista} aria-controls={idLista} aria-autocomplete="list" aria-activedescendant={mostrarLista ? `${idLista}-${activo}` : undefined} aria-label="Agregar personas y grupos" value={consulta} onChange={(e) => { setConsulta(e.target.value); setActivo(0); setEnfocado(true); }} onClick={() => setEnfocado(true)} onBlur={() => setTimeout(() => setEnfocado(false), 120)} onKeyDown={teclas} placeholder={chips.length ? "Agregar más" : "Agregar personas y grupos"} autoComplete="off" className="min-h-8 min-w-32 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-texto-terciario md:text-sm" />
        </div>
        {mostrarLista && <ul id={idLista} role="listbox" aria-label="Sugerencias" className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-borde-sutil bg-popover p-1 shadow-sombra-1">
          {opciones.map((o, i) => <li key={o.clave} id={`${idLista}-${i}`} role="option" aria-selected={i === activo} onMouseDown={(e) => { e.preventDefault(); agregar(o); }} onMouseEnter={() => setActivo(i)} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5", i === activo && "bg-accent")}><Avatar nombre={o.etiqueta} grupo={o.tipo === "grupo"} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{o.etiqueta}</span><span className="block truncate text-xs text-muted-foreground">{o.detalle}</span></span></li>)}
        </ul>}
      </div>

      {agregando ? <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Podrán entrar con su sesión del colegio.</p>
          <MenuNivel nivel={nivelEfectivo} onCambiar={setNivelNuevo} permiteEditor={permiteEditor} etiqueta="las personas elegidas" />
        </div>
        {!permiteEditor && <p className="text-sm text-muted-foreground">Las familias y los alumnos solo pueden ver y descargar.</p>}
        <label className="flex min-h-11 items-center gap-2.5 text-sm"><Checkbox checked={avisar} onCheckedChange={(v) => setAvisar(v === true)} /> Avisar a las personas <span className="text-muted-foreground">(por ahora a las familias que lo permiten)</span></label>
      </div> : <>
        <section aria-labelledby={`${idLista}-acc`} className="space-y-1">
          <h3 id={`${idLista}-acc`} className="text-sm font-semibold">Personas con acceso</h3>
          {problema ? <p role="alert" className="text-sm text-destructive">No se pudo cargar quién tiene acceso. Cierra y vuelve a abrir.</p> : !detalle ? <div aria-busy className="space-y-2" role="status"><span className="sr-only">Cargando</span>{[0, 1].map((i) => <div key={i} className="h-12 motion-safe:animate-pulse rounded-lg bg-sec-suave" />)}</div> : <ul className="max-h-[30dvh] divide-y divide-borde-sutil overflow-y-auto">
            {detalle.propietario && <li className="flex min-h-14 items-center gap-3 py-1.5"><Avatar nombre={detalle.propietario.nombre} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{detalle.propietario.nombre}{detalle.propietario.esTu && " (tú)"}</span><span className="block truncate text-xs text-muted-foreground">{ETIQUETA_ROL[detalle.propietario.rol] ?? detalle.propietario.rol} · {detalle.propietario.email}</span></span><span className="shrink-0 px-3 text-sm text-muted-foreground">Propietario</span></li>}
            {detalle.entradas.map((e) => <li key={e.id} className="flex min-h-14 items-center gap-3 py-1.5"><Avatar nombre={e.nombre} grupo={!e.membershipId} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{e.nombre}</span><span className="block truncate text-xs text-muted-foreground">{e.membershipId ? `${ETIQUETA_ROL[e.rolDestino ?? ""] ?? e.rolDestino} · ${e.email}` : "Grupo"}</span></span><MenuNivel nivel={e.nivel} etiqueta={e.nombre} permiteEditor={!soloLector(e.rolDestino)} onCambiar={(n) => void cambiarNivel(e, n)} onQuitar={() => void quitar(e)} /></li>)}
            {detalle.heredadas.map((h) => <li key={`h-${h.id}`} className="flex min-h-14 items-center gap-3 py-1.5"><Avatar nombre={h.nombre} grupo={!h.email} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{h.nombre}</span><span className="block truncate text-xs text-muted-foreground">Heredado de «{h.desde}»</span></span><span className="shrink-0 px-3 text-sm text-muted-foreground">{ETIQUETA_NIVEL[h.nivel]}</span></li>)}
            {detalle.entradas.length === 0 && detalle.heredadas.length === 0 && <li className="py-3 text-sm text-muted-foreground">Solo tú y dirección tienen acceso por ahora.</li>}
          </ul>}
        </section>

        <section aria-labelledby={`${idLista}-gen`} className="space-y-3 border-t border-borde-sutil pt-4">
          <h3 id={`${idLista}-gen`} className="text-sm font-semibold">Acceso general</h3>
          <div className="flex items-start gap-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sec-suave">{modoGeneral === "restringido" ? <Lock className="size-4 text-sec-trazo" strokeWidth={2} /> : <Building2 className="size-4 text-sec-trazo" strokeWidth={2} />}</span>
            <div className="min-w-0 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="-ml-3 min-h-11 font-semibold" disabled={!detalle || guardandoGeneral} aria-label={`Acceso general: ${modoGeneral === "restringido" ? "Restringido" : "Todo el colegio"}`} />}>{modoGeneral === "restringido" ? "Restringido" : "Todo el colegio"}<ChevronDown className="size-4" strokeWidth={2} aria-hidden /></DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-64">
                  <DropdownMenuRadioGroup value={modoGeneral} onValueChange={(v) => cambiarModo(v as "restringido" | "colegio")}>
                    {!esBibliotecaCarpeta && <DropdownMenuRadioItem value="restringido" className="min-h-11"><span className="flex flex-col"><span>Restringido</span><span className="text-xs text-muted-foreground">Solo las personas agregadas</span></span></DropdownMenuRadioItem>}
                    <DropdownMenuRadioItem value="colegio" className="min-h-11"><span className="flex flex-col"><span>Todo el colegio</span><span className="text-xs text-muted-foreground">Los roles que elijas, con salón opcional</span></span></DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-sm text-muted-foreground">{modoGeneral === "restringido" ? "Solo entran las personas agregadas y dirección." : esBibliotecaCarpeta && rolesGenerales.length === 0 ? "Sin roles marcados, la carpeta la ven todos los roles; el contenido necesita sus roles." : "Entran los roles marcados, con su sesión del colegio."}</p>
            </div>
          </div>
          {modoGeneral === "colegio" && <div className="ml-12 space-y-3">
            <div role="group" aria-label="Roles con acceso" className="grid gap-x-4 sm:grid-cols-2">
              {rolesDisponibles.map((g) => <label key={g.rol} className="flex min-h-11 items-center gap-2.5 text-sm"><Checkbox checked={rolesGenerales.includes(g.rol)} disabled={guardandoGeneral} onCheckedChange={(v) => alternarRol(g.rol, v === true)} />{g.plural}</label>)}
            </div>
            <label className="block space-y-1.5 text-sm font-medium">Salón{!esProfesor && <span className="font-normal text-muted-foreground"> (opcional)</span>}
              <NativeSelect className="w-full" value={salonGeneral} disabled={guardandoGeneral} onChange={(e) => cambiarSalon(e.target.value)}>
                <option value="">{esProfesor ? "Elige un salón" : "Todos los salones"}</option>
                {salonesGenerales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </NativeSelect>
            </label>
            {esProfesor && rolesGenerales.length > 0 && !salonGeneral && <p role="status" className="text-sm text-muted-foreground">Elige uno de tus salones para guardar este acceso.</p>}
          </div>}
        </section>
      </>}

      <DialogFooter className={agregando ? "sm:justify-end" : "sm:justify-between"}>
        {agregando ? <>
          <Button variant="outline" onClick={() => { setChips([]); setAvisar(false); }}>Cancelar</Button>
          <Button onClick={() => void enviar()} loading={enviando}><Check aria-hidden /> Compartir</Button>
        </> : <>
          <Button variant="outline" onClick={() => item && onCopiar(item)}><Link2 aria-hidden /> Copiar enlace</Button>
          <Button onClick={onCerrar}>Listo</Button>
        </>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
