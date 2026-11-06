import { ChevronRight, HelpCircle, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaInstalarApp } from "@/components/app/InstalarApp";
import { EstadoAsistencia } from "@/components/EstadoAsistencia";
import { buttonVariants } from "@/components/ui/button";
import { hora12 } from "@/lib/fechas";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { tableroInicio, type TableroInicio } from "@/lib/server/inicio-tablero";
import { estadoModulo } from "@/lib/server/plan";
import { requireTenantContext, type TenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { KhipuDelDia } from "./KhipuDelDia";
import { AvisosDeHoy, ResumenDireccion } from "./ResumenDireccion";
import { SaludoInicio } from "./SaludoInicio";
import { TarjetaHoy } from "./TarjetaHoy";
import { TituloBloque } from "./TituloBloque";

export const metadata: Metadata = { title: "Inicio" };

// Inicio = tablero de lo que te toca hoy, por rol (specs/18 · Inicio). La navegación vive en el menú lateral.
export default async function InicioPage({ params }: PageProps<"/colegio/[slug]/inicio">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  await requireConsentimiento(ctx);
  const t = await tableroInicio(ctx);
  const tareasPendientes = t.pendientes.filter((p) => !p.informativo).length;
  const nudito = ctx.rol === "alumno" && estadoModulo(ctx, "nudito_plus").estado === "activo";
  const conHorario = ctx.rol === "profesor" || ctx.rol === "alumno" || ctx.rol === "apoderado";

  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-10">
      <SaludoInicio
        nombre={ctx.user.nombres.split(/\s+/)[0]}
        isoFecha={t.hoy.isoFecha}
        hora={t.hoy.hora}
        resumen={resumenDelDia(ctx, t, tareasPendientes)}
        frase={fraseNudito(ctx, t.hoy.hora)}
        acciones={
          <>
            {nudito && <Link href="/nudito" className={buttonVariants({ size: "lg" })}><Sparkles strokeWidth={2} aria-hidden />Practicar con Nudito</Link>}
            {ctx.rol === "porteria" && estadoModulo(ctx, "porteria").estado === "activo" && (
              <Link href="/porteria" className={buttonVariants({ size: "lg" })}><ScanLine strokeWidth={2} aria-hidden />Abrir escáner</Link>
            )}
          </>
        }
        pie={ctx.rol === "direccion" && (
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4" strokeWidth={2} aria-hidden />Plan {ctx.accesoModulos.nombrePlan}</span>
        )}
      />

      <div className={cn("grid gap-10 lg:gap-12", ctx.rol !== "porteria" && "lg:grid-cols-[minmax(0,1fr)_minmax(17rem,21rem)]")}>
        <div className="flex min-w-0 flex-col gap-10">
          {t.llegadas.length > 0 && <LlegadasDeHoy llegadas={t.llegadas} />}
          {t.porteria && <IngresosDeHoy ingresos={t.porteria} />}
          {ctx.rol !== "porteria" && <KhipuDelDia pendientes={t.pendientes} />}
          {t.colegio && <ResumenDireccion colegio={t.colegio} />}
          {t.tareas.length > 0 && <TareasProximas tareas={t.tareas} zona={ctx.tenant.zonaHoraria} />}
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          {conHorario && <TarjetaHoy ctx={ctx} />}
          {t.avisos && <AvisosDeHoy avisos={t.avisos} />}
          {t.reuniones.length > 0 && <ReunionesProximas reuniones={t.reuniones} zona={ctx.tenant.zonaHoraria} />}
          {t.comunicados.length > 0 && <ComunicadosRecientes comunicados={t.comunicados} zona={ctx.tenant.zonaHoraria} />}
          <TarjetaInstalarApp />
        </div>
      </div>
    </div>
  );
}

function resumenDelDia(ctx: TenantContext, t: TableroInicio, pendientes: number): string {
  if (ctx.rol === "porteria") {
    return t.porteria ? `Hoy van ${t.porteria.llegaron} ingresos registrados en la puerta.` : "Aquí verás los ingresos del día.";
  }
  if (!t.hoy.habil && pendientes === 0) return "Hoy no hay clases. Que tengas un buen descanso.";
  if (pendientes === 0) return "Todo al día por ahora: no tienes pendientes en tus módulos.";
  return pendientes === 1 ? "Hoy tienes 1 pendiente; está aquí abajo con su acción." : `Hoy tienes ${pendientes} pendientes; están aquí abajo, cada uno con su acción.`;
}

/** Frases de Nudito: siempre benignas (nunca faltas, errores ni incidencias). */
function fraseNudito(ctx: TenantContext, hora: string): string {
  const saludo = hora < "05:00" ? "¡Hola!" : hora < "12:00" ? "¡Buenos días!" : hora < "19:00" ? "¡Buenas tardes!" : "¡Buenas noches!";
  if (ctx.rol === "alumno") return `${saludo} ¿Practicamos un ratito?`;
  if (ctx.rol === "apoderado") return `${saludo} Qué bueno verte por aquí.`;
  return `${saludo} Un paso a la vez.`;
}

const formatoCorto = (d: Date, zona: string, conHora = true) =>
  new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", ...(conHora ? { hour: "numeric", minute: "2-digit" } : {}), timeZone: zona }).format(d);

function LlegadasDeHoy({ llegadas }: { llegadas: TableroInicio["llegadas"] }) {
  return (
    <section aria-labelledby="titulo-llegadas" data-seccion="dia" className="flex flex-col gap-3">
      <TituloBloque id="titulo-llegadas" accion={<Link href="/asistencia" className="inline-flex min-h-10 items-center gap-0.5 text-cuerpo-sm enlace">Ver asistencia<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>}>Llegada de hoy</TituloBloque>
      <ul className="divide-y divide-borde-sutil border-y border-borde-sutil">
        {llegadas.map((h) => (
          <li key={h.alumnoId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
            <p><span className="font-semibold">{h.nombre}</span> <span className="text-cuerpo-sm text-muted-foreground">· {h.salon}</span></p>
            <p className="flex flex-wrap items-center gap-2">
              {h.estado ? (
                <EstadoAsistencia estado={h.estado} hora={h.estado === "falta" ? undefined : hora12(h.hora!)} />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-pildora bg-superficie-2 px-2.5 py-1 text-etiqueta text-muted-foreground"><HelpCircle className="size-3.5" strokeWidth={2} aria-hidden />Sin registro todavía</span>
              )}
              {h.horaSalida && <span className="text-cuerpo-sm text-muted-foreground">Salió a las {hora12(h.horaSalida)}</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IngresosDeHoy({ ingresos }: { ingresos: NonNullable<TableroInicio["porteria"]> }) {
  const datos = [
    { palabra: "Ingresaron", valor: ingresos.llegaron, detalle: ingresos.tarde ? `${ingresos.tarde} con tardanza` : "Ninguno con tardanza" },
    { palabra: "Salidas registradas", valor: ingresos.salidas, detalle: "Con carnet o a mano" },
    { palabra: "Aún sin ingreso", valor: ingresos.sinIngreso, detalle: `De ${ingresos.total} alumnos` },
  ];
  return (
    <section aria-labelledby="titulo-ingresos" data-seccion="dia" className="flex flex-col gap-3">
      <TituloBloque id="titulo-ingresos">Ingresos de hoy</TituloBloque>
      <dl className="grid divide-y divide-borde-sutil border-y border-borde-sutil sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {datos.map((d) => (
          <div key={d.palabra} className="flex flex-col gap-0.5 py-4 sm:px-5 sm:first:pl-0">
            <dt className="text-cuerpo-sm font-semibold text-sec-tinta">{d.palabra}</dt>
            <dd className="font-heading text-titulo-1 tabular-nums">{d.valor}</dd>
            <dd className="text-cuerpo-sm text-muted-foreground">{d.detalle}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TareasProximas({ tareas, zona }: { tareas: TableroInicio["tareas"]; zona: string }) {
  return (
    <section aria-labelledby="titulo-tareas" data-seccion="academico" className="flex flex-col gap-3">
      <TituloBloque id="titulo-tareas" accion={<Link href="/tareas" className="inline-flex min-h-10 items-center gap-0.5 text-cuerpo-sm enlace">Todas las tareas<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>}>Tareas de esta semana</TituloBloque>
      <ul className="divide-y divide-borde-sutil border-y border-borde-sutil">
        {tareas.map((ta) => (
          <li key={`${ta.id}-${ta.href}`}>
            <Link href={ta.href} className="group/tarea flex min-h-14 items-center gap-4 py-2.5 hover:bg-superficie-2/60">
              <span className="w-24 shrink-0 text-cuerpo-sm font-semibold text-sec-tinta first-letter:uppercase">{ta.limite ? formatoCorto(ta.limite, zona, false) : "Sin fecha"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{ta.titulo}</span>
                <span className="block truncate text-cuerpo-sm text-muted-foreground">{ta.curso}{ta.alumno ? ` · ${ta.alumno}` : ""}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover/tarea:text-foreground" strokeWidth={2} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReunionesProximas({ reuniones, zona }: { reuniones: TableroInicio["reuniones"]; zona: string }) {
  return (
    <section aria-labelledby="titulo-reuniones" data-seccion="comunicacion" className="flex flex-col gap-3">
      <TituloBloque id="titulo-reuniones" accion={<Link href="/reuniones" className="inline-flex min-h-10 items-center gap-0.5 text-cuerpo-sm enlace">Ver todas<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>}>Próximas reuniones</TituloBloque>
      <ul className="flex flex-col gap-1">
        {reuniones.map((r) => (
          <li key={r.id}>
            <Link href={`/reuniones/${r.id}`} className="flex flex-col gap-0.5 rounded-[10px] px-3 py-2 -mx-3 hover:bg-superficie-2/70">
              <span className="text-cuerpo-sm font-semibold text-sec-tinta first-letter:uppercase">{formatoCorto(r.inicio, zona)}</span>
              <span className="font-medium">{r.titulo}</span>
              {(r.porResponder || r.porConfirmar) && (
                <span className="w-fit rounded-pildora bg-sec-suave px-2 py-0.5 text-etiqueta text-sec-tinta">{r.porConfirmar ? "Por confirmar" : "Por responder"}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComunicadosRecientes({ comunicados, zona }: { comunicados: TableroInicio["comunicados"]; zona: string }) {
  return (
    <section aria-labelledby="titulo-comunicados" data-seccion="comunicacion" className="flex flex-col gap-3">
      <TituloBloque id="titulo-comunicados" accion={<Link href="/comunicados" className="inline-flex min-h-10 items-center gap-0.5 text-cuerpo-sm enlace">Ver todos<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>}>Comunicados</TituloBloque>
      <ul className="flex flex-col divide-y divide-borde-sutil">
        {comunicados.map((c) => (
          <li key={c.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0">
            <span className="text-cuerpo-sm text-muted-foreground first-letter:uppercase">{formatoCorto(c.publicadoAt, zona, false)}{c.importante && <span className={cn("ml-2 font-semibold text-sec-tinta")}>Importante</span>}</span>
            <Link href="/comunicados" className="font-medium hover:underline underline-offset-4">{c.titulo}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
