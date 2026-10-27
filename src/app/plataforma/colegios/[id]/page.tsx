import { ArrowLeft, Download, ExternalLink, History, ImageIcon, KeyRound, Mail, Pencil, Settings2, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { urlColegio } from "@/lib/dominio";
import { fechaCorta } from "@/lib/fechas";
import { NOMBRE_PLAN } from "@/lib/planes";
import { auditoriaDelColegio, detalleColegio, requireAdminPlataforma, type DiaMetricas } from "@/lib/server/plataforma";
import {
  agregarAdministradorAction, cambiarEstadoAction, cambiarInsigniaAction, cambiarPlanAction, editarColegioAction, reenviarBienvenidaAction,
} from "../../actions";
import { CamposAdministrador } from "../CamposAdministrador";
import { EstadoColegio, fechaHora, fechaSimple, porcentaje } from "../../EstadoColegio";
import { FormularioPlataforma } from "../FormularioPlataforma";

export const metadata: Metadata = { title: "Colegio" };

const NOMBRE_ACCION: Record<string, string> = {
  crear_colegio: "Creó el colegio",
  cambiar_plan: "Cambió el plan",
  cambiar_estado: "Cambió el estado",
  editar_colegio: "Editó los datos",
  cambiar_insignia: "Cambió la insignia",
  reenviar_bienvenida: "Reenvió la bienvenida",
  agregar_administrador: "Agregó un administrador",
  exportar_colegio: "Exportó los datos (ZIP)",
};

/** Agrupa los 30 días en semanas (de la más reciente a la más antigua). */
function porSemana(dias: DiaMetricas[]) {
  const grupos: { desde: string; hasta: string; asistencias: number; avisos: number; abiertos: number; rebotes: number; ingresos: number }[] = [];
  for (let fin = dias.length; fin > 0; fin -= 7) {
    const tramo = dias.slice(Math.max(0, fin - 7), fin);
    const suma = (k: keyof Omit<DiaMetricas, "fecha">) => tramo.reduce((s, d) => s + d[k], 0);
    grupos.push({
      desde: tramo[0].fecha, hasta: tramo[tramo.length - 1].fecha,
      asistencias: suma("asistencias"), avisos: suma("avisos"), abiertos: suma("abiertos"), rebotes: suma("rebotes"),
      // Usuarios distintos por día sumados: «ingresos», no personas únicas de la semana.
      ingresos: suma("ingresos"),
    });
  }
  return grupos;
}

export default async function DetalleColegio({ params, searchParams }: PageProps<"/plataforma/colegios/[id]">) {
  const admin = await requireAdminPlataforma();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const [{ tenant: t, fila, administradores, logoUrl, dias }, bitacora] = await Promise.all([detalleColegio(admin, id), auditoriaDelColegio(admin, id)]);
  const url = urlColegio(t.slug, "/inicio");
  const semanas = porSemana(dias);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/colegios" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-acento">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden /> Reporte de colegios
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-arena bg-white">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`Insignia de ${t.nombre}`} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-6 w-6 text-pizarra" strokeWidth={2} aria-label="Sin insignia" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{t.nombre}</h1>
          {t.eslogan && <p className="text-sm italic text-pizarra">{t.eslogan}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <EstadoColegio estado={t.estado} />
            <span className="text-pizarra">Plan {NOMBRE_PLAN[t.plan]}{t.ciudad ? ` · ${t.ciudad}` : ""} · alta {fechaSimple(t.createdAt)}</span>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-acento">
              {url.replace(/^https?:\/\//, "").replace(/\/inicio$/, "")} <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </a>
          </div>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      {fila && (
        <section aria-labelledby="resumen" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <h2 id="resumen" className="sr-only">Resumen</h2>
          {[
            ["Alumnos", fila.alumnos],
            ["Profesores", fila.profesores],
            ["Familias", fila.familias],
            ["Asistencia (7 d)", fila.asistencias7d],
            ["Apertura (7 d)", porcentaje(fila.avisos7d ? fila.abiertos7d / fila.avisos7d : null)],
            ["Último ingreso", fechaHora(fila.ultimoIngreso)],
          ].map(([titulo, valor]) => (
            <Tarjeta key={titulo} className="p-4">
              <p className="text-xs font-medium text-pizarra">{titulo}</p>
              <p className="font-titulo text-lg font-bold">{valor}</p>
            </Tarjeta>
          ))}
        </section>
      )}

      <section aria-labelledby="metricas" className="flex flex-col gap-2">
        <h2 id="metricas" className="text-lg font-semibold">Últimos 30 días</h2>
        <div className="overflow-x-auto rounded-lg border border-arena bg-superficie">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-superficie-2 text-left text-xs uppercase tracking-wide text-pizarra">
              <tr>
                <th scope="col" className="px-3 py-2">Semana</th>
                <th scope="col" className="px-3 py-2 text-right">Asistencia registrada</th>
                <th scope="col" className="px-3 py-2 text-right">Correos enviados</th>
                <th scope="col" className="px-3 py-2 text-right">Apertura</th>
                <th scope="col" className="px-3 py-2 text-right">Rebotes y quejas</th>
                <th scope="col" className="px-3 py-2 text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((s) => (
                <tr key={s.desde} className="border-t border-arena">
                  <td className="px-3 py-2">{fechaCorta(s.desde)} – {fechaCorta(s.hasta)}</td>
                  <td className="px-3 py-2 text-right">{s.asistencias}</td>
                  <td className="px-3 py-2 text-right">{s.avisos}</td>
                  <td className="px-3 py-2 text-right">{porcentaje(s.avisos ? s.abiertos / s.avisos : null)}</td>
                  <td className="px-3 py-2 text-right">{s.rebotes}</td>
                  <td className="px-3 py-2 text-right">{s.ingresos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-pizarra">Ingresos: suma diaria de personas del colegio que iniciaron sesión.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Administradores</h2>
          <ul className="flex flex-col divide-y divide-arena">
            {administradores.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="font-semibold">{a.user.nombres} {a.user.apellidos}</p>
                  <p className="text-sm text-pizarra">{a.cargo ?? "Dirección"} · {a.user.email}</p>
                  <p className="inline-flex items-center gap-1 text-xs text-pizarra">
                    <KeyRound className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {a.user.debeCambiarPassword ? "Aún no cambia su contraseña inicial" : "Ya eligió su contraseña"}
                    {a.estado !== "activa" ? ` · membresía ${a.estado}` : ""}
                  </p>
                </div>
                <form action={reenviarBienvenidaAction}>
                  <input type="hidden" name="tenantId" value={t.id} />
                  <input type="hidden" name="membershipId" value={a.id} />
                  <Boton type="submit" variante="secundario" className="px-3 py-1.5">
                    <Mail className="h-4 w-4" strokeWidth={2} aria-hidden /> Reenviar bienvenida
                  </Boton>
                </form>
              </li>
            ))}
            {administradores.length === 0 && <li className="py-2 text-sm text-pizarra">Sin administradores.</li>}
          </ul>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Settings2 className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Plan y estado</h2>
          <form action={cambiarPlanAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tenantId" value={t.id} />
            <Selector etiqueta="Plan" name="plan" defaultValue={t.plan}>
              <option value="basico">{NOMBRE_PLAN.basico}</option>
              <option value="fase2">{NOMBRE_PLAN.fase2}</option>
              <option value="promax">{NOMBRE_PLAN.promax}</option>
            </Selector>
            <Boton type="submit" variante="secundario">Cambiar plan</Boton>
          </form>
          <form action={cambiarEstadoAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tenantId" value={t.id} />
            <Selector etiqueta="Estado" name="estado" defaultValue={t.estado}>
              <option value="piloto">Piloto</option>
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido (nadie puede entrar)</option>
            </Selector>
            <Boton type="submit" variante="secundario">Cambiar estado</Boton>
          </form>
          <a href={`/colegios/${t.id}/exportar`} className="inline-flex items-center gap-2 text-sm font-semibold text-acento">
            <Download className="h-4 w-4" strokeWidth={2} aria-hidden /> Exportar todos los datos (ZIP, garantía de salida)
          </a>
          <p className="text-xs text-pizarra">El panel no borra colegios: se hace con el script <code>khipu:borrar-colegio</code>.</p>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Pencil className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Datos del colegio</h2>
          <form action={editarColegioAction} className="flex flex-col gap-4">
            <input type="hidden" name="tenantId" value={t.id} />
            <Campo etiqueta="Nombre" name="nombre" defaultValue={t.nombre} required />
            <Campo etiqueta="Eslogan (opcional)" name="eslogan" defaultValue={t.eslogan ?? ""} maxLength={140} />
            <Campo etiqueta="Ciudad" name="ciudad" defaultValue={t.ciudad ?? ""} />
            <Campo etiqueta="Dominios de correo" name="emailDomains" defaultValue={t.emailDomains.join(", ")} ayuda="Separados por coma." />
            <Selector etiqueta="Escala de notas" name="escalaCalificacion" defaultValue={t.escalaCalificacion}>
              <option value="literal">Literal (AD, A, B, C)</option>
              <option value="vigesimal">Vigesimal (0 a 20)</option>
            </Selector>
            <Boton type="submit" className="self-start">Guardar datos</Boton>
          </form>
          <form action={cambiarInsigniaAction} className="flex flex-wrap items-end gap-3 border-t border-arena pt-4">
            <input type="hidden" name="tenantId" value={t.id} />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Nueva insignia
              <input type="file" name="insignia" accept="image/png,image/jpeg,image/webp" required className="text-sm" />
              <span className="text-xs font-normal text-pizarra">PNG, JPG o WEBP, hasta 1 MB.</span>
            </label>
            <Boton type="submit" variante="secundario">Cambiar insignia</Boton>
          </form>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><UserPlus className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Agregar otro administrador</h2>
          <FormularioPlataforma accion={agregarAdministradorAction} etiqueta="Agregar administrador" className="flex flex-col gap-4">
            <input type="hidden" name="tenantId" value={t.id} />
            <CamposAdministrador />
          </FormularioPlataforma>
        </Tarjeta>
      </div>

      <section aria-labelledby="bitacora" className="flex flex-col gap-2">
        <h2 id="bitacora" className="flex items-center gap-2 text-lg font-semibold"><History className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Acciones de la plataforma</h2>
        {bitacora.length === 0 ? (
          <p className="text-sm text-pizarra">Sin acciones registradas.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {bitacora.map((b) => (
              <li key={b.id}><span className="text-pizarra">{fechaHora(b.createdAt)}</span> · {b.actor} · {NOMBRE_ACCION[b.accion] ?? b.accion}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
