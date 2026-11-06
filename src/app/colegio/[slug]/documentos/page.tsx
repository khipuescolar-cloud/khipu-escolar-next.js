import { ChevronRight, Download, FileSearch, Folder, FolderOpen, Lock, Search, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IconoAdjunto } from "@/components/adjuntos/IconoAdjunto";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Notificar } from "@/components/shell/Notificar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { formatoTamano } from "@/lib/adjuntos";
import { esOrdenDocumento, etiquetasDestino, ORDENES_DOCUMENTO, ROLES_BIBLIOTECA } from "@/lib/documentos";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { listarContenido, opcionesDeCarpeta, puedeAdministrarCarpetas, salonesParaDocumentos } from "@/lib/server/documentos";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
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
        descripcion={puedeSubir ? "Reglamento, calendario y documentos del colegio, con permisos por rol y salón." : "Reglamento, calendario y documentos del colegio para ti."}
        acciones={acciones}
      />

      <nav aria-label="Ruta de carpetas" className="mb-4 flex flex-wrap items-center gap-1 text-cuerpo-sm">
        <Link href="/documentos" className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 font-medium text-primary hover:underline">
          <FolderOpen className="size-4" strokeWidth={2} aria-hidden /> Documentos
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
        <div className="flex flex-col gap-6">
          {contenido.carpetas.length > 0 && (
            <section aria-label="Carpetas">
              <h2 className="mb-2 text-etiqueta uppercase tracking-wide text-muted-foreground">Carpetas</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {contenido.carpetas.map((c) => (
                  <li key={c.id}>
                    <Card className="h-full">
                      <CardContent className="flex flex-col gap-3">
                        <Link href={enlace(c.id)} className="flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                          <Folder className="size-6 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{c.nombre}</span>
                            <span className="text-cuerpo-sm text-muted-foreground">{c.elementos} {c.elementos === 1 ? "elemento" : "elementos"}</span>
                          </span>
                          {c.visibleRoles.length > 0 && gestorCarpetas && <Badge variant="secondary"><Lock strokeWidth={2} aria-hidden /> Restringida</Badge>}
                        </Link>
                        {gestorCarpetas && (
                          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
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
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {contenido.documentos.length > 0 && (
            <section aria-label="Documentos">
              <h2 className="mb-2 text-etiqueta uppercase tracking-wide text-muted-foreground">Documentos</h2>
              <ul className="flex flex-col gap-3">
                {contenido.documentos.map((d) => (
                  <li key={d.id}>
                    <Card>
                      <CardContent className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start gap-3">
                          {d.archivo && <IconoAdjunto mimeType={d.archivo.mimeType} nombre={d.archivo.nombre} className="mt-1 size-6 shrink-0 text-primary" />}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-titulo-3 font-medium">{d.titulo}</h3>
                            {d.descripcion && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{d.descripcion}</p>}
                            <p className="mt-1 text-cuerpo-sm text-muted-foreground">
                              {fecha.format(d.createdAt)} · {d.autor}{d.archivo ? ` · ${formatoTamano(d.archivo.bytes)}` : ""}
                              {contenido.buscando && d.carpetaRuta ? ` · en ${d.carpetaRuta}` : ""}
                            </p>
                            {(d.gestionable || ctx.rol === "direccion") && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {etiquetasDestino(d.visibleRoles).map((e) => (
                                  <Badge key={e} variant="secondary">{e === "Solo dirección" ? <Lock strokeWidth={2} aria-hidden /> : <Users strokeWidth={2} aria-hidden />} {e}</Badge>
                                ))}
                                {d.salon && <Badge variant="outline">{d.salon}</Badge>}
                              </div>
                            )}
                          </div>
                          {d.archivo && (
                            <a
                              href={`/archivos/${d.archivo.id}`}
                              download={d.archivo.nombre}
                              className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              <Download className="size-4 text-primary" strokeWidth={2} aria-hidden /> Descargar<span className="sr-only"> {d.titulo}</span>
                            </a>
                          )}
                        </div>
                        {d.gestionable && puedeSubir && (
                          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
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
                      </CardContent>
                    </Card>
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
