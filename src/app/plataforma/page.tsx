import { AlertTriangle, ChevronRight, Inbox, MailOpen, Plus, School, Search, Send, UserCheck, Users, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPlataforma } from "@/app/plataforma/_componentes/EncabezadoPlataforma";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EstadoTenant, Plan } from "@/generated/prisma/enums";
import { nombresDePlanes } from "@/lib/server/modulos";
import { META_APERTURA, metricasPlataforma, reporteColegios, requireAdminPlataforma, serieDiariaPlataforma } from "@/lib/server/plataforma";
import { GraficoBarras, GraficoDiario } from "./_componentes/Graficos";
import { StatTile, Semaforo } from "./_componentes/StatTile";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { EstadoColegio, NOMBRE_ESTADO, PlanColegio, porcentaje } from "./EstadoColegio";

export const metadata: Metadata = { title: "Vista principal" };

const numero = (n: number) => n.toLocaleString("es-PE");

export default async function VistaPrincipal({ searchParams }: PageProps<"/plataforma">) {
  const admin = await requireAdminPlataforma();
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q : "";
  const [m, serie, todos, nombres] = await Promise.all([metricasPlataforma(admin), serieDiariaPlataforma(admin), reporteColegios(admin), nombresDePlanes()]);
  const colegios = busqueda ? await reporteColegios(admin, { q: busqueda }) : todos;
  const MAX_BARRAS = 8;
  const ordenados = [...todos].sort((a, b) => b.alumnos - a.alumnos);
  const alumnosPorColegio = ordenados.slice(0, MAX_BARRAS).map((c) => ({ nombre: c.nombre, valor: c.alumnos }));
  if (ordenados.length > MAX_BARRAS) {
    alumnosPorColegio.push({ nombre: `Otros (${ordenados.length - MAX_BARRAS})`, valor: ordenados.slice(MAX_BARRAS).reduce((s, c) => s + c.alumnos, 0) });
  }
  const usoCorreo = m.limiteDiario > 0 ? m.correos24h / m.limiteDiario : 0;

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPlataforma
        titulo="Vista principal"
        descripcion="Operación de los colegios y avisos que necesitan seguimiento."
        acciones={
          <Link href="/colegios/nuevo" className={buttonVariants({ variant: "default" })}>
            <Plus strokeWidth={2} aria-hidden /> Nuevo colegio
          </Link>
        }
      />

      <section aria-labelledby="pendientes" className="flex flex-col gap-4">
        <TituloBloque id="pendientes">Requiere atención</TituloBloque>
        <div className="overflow-hidden rounded-xl border bg-card">
          {m.cola.vencidos + m.cola.atascados + m.cola.errores7d + m.rebotes7d + m.quejas7d === 0 ? (
            <p className="flex items-center gap-2 p-4 text-cuerpo-sm text-llego"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden /> Sin incidencias en avisos y correo.</p>
          ) : (
            <ul className="divide-y">
              {(m.cola.vencidos + m.cola.atascados + m.cola.errores7d > 0) && <li><Link href="/monitoreo" className="flex min-h-12 items-center justify-between gap-3 p-4 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><span className="flex items-center gap-2 font-medium"><Inbox className="size-4 shrink-0 text-tarde" strokeWidth={2} aria-hidden /> {m.cola.vencidos} retrasados · {m.cola.atascados} atascados · {m.cola.errores7d} con error</span><ChevronRight className="size-4 shrink-0" aria-hidden /></Link></li>}
              {(m.rebotes7d + m.quejas7d > 0) && <li><Link href="/monitoreo" className="flex min-h-12 items-center justify-between gap-3 p-4 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><span className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 shrink-0 text-tarde" strokeWidth={2} aria-hidden /> {m.rebotes7d} rebotes · {m.quejas7d} quejas de correo</span><ChevronRight className="size-4 shrink-0" aria-hidden /></Link></li>}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-cuerpo-sm">
          <Link href="/suscripciones" className="enlace min-h-11 inline-flex items-center gap-1">Revisar pagos <ChevronRight className="size-4" aria-hidden /></Link>
          <Link href="/mesa-ayuda" className="enlace min-h-11 inline-flex items-center gap-1">Revisar mesa de ayuda <ChevronRight className="size-4" aria-hidden /></Link>
        </div>
      </section>

      <section aria-labelledby="kpis" className="flex flex-col gap-3">
        <TituloBloque id="kpis">Plataforma en cifras</TituloBloque>
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4 [&>*:last-child]:lg:col-span-2">
          <StatTile titulo="Colegios" valor={numero(m.colegios.total)} Icono={School}>
            <span className="block">
              {(Object.keys(m.colegios.porEstado) as EstadoTenant[]).map((e) => `${NOMBRE_ESTADO[e]}: ${m.colegios.porEstado[e]}`).join(" · ")}
            </span>
            <span className="block">
              {(Object.keys(m.colegios.porPlan) as Plan[]).map((p) => `${nombres[p]}: ${m.colegios.porPlan[p]}`).join(" · ")}
            </span>
          </StatTile>
          <StatTile titulo="Alumnos activos" valor={numero(m.alumnos)} Icono={Users} />
          <StatTile titulo="Usuarios activos (7 días)" valor={numero(m.usuariosActivos7d)} Icono={UserCheck}>
            Personas de algún colegio que ingresaron en los últimos 7 días.
          </StatTile>
          <StatTile titulo="Correos (últimas 24 h)" valor={`${numero(m.correos24h)} / ${numero(m.limiteDiario)}`} Icono={Send}>
            <Semaforo bien={usoCorreo < 0.8} texto={`${porcentaje(usoCorreo)} del tope diario`} />
          </StatTile>
          <StatTile titulo="Apertura de la semana" valor={porcentaje(m.apertura7d.tasa)} Icono={MailOpen}>
            {m.apertura7d.tasa === null ? (
              "Aún no hay correos enviados esta semana."
            ) : (
              <Semaforo bien={m.apertura7d.tasa >= META_APERTURA} texto={`meta ${porcentaje(META_APERTURA)} · ${m.apertura7d.abiertos} de ${m.apertura7d.enviados}`} />
            )}
          </StatTile>
          <StatTile titulo="Rebotes y quejas (7 días)" valor={`${m.rebotes7d} · ${m.quejas7d}`} Icono={AlertTriangle}>
            <Semaforo bien={m.rebotes7d + m.quejas7d === 0} texto={`${m.rebotes7d} rebotes, ${m.quejas7d} quejas`} />
          </StatTile>
          <StatTile titulo="Cola de avisos" valor={numero(m.cola.pendientes)} Icono={Inbox}>
            <Semaforo
              bien={m.cola.vencidos + m.cola.atascados + m.cola.errores7d === 0}
              texto={`${m.cola.vencidos} retrasados, ${m.cola.atascados} atascados, ${m.cola.errores7d} con error (7 días)`}
            />
          </StatTile>
        </div>
      </section>

      <section aria-labelledby="ultimos-30" className="flex flex-col gap-3">
        <TituloBloque id="ultimos-30">Últimos 30 días</TituloBloque>
        <div className="grid gap-4 lg:grid-cols-2">
          <GraficoDiario
            titulo="Ingresos diarios"
            descripcion="Personas distintas que iniciaron sesión cada día."
            datos={serie}
            series={[{ clave: "ingresos", etiqueta: "Ingresos", color: "var(--chart-1)" }]}
          />
          <GraficoDiario
            titulo="Correos enviados y abiertos"
            descripcion="Avisos por correo de todos los colegios."
            datos={serie}
            series={[
              { clave: "enviados", etiqueta: "Enviados", color: "var(--chart-1)" },
              { clave: "abiertos", etiqueta: "Abiertos", color: "var(--chart-2)", punteada: true },
            ]}
          />
          {alumnosPorColegio.length > 0 && (
            <div className="lg:col-span-2">
              <GraficoBarras titulo="Alumnos activos por colegio" descripcion="Los colegios con más alumnos." datos={alumnosPorColegio} etiqueta="Alumnos" />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="lista-colegios" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <TituloBloque id="lista-colegios">Colegios</TituloBloque>
          <form role="search" className="flex w-full items-center gap-2 sm:w-auto">
            <label htmlFor="q" className="sr-only">Buscar colegio</label>
            <Input id="q" name="q" defaultValue={busqueda} placeholder="Nombre, dirección o ciudad" className="sm:w-64" />
            <Boton type="submit" variante="secundario">
              <Search strokeWidth={2} aria-hidden /> Buscar
            </Boton>
          </form>
        </div>
        {colegios.length === 0 ? (
          <EstadoVacio
            icono={School}
            titulo={busqueda ? "Ningún colegio coincide con la búsqueda." : "Aún no hay colegios."}
            descripcion={busqueda ? "Prueba con otro nombre o ciudad." : "Crea el primero para empezar a recibir métricas."}
            accion={
              busqueda ? (
                <Link href="/" className={buttonVariants({ variant: "outline" })}>Quitar búsqueda</Link>
              ) : (
                <Link href="/colegios/nuevo" className={buttonVariants()}><Plus strokeWidth={2} aria-hidden /> Nuevo colegio</Link>
              )
            }
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {colegios.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/colegios/${c.id}`}
                  className="group flex min-h-16 flex-wrap items-center justify-between gap-x-5 gap-y-2 p-4 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <div className="min-w-0">
                      <p className="truncate font-heading font-semibold">{c.nombre}</p>
                      <p className="truncate font-mono text-cuerpo-sm text-muted-foreground">{c.slug}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-cuerpo-sm">
                      <EstadoColegio estado={c.estado} />
                      <PlanColegio plan={c.plan} nombre={nombres[c.plan]} />
                      <span className="text-muted-foreground tabular-nums">{numero(c.alumnos)} alumnos</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
                    </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/colegios" className="inline-flex min-h-10 items-center gap-1 self-start text-cuerpo-sm enlace font-semibold">
          Ver el reporte completo <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
