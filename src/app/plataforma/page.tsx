import { AlertTriangle, CheckCircle2, Inbox, MailOpen, Plus, School, Search, Send, Users, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Tarjeta } from "@/components/ui/Tarjeta";
import type { EstadoTenant, Plan } from "@/generated/prisma/enums";
import { NOMBRE_PLAN } from "@/lib/planes";
import { META_APERTURA, metricasPlataforma, reporteColegios, requireAdminPlataforma } from "@/lib/server/plataforma";
import { EstadoColegio, NOMBRE_ESTADO, porcentaje } from "./EstadoColegio";

export const metadata: Metadata = { title: "Vista principal" };

const numero = (n: number) => n.toLocaleString("es-PE");

function Kpi({ titulo, valor, Icono, children }: { titulo: string; valor: string; Icono: typeof Users; children?: ReactNode }) {
  return (
    <Tarjeta className="flex flex-col gap-1 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-pizarra">
        <Icono className="h-4 w-4" strokeWidth={2} aria-hidden /> {titulo}
      </p>
      <p className="font-titulo text-2xl font-bold">{valor}</p>
      {children && <div className="text-xs text-pizarra">{children}</div>}
    </Tarjeta>
  );
}

/** Indicador con ícono + palabra: «Bien» o «Revisar». */
function Semaforo({ bien, texto }: { bien: boolean; texto: string }) {
  const Icono = bien ? CheckCircle2 : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${bien ? "text-llego" : "text-tarde"}`}>
      <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {bien ? "Bien" : "Revisar"} · {texto}
    </span>
  );
}

export default async function VistaPrincipal({ searchParams }: PageProps<"/plataforma">) {
  const admin = await requireAdminPlataforma();
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q : "";
  const [m, colegios] = await Promise.all([metricasPlataforma(admin), reporteColegios(admin, { q: busqueda || undefined })]);
  const usoCorreo = m.limiteDiario > 0 ? m.correos24h / m.limiteDiario : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Vista principal</h1>
          <p className="text-sm text-pizarra">Métricas agregadas de todos los colegios. Sin datos de alumnos, notas ni chats.</p>
        </div>
        <Link href="/colegios/nuevo" className="inline-flex items-center gap-2 rounded-md bg-acento px-4 py-2.5 text-sm font-semibold text-sobre-acento hover:opacity-90">
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Nuevo colegio
        </Link>
      </div>

      <section aria-labelledby="kpis" className="flex flex-col gap-3">
        <h2 id="kpis" className="sr-only">Indicadores</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Colegios" valor={numero(m.colegios.total)} Icono={School}>
            {(Object.keys(m.colegios.porEstado) as EstadoTenant[]).map((e) => `${NOMBRE_ESTADO[e]}: ${m.colegios.porEstado[e]}`).join(" · ")}
            <br />
            {(Object.keys(m.colegios.porPlan) as Plan[]).map((p) => `${NOMBRE_PLAN[p]}: ${m.colegios.porPlan[p]}`).join(" · ")}
          </Kpi>
          <Kpi titulo="Alumnos activos" valor={numero(m.alumnos)} Icono={Users} />
          <Kpi titulo="Usuarios activos (7 días)" valor={numero(m.usuariosActivos7d)} Icono={UserCheck}>
            Personas que iniciaron sesión con éxito.
          </Kpi>
          <Kpi titulo="Correos (últimas 24 h)" valor={`${numero(m.correos24h)} / ${numero(m.limiteDiario)}`} Icono={Send}>
            <Semaforo bien={usoCorreo < 0.8} texto={`${porcentaje(usoCorreo)} del tope diario`} />
          </Kpi>
          <Kpi titulo="Apertura de la semana" valor={porcentaje(m.apertura7d.tasa)} Icono={MailOpen}>
            {m.apertura7d.tasa === null ? (
              "Aún no hay correos enviados esta semana."
            ) : (
              <Semaforo bien={m.apertura7d.tasa >= META_APERTURA} texto={`meta ${porcentaje(META_APERTURA)} · ${m.apertura7d.abiertos} de ${m.apertura7d.enviados}`} />
            )}
          </Kpi>
          <Kpi titulo="Rebotes y quejas (7 días)" valor={`${m.rebotes7d} · ${m.quejas7d}`} Icono={AlertTriangle}>
            <Semaforo bien={m.rebotes7d + m.quejas7d === 0} texto={`${m.rebotes7d} rebotes, ${m.quejas7d} quejas`} />
          </Kpi>
          <Kpi titulo="Cola de avisos" valor={numero(m.cola.pendientes)} Icono={Inbox}>
            <Semaforo
              bien={m.cola.vencidos + m.cola.atascados === 0}
              texto={`${m.cola.vencidos} retrasados, ${m.cola.atascados} atascados, ${m.cola.errores7d} con error (7 días)`}
            />
          </Kpi>
        </div>
      </section>

      <section aria-labelledby="lista-colegios" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="lista-colegios" className="text-lg font-semibold">Colegios</h2>
          <form role="search" className="flex items-center gap-2">
            <label htmlFor="q" className="sr-only">Buscar colegio</label>
            <input
              id="q"
              name="q"
              defaultValue={busqueda}
              placeholder="Nombre, dirección o ciudad"
              className="rounded-md border border-arena bg-superficie px-3 py-2 text-sm"
            />
            <button className="inline-flex items-center gap-1.5 rounded-md border border-arena px-3 py-2 text-sm font-semibold hover:bg-superficie-2">
              <Search className="h-4 w-4" strokeWidth={2} aria-hidden /> Buscar
            </button>
          </form>
        </div>
        {colegios.length === 0 ? (
          <Tarjeta className="text-sm text-pizarra">{busqueda ? "Ningún colegio coincide con la búsqueda." : "Aún no hay colegios."}</Tarjeta>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colegios.map((c) => (
              <li key={c.id}>
                <Link href={`/colegios/${c.id}`} className="block h-full rounded-lg border border-arena bg-superficie p-4 shadow-sm hover:border-acento">
                  <p className="font-titulo font-semibold">{c.nombre}</p>
                  <p className="font-mono text-xs text-pizarra">{c.slug}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <EstadoColegio estado={c.estado} />
                    <span className="text-pizarra">Plan {NOMBRE_PLAN[c.plan]} · {numero(c.alumnos)} alumnos</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/colegios" className="self-start text-sm font-semibold text-acento">Ver el reporte completo</Link>
      </section>
    </div>
  );
}
