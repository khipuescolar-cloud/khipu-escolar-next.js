import { ArrowLeft, CalendarCheck, CalendarX, ChevronRight, ClipboardCheck, FileText, MessageSquarePlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";
import { fechaLarga, hora12 } from "@/lib/fechas";
import { planIncluye } from "@/lib/planes";
import { mensajePlazoVencido, textoPlazoJustificacion } from "@/lib/plazo-justificacion";
import { esVistaFamilia } from "@/lib/roles";
import { MARCADOR_ALUMNO } from "@/lib/vista-previa";
import {
  AMBITO_DIA, ESTADOS, historialDeHijos, hoyDelColegio, obtenerLista, opcionesDeLista, resumenDelDia,
} from "@/lib/server/asistencia";
import { renderizarPlantilla } from "@/lib/server/email/plantillas";
import { obtenerOpcionesCanalesPago } from "@/lib/server/notificaciones/canales-pago";
import { obtenerPreferencias } from "@/lib/server/notificaciones/preferencias";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext, type TenantContext } from "@/lib/server/tenant";
import { armarMesAsistencia } from "@/lib/calendario-asistencia";
import { CalendarioAsistencia, nombreMes } from "./CalendarioAsistencia";
import { ListaAsistencia } from "./ListaAsistencia";
import { SincronizadorListas } from "./SincronizadorListas";
import { PreferenciasAvisos } from "./PreferenciasAvisos";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AsistenciaPage({ params, searchParams }: PageProps<"/colegio/[slug]/asistencia">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion", "apoderado", "alumno"]);
  requireFeature(ctx, "asistencia");

  if (esVistaFamilia(ctx.rol)) return <VistaFamilia ctx={ctx} slug={slug} mes={typeof sp.mes === "string" ? sp.mes : undefined} />;

  const salon = typeof sp.salon === "string" ? sp.salon : null;
  const ambito = typeof sp.ambito === "string" ? sp.ambito : null;
  if (salon && ambito) return <PasarLista ctx={ctx} slug={slug} salonId={salon} ambito={ambito} />;
  return <ElegirLista ctx={ctx} />;
}

async function ElegirLista({ ctx }: { ctx: TenantContext }) {
  const opciones = await opcionesDeLista(ctx);
  const hoy = hoyDelColegio(ctx);
  const resumen = ctx.rol === "direccion" ? await resumenDelDia(ctx) : null;
  const porSalon = new Map<string, typeof opciones>();
  for (const o of opciones) porSalon.set(o.salonNombre, [...(porSalon.get(o.salonNombre) ?? []), o]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Pasar lista" descripcion={<span className="first-letter:uppercase">{fechaLarga(hoy.isoFecha)}</span>} />
      <div className="-mt-2"><SincronizadorListas /></div>

      {resumen && (
        <Card className="-mt-2">
          <CardContent className="flex flex-col gap-3">
            <h2 className="font-heading font-semibold">Asistencia del día en el colegio</h2>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {ESTADOS.map((e) => (
                <li key={e} className="flex items-center gap-1.5 text-sm">
                  <EstadoAsistencia estado={e} /> <strong>{resumen.conteo[e]}</strong>
                </li>
              ))}
              <li className="text-sm text-muted-foreground">Sin registro: <strong className="text-foreground">{resumen.sinRegistro}</strong> de {resumen.totalAlumnos}</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {opciones.length === 0 ? (
        <EstadoVacio icono={Users} titulo="Aún no tienes salones ni cursos asignados" descripcion="Cuando dirección te asigne un salón, podrás pasar lista desde aquí." />
      ) : (
        [...porSalon.entries()].map(([nombre, lista]) => (
          <section key={nombre} className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">{nombre}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((o) => (
                <li key={o.ambito}>
                  <Link
                    href={`/asistencia?salon=${o.salonId}&ambito=${o.ambito}`}
                    className="group/lista flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-card p-4 font-semibold shadow-xs transition-colors outline-none hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CalendarCheck className="size-5" strokeWidth={2} aria-hidden />
                      </span>
                      {o.ambito === AMBITO_DIA ? `Asistencia del día · ${nombre}` : `${o.titulo} · ${nombre}`}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/lista:translate-x-0.5" strokeWidth={2} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

async function PasarLista({ ctx, slug, salonId, ambito }: { ctx: TenantContext; slug: string; salonId: string; ambito: string }) {
  const lista = await obtenerLista(ctx, salonId, ambito);
  const momento = lista.curso ? `a ${lista.curso.nombre}` : "a la 1.ª hora";
  const previas = Object.fromEntries(
    ESTADOS.map((estado) => {
      const comun = { colegio: ctx.tenant.nombre, alumno: MARCADOR_ALUMNO, hora: lista.hoy.hora };
      const payload =
        estado === "falta"
          ? { colegio: ctx.tenant.nombre, alumno: MARCADOR_ALUMNO, momento, urlJustificar: "#justificar" }
          : estado === "problema"
            ? { ...comun, urlMensajes: "#mensajes" }
            : comun;
      const { asunto, html } = renderizarPlantilla(`asistencia_${estado}`, { ...payload, urlPreferencias: "#avisos" });
      return [estado, { asunto, html }];
    }),
  ) as Record<Estado, { asunto: string; html: string }>;

  return (
    <div className="flex flex-col gap-2">
      <Link href="/asistencia" className="mb-2 inline-flex min-h-10 w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Elegir otra lista
      </Link>
      <EncabezadoPagina
        titulo={`${lista.curso ? lista.curso.nombre : "Asistencia del día"} · ${lista.salon.nombre}`}
        descripcion={<span className="first-letter:uppercase">{fechaLarga(lista.hoy.isoFecha)}</span>}
      />
      <div className="mb-2"><SincronizadorListas /></div>
      {lista.alumnos.length === 0 ? (
        <EstadoVacio icono={Users} titulo="Este salón no tiene alumnos activos" descripcion="Pide a dirección que agregue alumnos al salón." />
      ) : (
        <ListaAsistencia
          slug={slug}
          salonId={lista.salon.id}
          ambito={lista.ambito}
          alumnos={lista.alumnos}
          horaActual={lista.hoy.hora}
          previas={previas}
        />
      )}
    </div>
  );
}

const PALABRA_JUSTIFICACION = { pendiente: "Justificación en revisión", aceptada: "Falta justificada", rechazada: "Justificación no aceptada" } as const;

async function VistaFamilia({ ctx, slug, mes }: { ctx: TenantContext; slug: string; mes?: string }) {
  // El alumno con cuenta propia ve solo su asistencia: sin chat, sin justificar y sin preferencias de avisos (son de la familia).
  const esAlumno = ctx.rol === "alumno";
  const [historial, preferencias, canalesPago] = await Promise.all([
    historialDeHijos(ctx, mes),
    esAlumno ? null : obtenerPreferencias(ctx),
    esAlumno ? null : obtenerOpcionesCanalesPago(ctx),
  ]);
  const { hijos, anio, mes: numeroMes, hoy } = historial;
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Asistencia" descripcion={esAlumno ? "Tu calendario del mes, con el detalle de cada día." : "Calendario del mes de cada hijo, con el detalle de cada día."} />

      {hijos.length === 0 && (
        <EstadoVacio
          icono={Users}
          titulo={esAlumno ? "Tu cuenta aún no está vinculada a tu ficha" : "Aún no hay alumnos vinculados a tu cuenta"}
          descripcion={esAlumno ? "Avisa a la dirección del colegio para que la revise." : "Cuando el colegio vincule a tus hijos, verás aquí su asistencia."}
        />
      )}

      {hijos.map((h) => (
        <section key={h.id} className="flex flex-col gap-3" aria-labelledby={`hijo-${h.id}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`hijo-${h.id}`} className="text-xl font-semibold">
              {h.nombres} {h.apellidos} <span className="font-sans text-sm font-normal text-muted-foreground">· {h.salon}</span>
            </h2>
            {!esAlumno && planIncluye(ctx.tenant.plan, "mensajes") && (
              <Link href={`/mensajes/nuevo?alumno=${h.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                <MessageSquarePlus strokeWidth={2} aria-hidden /> Escribir a la tutora
              </Link>
            )}
          </div>
          <CalendarioAsistencia
            hijoId={h.id}
            nombre={h.nombres}
            hoy={hoy}
            mes={armarMesAsistencia(anio, numeroMes, h.registros.map((r) => ({ fecha: r.fecha, estado: r.estado, esDia: r.esDia })), hoy)}
          />
          {h.registros.length === 0 ? (
            <EstadoVacio icono={ClipboardCheck} titulo={`No hay registros en ${nombreMes(anio, numeroMes)}`} descripcion={esAlumno ? "Cuando tengas asistencia registrada, aparecerá aquí." : "Cuando tu hijo tenga asistencia registrada, aparecerá aquí."} />
          ) : (
            <Card className="py-0">
              <ul className="divide-y">
                {h.registros.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                    <div>
                      <p className="font-medium first-letter:uppercase">{fechaLarga(r.fecha)}</p>
                      <p className="text-sm text-muted-foreground">{r.lugar}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <EstadoAsistencia estado={r.estado} hora={r.estado === "falta" ? undefined : hora12(r.hora)} />
                      {r.justificacion && r.justificacion !== "rechazada" && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="size-3.5" strokeWidth={2} aria-hidden />
                          {PALABRA_JUSTIFICACION[r.justificacion]}
                        </span>
                      )}
                      {r.puedeJustificar && (
                        <span className="flex flex-col items-end gap-0.5">
                          <Link href={`/asistencia/justificar/${r.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                            <FileText aria-hidden strokeWidth={2} /> Justificar falta
                          </Link>
                          <span className="text-xs text-muted-foreground">{textoPlazoJustificacion(r.fecha, ctx.tenant.plazoJustificacionDiasHabiles)}</span>
                        </span>
                      )}
                      {!esAlumno && r.plazoVencido && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={mensajePlazoVencido(ctx.tenant.plazoJustificacionDiasHabiles)}>
                          <CalendarX className="size-3.5" strokeWidth={2} aria-hidden /> Plazo vencido
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      ))}

      {preferencias && canalesPago && (
        <PreferenciasAvisos slug={slug} correo={preferencias.correo} push={preferencias.push} vapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} canalesPago={canalesPago} />
      )}
    </div>
  );
}
