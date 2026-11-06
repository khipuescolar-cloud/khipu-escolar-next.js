import { ArrowLeft, ListChecks, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { NOMBRE_INSTRUMENTO } from "@/lib/calificaciones";
import { criteriosDeEvaluacion } from "@/lib/server/criterios";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { crearCriterioAction, eliminarCriterioAction } from "../actions";
import { GrillaCriterios } from "./GrillaCriterios";

export const metadata: Metadata = { title: "Criterios de evaluación" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Criterios (rúbrica o lista de cotejo) de una columna del registro auxiliar y los resultados de cada alumno (specs/11). */
export default async function CriteriosPage({ params, searchParams }: PageProps<"/colegio/[slug]/notas/criterios">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "notas");
  const evaluacionId = uno(sp.evaluacion);
  if (!evaluacionId || !/^[0-9a-f-]{36}$/i.test(evaluacionId)) forbidden();
  const d = await criteriosDeEvaluacion(ctx, evaluacionId);
  const e = d.evaluacion;
  const volver = `/notas?curso=${e.cursoId}&periodo=${e.periodoId}`;

  return (
    <div className="flex flex-col gap-5">
      <Link href={volver} className={`${buttonVariants({ variant: "ghost" })} self-start`}>
        <ArrowLeft strokeWidth={2} aria-hidden />Volver al registro auxiliar
      </Link>
      <EncabezadoPagina
        titulo={`Criterios · ${e.titulo}`}
        seccion="academico"
        descripcion={`${e.curso} · ${e.salon} · ${e.competencia?.nombre ?? "Sin competencia"}${e.instrumento ? ` · ${NOMBRE_INSTRUMENTO[e.instrumento]}` : ""}`}
        acciones={d.editable && (
          <DialogoAccion
            disparador={<><Plus strokeWidth={2} aria-hidden />Nuevo criterio</>}
            titulo="Nuevo criterio"
            descripcion="Rúbrica: puntaje de 0 al máximo. Lista de cotejo: cumple o no cumple."
            etiqueta="Agregar criterio"
            accion={crearCriterioAction.bind(null, slug, e.id)}
          >
            <div className="sm:col-span-2"><Campo etiqueta="Criterio" name="descripcion" required maxLength={300} placeholder="Identifica la idea principal del texto" /></div>
            <Selector etiqueta="Escala" name="escala" defaultValue="puntaje">
              <option value="puntaje">Puntaje (rúbrica)</option>
              <option value="cumple">Cumple / no cumple (lista de cotejo)</option>
            </Selector>
            <Campo etiqueta="Puntaje máximo" name="puntajeMaximo" type="number" min={1} max={100} step={1} defaultValue={3} ayuda="Solo para la escala de puntaje." />
            {d.desempenos.length > 0 && (
              <div className="sm:col-span-2">
                <Selector etiqueta="Desempeño (opcional)" name="desempenoId" defaultValue="">
                  <option value="">Sin desempeño</option>
                  {d.desempenos.map((x) => <option key={x.id} value={x.id}>{x.codigo ? `${x.codigo} · ` : ""}{x.descripcion.slice(0, 90)}</option>)}
                </Selector>
              </div>
            )}
          </DialogoAccion>
        )}
      />
      <Alerta tipo="info">
        Khipu guarda estos resultados tal cual, como evidencia. No los convierte en AD, A, B o C: la nota de la competencia la
        pones tú en el registro auxiliar.
      </Alerta>
      {d.motivoBloqueo && ctx.rol === "profesor" && <Alerta tipo="aviso">{d.motivoBloqueo}</Alerta>}

      {d.criterios.length === 0 ? (
        <EstadoVacio
          icono={ListChecks}
          titulo="Aún no hay criterios"
          descripcion={d.editable ? "Agrega los criterios de tu rúbrica o lista de cotejo con «Nuevo criterio»." : undefined}
        />
      ) : (
        <>
          <GrillaCriterios slug={slug} editable={d.editable} alumnos={d.alumnos} criterios={d.criterios} resultados={d.resultados} />
          {d.editable && (
            <section aria-labelledby="lista-criterios" className="flex flex-col gap-3">
              <TituloBloque id="lista-criterios" descripcion="Al eliminar un criterio también se borran sus resultados.">Criterios</TituloBloque>
              <div className="rounded-[14px] border border-borde-sutil bg-superficie px-4 sm:px-5">
                <ul className="divide-y divide-borde-sutil">
                  {d.criterios.map((c, i) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{i + 1}. {c.descripcion}</p>
                        <p className="text-cuerpo-sm text-muted-foreground">
                          {c.escala === "puntaje" ? `Puntaje de 0 a ${c.puntajeMaximo}` : "Cumple / no cumple"}
                          {c.desempeno && ` · ${c.desempeno}`}
                        </p>
                      </div>
                      <BotonConfirmar
                        etiqueta="Eliminar" variante="ghost" peligro
                        titulo={`¿Eliminar el criterio «${c.descripcion}»?`}
                        descripcion="Se borran también los resultados de los alumnos en este criterio."
                        confirmar="Eliminar criterio"
                        accion={eliminarCriterioAction.bind(null, slug, c.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
