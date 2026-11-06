import { LogOut, Lock, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { fechaCorta, hora12, momentoEnZona } from "@/lib/fechas";
import { NOMBRE_TIPO_INCIDENCIA, TIPOS_INCIDENCIA, alumnosParaIncidencia, cursosParaIncidencia, listarIncidencias } from "@/lib/server/incidencias";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { registrarIncidenciaAction } from "./actions";

export const metadata: Metadata = { title: "Incidencias" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Incidencias y retiros anticipados (specs/37). Paso 1: alumno, fecha y hora. Paso 2: qué pasó y qué clases se perdió
 * (sugeridas por el horario). Cada clase marcada recibe una falta a clase y su profesor un aviso sin el detalle.
 */
export default async function IncidenciasPage({ params, searchParams }: PageProps<"/colegio/[slug]/incidencias">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "profesor", "administrativo"]);
  requireFeature(ctx, "asistencia");
  const ahora = momentoEnZona(new Date(), ctx.tenant.zonaHoraria);
  const alumnoId = uno(sp.alumno);
  const fecha = uno(sp.fecha) || ahora.isoFecha;
  const hora = uno(sp.hora) || ahora.hora;
  const [alumnos, incidencias] = await Promise.all([alumnosParaIncidencia(ctx), listarIncidencias(ctx)]);
  const alumno = alumnos.find((a) => a.id === alumnoId);
  const cursos = alumno ? await cursosParaIncidencia(ctx, alumno.id, fecha, hora) : [];

  return (
    <div className="flex flex-col">
      <EncabezadoPagina titulo="Incidencias" seccion="dia" descripcion="Si un alumno se accidenta, se siente mal o se retira antes, registra aquí las clases que se perdió." />
      <Flash ok={uno(sp.ok)} error={uno(sp.error)} />

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start">
        <section aria-labelledby="titulo-registrar" data-seccion="dia" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <TituloSeccion id="titulo-registrar">Registrar</TituloSeccion>
            <p className="text-cuerpo-sm text-muted-foreground tabular-nums">Paso {alumno ? 2 : 1} de 2 · {alumno ? "Qué pasó" : "Alumno y momento"}</p>
          </div>
          <div className="rounded-[14px] border border-borde-sutil bg-superficie p-5">
            {!alumno ? (
              <form method="get" className="flex flex-col gap-4">
                <Selector etiqueta="Alumno" name="alumno" required defaultValue="">
                  <option value="" disabled>Elige al alumno</option>
                  {alumnos.map((a) => <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres} · {a.salon.nombre}</option>)}
                </Selector>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo etiqueta="Fecha" name="fecha" type="date" max={ahora.isoFecha} defaultValue={fecha} required />
                  <Campo etiqueta="Hora" name="hora" type="time" defaultValue={hora} required />
                </div>
                <Boton type="submit" className="self-start">Continuar</Boton>
              </form>
            ) : (
              <form action={registrarIncidenciaAction} className="flex flex-col gap-6">
                <input type="hidden" name="alumnoId" value={alumno.id} />
                <input type="hidden" name="fecha" value={fecha} />
                <input type="hidden" name="hora" value={hora} />
                <p className="rounded-xl bg-sec-suave px-4 py-3 text-cuerpo-sm text-sec-tinta tabular-nums">
                  <span className="font-semibold">{alumno.apellidos}, {alumno.nombres}</span> · {alumno.salon.nombre} · {fechaCorta(fecha)}, {hora12(hora)}{" "}
                  <Link href="/incidencias" className="enlace">Cambiar</Link>
                </p>
                <div className="flex flex-col gap-4">
                  <h3 className="text-cuerpo font-semibold">Qué ocurrió</h3>
                  <Selector etiqueta="Tipo" name="tipo" required defaultValue="accidente">
                    {TIPOS_INCIDENCIA.map((t) => <option key={t} value={t}>{NOMBRE_TIPO_INCIDENCIA[t]}</option>)}
                  </Selector>
                  <label className="flex flex-col gap-1.5 text-cuerpo-sm">
                    <span className="font-medium">Qué pasó</span>
                    <Textarea name="descripcion" rows={3} maxLength={1000} required />
                    <span className="flex items-start gap-1.5 text-cuerpo-sm text-muted-foreground">
                      <Lock className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      Solo lo ven dirección, el tutor del salón y tú. Los profesores reciben solo que el alumno no estará en su clase. No escribas diagnósticos médicos.
                    </span>
                  </label>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-cuerpo font-semibold">Retiro</h3>
                  <label className="flex min-h-11 items-center gap-2.5 text-cuerpo-sm">
                    <input type="checkbox" name="retiro" className="size-5 accent-primary" />
                    <span className="font-medium">Se retiró antes del colegio</span>
                  </label>
                  <Campo etiqueta="Hora del retiro" name="horaRetiro" type="time" defaultValue={hora} />
                </div>
                <fieldset className="flex flex-col gap-1">
                  <legend className="mb-2 text-cuerpo font-semibold">Clases que se perdió</legend>
                  {cursos.length === 0 && <p className="text-cuerpo-sm text-muted-foreground">Su salón no tiene cursos.</p>}
                  {cursos.map((c) => (
                    <label key={c.id} className="flex min-h-11 items-center gap-2.5 text-cuerpo-sm">
                      <input type="checkbox" name="cursoIds" value={c.id} defaultChecked={c.sugerido} className="size-5 accent-primary" />
                      <span>{c.nombre}{c.hora && <span className="text-muted-foreground tabular-nums"> · {hora12(c.hora)}</span>}</span>
                    </label>
                  ))}
                  <p className="mt-1 text-cuerpo-sm text-muted-foreground">
                    Marcamos las clases de su horario desde esa hora. Cada una queda con falta a clase (la familia puede justificarla) y las actividades de ese día con NSP. Registrar la incidencia no autoriza por sí sola una recuperación.
                  </p>
                </fieldset>
                <Boton type="submit" className="self-start">Registrar incidencia</Boton>
              </form>
            )}
          </div>
        </section>

        <section aria-labelledby="titulo-recientes" data-seccion="dia" className="flex min-w-0 flex-col gap-4">
          <TituloSeccion id="titulo-recientes">Recientes</TituloSeccion>
          {incidencias.length === 0 ? (
            <EstadoVacio icono={TriangleAlert} titulo="Sin incidencias registradas" descripcion="Cuando registres una, aparecerá aquí." />
          ) : (
            <ul className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
              {incidencias.map((i) => (
                <li key={i.id} className="flex flex-col gap-1 py-4 text-cuerpo-sm">
                  <p className="flex flex-wrap items-center gap-2 text-cuerpo font-semibold">
                    {i.alumno} <span className="font-normal text-muted-foreground">· {i.salon}</span>
                    <span className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-2 py-0.5 text-etiqueta">
                      <TriangleAlert className="size-3.5 text-sec-trazo" strokeWidth={2} aria-hidden />{NOMBRE_TIPO_INCIDENCIA[i.tipo]}
                    </span>
                    {i.retiro && (
                      <span className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-2 py-0.5 text-etiqueta tabular-nums">
                        <LogOut className="size-3.5 text-sec-trazo" strokeWidth={2} aria-hidden />Retiro {i.horaRetiro && hora12(i.horaRetiro)}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground tabular-nums">{fechaCorta(i.fecha)}, {hora12(i.hora)} · registró {i.registradoPor}</p>
                  {i.cursos.length > 0 && <p>Clases perdidas: {i.cursos.join(", ")}</p>}
                  {i.descripcion ? <p className="text-muted-foreground">{i.descripcion}</p> : <p className="text-muted-foreground">Detalle reservado.</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Título de bloque con el nudo de la sección (mismo patrón que `TituloBloque` del inicio). */
function TituloSeccion({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold">
      <span aria-hidden className="size-2.5 rounded-full bg-sec-nudo" />
      {children}
    </h2>
  );
}
