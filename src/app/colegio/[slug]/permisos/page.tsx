import { Ban, CalendarCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { fechaCorta, hora12, momentoEnZona } from "@/lib/fechas";
import { textoHorasPermiso } from "@/lib/permisos-asistencia";
import { alumnosParaPermiso, listarPermisos } from "@/lib/server/permisos-asistencia";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { anularPermisoAction, registrarPermisoAction } from "./actions";

export const metadata: Metadata = { title: "Permisos" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Permisos de asistencia (specs/04): el colegio autoriza que un alumno no asista o falte unas horas. Registran y anulan
 * dirección, administrativo y el tutor del salón; los demás profesores los ven en solo lectura. Un permiso no se
 * convierte en falta automática ni en NSP.
 */
export default async function PermisosPage({ params, searchParams }: PageProps<"/colegio/[slug]/permisos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "profesor", "administrativo"]);
  requireFeature(ctx, "asistencia");
  const hoy = momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha;
  const [alumnos, permisos] = await Promise.all([alumnosParaPermiso(ctx), listarPermisos(ctx)]);
  const alumnoElegido = uno(sp.alumno) ?? "";

  return (
    <div className="flex flex-col">
      <EncabezadoPagina
        titulo="Permisos"
        seccion="dia"
        descripcion="Registra los días u horas en que el colegio autoriza que un alumno no asista. No generan falta automática ni NSP."
      />
      <Flash ok={uno(sp.ok)} error={uno(sp.error)} />

      <div className={alumnos.length > 0 ? "grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start" : "flex flex-col gap-10"}>
        {alumnos.length > 0 ? (
          <section aria-labelledby="titulo-nuevo" data-seccion="dia" className="flex flex-col gap-4">
            <TituloSeccion id="titulo-nuevo">Registrar permiso</TituloSeccion>
            <form action={registrarPermisoAction} className="flex flex-col gap-6 rounded-[14px] border border-borde-sutil bg-superficie p-5">
              <div className="flex flex-col gap-4">
                <h3 className="text-cuerpo font-semibold">Alumno y fechas</h3>
                <Selector etiqueta="Alumno" name="alumnoId" required defaultValue={alumnos.some((a) => a.id === alumnoElegido) ? alumnoElegido : ""}>
                  <option value="" disabled>Elige al alumno</option>
                  {alumnos.map((a) => <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres} · {a.salon.nombre}</option>)}
                </Selector>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo etiqueta="Desde" name="desde" type="date" defaultValue={hoy} required />
                  <Campo etiqueta="Hasta" name="hasta" type="date" defaultValue={hoy} required />
                </div>
              </div>
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-cuerpo font-semibold">Horario</legend>
                <label className="flex min-h-11 items-center gap-2.5 text-cuerpo-sm">
                  <input type="radio" name="alcance" value="dia" defaultChecked className="size-5 accent-primary" />
                  Todo el día
                </label>
                <label className="flex min-h-11 items-center gap-2.5 text-cuerpo-sm">
                  <input type="radio" name="alcance" value="horas" className="size-5 accent-primary" />
                  Solo unas horas
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo etiqueta="Desde la hora" name="horaDesde" type="time" ayuda="Solo si es por horas." />
                  <Campo etiqueta="Hasta la hora" name="horaHasta" type="time" />
                </div>
              </fieldset>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-cuerpo-sm">
                  <span className="font-medium">Motivo</span>
                  <Textarea name="motivo" rows={2} maxLength={500} required />
                  <span className="text-cuerpo-sm text-muted-foreground">Lo ven dirección, administrativo y los profesores del salón. No escribas diagnósticos médicos.</span>
                </label>
                <Boton type="submit" className="self-start">Registrar permiso</Boton>
              </div>
            </form>
          </section>
        ) : (
          <p className="text-cuerpo-sm text-muted-foreground">Los permisos los registran dirección, administrativo y el tutor del salón. Aquí ves los de tus salones.</p>
        )}

        <section aria-labelledby="titulo-registrados" data-seccion="dia" className="flex min-w-0 flex-col gap-4">
          <TituloSeccion id="titulo-registrados">Registrados</TituloSeccion>
          {permisos.length === 0 ? (
            <EstadoVacio icono={CalendarCheck} titulo="Sin permisos registrados" descripcion="Cuando el colegio registre uno, aparecerá aquí." />
          ) : (
            <ul className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
              {permisos.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 py-4 text-cuerpo-sm">
                  <p className="flex flex-wrap items-center gap-2 text-cuerpo font-semibold">
                    {p.alumno} <span className="font-normal text-muted-foreground">· {p.salon}</span>
                    {p.anulado ? (
                      <span className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-2 py-0.5 text-etiqueta">
                        <Ban className="size-3.5" strokeWidth={2} aria-hidden />Anulado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-pildora bg-llego-fondo px-2 py-0.5 text-etiqueta text-llego">
                        <CalendarCheck className="size-3.5" strokeWidth={2} aria-hidden />Vigente
                      </span>
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-1.5 tabular-nums">
                    <Clock className="size-3.5 text-sec-trazo" strokeWidth={2} aria-hidden />
                    {p.desde === p.hasta ? fechaCorta(p.desde) : `Del ${fechaCorta(p.desde)} al ${fechaCorta(p.hasta)}`} · {textoHorasPermiso(p, hora12)}
                  </p>
                  <p className="text-muted-foreground">{p.motivo}</p>
                  <p className="text-muted-foreground">Registró {p.registradoPor}</p>
                  {p.anulado && (
                    <p className="text-muted-foreground">
                      Anulado por {p.anulado.por}{p.anulado.motivo ? `: ${p.anulado.motivo}` : ""}
                    </p>
                  )}
                  {p.puedeAnular && (
                    <details className="mt-1">
                      <summary className="enlace inline-flex min-h-11 w-fit cursor-pointer items-center">Anular permiso</summary>
                      <form action={anularPermisoAction} className="mt-2 flex flex-col gap-2 rounded-xl bg-superficie-2 p-4">
                        <input type="hidden" name="permisoId" value={p.id} />
                        <label className="flex flex-col gap-1.5">
                          <span className="font-medium">Motivo de la anulación</span>
                          <Textarea name="motivo" rows={2} maxLength={500} required />
                        </label>
                        <p className="text-muted-foreground">El permiso queda en el historial como anulado. Si el alumno faltó esos días, sus actividades vuelven a quedar con NSP.</p>
                        <Boton type="submit" variante="secundario" className="self-start">Anular permiso</Boton>
                      </form>
                    </details>
                  )}
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
