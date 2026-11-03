import { LogOut, Lock, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
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
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <EncabezadoPagina titulo="Incidencias" descripcion="Si un alumno se accidenta, se siente mal o se retira antes, registra aquí las clases que se perdió." />
        <Flash ok={uno(sp.ok)} error={uno(sp.error)} />
      </div>

      <Tarjeta>
        {!alumno ? (
          <form method="get" className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <Selector etiqueta="Alumno" name="alumno" required defaultValue="">
              <option value="" disabled>Elige al alumno</option>
              {alumnos.map((a) => <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres} · {a.salon.nombre}</option>)}
            </Selector>
            <Campo etiqueta="Fecha" name="fecha" type="date" max={ahora.isoFecha} defaultValue={fecha} required />
            <Campo etiqueta="Hora" name="hora" type="time" defaultValue={hora} required />
            <Boton type="submit">Continuar</Boton>
          </form>
        ) : (
          <form action={registrarIncidenciaAction} className="flex flex-col gap-4">
            <input type="hidden" name="alumnoId" value={alumno.id} />
            <input type="hidden" name="fecha" value={fecha} />
            <input type="hidden" name="hora" value={hora} />
            <p className="text-sm">
              <span className="font-medium">{alumno.apellidos}, {alumno.nombres}</span> · {alumno.salon.nombre} · {fechaCorta(fecha)}, {hora12(hora)}{" "}
              <Link href="/incidencias" className="enlace">Cambiar</Link>
            </p>
            <Selector etiqueta="Tipo" name="tipo" required defaultValue="accidente">
              {TIPOS_INCIDENCIA.map((t) => <option key={t} value={t}>{NOMBRE_TIPO_INCIDENCIA[t]}</option>)}
            </Selector>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Qué pasó</span>
              <Textarea name="descripcion" rows={3} maxLength={1000} required />
              <span className="flex items-start gap-1.5 text-cuerpo-sm text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Solo lo ven dirección, el tutor del salón y tú. Los profesores reciben solo que el alumno no estará en su clase. No escribas diagnósticos médicos.
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" name="retiro" className="size-4 accent-primary" />
                <span className="font-medium">Se retiró antes del colegio</span>
              </label>
              <Campo etiqueta="Hora del retiro" name="horaRetiro" type="time" defaultValue={hora} />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Clases que se perdió</legend>
              {cursos.length === 0 && <p className="text-cuerpo-sm text-muted-foreground">Su salón no tiene cursos.</p>}
              {cursos.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" name="cursoIds" value={c.id} defaultChecked={c.sugerido} className="size-4 accent-primary" />
                  <span>{c.nombre}{c.hora && <span className="text-muted-foreground"> · {hora12(c.hora)}</span>}</span>
                </label>
              ))}
              <p className="text-cuerpo-sm text-muted-foreground">
                Marcamos las clases de su horario desde esa hora. Cada una queda con falta a clase (la familia puede justificarla) y las actividades de ese día con NSP. Registrar la incidencia no autoriza por sí sola una recuperación.
              </p>
            </fieldset>
            <Boton type="submit" className="self-start">Registrar incidencia</Boton>
          </form>
        )}
      </Tarjeta>

      <section className="flex flex-col gap-3">
        <h2 className="text-titulo-2">Recientes</h2>
        {incidencias.length === 0 ? (
          <EstadoVacio icono={TriangleAlert} titulo="Sin incidencias registradas" descripcion="Cuando registres una, aparecerá aquí." />
        ) : (
          <ul className="flex flex-col gap-2">
            {incidencias.map((i) => (
              <li key={i.id}>
                <Tarjeta>
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {i.alumno} <span className="font-normal text-muted-foreground">· {i.salon}</span>
                      <span className="inline-flex items-center gap-1 rounded-pildora bg-muted px-2 py-0.5 text-etiqueta">
                        <TriangleAlert className="size-3.5" strokeWidth={2} aria-hidden />{NOMBRE_TIPO_INCIDENCIA[i.tipo]}
                      </span>
                      {i.retiro && (
                        <span className="inline-flex items-center gap-1 rounded-pildora bg-muted px-2 py-0.5 text-etiqueta">
                          <LogOut className="size-3.5" strokeWidth={2} aria-hidden />Retiro {i.horaRetiro && hora12(i.horaRetiro)}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground">{fechaCorta(i.fecha)}, {hora12(i.hora)} · registró {i.registradoPor}</p>
                    {i.cursos.length > 0 && <p>Clases perdidas: {i.cursos.join(", ")}</p>}
                    {i.descripcion ? <p className="text-muted-foreground">{i.descripcion}</p> : <p className="text-cuerpo-sm text-muted-foreground">Detalle reservado.</p>}
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
