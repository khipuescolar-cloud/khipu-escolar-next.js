import { ArrowLeft, CalendarCheck, ChevronRight, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { Tarjeta } from "@/components/ui/Tarjeta";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";
import { fechaLarga, hora12 } from "@/lib/fechas";
import { MARCADOR_ALUMNO } from "@/lib/vista-previa";
import {
  AMBITO_DIA, ESTADOS, historialDeHijos, hoyDelColegio, obtenerLista, opcionesDeLista, resumenDelDia,
} from "@/lib/server/asistencia";
import { renderizarPlantilla } from "@/lib/server/email/plantillas";
import { obtenerPreferencias } from "@/lib/server/notificaciones/preferencias";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext, type TenantContext } from "@/lib/server/tenant";
import { ListaAsistencia } from "./ListaAsistencia";
import { PreferenciasAvisos } from "./PreferenciasAvisos";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AsistenciaPage({ params, searchParams }: PageProps<"/colegio/[slug]/asistencia">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion", "apoderado"]);
  requireFeature(ctx, "asistencia");

  if (ctx.rol === "apoderado") return <VistaFamilia ctx={ctx} slug={slug} />;

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
      <div>
        <h1 className="text-2xl font-bold">Pasar lista</h1>
        <p className="text-sm text-pizarra first-letter:uppercase">{fechaLarga(hoy.isoFecha)}</p>
      </div>

      {resumen && (
        <Tarjeta>
          <h2 className="mb-3 font-titulo font-semibold">Asistencia del día en el colegio</h2>
          <ul className="flex flex-wrap gap-3">
            {ESTADOS.map((e) => (
              <li key={e} className="flex items-center gap-1.5 text-sm">
                <EstadoAsistencia estado={e} /> <strong>{resumen.conteo[e]}</strong>
              </li>
            ))}
            <li className="text-sm text-pizarra">Sin registro: <strong>{resumen.sinRegistro}</strong> de {resumen.totalAlumnos}</li>
          </ul>
        </Tarjeta>
      )}

      {opciones.length === 0 ? (
        <p className="text-pizarra">Todavía no tienes salones ni cursos asignados.</p>
      ) : (
        [...porSalon.entries()].map(([nombre, lista]) => (
          <section key={nombre} className="flex flex-col gap-2">
            <h2 className="font-titulo text-lg font-semibold">{nombre}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((o) => (
                <li key={o.ambito}>
                  <Link
                    href={`/asistencia?salon=${o.salonId}&ambito=${o.ambito}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-arena bg-superficie p-4 font-semibold transition hover:border-acento"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-acento" strokeWidth={2} aria-hidden />
                      {o.ambito === AMBITO_DIA ? `Asistencia del día · ${nombre}` : `${o.titulo} · ${nombre}`}
                    </span>
                    <ChevronRight className="h-4 w-4 text-pizarra" strokeWidth={2} aria-hidden />
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
    <div className="flex flex-col gap-4">
      <Link href="/asistencia" className="inline-flex items-center gap-1 text-sm font-semibold text-acento">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden /> Elegir otra lista
      </Link>
      <div>
        <h1 className="text-2xl font-bold">
          {lista.curso ? lista.curso.nombre : "Asistencia del día"} · {lista.salon.nombre}
        </h1>
        <p className="text-sm text-pizarra first-letter:uppercase">{fechaLarga(lista.hoy.isoFecha)}</p>
      </div>
      {lista.alumnos.length === 0 ? (
        <p className="text-pizarra">Este salón no tiene alumnos activos.</p>
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

async function VistaFamilia({ ctx, slug }: { ctx: TenantContext; slug: string }) {
  const [hijos, preferencias] = await Promise.all([historialDeHijos(ctx), obtenerPreferencias(ctx)]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Asistencia</h1>
        <p className="text-sm text-pizarra">Últimos 30 días.</p>
      </div>

      {hijos.length === 0 && <p className="text-pizarra">Aún no hay alumnos vinculados a tu cuenta.</p>}

      {hijos.map((h) => (
        <section key={h.id} className="flex flex-col gap-3" aria-labelledby={`hijo-${h.id}`}>
          <h2 id={`hijo-${h.id}`} className="font-titulo text-lg font-semibold">
            {h.nombres} {h.apellidos} <span className="text-sm font-normal text-pizarra">· {h.salon}</span>
          </h2>
          {h.registros.length === 0 ? (
            <p className="text-sm text-pizarra">No hay registros en los últimos 30 días.</p>
          ) : (
            <ul className="divide-y divide-arena rounded-lg border border-arena bg-superficie">
              {h.registros.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium first-letter:uppercase">{fechaLarga(r.fecha)}</p>
                    <p className="text-sm text-pizarra">{r.lugar}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <EstadoAsistencia estado={r.estado} hora={r.estado === "falta" ? undefined : hora12(r.hora)} />
                    {r.justificacion && r.justificacion !== "rechazada" && (
                      <span className="inline-flex items-center gap-1 text-xs text-pizarra">
                        <FileText className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        {PALABRA_JUSTIFICACION[r.justificacion]}
                      </span>
                    )}
                    {r.puedeJustificar && (
                      <Link
                        href={`/asistencia/justificar/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-arena px-3 py-1.5 text-sm font-semibold text-acento hover:bg-superficie-2"
                      >
                        <FileText className="h-4 w-4" strokeWidth={2} aria-hidden /> Justificar falta
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <PreferenciasAvisos slug={slug} correo={preferencias.correo} push={preferencias.push} vapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </div>
  );
}
