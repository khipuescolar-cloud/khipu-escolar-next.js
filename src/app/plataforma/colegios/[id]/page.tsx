import { ArrowLeft, Download, ExternalLink, History, ImageIcon, LifeBuoy, Pencil, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Notificar } from "@/components/shell/Notificar";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { urlColegio } from "@/lib/dominio";
import { fechaCorta } from "@/lib/fechas";
import { NOMBRE_PLAN } from "@/lib/planes";
import { listarResponsables } from "@/lib/server/plataforma-responsables";
import { suscripcionDelColegio } from "@/lib/server/plataforma-suscripciones";
import { accesoSoporteActual, auditoriaDelColegio, detalleColegio, requireAdminPlataforma, type DiaMetricas } from "@/lib/server/plataforma";
import {
  cambiarEstadoAction, cambiarInsigniaAction, cambiarPlanAction, editarColegioAction, entrarSoporteAction,
  terminarSoporteAction,
} from "../../actions";
import { DialogoSoporte } from "../../_componentes/DialogoSoporte";
import { GraficoDiario } from "../../_componentes/Graficos";
import { SeccionResponsables } from "./_responsables/SeccionResponsables";
import { SeccionSuscripcion } from "./_suscripcion/SeccionSuscripcion";
import { CambiarEstado } from "../../_componentes/CambiarEstado";
import { EstadoColegio, fechaHora, fechaSimple, PlanColegio, porcentaje } from "../../EstadoColegio";
import { ModulosColegio } from "./ModulosColegio";

export const metadata: Metadata = { title: "Colegio" };

const NOMBRE_ACCION: Record<string, string> = {
  crear_colegio: "Creó el colegio",
  cambiar_plan: "Cambió el plan",
  cambiar_estado: "Cambió el estado",
  editar_colegio: "Editó los datos",
  cambiar_insignia: "Cambió la insignia",
  reenviar_bienvenida: "Reenvió la bienvenida",
  agregar_administrador: "Agregó un administrador",
  agregar_responsable: "Agregó un responsable",
  editar_responsable: "Editó un responsable",
  marcar_responsable_principal: "Cambió el responsable principal",
  quitar_responsable: "Quitó un responsable",
  guardar_suscripcion: "Guardó la suscripción",
  registrar_pago: "Registró un pago",
  anular_pago: "Anuló un pago",
  exportar_colegio: "Exportó los datos (ZIP)",
  soporte_inicio: "Entró como soporte (solo lectura)",
  soporte_fin: "Terminó el acceso de soporte",
  colegio_modulo: "Cambió los módulos del colegio",
};

const horaLima = (d: Date) => d.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });

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
  const [{ tenant: t, fila, logoUrl, dias }, bitacora, soporte, responsables, comercial] = await Promise.all([
    detalleColegio(admin, id),
    auditoriaDelColegio(admin, id),
    accesoSoporteActual(admin, id),
    listarResponsables(admin, id),
    suscripcionDelColegio(admin, id),
  ]);
  const url = urlColegio(t.slug, "/inicio");
  const semanas = porSemana(dias);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/colegios" className="inline-flex min-h-10 items-center gap-1 self-start text-cuerpo-sm enlace font-semibold">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Colegios
      </Link>

      <div className="-mt-4 flex items-start gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`Insignia de ${t.nombre}`} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" strokeWidth={2} aria-label="Sin insignia" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <EncabezadoPagina
            titulo={t.nombre}
            descripcion={t.eslogan ? <span className="italic">{t.eslogan}</span> : undefined}
            acciones={
              <>
                {!soporte && <DialogoSoporte tenantId={t.id} nombre={t.nombre} accion={entrarSoporteAction} />}
                <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                  <ExternalLink strokeWidth={2} aria-hidden /> Abrir colegio
                </a>
              </>
            }
          />
          <div className="-mt-3 flex flex-wrap items-center gap-2 text-cuerpo-sm">
            <EstadoColegio estado={t.estado} />
            <PlanColegio plan={t.plan} />
            <span className="text-muted-foreground">{t.ciudad ? `${t.ciudad} · ` : ""}alta {fechaSimple(t.createdAt)}</span>
            <span className="font-mono text-cuerpo-sm text-muted-foreground">{url.replace(/^https?:\/\//, "").replace(/\/inicio$/, "")}</span>
          </div>
        </div>
      </div>

      <Notificar ok={typeof ok === "string" ? ok : undefined} error={typeof error === "string" ? error : undefined} />

      {soporte && (
        <Tarjeta role="region" className="flex flex-wrap items-center justify-between gap-3 border-primary/40 p-4" aria-labelledby="soporte-activo">
          <div className="flex min-w-0 items-start gap-3">
            <LifeBuoy className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            <div className="min-w-0">
              <p id="soporte-activo" className="font-semibold">Acceso de soporte activo · solo lectura · vence a las {horaLima(soporte.expiraAt)}</p>
              <p className="truncate text-cuerpo-sm text-muted-foreground">Motivo: {soporte.motivo}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={url} className={buttonVariants({ variant: "outline" })}>
              <ExternalLink strokeWidth={2} aria-hidden /> Ir al colegio
            </a>
            <BotonConfirmar
              etiqueta="Terminar acceso"
              titulo="¿Terminar el acceso de soporte?"
              descripcion="Dejarás de ver el colegio. Para volver a entrar tendrás que indicar otro motivo."
              confirmar="Terminar acceso"
              accion={terminarSoporteAction}
              campos={{ tenantId: t.id, accesoId: soporte.id }}
              variante="destructive"
            />
          </div>
        </Tarjeta>
      )}

      {fila && (
        <section aria-labelledby="resumen" className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          <h2 id="resumen" className="sr-only">Resumen</h2>
          {[
            ["Alumnos", fila.alumnos],
            ["Profesores", fila.profesores],
            ["Familias", fila.familias],
            ["Activos (7 d)", fila.usuariosActivos7d],
            ["Asistencia (7 d)", fila.asistencias7d],
            ["Apertura (7 d)", porcentaje(fila.avisos7d ? fila.abiertos7d / fila.avisos7d : null)],
            ["Último ingreso", fechaHora(fila.ultimoIngreso)],
          ].map(([titulo, valor]) => (
            <Tarjeta key={titulo} className="flex flex-col gap-1 p-4">
              <p className="text-cuerpo-sm font-medium text-muted-foreground">{titulo}</p>
              <p className="font-heading text-titulo-2">{valor}</p>
            </Tarjeta>
          ))}
        </section>
      )}

      <section aria-labelledby="metricas" className="flex flex-col gap-3">
        <h2 id="metricas" className="font-heading text-titulo-2">Últimos 30 días</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <GraficoDiario
            titulo="Ingresos diarios"
            descripcion="Personas del colegio que iniciaron sesión cada día."
            datos={dias}
            series={[{ clave: "ingresos", etiqueta: "Ingresos", color: "var(--chart-1)" }]}
          />
          <GraficoDiario
            titulo="Correos enviados y abiertos"
            datos={dias}
            series={[
              { clave: "avisos", etiqueta: "Enviados", color: "var(--chart-1)" },
              { clave: "abiertos", etiqueta: "Abiertos", color: "var(--chart-2)", punteada: true },
            ]}
          />
          <GraficoDiario
            titulo="Asistencia registrada"
            descripcion="Registros de asistencia por día."
            datos={dias}
            series={[{ clave: "asistencias", etiqueta: "Registros", color: "var(--chart-1)" }]}
          />
        </div>
        <details className="group rounded-xl border bg-card">
          <summary className="flex min-h-10 cursor-pointer items-center px-4 text-cuerpo-sm font-semibold text-primary">Ver la tabla por semana</summary>
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sobretitulo pl-4">Semana</TableHead>
                  <TableHead className="sobretitulo text-right">Asistencia registrada</TableHead>
                  <TableHead className="sobretitulo text-right">Correos enviados</TableHead>
                  <TableHead className="sobretitulo text-right">Apertura</TableHead>
                  <TableHead className="sobretitulo text-right">Rebotes y quejas</TableHead>
                  <TableHead className="sobretitulo pr-4 text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semanas.map((s) => (
                  <TableRow key={s.desde}>
                    <TableCell className="pl-4">{fechaCorta(s.desde)} – {fechaCorta(s.hasta)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.asistencias}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.avisos}</TableCell>
                    <TableCell className="text-right tabular-nums">{porcentaje(s.avisos ? s.abiertos / s.avisos : null)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.rebotes}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{s.ingresos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
        <p className="text-cuerpo-sm text-muted-foreground">Ingresos: suma diaria de personas del colegio que iniciaron sesión.</p>
      </section>

      {/* Comercial (specs/20): responsables y suscripción */}
      <SeccionResponsables tenantId={t.id} responsables={responsables} />
      <SeccionSuscripcion datos={comercial} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-heading text-titulo-2"><Settings2 className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Plan y estado</h2>
          <form action={cambiarPlanAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tenantId" value={t.id} />
            <Selector etiqueta="Plan" name="plan" defaultValue={t.plan}>
              <option value="basico">{NOMBRE_PLAN.basico}</option>
              <option value="fase2">{NOMBRE_PLAN.fase2}</option>
              <option value="promax">{NOMBRE_PLAN.promax}</option>
            </Selector>
            <Boton type="submit" variante="secundario">Cambiar plan</Boton>
          </form>
          <CambiarEstado tenantId={t.id} nombre={t.nombre} estadoActual={t.estado} accion={cambiarEstadoAction} />
          <a href={`/colegios/${t.id}/exportar`} className="inline-flex min-h-10 items-center gap-2 text-cuerpo-sm enlace font-semibold">
            <Download className="size-4" strokeWidth={2} aria-hidden /> Exportar todos los datos (ZIP, garantía de salida)
          </a>
          <p className="text-cuerpo-sm text-muted-foreground">El panel no borra colegios: se hace con el script <code>khipu:borrar-colegio</code>.</p>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-heading text-titulo-2"><Pencil className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Datos del colegio</h2>
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
          <form action={cambiarInsigniaAction} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <input type="hidden" name="tenantId" value={t.id} />
            <label className="flex flex-col gap-1 text-cuerpo-sm font-medium">
              Nueva insignia
              <input type="file" name="insignia" accept="image/png,image/jpeg,image/webp" required className="text-cuerpo-sm" />
              <span className="text-cuerpo-sm font-normal text-muted-foreground">PNG, JPG o WEBP, hasta 1 MB.</span>
            </label>
            <Boton type="submit" variante="secundario">Cambiar insignia</Boton>
          </form>
        </Tarjeta>

      </div>

      <ModulosColegio admin={admin} tenantId={t.id} />

      <section aria-labelledby="bitacora" className="flex flex-col gap-3">
        <h2 id="bitacora" className="flex items-center gap-2 font-heading text-titulo-2"><History className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Acciones de la plataforma</h2>
        {bitacora.length === 0 ? (
          <p className="text-cuerpo-sm text-muted-foreground">Sin acciones registradas.</p>
        ) : (
          <Tarjeta className="p-0">
            <ul className="flex flex-col divide-y text-cuerpo-sm">
              {bitacora.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
                  <span className="text-muted-foreground tabular-nums">{fechaHora(b.createdAt)}</span>
                  <span className="font-medium">{NOMBRE_ACCION[b.accion] ?? b.accion}</span>
                  <span className="text-muted-foreground">· {b.actor}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </section>
    </div>
  );
}
