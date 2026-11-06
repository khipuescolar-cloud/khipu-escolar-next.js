import { ChevronRight, Download, FileSearch, Folder, FolderOpen, Lock, Search, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IconoAdjunto } from "@/components/adjuntos/IconoAdjunto";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Notificar } from "@/components/shell/Notificar";
import { Button } from "@/components/ui/button";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { formatoTamano } from "@/lib/adjuntos";
import { esOrdenDocumento, etiquetasDestino, ORDENES_DOCUMENTO, ROLES_BIBLIOTECA } from "@/lib/documentos";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { listarContenido, opcionesDeCarpeta, puedeAdministrarCarpetas, salonesParaDocumentos } from "@/lib/server/documentos";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { TituloBloque } from "../inicio/TituloBloque";
import { borrarCarpetaAction, borrarDocumentoAction } from "./actions";
import { DialogoEditarCarpeta, DialogoEditarDocumento, DialogoNuevaCarpeta, DialogoSubir } from "./FormulariosDocumentos";

export const metadata: Metadata = { title: "Documentos" };

const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" });
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const UUID = /^[0-9a-f-]{36}$/i;

export default async function DocumentosPage({ params, searchParams }: PageProps<"/colegio/[slug]/documentos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ROLES_BIBLIOTECA);
  requireFeature(ctx, "documentos");
  await requireConsentimiento(ctx);

  const carpetaParam = uno(sp.carpeta);
  const carpetaId = carpetaParam && UUID.test(carpetaParam) ? carpetaParam : null;
  const q = (uno(sp.q) ?? "").slice(0, 100);
  const ordenParam = uno(sp.orden);
  const orden = esOrdenDocumento(ordenParam) ? ordenParam : "recientes";

  const [contenido, opciones, salones] = await Promise.all([
    listarContenido(ctx, { carpetaId, q, orden }),
    opcionesDeCarpeta(ctx),
    salonesParaDocumentos(ctx),
  ]);
  const gestorCarpetas = puedeAdministrarCarpetas(ctx);
  const puedeSubir = gestorCarpetas || ctx.rol === "profesor";
  const esProfesor = ctx.rol === "profesor";
  const ok = uno(sp.ok);
  const error = uno(sp.error);
  const clave = `${ok ?? ""}|${error ?? ""}`;
  const volver = carpetaId;
  const vacio = contenido.carpetas.length === 0 && contenido.documentos.length === 0;

  const acciones = puedeSubir ? (
    <>
      {gestorCarpetas && <DialogoNuevaCarpeta key={`c${clave}`} parentId={carpetaId} volver={volver} />}
      <DialogoSubir key={`s${clave}`} carpetaId={carpetaId} volver={volver} opciones={opciones} salones={salones} esProfesor={esProfesor} hayFamilias={ctx.rol !== "profesor" || salones.length > 0} />
    </>
  ) : undefined;

  const enlace = (c: string | null) => `/documentos${c ? `?carpeta=${c}` : ""}`;

  return (
    <div>
      <Notificar ok={ok} error={error} />
      <EncabezadoPagina
        titulo="Documentos"
        seccion="comunicacion"
        descripcion={puedeSubir ? "Reglamento, calendario y documentos del colegio, con permisos por rol y salón." : "Reglamento, calendario y documentos del colegio para ti."}
        acciones={acciones}
      />

      <nav aria-label="Ruta de carpetas" className="mb-4 flex flex-wrap items-center gap-1 text-cuerpo-sm">
        <Link href="/documentos" className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 font-medium text-primary hover:underline">
          <FolderOpen className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden /> Documentos
        </Link>
        {contenido.ruta.map((r, i) => (
          <span key={r.id} className="inline-flex items-center gap-1">
            <ChevronRight className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />
            {i === contenido.ruta.length - 1 ? <span aria-current="page" className="font-medium">{r.nombre}</span> : <Link href={enlace(r.id)} className="rounded-md px-1.5 text-primary hover:underline">{r.nombre}</Link>}
          </span>
        ))}
      </nav>

      <form method="get" action="/documentos" role="search" className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        {carpetaId && <input type="hidden" name="carpeta" value={carpetaId} />}
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">Buscar por título</span>
          <input type="search" name="q" defaultValue={q} maxLength={100} placeholder="Reglamento, calendario…" className={CLASE_CAMPO} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:w-48">
          <span className="font-medium">Ordenar por</span>
          <select name="orden" defaultValue={orden} className={`${CLASE_CAMPO} cursor-pointer`}>
            {Object.entries(ORDENES_DOCUMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <Button type="submit" variant="outline"><Search strokeWidth={2} aria-hidden /> Buscar</Button>
      </form>

      {contenido.buscando && (
        <p className="mb-4 text-cuerpo-sm text-muted-foreground" role="status">
          {contenido.documentos.length} {contenido.documentos.length === 1 ? "resultado" : "resultados"} para «{q}» en toda la biblioteca.{" "}
          <Link href={enlace(carpetaId)} className="font-medium text-primary hover:underline">Quitar búsqueda</Link>
        </p>
      )}

      {vacio ? (
        contenido.buscando ? (
          <EstadoVacio icono={FileSearch} titulo="No encontramos documentos con ese título" descripcion="Prueba con otra palabra o revisa las carpetas." />
        ) : (
          <EstadoVacio
            icono={FolderOpen}
            titulo={carpetaId ? "Esta carpeta está vacía" : "Todavía no hay documentos"}
            descripcion={puedeSubir ? "Sube el primero para que los demás lo encuentren aquí." : "Cuando el colegio publique un documento para ti, lo verás aquí."}
            accion={acciones}
          />
        )
      ) : (
        <div className="flex flex-col gap-10">
          {contenido.carpetas.length > 0 && (
            <section aria-labelledby="bloque-carpetas" className="flex flex-col gap-3">
              <TituloBloque id="bloque-carpetas">Carpetas</TituloBloque>
              <ul className="flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
                {contenido.carpetas.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-3 sm:pr-4">
                    <Link href={enlace(c.id)} className="flex min-h-14 min-w-0 basis-full items-center gap-3 px-4 py-2 sm:basis-0 sm:flex-1 outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset">
                      <Folder className="size-5 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.nombre}</span>
                        <span className="text-cuerpo-sm text-muted-foreground tabular-nums">{c.elementos} {c.elementos === 1 ? "elemento" : "elementos"}</span>
                      </span>
                      {c.visibleRoles.length > 0 && gestorCarpetas && <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground"><Lock className="size-3.5" strokeWidth={2} aria-hidden /> Restringida</span>}
                    </Link>
                    {gestorCarpetas && (
                      <div className="flex flex-wrap items-center gap-2 pb-2 pl-4 sm:p-0">
                        <DialogoEditarCarpeta key={`e${c.id}${clave}`} carpeta={{ id: c.id, nombre: c.nombre, visibleRoles: c.visibleRoles, parentId: carpetaId }} opciones={opciones} volver={volver} />
                        <BotonConfirmar
                          etiqueta={<><Trash2 strokeWidth={2} aria-hidden /> Borrar<span className="sr-only"> carpeta {c.nombre}</span></>}
                          titulo={`¿Borrar la carpeta «${c.nombre}»?`}
                          descripcion="Se borran también sus subcarpetas y todos sus documentos. Esta acción no se puede deshacer."
                          confirmar="Borrar carpeta"
                          accion={borrarCarpetaAction}
                          campos={{ id: c.id, volver: volver ?? "" }}
                          peligro variante="outline" className="text-destructive"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {contenido.documentos.length > 0 && (
            <section aria-labelledby="bloque-documentos" className="flex flex-col gap-3">
              <TituloBloque id="bloque-documentos">Documentos</TituloBloque>
              <ul className="flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
                {contenido.documentos.map((d) => (
                  <li key={d.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start gap-3">
                      {d.archivo && <IconoAdjunto mimeType={d.archivo.mimeType} nombre={d.archivo.nombre} className="mt-1 size-5 shrink-0 text-sec-trazo" />}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-titulo-3 font-medium">{d.titulo}</h3>
                        {d.descripcion && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{d.descripcion}</p>}
                        <p className="mt-1 text-cuerpo-sm text-muted-foreground tabular-nums">
                          {fecha.format(d.createdAt)} · {d.autor}{d.archivo ? ` · ${formatoTamano(d.archivo.bytes)}` : ""}
                          {contenido.buscando && d.carpetaRuta ? ` · en ${d.carpetaRuta}` : ""}
                        </p>
                        {(d.gestionable || ctx.rol === "direccion") && (
                          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-cuerpo-sm text-muted-foreground">
                            {etiquetasDestino(d.visibleRoles).map((e) => (
                              <span key={e} className="inline-flex items-center gap-1">{e === "Solo dirección" ? <Lock className="size-3.5" strokeWidth={2} aria-hidden /> : <Users className="size-3.5" strokeWidth={2} aria-hidden />} {e}</span>
                            ))}
                            {d.salon && <span>{d.salon}</span>}
                          </p>
                        )}
                      </div>
                      {d.archivo && (
                        <a
                          href={`/archivos/${d.archivo.id}`}
                          download={d.archivo.nombre}
                          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-borde-sutil bg-background px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <Download className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden /> Descargar<span className="sr-only"> {d.titulo}</span>
                        </a>
                      )}
                    </div>
                    {d.gestionable && puedeSubir && (
                      <div className="flex flex-wrap items-center gap-2">
                        <DialogoEditarDocumento
                          key={`d${d.id}${clave}`}
                          doc={{ id: d.id, titulo: d.titulo, descripcion: d.descripcion, carpetaId: d.carpetaId, salonId: d.salonId, visibleRoles: d.visibleRoles }}
                          opciones={opciones} salones={salones} esProfesor={esProfesor} volver={volver}
                        />
                        <BotonConfirmar
                          etiqueta={<><Trash2 strokeWidth={2} aria-hidden /> Borrar<span className="sr-only"> {d.titulo}</span></>}
                          titulo={`¿Borrar «${d.titulo}»?`}
                          descripcion="Dejará de estar disponible para todos y no se puede recuperar."
                          confirmar="Borrar documento"
                          accion={borrarDocumentoAction}
                          campos={{ id: d.id, volver: volver ?? "" }}
                          peligro variante="outline" className="text-destructive"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
