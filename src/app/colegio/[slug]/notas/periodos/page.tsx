import { ArrowLeft, CalendarDays, CalendarRange, CheckCircle2, Lock, Megaphone, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NOMBRE_NIVEL } from "@/lib/asistencia-por-curso";
import { fechaLima, formatoDia, fechaDeColumnaDate, isoDeFechaDb } from "@/lib/fechas";
import { CANTIDAD_PERIODOS, NOMBRE_TIPO, TIPOS_PERIODO, TODOS_LOS_NIVELES, organizacionDelAnio } from "@/lib/periodos-academicos";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { estadoPublicacionLibreta, listarPeriodos } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { whereSalonActivo } from "@/lib/server/salones-activos";
import { actualizarPeriodoAction, cambiarEstadoPeriodoAction, crearPeriodoAction, organizarNivelAction, publicarLibretaAction } from "../actions";

export const metadata: Metadata = { title: "Periodos" };

export default async function PeriodosPage({ params, searchParams }: PageProps<"/colegio/[slug]/notas/periodos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  requireFeature(ctx, "notas");
  const anioActual = Number(hoyDelColegio(ctx).isoFecha.slice(0, 4));
  const pedido = Number(typeof sp.anio === "string" ? sp.anio : NaN);
  const anio = Number.isInteger(pedido) && Math.abs(pedido - anioActual) <= 1 ? pedido : anioActual;
  const [todos, nivelesConSalones] = await Promise.all([
    listarPeriodos(ctx),
    ctx.db.salon.findMany({ where: whereSalonActivo, distinct: ["nivel"], select: { nivel: true } }),
  ]);
  const periodos = todos.filter((p) => p.anio === anio).sort((a, b) => a.inicio.getTime() - b.inicio.getTime() || a.tipo.localeCompare(b.tipo));
  const niveles = TODOS_LOS_NIVELES.filter((n) => nivelesConSalones.some((s) => s.nivel === n));
  const organizacion = organizacionDelAnio(periodos);
  const publicacion = new Map(await Promise.all(periodos.map(async (p) => [p.id, await estadoPublicacionLibreta(ctx, p.id)] as const)));

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Periodos"
        descripcion="Organiza el año de cada nivel, ajusta las fechas y cierra los periodos. Al cerrar uno, los profesores ya no pueden cambiar sus notas; cuando todo esté listo, publica la libreta para avisar a las familias."
        acciones={
          <>
            <Link href="/notas" className={buttonVariants({ variant: "outline" })}><ArrowLeft strokeWidth={2} aria-hidden />Volver a notas</Link>
            <DialogoAccion
              disparador={<><Plus strokeWidth={2} aria-hidden />Nuevo periodo</>}
              titulo="Nuevo periodo"
              descripcion="Define las fechas en que los profesores podrán registrar notas."
              etiqueta="Crear periodo"
              accion={crearPeriodoAction.bind(null, slug)}
            >
              <Campo etiqueta="Nombre" name="nombre" required placeholder="I Bimestre" />
              <Campo etiqueta="Año" name="anio" type="number" required defaultValue={anio} />
              <Selector etiqueta="Tipo" name="tipo">
                <option value="bimestre">Bimestre</option>
                <option value="trimestre">Trimestre</option>
                <option value="semestre">Semestre</option>
              </Selector>
              <Campo etiqueta="Número" name="numero" type="number" min={1} max={6} required defaultValue={1} />
              <fieldset className="flex flex-col gap-2 text-sm">
                <legend className="mb-1 font-medium">Niveles que lo usan</legend>
                {niveles.map((n) => (
                  <label key={n} className="flex min-h-10 items-center gap-2">
                    <input type="checkbox" name="niveles" value={n} defaultChecked className="size-4 accent-[var(--primary)]" />{NOMBRE_NIVEL[n]}
                  </label>
                ))}
              </fieldset>
              <Campo etiqueta="Inicio" name="inicio" type="date" required />
              <Campo etiqueta="Fin" name="fin" type="date" required />
            </DialogoAccion>
          </>
        }
      />
      <NavegacionPildoras
        etiqueta="Año escolar"
        items={[anioActual - 1, anioActual, anioActual + 1].map((a) => ({ href: `/notas/periodos?anio=${a}`, texto: String(a), activo: a === anio }))}
      />

      <section aria-labelledby="organizacion" className="flex flex-col gap-3">
        <div>
          <h2 id="organizacion" className="text-titulo-2">Organización del año {anio}</h2>
          <p className="text-cuerpo-sm text-muted-foreground">
            Cada nivel trabaja por bimestres, trimestres o semestres. Los niveles con el mismo tipo comparten los periodos y sus fechas.
          </p>
        </div>
        {niveles.length === 0 ? (
          <EstadoVacio icono={CalendarRange} titulo="Aún no hay salones" descripcion="Crea los salones en Gestión y vuelve para organizar el año." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {niveles.map((n) => {
              const tipo = organizacion[n];
              const suyos = periodos.filter((p) => p.niveles.includes(n));
              return (
                <li key={n}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading font-semibold">{NOMBRE_NIVEL[n]}</h3>
                        <span className={`rounded-pildora px-2.5 py-0.5 text-etiqueta ${tipo ? "bg-primary/10 text-primary" : "bg-tarde-fondo text-tarde"}`}>
                          {tipo ? NOMBRE_TIPO[tipo].plural : "Sin definir"}
                        </span>
                      </div>
                      {tipo ? (
                        <ul className="flex flex-col gap-1 text-cuerpo-sm">
                          {suyos.map((p) => (
                            <li key={p.id} className="flex justify-between gap-2">
                              <span>{p.nombre}</span>
                              <span className="text-muted-foreground tabular-nums">{formatoDia(fechaDeColumnaDate(p.inicio), { day: "numeric", month: "short" })} – {formatoDia(fechaDeColumnaDate(p.fin), { day: "numeric", month: "short" })}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-cuerpo-sm text-muted-foreground">Elige cómo trabajará {NOMBRE_NIVEL[n].toLowerCase()} en {anio}; Khipu crea los periodos con fechas sugeridas.</p>
                      )}
                      <div className="mt-auto">
                        <DialogoAccion
                          variante={tipo ? "outline" : "default"}
                          tamano="sm"
                          disparador={tipo ? "Cambiar" : "Elegir organización"}
                          titulo={`${NOMBRE_NIVEL[n]} · año ${anio}`}
                          descripcion="Si cambias el tipo, se quitan los periodos anteriores de este nivel. No se puede cambiar si el nivel ya tiene notas en ellos."
                          etiqueta="Guardar"
                          accion={organizarNivelAction.bind(null, slug, n)}
                        >
                          <input type="hidden" name="anio" value={anio} />
                          <fieldset className="flex flex-col gap-2 text-sm">
                            <legend className="mb-1 font-medium">¿Cómo trabaja {NOMBRE_NIVEL[n].toLowerCase()}?</legend>
                            {TIPOS_PERIODO.map((t) => (
                              <label key={t} className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 has-checked:border-primary/50 has-checked:bg-primary/5">
                                <input type="radio" name="tipo" value={t} defaultChecked={t === (tipo ?? "bimestre")} required className="size-4 accent-[var(--primary)]" />
                                <span className="flex flex-col">
                                  <span className="font-medium">{NOMBRE_TIPO[t].plural}</span>
                                  <span className="text-muted-foreground">{CANTIDAD_PERIODOS[t]} periodos en el año</span>
                                </span>
                              </label>
                            ))}
                          </fieldset>
                        </DialogoAccion>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <h2 className="text-titulo-2">Periodos de {anio}</h2>
      {periodos.length === 0 ? (
        <EstadoVacio icono={CalendarDays} titulo={`Aún no hay periodos en ${anio}`} descripcion="Elige la organización de cada nivel arriba, o crea un periodo a mano." />
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y">
              {periodos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{p.nombre} {p.anio}</p>
                    <p className="text-cuerpo-sm text-muted-foreground">{formatoDia(fechaDeColumnaDate(p.inicio), { day: "numeric", month: "short" })} al {formatoDia(fechaDeColumnaDate(p.fin), { day: "numeric", month: "short" })}</p>
                    <p className="flex flex-wrap gap-1">
                      {p.niveles.filter((n) => niveles.includes(n)).map((n) => <span key={n} className="rounded-pildora border px-2 py-0.5 text-etiqueta">{NOMBRE_NIVEL[n]}</span>)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {(() => {
                      const pub = publicacion.get(p.id)!;
                      return (
                        <>
                          <span className="text-cuerpo-sm text-muted-foreground">{pub.cursosCerrados} de {pub.totalCursos} cursos cerrados</span>
                          {pub.publicadaAt && (
                            <span className="inline-flex items-center gap-1.5 rounded-pildora bg-llego-fondo px-2.5 py-1 text-etiqueta text-llego">
                              <Megaphone className="size-3.5" strokeWidth={2} aria-hidden />Libreta publicada el {fechaLima(pub.publicadaAt)}
                            </span>
                          )}
                          {pub.publicadaAt ? (
                            <BotonConfirmar
                              etiqueta="Reenviar aviso"
                              titulo={`¿Reenviar el aviso de ${p.nombre} ${p.anio}?`}
                              descripcion="Las familias volverán a recibir el aviso de que la libreta está disponible."
                              confirmar="Reenviar aviso"
                              accion={publicarLibretaAction.bind(null, slug, p.id, true)}
                            />
                          ) : pub.puedePublicar ? (
                            <BotonConfirmar
                              etiqueta="Publicar libreta y avisar a las familias"
                              titulo={`¿Publicar la libreta de ${p.nombre} ${p.anio}?`}
                              descripcion="Las familias podrán ver y descargar la libreta, y recibirán un aviso por correo o push según sus preferencias."
                              confirmar="Publicar y avisar"
                              variante="default"
                              accion={publicarLibretaAction.bind(null, slug, p.id, false)}
                            />
                          ) : (
                            <span className="text-cuerpo-sm text-muted-foreground">Para publicar la libreta, cierra el periodo o las notas de todos los cursos.</span>
                          )}
                        </>
                      );
                    })()}
                    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta ${p.cerrado ? "bg-muted text-muted-foreground" : "bg-llego-fondo text-llego"}`}>
                      {p.cerrado ? <Lock className="size-3.5" strokeWidth={2} aria-hidden /> : <CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden />}
                      {p.cerrado ? "Cerrado" : "Abierto"}
                    </span>
                    <DialogoAccion
                      variante="outline"
                      disparador={<><Pencil strokeWidth={2} aria-hidden />Fechas</>}
                      titulo={`${p.nombre} ${p.anio}`}
                      descripcion={`Las fechas valen para ${p.niveles.filter((n) => niveles.includes(n)).map((n) => NOMBRE_NIVEL[n].toLowerCase()).join(", ") || "todos los niveles"}.`}
                      etiqueta="Guardar fechas"
                      accion={actualizarPeriodoAction.bind(null, slug, p.id)}
                    >
                      <Campo etiqueta="Nombre" name="nombre" required defaultValue={p.nombre} />
                      <Campo etiqueta="Inicio" name="inicio" type="date" required defaultValue={isoDeFechaDb(p.inicio)} />
                      <Campo etiqueta="Fin" name="fin" type="date" required defaultValue={isoDeFechaDb(p.fin)} />
                    </DialogoAccion>
                    <BotonConfirmar
                      etiqueta={p.cerrado ? "Abrir de nuevo" : "Cerrar periodo"}
                      titulo={p.cerrado ? `¿Abrir de nuevo ${p.nombre} ${p.anio}?` : `¿Cerrar ${p.nombre} ${p.anio}?`}
                      descripcion={p.cerrado ? "Los profesores podrán volver a cambiar sus notas." : "Los profesores ya no podrán cambiar sus notas de este periodo."}
                      confirmar={p.cerrado ? "Abrir periodo" : "Cerrar periodo"}
                      peligro={!p.cerrado}
                      accion={cambiarEstadoPeriodoAction.bind(null, slug, p.id, !p.cerrado)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
