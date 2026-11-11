import { BadgeCheck, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Filter, RotateCcw, Send, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPlataforma } from "@/app/plataforma/_componentes/EncabezadoPlataforma";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarTemasEditoriales } from "@/lib/server/curriculum/estado-editorial";
import { cambiarEstadoContenidoAction, revisarBloqueContenidoAction } from "./actions";

export const metadata: Metadata = { title: "Revisión de contenido" };

const nombreEstado = { borrador: "Borrador", revisado: "Revisado", publicado: "Publicado", pendiente_revision: "Revisar de nuevo" } as const;
const iconoEstado = { borrador: Clock3, revisado: BadgeCheck, publicado: Send, pendiente_revision: RotateCcw } as const;
const uno = (valor: string | string[] | undefined) => Array.isArray(valor) ? valor[0] : valor;

function enlace(filtro: Record<string, string | number | undefined>, pagina: number) {
  const q = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ ...filtro, pagina })) if (valor !== undefined && String(valor) !== "") q.set(clave, String(valor));
  return `/contenido?${q.toString()}`;
}

export default async function RevisionContenido({ searchParams }: PageProps<"/plataforma/contenido">) {
  const sp = await searchParams;
  const { filtro, total, pendientes, temas, areas, disciplinas, paginas } = await listarTemasEditoriales({
    area: uno(sp.area), nivel: uno(sp.nivel) as "inicial" | "primaria" | "secundaria" | undefined,
    grado: uno(sp.grado), disciplina: uno(sp.disciplina), estado: uno(sp.estado) as "borrador" | "revisado" | "publicado" | "pendiente_revision" | undefined,
    pagina: uno(sp.pagina),
  });
  const hayFiltro = !!(filtro.area || filtro.nivel || filtro.grado || filtro.disciplina || filtro.estado);
  const base = { area: filtro.area, nivel: filtro.nivel, grado: filtro.grado, disciplina: filtro.disciplina, estado: filtro.estado };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <EncabezadoPlataforma
        titulo="Revisión de contenido"
        descripcion="La revisión vale para todos los colegios. Si cambia el contenido o la ficha, vuelve a quedar pendiente y los alumnos dejan de verla."
      />
      <Flash ok={sp.ok} error={sp.error} />
      <form method="get" className="grid min-w-0 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end" aria-label="Filtros de contenido">
        <Selector etiqueta="Área" name="area" defaultValue={filtro.area ?? ""}>
          <option value="">Todas</option>
          {areas.map((area) => <option key={area} value={area}>{area}</option>)}
        </Selector>
        <Selector etiqueta="Nivel" name="nivel" defaultValue={filtro.nivel ?? ""}>
          <option value="">Todos</option>
          <option value="inicial">Inicial</option>
          <option value="primaria">Primaria</option>
          <option value="secundaria">Secundaria</option>
        </Selector>
        <Selector etiqueta="Grado" name="grado" defaultValue={filtro.grado ?? ""}>
          <option value="">Todos</option>
          {[1, 2, 3, 4, 5, 6].map((grado) => <option key={grado} value={grado}>{grado}.°</option>)}
        </Selector>
        <Selector etiqueta="Disciplina" name="disciplina" defaultValue={filtro.disciplina ?? ""}>
          <option value="">Todas</option>
          {disciplinas.map((disciplina) => <option key={disciplina} value={disciplina}>{disciplina}</option>)}
        </Selector>
        <Selector etiqueta="Estado" name="estado" defaultValue={filtro.estado ?? ""}>
          <option value="">Todos</option>
          {Object.entries(nombreEstado).map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
        </Selector>
        <div className="flex flex-wrap gap-2">
          <button className={buttonVariants({ variant: "outline" })} type="submit"><Filter strokeWidth={2} aria-hidden /> Filtrar</button>
          {hayFiltro && <Link href="/contenido" className={buttonVariants({ variant: "ghost" })}><X strokeWidth={2} aria-hidden /> Quitar</Link>}
        </div>
      </form>
      <p className="text-sm text-muted-foreground" aria-live="polite"><span className="inline-flex items-center gap-1 font-semibold text-foreground"><Clock3 className="size-4" strokeWidth={2} aria-hidden /> {pendientes} pendientes globales</span> · {total} {total === 1 ? "tema" : "temas"} · Página {filtro.pagina} de {Math.max(paginas, 1)}</p>
      {filtro.area && filtro.nivel && filtro.grado && filtro.disciplina && (
        <Tarjeta className="space-y-3">
          <p className="font-semibold">Revisar bloque: {filtro.area} · {filtro.nivel} · {filtro.grado}.° · {filtro.disciplina}</p>
          <p className="text-sm text-muted-foreground">Se revisan juntos los borradores y los temas cuya huella cambió. Si falta algún requisito, no se cambia ninguno.</p>
          <form action={revisarBloqueContenidoAction} className="flex flex-col gap-3">
            <input type="hidden" name="area" value={filtro.area} />
            <input type="hidden" name="nivel" value={filtro.nivel} />
            <input type="hidden" name="grado" value={filtro.grado} />
            <input type="hidden" name="disciplina" value={filtro.disciplina} />
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="checklist" value="si" required className="mt-1 size-4 shrink-0" /><span>Confirmo la revisión de fuente, licencia, adecuación pedagógica, ejercicios y accesibilidad de todo el bloque.</span></label>
            <button type="submit" className={buttonVariants()}><Check strokeWidth={2} aria-hidden /> Marcar revisado en lote</button>
          </form>
        </Tarjeta>
      )}
      {temas.length === 0 ? (
        <EstadoVacio icono={BookOpen} titulo={hayFiltro ? "No hay temas con estos filtros." : "Aún no hay temas en el índice."} descripcion="Los temas importados aparecerán aquí como borradores." />
      ) : (
        <ul className="grid min-w-0 gap-3" aria-label="Temas curriculares">
          {temas.map((tema) => {
            const estadoVisible = tema.pendienteRevision ? "pendiente_revision" : tema.estado;
            const IconoEstado = iconoEstado[estadoVisible];
            const listo = !!(tema.huellaActual && tema.fuenteId && tema.fuenteLocator && tema.desempenosOficiales.length);
            const siguiente = tema.pendienteRevision ? tema.estado : tema.estado === "borrador" ? "revisado" : tema.estado === "revisado" ? "publicado" : null;
            return (
              <li key={tema.clave} className="min-w-0">
                <Tarjeta className="min-w-0 space-y-3" data-testid="tema-editorial">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-all font-semibold">{tema.clave}</p>
                      <p className="text-sm text-muted-foreground">{tema.areaCneb} · {tema.nivel} · {tema.grado}.° · Versión {tema.version}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-superficie-2 px-3 py-1 text-sm font-medium">
                      <IconoEstado className="size-4" strokeWidth={2} aria-hidden /> {nombreEstado[estadoVisible]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tema.pendienteRevision ? "El contenido o la ficha cambió desde la última revisión. Los alumnos no lo ven." : listo ? "Fuente, localizador y desempeño oficial verificado registrados." : "Falta contenido, fuente, localizador o desempeño oficial verificado para revisar."}
                  </p>
                  <div className="flex flex-wrap items-end gap-3 border-t pt-3">
                    {siguiente && (
                      <form action={cambiarEstadoContenidoAction} className="flex min-w-0 flex-col gap-2">
                        <input type="hidden" name="clave" value={tema.clave} />
                        <input type="hidden" name="estado" value={siguiente} />
                        <label className="flex max-w-xl items-start gap-2 text-sm">
                          <input type="checkbox" name="checklist" value="si" required className="mt-1 size-4 shrink-0" />
                          <span>Confirmo la revisión de fuente y licencia, adecuación pedagógica, ejercicios y accesibilidad.</span>
                        </label>
                        <button type="submit" disabled={!listo} className={buttonVariants()}>
                          <Check strokeWidth={2} aria-hidden /> {tema.pendienteRevision ? "Revisar de nuevo" : siguiente === "revisado" ? "Marcar revisado" : "Publicar"}
                        </button>
                      </form>
                    )}
                    {tema.estado !== "borrador" && (
                      <form action={cambiarEstadoContenidoAction}>
                        <input type="hidden" name="clave" value={tema.clave} />
                        <input type="hidden" name="estado" value="borrador" />
                        <button type="submit" className={buttonVariants({ variant: "outline" })}>
                          <RotateCcw strokeWidth={2} aria-hidden /> Volver a borrador
                        </button>
                      </form>
                    )}
                  </div>
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      )}
      {paginas > 1 && <nav aria-label="Páginas de contenido" className="flex flex-wrap items-center justify-between gap-3">
        {filtro.pagina > 1 ? <Link href={enlace(base, filtro.pagina - 1)} className={buttonVariants({ variant: "outline" })}><ChevronLeft strokeWidth={2} aria-hidden /> Anterior</Link> : <span />}
        {filtro.pagina < paginas && <Link href={enlace(base, filtro.pagina + 1)} className={buttonVariants({ variant: "outline" })}>Siguiente <ChevronRight strokeWidth={2} aria-hidden /></Link>}
      </nav>}
    </div>
  );
}
