import { ArrowLeft, BarChart3, CalendarCheck, CalendarX, ChevronRight, ClipboardCheck, DoorOpen, FileText, LogOut, MessageSquarePlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { InsigniaAhora } from "@/components/horario/Insignias";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { ListaDividida } from "@/components/ui/Superficies";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { cn } from "@/lib/utils";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";
import { fechaLarga, hora12 } from "@/lib/fechas";
import { rango } from "@/lib/horario";
import { mensajePlazoVencido, textoPlazoJustificacion, textoUltimoDiaJustificacion } from "@/lib/plazo-justificacion";
import { esVistaFamilia } from "@/lib/roles";
import { HORA_MARCADOR_INGRESO, MARCADOR_ALUMNO } from "@/lib/vista-previa";
import {
  AMBITO_DIA, ESTADOS, historialDeHijos, hoyDelColegio, obtenerLista, opcionesDeLista,
} from "@/lib/server/asistencia";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { cursosDeHoy } from "@/lib/server/horario";
import { renderizarPlantilla } from "@/lib/server/email/plantillas";
import { obtenerPreferencias } from "@/lib/server/notificaciones/preferencias";
import { requireFeature, tieneFeature } from "@/lib/server/plan";
import { requireTenantContext, type TenantContext } from "@/lib/server/tenant";
import { armarMesAsistencia } from "@/lib/calendario-asistencia";
import { CalendarioAsistencia, nombreMes } from "./CalendarioAsistencia";
import { ListaAsistencia } from "./ListaAsistencia";
import { SincronizadorListas } from "./SincronizadorListas";
import { PreferenciasAvisos } from "./PreferenciasAvisos";
import { AsistenciaAlumno } from "./_alumno/AsistenciaAlumno";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AsistenciaPage({ params, searchParams }: PageProps<"/colegio/[slug]/asistencia">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion", "apoderado", "alumno"]);
  requireFeature(ctx, "asistencia");

  if (esVistaFamilia(ctx.rol)) {
    const parametro = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
    if (ctx.rol === "alumno") return <VistaAlumno ctx={ctx} mes={parametro("mes") ?? undefined} parametro={parametro} />;
    return <VistaFamilia ctx={ctx} slug={slug} mes={parametro("mes") ?? undefined} />;
  }

  const salon = typeof sp.salon === "string" ? sp.salon : null;
  const ambito = typeof sp.ambito === "string" ? sp.ambito : null;
  const fecha = typeof sp.fecha === "string" ? sp.fecha : undefined;
  if (salon && ambito) return <PasarLista ctx={ctx} slug={slug} salonId={salon} ambito={ambito} fecha={fecha} />;
  // Dirección no pasa lista (specs/04): ve la asistencia en los reportes y desde ahí abre una lista para corregirla.
  if (ctx.rol === "direccion") redirect("/asistencia/reportes");
  return <ElegirLista ctx={ctx} />;
}

async function ElegirLista({ ctx }: { ctx: TenantContext }) {
  const [opciones, horario] = await Promise.all([opcionesDeLista(ctx), cursosDeHoy(ctx)]);
  const hoy = hoyDelColegio(ctx);
  // Con horario (specs/34): las listas de curso de hoy van primero y en orden de hora; la que está en clase lleva «Ahora».
  const enHorario = (o: (typeof opciones)[number]) => (o.ambito === AMBITO_DIA ? undefined : horario.get(o.ambito));
  const clave = (o: (typeof opciones)[number]) => (o.ambito === AMBITO_DIA ? "" : enHorario(o)?.horaInicio ?? "99:99");
  const porSalon = new Map<string, typeof opciones>();
  for (const o of opciones) porSalon.set(o.salonNombre, [...(porSalon.get(o.salonNombre) ?? []), o]);
  for (const lista of porSalon.values()) lista.sort((a, b) => clave(a).localeCompare(clave(b)));
  const primeraClase = (lista: typeof opciones) => lista.map((o) => enHorario(o)?.horaInicio ?? "99:99").sort()[0] ?? "99:99";
  const grupos = [...porSalon.entries()].sort(([, a], [, b]) => primeraClase(a).localeCompare(primeraClase(b)));

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Pasar lista"
        seccion="dia"
        descripcion={<span className="first-letter:uppercase">{fechaLarga(hoy.isoFecha)}</span>}
        acciones={<Link href="/asistencia/reportes" className={buttonVariants({ variant: "outline" })}><BarChart3 className="size-4" strokeWidth={2} aria-hidden /> Reportes</Link>}
      />
      <div className="-mt-2"><SincronizadorListas /></div>

      {opciones.length === 0 ? (
        <EstadoVacio icono={Users} titulo="Aún no tienes salones ni cursos asignados" descripcion="Cuando dirección te asigne un salón, podrás pasar lista desde aquí." />
      ) : (
        grupos.map(([nombre, lista]) => (
          <section key={nombre} data-seccion="dia" className="flex flex-col gap-2">
            <TituloBloque id={`salon-${nombre}`}>{nombre}</TituloBloque>
            <ul className="grid divide-y divide-borde-sutil border-y border-borde-sutil lg:grid-cols-2 lg:gap-x-10">
              {lista.map((o) => o.ambito === AMBITO_DIA ? (
                // Ingreso al colegio (respaldo de portería): otro color y una línea que lo explica, para no confundirlo con un curso.
                <li key={o.ambito} className="py-2 lg:[&:nth-child(2)]:border-t-0">
                  <Link
                    href={`/asistencia?salon=${o.salonId}&ambito=${o.ambito}`}
                    className="group/lista flex min-h-16 items-center justify-between gap-3 rounded-md border border-info/25 bg-info-fondo px-3 py-3 font-semibold text-info outline-none hover:border-info/50 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex items-center gap-3">
                      <DoorOpen className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="flex flex-col gap-0.5">
                        {`Asistencia del día · ${nombre}`}
                        <span className="text-cuerpo-sm font-normal">Ingreso al colegio · respaldo si portería no lo registró</span>
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 transition-transform duration-150 group-hover/lista:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
                  </Link>
                </li>
              ) : (
                <li key={o.ambito} className="lg:[&:nth-child(2)]:border-t-0">
                  <Link
                    href={`/asistencia?salon=${o.salonId}&ambito=${o.ambito}`}
                    className="group/lista flex min-h-16 items-center justify-between gap-3 rounded-md py-3 font-semibold outline-none hover:text-sec-tinta focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex items-center gap-3">
                      <CalendarCheck className="size-5 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
                      <span className="flex flex-col gap-0.5">
                        {enHorario(o)?.ahora && <InsigniaAhora />}
                        {`${o.titulo} · ${nombre}`}
                        {enHorario(o) && <span className="text-cuerpo-sm font-normal text-muted-foreground tabular-nums">Hoy {rango(enHorario(o)!)}</span>}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/lista:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
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

async function PasarLista({ ctx, slug, salonId, ambito, fecha }: { ctx: TenantContext; slug: string; salonId: string; ambito: string; fecha?: string }) {
  const corregir = ctx.rol === "direccion";
  const volver = corregir
    ? { href: "/asistencia/reportes", texto: "Volver a los reportes" }
    : { href: "/asistencia", texto: "Elegir otra lista" };
  let lista: Awaited<ReturnType<typeof obtenerLista>>;
  try {
    lista = await obtenerLista(ctx, salonId, ambito, fecha);
  } catch (error) {
    // Asistencia por curso apagada para el nivel, fecha futura o no válida: mensaje claro en vez de una página de error.
    if (!(error instanceof ErrorDeNegocio)) throw error;
    return (
      <div className="flex flex-col gap-4">
        <Link href={volver.href} className="inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace">
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> {volver.texto}
        </Link>
        <EstadoVacio icono={CalendarX} titulo="No se puede abrir esta lista" descripcion={error.message} />
      </div>
    );
  }
  const esCurso = !!lista.curso;
  const momento = lista.curso ? `a ${lista.curso.nombre}` : "a la 1.ª hora";
  // Vista previa por estado. Corregir un día pasado no avisa; en un curso no se avisa la llegada (specs/04).
  const previas = Object.fromEntries(
    ESTADOS.map((estado) => {
      if (!lista.esHoy || (esCurso && estado === "llego")) return [estado, null];
      const comun = { colegio: ctx.tenant.nombre, alumno: MARCADOR_ALUMNO, hora: lista.hoy.hora };
      const payload =
        estado === "falta"
          ? {
              colegio: ctx.tenant.nombre, alumno: MARCADOR_ALUMNO, momento, urlJustificar: "#justificar",
              ...(lista.curso ? { curso: lista.curso.nombre, ingreso: HORA_MARCADOR_INGRESO, horaClase: lista.hoy.hora } : {}),
            }
          : estado === "problema"
            ? { ...comun, urlMensajes: "#mensajes" }
            : estado === "tarde" && lista.curso
              ? { ...comun, curso: lista.curso.nombre }
              : comun;
      const { asunto, html } = renderizarPlantilla(`asistencia_${estado}`, { ...payload, urlPreferencias: "#avisos" });
      return [estado, { asunto, html }];
    }),
  ) as Record<Estado, { asunto: string; html: string } | null>;
  const nombreLista = `${lista.curso ? lista.curso.nombre : "Asistencia del día"} · ${lista.salon.nombre}`;

  return (
    <div className="flex flex-col gap-2">
      <Link href={volver.href} className="mb-2 inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> {volver.texto}
      </Link>
      <EncabezadoPagina
        titulo={corregir ? `Corregir · ${nombreLista}` : nombreLista}
        seccion="dia"
        descripcion={<span className="first-letter:uppercase">{fechaLarga(lista.hoy.isoFecha)}</span>}
      />
      {!corregir && <div className="mb-2"><SincronizadorListas /></div>}
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
          esCurso={esCurso}
          exigeIngreso={esCurso && !corregir && ctx.tenant.controlIngresoAutomatico}
          corregir={corregir ? { fecha: lista.hoy.isoFecha, avisa: lista.esHoy } : null}
        />
      )}
    </div>
  );
}

const PALABRA_JUSTIFICACION = { pendiente: "Justificación en revisión", aceptada: "Falta justificada", rechazada: "Justificación no aceptada" } as const;

/**
 * «Mi asistencia» del alumno (specs/27): Resumen del periodo (khipu de días, lo que conviene revisar, cursos con menos
 * asistencia), Llegadas (calendario del mes con la lista de ingresos al colegio) y Cursos (cada uno abre su historial).
 * Sin chat, sin justificar y sin preferencias de avisos: son de la familia.
 */
async function VistaAlumno({ ctx, mes, parametro }: { ctx: TenantContext; mes?: string; parametro: (clave: string) => string | null }) {
  const enLlegadas = parametro("tab") === "llegadas";
  const historial = enLlegadas ? await historialDeHijos(ctx, mes) : null;
  const yo = historial?.hijos[0];
  const llegadas = historial && yo && (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <CalendarioAsistencia
        hijoId={yo.id}
        nombre={yo.nombres}
        hoy={historial.hoy}
        compacto
        hrefMes={(clave) => `/asistencia?tab=llegadas&mes=${clave}`}
        mes={armarMesAsistencia(historial.anio, historial.mes, yo.registros.filter((r) => r.esDia).map((r) => ({ fecha: r.fecha, estado: r.estado, esDia: r.esDia })), historial.hoy)}
      />
      <section aria-labelledby="titulo-llegadas" className="flex flex-col gap-3">
        <TituloBloque id="titulo-llegadas">Tus llegadas de {nombreMes(historial.anio, historial.mes).split(" ")[0]}</TituloBloque>
        {yo.registros.filter((r) => r.esDia).length === 0 ? (
          <EstadoVacio icono={ClipboardCheck} titulo={`No hay llegadas registradas en ${nombreMes(historial.anio, historial.mes)}`} descripcion="Cuando pases por portería o el tutor pase la lista del día, aparecerá aquí." />
        ) : (
          <ListaDividida>
            {yo.registros.filter((r) => r.esDia).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                <span className="font-medium first-letter:uppercase">{fechaLarga(r.fecha)}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <EstadoAsistencia estado={r.estado} hora={r.estado === "falta" ? undefined : hora12(r.hora)} />
                  {r.horaSalida && (
                    <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground">
                      <LogOut className="size-3.5" strokeWidth={2} aria-hidden /> Salió {hora12(r.horaSalida)}
                    </span>
                  )}
                  {r.conPermiso && (
                    <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground">
                      <CalendarCheck className="size-3.5" strokeWidth={2} aria-hidden /> Con permiso
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ListaDividida>
        )}
      </section>
    </div>
  );
  return (
    <div className="flex flex-col gap-6" data-seccion="dia">
      <EncabezadoPagina titulo="Mi asistencia" seccion="dia" descripcion="Cómo vas en el colegio y en cada curso, día por día." />
      <AsistenciaAlumno ctx={ctx} modo="alumno" parametro={parametro} llegadas={llegadas} />
    </div>
  );
}

async function VistaFamilia({ ctx, slug, mes }: { ctx: TenantContext; slug: string; mes?: string }) {
  const [historial, preferencias] = await Promise.all([historialDeHijos(ctx, mes), obtenerPreferencias(ctx)]);
  const { anio, mes: numeroMes, hoy, hijos } = historial;
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Asistencia" seccion="dia" descripcion="Calendario del mes de cada hijo, con el detalle de cada día." />

      {hijos.length === 0 && (
        <EstadoVacio
          icono={Users}
          titulo="Aún no hay alumnos vinculados a tu cuenta"
          descripcion="Cuando el colegio vincule a tus hijos, verás aquí su asistencia."
        />
      )}

      {hijos.map((h) => (
        <section key={h.id} data-seccion="dia" className="flex flex-col gap-4" aria-labelledby={`hijo-${h.id}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TituloBloque id={`hijo-${h.id}`}>
              {h.nombres} {h.apellidos} <span className="font-sans text-cuerpo-sm font-normal text-muted-foreground">· {h.salon}</span>
            </TituloBloque>
            {tieneFeature(ctx, "mensajes") && (
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
            <EstadoVacio icono={ClipboardCheck} titulo={`No hay registros en ${nombreMes(anio, numeroMes)}`} descripcion="Cuando tu hijo tenga asistencia registrada, aparecerá aquí." />
          ) : (
            <div>
              <ul className="divide-y divide-borde-sutil border-y border-borde-sutil">
                {h.registros.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
                    <div>
                      <p className="font-medium first-letter:uppercase">{fechaLarga(r.fecha)}</p>
                      <p className="text-sm text-muted-foreground">{r.lugar}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <EstadoAsistencia estado={r.estado} hora={r.estado === "falta" ? undefined : hora12(r.hora)} />
                      {r.horaSalida && (
                        <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground">
                          <LogOut className="size-3.5" strokeWidth={2} aria-hidden /> Salió {hora12(r.horaSalida)}
                        </span>
                      )}
                      {r.conPermiso && (
                        <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground">
                          <CalendarCheck className="size-3.5" strokeWidth={2} aria-hidden /> Con permiso del colegio
                        </span>
                      )}
                      {r.justificacion && r.justificacion !== "rechazada" && (
                        <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground">
                          <FileText className="size-3.5" strokeWidth={2} aria-hidden />
                          {PALABRA_JUSTIFICACION[r.justificacion]}
                        </span>
                      )}
                      {r.puedeJustificar && (
                        <span className="flex flex-col items-end gap-0.5">
                          <Link href={`/asistencia/justificar/${r.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                            <FileText aria-hidden strokeWidth={2} /> Justificar falta
                          </Link>
                          <span className="text-cuerpo-sm text-muted-foreground">{r.justificarHasta ? textoUltimoDiaJustificacion(r.justificarHasta) : textoPlazoJustificacion(r.fecha, ctx.tenant.plazoJustificacionDias)}</span>
                        </span>
                      )}
                      {r.plazoVencido && (
                        <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground" title={mensajePlazoVencido(ctx.tenant.plazoJustificacionDias)}>
                          <CalendarX className="size-3.5" strokeWidth={2} aria-hidden /> Plazo vencido
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      {preferencias && (
        <PreferenciasAvisos slug={slug} correo={preferencias.correo} push={preferencias.push} pushAcademico={preferencias.pushAcademico} vapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      )}
    </div>
  );
}
