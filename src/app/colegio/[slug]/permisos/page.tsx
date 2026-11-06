import { Ban, CalendarCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
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
    <div className="flex flex-col gap-6">
      <div>
        <EncabezadoPagina
          titulo="Permisos"
          descripcion="Registra los días u horas en que el colegio autoriza que un alumno no asista. No generan falta automática ni NSP."
        />
        <Flash ok={uno(sp.ok)} error={uno(sp.error)} />
      </div>

      {alumnos.length > 0 ? (
        <Tarjeta>
          <form action={registrarPermisoAction} className="flex flex-col gap-4">
            <Selector etiqueta="Alumno" name="alumnoId" required defaultValue={alumnos.some((a) => a.id === alumnoElegido) ? alumnoElegido : ""}>
              <option value="" disabled>Elige al alumno</option>
              {alumnos.map((a) => <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres} · {a.salon.nombre}</option>)}
            </Selector>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Desde" name="desde" type="date" defaultValue={hoy} required />
              <Campo etiqueta="Hasta" name="hasta" type="date" defaultValue={hoy} required />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Horario</legend>
              <label className="flex items-center gap-2.5 text-sm">
                <input type="radio" name="alcance" value="dia" defaultChecked className="size-4 accent-primary" />
                Todo el día
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <input type="radio" name="alcance" value="horas" className="size-4 accent-primary" />
                Solo unas horas
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Desde la hora" name="horaDesde" type="time" ayuda="Solo si es por horas." />
                <Campo etiqueta="Hasta la hora" name="horaHasta" type="time" />
              </div>
            </fieldset>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Motivo</span>
              <Textarea name="motivo" rows={2} maxLength={500} required />
              <span className="text-cuerpo-sm text-muted-foreground">Lo ven dirección, administrativo y los profesores del salón. No escribas diagnósticos médicos.</span>
            </label>
            <Boton type="submit" className="self-start">Registrar permiso</Boton>
          </form>
        </Tarjeta>
      ) : (
        <p className="text-cuerpo-sm text-muted-foreground">Los permisos los registran dirección, administrativo y el tutor del salón. Aquí ves los de tus salones.</p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-titulo-2">Registrados</h2>
        {permisos.length === 0 ? (
          <EstadoVacio icono={CalendarCheck} titulo="Sin permisos registrados" descripcion="Cuando el colegio registre uno, aparecerá aquí." />
        ) : (
          <ul className="flex flex-col gap-2">
            {permisos.map((p) => (
              <li key={p.id}>
                <Tarjeta>
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {p.alumno} <span className="font-normal text-muted-foreground">· {p.salon}</span>
                      {p.anulado ? (
                        <span className="inline-flex items-center gap-1 rounded-pildora bg-muted px-2 py-0.5 text-etiqueta">
                          <Ban className="size-3.5" strokeWidth={2} aria-hidden />Anulado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-pildora bg-llego-fondo px-2 py-0.5 text-etiqueta text-llego">
                          <CalendarCheck className="size-3.5" strokeWidth={2} aria-hidden />Vigente
                        </span>
                      )}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground" strokeWidth={2} aria-hidden />
                      {p.desde === p.hasta ? fechaCorta(p.desde) : `Del ${fechaCorta(p.desde)} al ${fechaCorta(p.hasta)}`} · {textoHorasPermiso(p, hora12)}
                    </p>
                    <p className="text-muted-foreground">{p.motivo}</p>
                    <p className="text-cuerpo-sm text-muted-foreground">Registró {p.registradoPor}</p>
                    {p.anulado && (
                      <p className="text-cuerpo-sm text-muted-foreground">
                        Anulado por {p.anulado.por}{p.anulado.motivo ? `: ${p.anulado.motivo}` : ""}
                      </p>
                    )}
                    {p.puedeAnular && (
                      <details className="mt-1">
                        <summary className="enlace w-fit cursor-pointer text-sm">Anular permiso</summary>
                        <form action={anularPermisoAction} className="mt-2 flex flex-col gap-2">
                          <input type="hidden" name="permisoId" value={p.id} />
                          <label className="flex flex-col gap-1.5 text-sm">
                            <span className="font-medium">Motivo de la anulación</span>
                            <Textarea name="motivo" rows={2} maxLength={500} required />
                          </label>
                          <p className="text-cuerpo-sm text-muted-foreground">El permiso queda en el historial como anulado. Si el alumno faltó esos días, sus actividades vuelven a quedar con NSP.</p>
                          <Boton type="submit" variante="secundario" className="self-start">Anular permiso</Boton>
                        </form>
                      </details>
                    )}
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
