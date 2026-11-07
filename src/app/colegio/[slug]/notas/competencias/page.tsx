import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { BookOpen, CheckCircle2, CircleOff, RotateCcw, Plus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Campo } from "@/components/ui/Campo";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { PanelFormulario } from "@/app/colegio/[slug]/gestion/_componentes/PanelFormulario";
import { competenciasDelCurso, puedeGestionarCompetencias } from "@/lib/server/curriculo";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import {
  crearCompetenciaAction, desactivarCompetenciaAction, editarCompetenciaAction, reactivarCompetenciaAction, restaurarPlantillaAction,
} from "./actions";

export const metadata: Metadata = { title: "Competencias" };

export default async function CompetenciasPage({ params, searchParams }: PageProps<"/colegio/[slug]/notas/competencias">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "notas");
  if (!puedeGestionarCompetencias(ctx)) forbidden();
  const cursos = await ctx.db.curso.findMany({
    where: ctx.rol === "profesor" ? { profesorId: ctx.membership.id, salon: { archivadoAt: null } } : { salon: { archivadoAt: null } },
    orderBy: [{ salon: { nombre: "asc" } }, { nombre: "asc" }],
    select: { id: true, nombre: true, salon: { select: { nombre: true, nivel: true, grado: true } } },
  });
  const pedido = typeof sp.curso === "string" ? sp.curso : undefined;
  if (pedido && !cursos.some((c) => c.id === pedido)) forbidden();
  const curso = cursos.find((c) => c.id === pedido) ?? cursos[0];
  const competencias = curso ? await competenciasDelCurso(ctx, curso.id, { incluirDesactivadas: true }) : [];
  const capacidades = curso ? await ctx.db.capacidad.findMany({ where: { competenciaId: { in: competencias.map((c) => c.id) } }, orderBy: [{ orden: "asc" }, { nombre: "asc" }], select: { competenciaId: true, nombre: true } }) : [];
  const ok = typeof sp.ok === "string" ? sp.ok : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return <div className="flex flex-col gap-6">
    <EncabezadoPagina titulo="Competencias" seccion="academico" descripcion="Configura las competencias de tus cursos sin cambiar las calificaciones anteriores." acciones={<Link href="/notas" className="enlace">Volver al registro</Link>} />
    <Flash ok={ok} error={error} />
    {curso ? <>
      <div className="flex flex-col gap-4 rounded-[14px] border border-borde-sutil bg-superficie p-4 sm:flex-row sm:items-end sm:justify-between">
        <form method="get" action="/notas/competencias" className="flex w-full flex-col gap-2 sm:max-w-sm">
          <Selector etiqueta="Curso" name="curso" defaultValue={curso.id} required>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.salon.nombre} · {c.salon.nivel}</option>)}
          </Selector>
          <Boton type="submit" variante="secundario" className="self-start">Abrir curso</Boton>
        </form>
        <div className="flex flex-wrap gap-2">
          <BotonConfirmar etiqueta={<><RotateCcw className="size-4" strokeWidth={2} aria-hidden /> Restaurar plantilla oficial</>} titulo="¿Restaurar la plantilla oficial?" descripcion="Se crearán o reactivarán las competencias oficiales que falten. Las personalizadas y las calificaciones se conservan." confirmar="Restaurar plantilla" accion={restaurarPlantillaAction} campos={{ cursoId: curso.id }} variante="outline" />
          <PanelFormulario tipo="sheet" boton={<><Plus className="size-4" strokeWidth={2} aria-hidden /> Nueva competencia</>} titulo="Nueva competencia" descripcion="Esta competencia será personalizada y se usará solo en este curso.">
            <form action={crearCompetenciaAction} className="flex flex-col gap-5">
              <input type="hidden" name="cursoId" value={curso.id} />
              <Campo etiqueta="Nombre" name="nombre" maxLength={200} required />
              <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">Descripción (opcional)</span><Textarea name="descripcion" maxLength={500} /></label>
              <Boton type="submit" className="self-start">Guardar competencia</Boton>
            </form>
          </PanelFormulario>
        </div>
      </div>
      {competencias.length ? <ul className="divide-y divide-borde-sutil rounded-[14px] border border-borde-sutil bg-superficie px-4 sm:px-5">
        {competencias.map((c) => {
          const lista = capacidades.filter((x) => x.competenciaId === c.id);
          return <li key={c.id} className="flex flex-col gap-3 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-medium leading-6">{c.nombre}</h2>
                {c.descripcion && <p className="mt-1 text-cuerpo-sm text-muted-foreground">{c.descripcion}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{c.origen === "oficial" && c.codigoOficial ? `Oficial · ${c.codigoOficial}` : "Personalizada · No oficial"}</Badge>
                  <Badge variant="outline" className="gap-1">{c.desactivadaAt ? <><CircleOff className="size-3.5" strokeWidth={2} aria-hidden /> Desactivada</> : <><CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden /> Activa</>}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <PanelFormulario tipo="sheet" variante="outline" boton={<><Pencil className="size-4" strokeWidth={2} aria-hidden /> Editar</>} titulo="Editar competencia" descripcion={c.nombre}>
                  <form action={editarCompetenciaAction} className="flex flex-col gap-5">
                    <input type="hidden" name="cursoId" value={curso.id} /><input type="hidden" name="competenciaId" value={c.id} />
                    <Campo etiqueta="Nombre" name="nombre" defaultValue={c.nombre} maxLength={200} required />
                    <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">Descripción (opcional)</span><Textarea name="descripcion" defaultValue={c.descripcion ?? ""} maxLength={500} /></label>
                    <Boton type="submit" className="self-start">Guardar cambios</Boton>
                  </form>
                </PanelFormulario>
                <BotonConfirmar etiqueta={c.desactivadaAt ? "Reactivar" : "Desactivar"} titulo={c.desactivadaAt ? "¿Reactivar competencia?" : "¿Desactivar competencia?"} descripcion={c.desactivadaAt ? "Volverá a estar disponible para nuevas calificaciones." : "Dejará de aparecer al crear calificaciones. Las anteriores conservarán esta competencia."} confirmar={c.desactivadaAt ? "Reactivar" : "Desactivar"} accion={c.desactivadaAt ? reactivarCompetenciaAction : desactivarCompetenciaAction} campos={{ cursoId: curso.id, competenciaId: c.id }} variante="outline" />
              </div>
            </div>
            <details className="text-cuerpo-sm"><summary className="cursor-pointer text-sec-tinta">Capacidades ({lista.length})</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{lista.map((x, i) => <li key={`${x.nombre}-${i}`}>{x.nombre}</li>)}</ul></details>
          </li>;
        })}
      </ul> : <EstadoVacio icono={BookOpen} titulo="Sin competencias" descripcion="Crea una competencia o restaura la plantilla oficial del curso." />}
    </> : <EstadoVacio icono={BookOpen} titulo="Sin cursos asignados" descripcion="Dirección debe asignarte un curso para gestionar sus competencias." />}
  </div>;
}
