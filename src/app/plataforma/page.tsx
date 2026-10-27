import { AlertTriangle, ChevronRight, Inbox, MailOpen, Plus, School, Search, Send, UserCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tarjeta } from "@/components/ui/Tarjeta";
import type { EstadoTenant, Plan } from "@/generated/prisma/enums";
import { NOMBRE_PLAN } from "@/lib/planes";
import { META_APERTURA, metricasPlataforma, reporteColegios, requireAdminPlataforma } from "@/lib/server/plataforma";
import { cn } from "@/lib/utils";
import { StatTile, Semaforo } from "./_componentes/StatTile";
import { EstadoColegio, NOMBRE_ESTADO, PlanColegio, porcentaje } from "./EstadoColegio";

export const metadata: Metadata = { title: "Vista principal" };

const numero = (n: number) => n.toLocaleString("es-PE");

export default async function VistaPrincipal({ searchParams }: PageProps<"/plataforma">) {
  const admin = await requireAdminPlataforma();
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q : "";
  const [m, colegios] = await Promise.all([metricasPlataforma(admin), reporteColegios(admin, { q: busqueda || undefined })]);
  const usoCorreo = m.limiteDiario > 0 ? m.correos24h / m.limiteDiario : 0;

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Vista principal"
        descripcion="Métricas agregadas de todos los colegios. Sin datos de alumnos, notas ni chats."
        acciones={
          <Link href="/colegios/nuevo" className={buttonVariants({ variant: "default" })}>
            <Plus strokeWidth={2} aria-hidden /> Nuevo colegio
          </Link>
        }
      />

      <section aria-labelledby="kpis" className="-mt-2 flex flex-col gap-3">
        <h2 id="kpis" className="sr-only">Indicadores</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile titulo="Colegios" valor={numero(m.colegios.total)} Icono={School}>
            <span className="block">
              {(Object.keys(m.colegios.porEstado) as EstadoTenant[]).map((e) => `${NOMBRE_ESTADO[e]}: ${m.colegios.porEstado[e]}`).join(" · ")}
            </span>
            <span className="block">
              {(Object.keys(m.colegios.porPlan) as Plan[]).map((p) => `${NOMBRE_PLAN[p]}: ${m.colegios.porPlan[p]}`).join(" · ")}
            </span>
          </StatTile>
          <StatTile titulo="Alumnos activos" valor={numero(m.alumnos)} Icono={Users} />
          <StatTile titulo="Usuarios activos (7 días)" valor={numero(m.usuariosActivos7d)} Icono={UserCheck}>
            Personas que iniciaron sesión con éxito.
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
              bien={m.cola.vencidos + m.cola.atascados === 0}
              texto={`${m.cola.vencidos} retrasados, ${m.cola.atascados} atascados, ${m.cola.errores7d} con error (7 días)`}
            />
          </StatTile>
        </div>
      </section>

      <section aria-labelledby="lista-colegios" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="lista-colegios" className="text-xl font-semibold">Colegios</h2>
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
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {colegios.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/colegios/${c.id}`}
                  className={cn("group block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}
                >
                  <Tarjeta className="flex h-full flex-col gap-3 transition-colors group-hover:border-primary/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-heading font-semibold">{c.nombre}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{c.slug}</p>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-2 text-sm">
                      <EstadoColegio estado={c.estado} />
                      <PlanColegio plan={c.plan} />
                      <span className="text-muted-foreground">{numero(c.alumnos)} alumnos</span>
                    </div>
                  </Tarjeta>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/colegios" className="inline-flex min-h-10 items-center gap-1 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Ver el reporte completo <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
