import { AlertTriangle, CheckCircle2, CircleHelp, Clock, Inbox, LifeBuoy, Play, RotateCw, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { panelMonitoreo, type EstadoCron } from "@/lib/server/plataforma-monitoreo";
import { GraficoDiario } from "../_componentes/Graficos";
import { fechaHora } from "../EstadoColegio";
import { procesarColaAction, reintentarAvisosAction } from "./actions";

export const metadata: Metadata = { title: "Monitoreo" };
export const dynamic = "force-dynamic";

const NOMBRE_CANAL = { correo: "Correo", push: "Notificaciones push", whatsapp: "WhatsApp", sms: "SMS" } as const;
const NOMBRE_CRON = { avisos: "Proceso de avisos", exportaciones: "Proceso de exportaciones" } as const;
const NOMBRE_TIPO: Record<string, string> = {
  asistencia: "Asistencia", resumen_llegadas: "Resumen de llegadas", mensaje: "Mensaje", comunicado: "Comunicado", invitacion: "Invitación",
  justificacion: "Justificación", tarea: "Tarea", alerta_direccion: "Alerta a dirección", libreta: "Libreta",
};
const numero = (n: number) => n.toLocaleString("es-PE");

const ESTADO_CRON: Record<EstadoCron, { Icono: typeof Clock; palabra: string; clase: string }> = {
  al_dia: { Icono: CheckCircle2, palabra: "Al día", clase: "bg-llego-fondo text-llego" },
  atrasado: { Icono: AlertTriangle, palabra: "Atrasado", clase: "bg-falta-fondo text-falta" },
  nunca: { Icono: CircleHelp, palabra: "Nunca corrió", clase: "bg-tarde-fondo text-tarde" },
};

function hace(min: number): string {
  if (min < 1) return "Hace menos de 1 min";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `Hace ${h} h` : `Hace ${Math.floor(h / 24)} d`;
}

function Dato({ titulo, valor, Icono, children }: { titulo: string; valor: string; Icono: typeof Inbox; children?: React.ReactNode }) {
  return (
    <Tarjeta className="flex flex-col gap-1">
      <p className="sobretitulo flex items-center gap-2"><Icono className="size-4" strokeWidth={2} aria-hidden /> {titulo}</p>
      <p className="font-heading text-titulo-1 tabular-nums">{valor}</p>
      {children && <div className="text-cuerpo-sm text-muted-foreground">{children}</div>}
    </Tarjeta>
  );
}

export default async function Monitoreo() {
  const admin = await requireAdminPlataforma();
  const p = await panelMonitoreo(admin);

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Monitoreo"
        descripcion="Salud del sistema: avisos, cola, rebotes y procesos automáticos. Solo conteos, sin el contenido de los mensajes."
        acciones={
          <BotonConfirmar
            etiqueta={<><Play strokeWidth={2} aria-hidden /> Procesar la cola ahora</>}
            titulo="¿Procesar la cola ahora?"
            descripcion="Enviaremos los avisos pendientes, igual que lo hace el proceso automático. Respeta los topes diarios."
            confirmar="Procesar"
            accion={procesarColaAction}
          />
        }
      />

      <section aria-labelledby="canales" className="-mt-2 flex flex-col gap-3">
        <h2 id="canales" className="font-heading text-titulo-2">Avisos de las últimas 24 horas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {p.usoCanales.map((c) => {
            const pct = c.tope ? Math.min(100, Math.round((c.enviados / c.tope) * 100)) : null;
            return (
              <Tarjeta key={c.canal} className="flex flex-col gap-2">
                <p className="sobretitulo flex items-center gap-2"><Send className="size-4" strokeWidth={2} aria-hidden /> {NOMBRE_CANAL[c.canal]}</p>
                <p className="font-heading text-titulo-1 tabular-nums">
                  {numero(c.enviados)}{c.tope ? <span className="text-cuerpo text-muted-foreground"> / {numero(c.tope)}</span> : null}
                </p>
                {pct === null ? (
                  <p className="text-cuerpo-sm text-muted-foreground">Sin tope diario.</p>
                ) : (
                  <>
                    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${NOMBRE_CANAL[c.canal]}: ${pct} % del tope`} className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${pct >= 90 ? "bg-falta" : pct >= 80 ? "bg-tarde" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-cuerpo-sm text-muted-foreground">
                      {pct} % del tope diario{pct >= 80 ? " · cerca del límite" : ""}
                    </p>
                  </>
                )}
              </Tarjeta>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="estado" className="flex flex-col gap-3">
        <h2 id="estado" className="font-heading text-titulo-2">Cola y procesos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato titulo="Cola de avisos" valor={numero(p.cola.pendientes)} Icono={Inbox}>
            pendientes · {numero(p.cola.enviando)} enviando ({numero(p.cola.atascados)} atascados) · {numero(p.cola.errores)} con error
          </Dato>
          <Dato titulo="Exportaciones" valor={numero(p.exportaciones.pendientes)} Icono={Inbox}>
            pendientes · {numero(p.exportaciones.errores)} con error
          </Dato>
          <Dato titulo="Accesos de soporte" valor={numero(p.accesosSoporte)} Icono={LifeBuoy}>vigentes ahora</Dato>
          {p.crons.map((c) => {
            const { Icono, palabra, clase } = ESTADO_CRON[c.estado];
            return (
              <Tarjeta key={c.nombre} className="flex flex-col gap-2">
                <p className="sobretitulo flex items-center gap-2"><Clock className="size-4" strokeWidth={2} aria-hidden /> {NOMBRE_CRON[c.nombre]}</p>
                <p className="font-heading text-titulo-2">{c.minutos === null ? "Sin ejecuciones" : hace(c.minutos)}</p>
                <span className={`inline-flex w-fit items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta ${clase}`}>
                  <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {palabra}
                </span>
                {c.ejecucion && (
                  <p className="text-cuerpo-sm text-muted-foreground">
                    {c.ejecucion.resultado === "ok" ? "Terminó bien" : "Terminó con error"} · {numero(c.ejecucion.duracionMs)} ms
                  </p>
                )}
              </Tarjeta>
            );
          })}
        </div>
      </section>

      <GraficoDiario
        titulo="Avisos enviados por día"
        descripcion="Últimos 14 días, todos los canales."
        datos={p.serie}
        series={[{ clave: "enviados", etiqueta: "Enviados", color: "var(--chart-1)" }]}
      />

      <section aria-labelledby="rebotes" className="flex flex-col gap-3">
        <h2 id="rebotes" className="font-heading text-titulo-2">Rebotes y quejas (7 días)</h2>
        {p.rebotesPorColegio.length === 0 ? (
          <Tarjeta className="flex items-center gap-2 text-cuerpo-sm"><CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden /> Sin rebotes ni quejas en los últimos 7 días.</Tarjeta>
        ) : (
          <Tarjeta className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sobretitulo pl-4">Colegio</TableHead>
                  <TableHead className="sobretitulo text-right">Rebotes</TableHead>
                  <TableHead className="sobretitulo pr-4 text-right">Quejas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.rebotesPorColegio.map((r) => (
                  <TableRow key={r.tenantId}>
                    <TableCell className="pl-4"><Link href={`/colegios/${r.tenantId}`} className="enlace">{r.colegio}</Link></TableCell>
                    <TableCell className="text-right tabular-nums">{r.rebotes}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{r.quejas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Tarjeta>
        )}
      </section>

      <section aria-labelledby="errores" className="flex flex-col gap-3">
        <h2 id="errores" className="font-heading text-titulo-2">Avisos con error</h2>
        {p.erroresPorColegio.length > 0 && (
          <Tarjeta className="flex flex-col gap-2">
            <p className="text-cuerpo-sm text-muted-foreground">Volver a poner en la cola los avisos con error de un colegio (los rebotes no se tocan).</p>
            <ul className="flex flex-col gap-2">
              {p.erroresPorColegio.map((c) => (
                <li key={c.tenantId} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{c.colegio} · <span className="tabular-nums">{c.avisos}</span> {c.avisos === 1 ? "aviso" : "avisos"}</span>
                  <BotonConfirmar
                    etiqueta={<><RotateCw strokeWidth={2} aria-hidden /> Reintentar</>}
                    titulo={`¿Reintentar los avisos de ${c.colegio}?`}
                    descripcion={`Volverán a la cola ${c.avisos} ${c.avisos === 1 ? "aviso" : "avisos"} con error y se enviarán de nuevo. Queda registrado en la auditoría.`}
                    confirmar="Reintentar"
                    accion={reintentarAvisosAction}
                    campos={{ tenantId: c.tenantId }}
                    tamano="sm"
                  />
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
        {p.errores.length === 0 ? (
          <Tarjeta className="flex items-center gap-2 text-cuerpo-sm"><CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden /> No hay avisos con error.</Tarjeta>
        ) : (
          <Tarjeta className="overflow-hidden p-0">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sobretitulo pl-4">Fecha</TableHead>
                  <TableHead className="sobretitulo">Colegio</TableHead>
                  <TableHead className="sobretitulo">Tipo</TableHead>
                  <TableHead className="sobretitulo">Canal</TableHead>
                  <TableHead className="sobretitulo pr-4">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.errores.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-4">{fechaHora(e.fecha)}</TableCell>
                    <TableCell><Link href={`/colegios/${e.colegioId}`} className="enlace">{e.colegio}</Link></TableCell>
                    <TableCell>{NOMBRE_TIPO[e.tipo] ?? e.tipo}</TableCell>
                    <TableCell>{NOMBRE_CANAL[e.canal]}</TableCell>
                    <TableCell className="pr-4 text-cuerpo-sm"><span className="inline-flex items-start gap-1"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-falta" strokeWidth={2} aria-hidden /> {e.error}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Tarjeta>
        )}
      </section>
    </div>
  );
}
