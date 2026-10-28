import { Clock, Hourglass, Inbox, LifeBuoy, MessageCircleQuestion, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { InsigniaEstadoTicket, InsigniaPrioridad } from "@/components/soporte/EstadoTicket";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { colegiosConTickets, listarBandeja, pendientesMesaAyuda, resumenMesaAyuda, type FilaBandeja } from "@/lib/server/plataforma-mesa-ayuda";
import { duracionLegible, ESTADOS_TICKET, nombreEstado, NOMBRE_CATEGORIA, NOMBRE_PRIORIDAD, PRIORIDADES_TICKET, type NivelSla } from "@/lib/soporte";
import { cn } from "@/lib/utils";
import { StatTile } from "../_componentes/StatTile";
import { RefrescoPeriodico } from "./RefrescoPeriodico";

export async function generateMetadata(): Promise<Metadata> {
  const admin = await requireAdminPlataforma();
  const n = await pendientesMesaAyuda(admin);
  return { title: n > 0 ? `(${n}) Mesa de ayuda` : "Mesa de ayuda" };
}

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const fecha = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

const CLASE_SLA: Record<NivelSla, string> = {
  normal: "text-muted-foreground",
  ambar: "bg-tarde-fondo text-tarde",
  rojo: "bg-falta-fondo text-falta",
};

function Sla({ sla }: { sla: NonNullable<FilaBandeja["sla"]> }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta whitespace-nowrap", CLASE_SLA[sla.nivel])} data-testid="sla">
      <Clock className="size-3.5" strokeWidth={2} aria-hidden /> {sla.texto}
    </span>
  );
}

export default async function MesaDeAyuda({ searchParams }: PageProps<"/plataforma/mesa-ayuda">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const filtro = { estado: uno(sp.estado), prioridad: uno(sp.prioridad), colegio: uno(sp.colegio), asignado: uno(sp.asignado) };
  const [resumen, filas, colegios, pendientes] = await Promise.all([
    resumenMesaAyuda(admin),
    listarBandeja(admin, filtro as Parameters<typeof listarBandeja>[1]),
    colegiosConTickets(admin),
    pendientesMesaAyuda(admin),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <RefrescoPeriodico />
      <EncabezadoPagina
        titulo="Mesa de ayuda"
        descripcion="Conversaciones de los colegios con el equipo Khipu. Las urgentes y las más antiguas van primero."
        acciones={
          <Badge variant="outline" className="h-8 gap-1.5 px-3 text-sm" data-testid="pendientes-mesa">
            <Inbox className="size-4" strokeWidth={2} aria-hidden /> {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile titulo="Abiertas sin respuesta" valor={String(resumen.abiertasSinRespuesta)} Icono={LifeBuoy} />
        <StatTile titulo="En progreso" valor={String(resumen.enProgreso)} Icono={Hourglass} />
        <StatTile titulo="Esperando al colegio" valor={String(resumen.esperandoColegio)} Icono={MessageCircleQuestion} />
        <StatTile titulo="Primera respuesta (7 días)" valor={resumen.primeraRespuestaMin === null ? "—" : duracionLegible(resumen.primeraRespuestaMin)} Icono={Clock}>
          Promedio de las conversaciones abiertas esta semana.
        </StatTile>
        <StatTile titulo="Valoración media" valor={resumen.valoracionMedia === null ? "—" : `${resumen.valoracionMedia.toFixed(1).replace(".", ",")} / 5`} Icono={Star}>
          {resumen.valoraciones} {resumen.valoraciones === 1 ? "valoración" : "valoraciones"}
        </StatTile>
      </div>

      <form method="get" className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" aria-label="Filtros">
        <Selector etiqueta="Estado" name="estado" defaultValue={filtro.estado ?? "activas"}>
          <option value="activas">Activas</option>
          <option value="todas">Todas</option>
          {ESTADOS_TICKET.map((e) => (
            <option key={e} value={e}>{nombreEstado(e, "khipu")}</option>
          ))}
        </Selector>
        <Selector etiqueta="Prioridad" name="prioridad" defaultValue={filtro.prioridad ?? ""}>
          <option value="">Todas</option>
          {PRIORIDADES_TICKET.map((p) => (
            <option key={p} value={p}>{NOMBRE_PRIORIDAD[p]}</option>
          ))}
        </Selector>
        <Selector etiqueta="Colegio" name="colegio" defaultValue={filtro.colegio ?? ""}>
          <option value="">Todos</option>
          {colegios.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </Selector>
        <Selector etiqueta="Asignación" name="asignado" defaultValue={filtro.asignado ?? ""}>
          <option value="">Cualquiera</option>
          <option value="mi">Asignadas a mí</option>
          <option value="sin">Sin asignar</option>
        </Selector>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Filtrar</button>
      </form>

      {filas.length === 0 ? (
        <EstadoVacio icono={Inbox} titulo="No hay conversaciones con estos filtros." descripcion="Cuando un colegio escriba, aparecerá aquí." />
      ) : (
        <>
          <Tarjeta className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sobretitulo pl-4">Conversación</TableHead>
                    <TableHead className="sobretitulo">Prioridad</TableHead>
                    <TableHead className="sobretitulo">Estado</TableHead>
                    <TableHead className="sobretitulo">Asignada a</TableHead>
                    <TableHead className="sobretitulo pr-4">Actividad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((f) => (
                    <TableRow key={f.id} data-testid="fila-bandeja">
                      <TableCell className="max-w-sm pl-4">
                        <Link href={`/mesa-ayuda/${f.id}`} className={cn("enlace block truncate", f.noLeidos > 0 ? "font-bold" : "font-medium")}>
                          {f.asunto}
                        </Link>
                        <p className="truncate text-cuerpo-sm text-muted-foreground">{f.colegio} · {NOMBRE_CATEGORIA[f.categoria]}</p>
                      </TableCell>
                      <TableCell><InsigniaPrioridad prioridad={f.prioridad} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <InsigniaEstadoTicket estado={f.estado} lado="khipu" />
                          {f.sla && <Sla sla={f.sla} />}
                        </div>
                      </TableCell>
                      <TableCell className="text-cuerpo-sm">{f.asignado ?? <span className="text-muted-foreground">Sin asignar</span>}</TableCell>
                      <TableCell className="pr-4 text-cuerpo-sm text-muted-foreground">
                        {fecha.format(f.ultimoMensajeAt)}
                        {f.noLeidos > 0 && <Badge className="ml-2 h-6 px-2 text-xs">{f.noLeidos} sin leer</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Tarjeta>
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Conversaciones">
            {filas.map((f) => (
              <li key={f.id}>
                <Link href={`/mesa-ayuda/${f.id}`} className="flex flex-col gap-1.5 rounded-lg border bg-card p-4 outline-none hover:bg-accent focus-visible:bg-accent">
                  <span className={cn("text-sm", f.noLeidos > 0 ? "font-bold" : "font-semibold")}>{f.asunto}</span>
                  <span className="text-cuerpo-sm text-muted-foreground">{f.colegio} · {NOMBRE_CATEGORIA[f.categoria]}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <InsigniaEstadoTicket estado={f.estado} lado="khipu" />
                    <InsigniaPrioridad prioridad={f.prioridad} />
                    {f.sla && <Sla sla={f.sla} />}
                    {f.noLeidos > 0 && <Badge className="h-6 px-2 text-xs">{f.noLeidos} sin leer</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
