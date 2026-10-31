import { BookMarked, Download, GraduationCap, Layers, ListChecks, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ETIQUETA_NIVEL, textoGrado as gradoComoTexto } from "@/lib/cneb/catalogo";
import { estructuraCurso, type EstructuraCneb } from "@/lib/server/cneb";
import type { TenantContext } from "@/lib/server/tenant";
import { BotonesOrden } from "./BotonesOrden";
import {
  crearCapacidadAction, crearDesempenoAction, editarCapacidadAction, editarDesempenoAction, eliminarCapacidadAction, eliminarDesempenoAction,
  fijarGradoAction, importarCnebAction,
} from "./cneb-actions";

type Competencia = EstructuraCneb["competencias"][number];

/** Pestaña «Capacidades y desempeños» de /notas (specs/30). Dirección edita; el profesor del curso solo mira. */
export async function SeccionCneb({ ctx, slug, cursoId }: { ctx: TenantContext; slug: string; cursoId: string }) {
  const e = await estructuraCurso(ctx, cursoId);
  const sinCneb = e.gradosDelNivel.length === 0;
  const nivel = ETIQUETA_NIVEL[e.salon.nivel];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <h2 className="font-titulo text-cuerpo font-semibold">Capacidades y desempeños de {e.curso.nombre}</h2>
          <CardDescription>
            Salón {e.salon.nombre} · {e.textoGrado ?? `${nivel}, sin grado`}. Cada competencia del Currículo Nacional tiene capacidades, y para cada
            grado hay desempeños esperados. {e.puedeEditar ? "Los profesores los marcan al crear una evaluación." : "Márcalos al crear una evaluación para saber qué mide cada una."}
          </CardDescription>
          {e.puedeEditar && !sinCneb && (
            <div className="mt-2 flex flex-wrap gap-2">
              <BotonGrado slug={slug} e={e} />
              {e.salon.grado !== null && <BotonImportar slug={slug} e={e} />}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sinCneb ? (
            <Alerta tipo="info">Los salones de {nivel.toLowerCase()} no usan capacidades ni desempeños del CNEB.</Alerta>
          ) : e.salon.grado === null ? (
            <Alerta tipo="aviso">
              <strong>Este salón no tiene grado.</strong>{" "}
              {e.puedeEditar
                ? "Indica el grado con el botón «Indicar grado» para ver e importar los desempeños que le corresponden."
                : "Pide a dirección que lo indique para ver los desempeños que le corresponden."}
              {e.puedeEditar && <> También puedes hacerlo en <Link href="/gestion/salones" className="enlace">Gestión · Salones</Link>.</>}
            </Alerta>
          ) : !e.puedeEditar ? (
            <Alerta tipo="info">Solo dirección edita las capacidades y los desempeños. Si falta alguno, pídeselo.</Alerta>
          ) : null}
        </CardContent>
      </Card>

      {e.competencias.length === 0 ? (
        <EstadoVacio
          icono={BookMarked}
          titulo="Este curso aún no tiene competencias"
          descripcion={e.puedeEditar ? "Usa «Importar desde el CNEB» para traer las competencias, capacidades y desempeños oficiales." : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {e.competencias.map((c, i) => (
            <li key={c.id}>
              <TarjetaCompetencia slug={slug} e={e} c={c} primero={i === 0} ultimo={i === e.competencias.length - 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BotonGrado({ slug, e }: { slug: string; e: EstructuraCneb }) {
  return (
    <DialogoAccion
      disparador={<><GraduationCap strokeWidth={2} aria-hidden />{e.salon.grado === null ? "Indicar grado" : "Cambiar grado"}</>}
      variante={e.salon.grado === null ? "default" : "outline"}
      titulo={`Grado del salón ${e.salon.nombre}`}
      descripcion="Los desempeños del CNEB dependen del nivel y del grado. Cambiarlo no borra los desempeños de otros grados."
      etiqueta="Guardar grado"
      accion={fijarGradoAction.bind(null, slug, e.salon.id)}
    >
      <Selector etiqueta="Grado" name="grado" defaultValue={e.salon.grado ?? ""} required>
        <option value="" disabled>Elige el grado</option>
        {e.gradosDelNivel.map((g) => <option key={g} value={g}>{gradoComoTexto(e.salon.nivel, g)}</option>)}
      </Selector>
    </DialogoAccion>
  );
}

function BotonImportar({ slug, e }: { slug: string; e: EstructuraCneb }) {
  return (
    <DialogoAccion
      disparador={<><Download strokeWidth={2} aria-hidden />Importar desde el CNEB</>}
      variante="outline"
      titulo="Importar desde el CNEB"
      descripcion={
        <>
          Agregamos las competencias, capacidades y desempeños de {e.textoGrado} que falten en {e.curso.nombre}. Lo que ya existe no se duplica
          ni se cambia, así que puedes importar otra vez sin problema.
        </>
      }
      etiqueta="Importar"
      accion={importarCnebAction.bind(null, slug, e.curso.id)}
    >
      <div className="sm:col-span-2">
        <Selector etiqueta="Área del CNEB" name="area" defaultValue={e.areaSugerida ?? ""} required>
          <option value="" disabled>Elige el área</option>
          {e.areas.map((a) => <option key={a.area} value={a.area}>{a.nombre}</option>)}
        </Selector>
      </div>
    </DialogoAccion>
  );
}

function CamposCapacidad({ nombre, descripcion }: { nombre?: string; descripcion?: string | null }) {
  return (
    <>
      <div className="sm:col-span-2"><Campo etiqueta="Nombre" name="nombre" required minLength={3} maxLength={200} defaultValue={nombre} placeholder="Traduce cantidades a expresiones numéricas" /></div>
      <div className="sm:col-span-2"><Campo etiqueta="Descripción (opcional)" name="descripcion" maxLength={500} defaultValue={descripcion ?? ""} /></div>
    </>
  );
}

function CamposDesempeno({ c, d }: { c: Competencia; d?: Competencia["desempenos"][number] }) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium text-foreground">Descripción</span>
        <Textarea name="descripcion" rows={4} required minLength={10} maxLength={2000} defaultValue={d?.descripcion} />
      </label>
      <Selector etiqueta="Capacidad (opcional)" name="capacidadId" defaultValue={d?.capacidadId ?? ""}>
        <option value="">Sin capacidad</option>
        {c.capacidades.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
      </Selector>
      <Campo etiqueta="Código (opcional)" name="codigo" maxLength={30} defaultValue={d?.codigo ?? ""} placeholder="MAT-C23-P3-01" />
    </>
  );
}

function TarjetaCompetencia({ slug, e, c, primero, ultimo }: { slug: string; e: EstructuraCneb; c: Competencia; primero: boolean; ultimo: boolean }) {
  const editar = e.puedeEditar;
  const nombreCapacidad = (id: string | null) => c.capacidades.find((x) => x.id === id)?.nombre ?? null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-titulo text-cuerpo font-semibold">{c.nombre}</h3>
          {editar && <BotonesOrden slug={slug} tipo="competencia" id={c.id} nombre={c.nombre} primero={primero} ultimo={ultimo} />}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <section className="flex flex-col gap-2" aria-label={`Capacidades de ${c.nombre}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold"><Layers className="size-4 text-primary" strokeWidth={2} aria-hidden />Capacidades ({c.capacidades.length})</h4>
            {editar && (
              <DialogoAccion
                disparador={<><Plus strokeWidth={2} aria-hidden />Nueva capacidad</>}
                variante="outline" tamano="sm"
                titulo="Nueva capacidad" descripcion={c.nombre}
                etiqueta="Agregar capacidad"
                accion={crearCapacidadAction.bind(null, slug, c.id)}
              >
                <CamposCapacidad />
              </DialogoAccion>
            )}
          </div>
          {c.capacidades.length === 0 ? (
            <p className="text-cuerpo-sm text-muted-foreground">Sin capacidades registradas.</p>
          ) : (
            <ol className="flex flex-col divide-y rounded-md border">
              {c.capacidades.map((x, i) => (
                <li key={x.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <div className="min-w-0 flex-1 text-sm">
                    <p>{x.nombre}</p>
                    {x.descripcion && <p className="text-cuerpo-sm text-muted-foreground">{x.descripcion}</p>}
                  </div>
                  {editar && (
                    <div className="flex shrink-0 items-center gap-1">
                      <BotonesOrden slug={slug} tipo="capacidad" id={x.id} nombre={x.nombre} primero={i === 0} ultimo={i === c.capacidades.length - 1} />
                      <DialogoAccion
                        disparador={<><Pencil strokeWidth={2} aria-hidden /><span className="sr-only">Editar {x.nombre}</span></>}
                        variante="ghost" tamano="sm"
                        titulo="Editar capacidad" etiqueta="Guardar cambios"
                        accion={editarCapacidadAction.bind(null, slug, x.id)}
                      >
                        <CamposCapacidad nombre={x.nombre} descripcion={x.descripcion} />
                      </DialogoAccion>
                      <BotonConfirmar
                        etiqueta={<>Eliminar<span className="sr-only"> la capacidad {x.nombre}</span></>} variante="ghost" tamano="sm" peligro
                        titulo={`¿Eliminar la capacidad «${x.nombre}»?`}
                        descripcion="Sus desempeños no se borran: se quedan sin capacidad."
                        confirmar="Eliminar capacidad"
                        accion={eliminarCapacidadAction.bind(null, slug, x.id)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {e.salon.grado !== null && (
          <section className="flex flex-col gap-2" aria-label={`Desempeños de ${c.nombre}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                <ListChecks className="size-4 text-primary" strokeWidth={2} aria-hidden />Desempeños de {e.textoGrado} ({c.desempenos.length})
              </h4>
              {editar && (
                <DialogoAccion
                  disparador={<><Plus strokeWidth={2} aria-hidden />Nuevo desempeño</>}
                  variante="outline" tamano="sm"
                  titulo="Nuevo desempeño" descripcion={`${c.nombre} · ${e.textoGrado}`}
                  etiqueta="Agregar desempeño"
                  accion={crearDesempenoAction.bind(null, slug, c.id)}
                >
                  <CamposDesempeno c={c} />
                </DialogoAccion>
              )}
            </div>
            {c.desempenos.length === 0 ? (
              <p className="text-cuerpo-sm text-muted-foreground">Sin desempeños para este grado.</p>
            ) : (
              <ol className="flex flex-col divide-y rounded-md border">
                {c.desempenos.map((d, i) => (
                  <li key={d.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 text-sm">
                      <p>{d.descripcion}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-cuerpo-sm text-muted-foreground">
                        {d.codigo && <span className="font-mono text-xs">{d.codigo}</span>}
                        {nombreCapacidad(d.capacidadId) && <span>Capacidad: {nombreCapacidad(d.capacidadId)}</span>}
                        <span>{d.usos === 0 ? "Sin evaluaciones" : `En ${d.usos} ${d.usos === 1 ? "evaluación" : "evaluaciones"}`}</span>
                      </p>
                    </div>
                    {editar && (
                      <div className="flex shrink-0 items-center gap-1">
                        <BotonesOrden slug={slug} tipo="desempeno" id={d.id} nombre={`desempeño ${i + 1}`} primero={i === 0} ultimo={i === c.desempenos.length - 1} />
                        <DialogoAccion
                          disparador={<><Pencil strokeWidth={2} aria-hidden /><span className="sr-only">Editar desempeño {i + 1}</span></>}
                          variante="ghost" tamano="sm"
                          titulo="Editar desempeño" etiqueta="Guardar cambios"
                          accion={editarDesempenoAction.bind(null, slug, d.id)}
                        >
                          <CamposDesempeno c={c} d={d} />
                        </DialogoAccion>
                        <BotonConfirmar
                          etiqueta={<>Eliminar<span className="sr-only"> desempeño {i + 1}</span></>} variante="ghost" tamano="sm" peligro
                          titulo="¿Eliminar este desempeño?"
                          descripcion={d.usos > 0 ? `Se quitará de ${d.usos} ${d.usos === 1 ? "evaluación" : "evaluaciones"}. Las notas no cambian.` : "No está en ninguna evaluación."}
                          confirmar="Eliminar desempeño"
                          accion={eliminarDesempenoAction.bind(null, slug, d.id)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
