import { Download, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOMBRE_PLAN } from "@/lib/planes";
import { ESTADOS_SOLICITUD, NOMBRE_ESTADO_SOLICITUD } from "@/lib/solicitudes";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { listarSolicitudes, pendientesSolicitudes } from "@/lib/server/plataforma-solicitudes";
import { InsigniaEstadoSolicitud } from "./InsigniaEstadoSolicitud";

export async function generateMetadata(): Promise<Metadata> {
  const admin = await requireAdminPlataforma();
  const n = await pendientesSolicitudes(admin);
  return { title: n > 0 ? `(${n}) Solicitudes de demo` : "Solicitudes de demo" };
}

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const fecha = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

export default async function Solicitudes({ searchParams }: PageProps<"/plataforma/solicitudes">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const filtro = { estado: uno(sp.estado), q: uno(sp.q), orden: uno(sp.orden) as "recientes" | "antiguas" | undefined };
  const [filas, nuevas] = await Promise.all([listarSolicitudes(admin, filtro), pendientesSolicitudes(admin)]);
  const query = new URLSearchParams(Object.entries({ estado: filtro.estado, q: filtro.q, orden: filtro.orden }).filter((e): e is [string, string] => !!e[1])).toString();

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Solicitudes de demo"
        descripcion="Colegios que pidieron una demo desde la página de Khipu Escolar. Contienen datos de contacto: úsalos solo para responder el pedido."
        acciones={
          <>
            <Badge variant="outline" className="h-8 gap-1.5 px-3 text-sm" data-testid="solicitudes-nuevas">
              <Inbox className="size-4" strokeWidth={2} aria-hidden /> {nuevas} {nuevas === 1 ? "nueva" : "nuevas"}
            </Badge>
            <a href={`/solicitudes/reporte.csv${query ? `?${query}` : ""}`} className={buttonVariants({ variant: "outline" })}>
              <Download strokeWidth={2} aria-hidden /> Exportar CSV
            </a>
          </>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />

      <form method="get" className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_auto] lg:items-end" aria-label="Filtros">
        <Campo etiqueta="Buscar" name="q" type="search" defaultValue={filtro.q ?? ""} placeholder="Colegio, nombre, correo o ciudad" />
        <Selector etiqueta="Estado" name="estado" defaultValue={filtro.estado ?? "todas"}>
          <option value="todas">Todos</option>
          {ESTADOS_SOLICITUD.map((e) => <option key={e} value={e}>{NOMBRE_ESTADO_SOLICITUD[e]}</option>)}
        </Selector>
        <Selector etiqueta="Orden" name="orden" defaultValue={filtro.orden ?? "recientes"}>
          <option value="recientes">Más recientes primero</option>
          <option value="antiguas">Más antiguas primero</option>
        </Selector>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Filtrar</button>
      </form>

      {filas.length === 0 ? (
        <EstadoVacio icono={Inbox} titulo="No hay solicitudes con estos filtros." descripcion="Cuando un colegio pida una demo desde la página, aparecerá aquí." />
      ) : (
        <>
          <Tarjeta className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sobretitulo pl-4">Fecha</TableHead>
                    <TableHead className="sobretitulo">Colegio</TableHead>
                    <TableHead className="sobretitulo">Contacto</TableHead>
                    <TableHead className="sobretitulo">Alumnos</TableHead>
                    <TableHead className="sobretitulo">Plan de interés</TableHead>
                    <TableHead className="sobretitulo pr-4">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((s) => (
                    <TableRow key={s.id} data-testid="fila-solicitud">
                      <TableCell className="pl-4 text-cuerpo-sm whitespace-nowrap text-muted-foreground">{fecha.format(s.createdAt)}</TableCell>
                      <TableCell className="max-w-xs">
                        <Link href={`/solicitudes/${s.id}`} className="enlace block truncate font-medium">{s.colegio}</Link>
                        <p className="truncate text-cuerpo-sm text-muted-foreground">{s.ciudad ?? "Ciudad sin indicar"}</p>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-cuerpo-sm">{s.nombre}{s.cargo ? ` · ${s.cargo}` : ""}</p>
                        <p className="truncate text-cuerpo-sm text-muted-foreground">{s.correo}</p>
                      </TableCell>
                      <TableCell className="text-cuerpo-sm">{s.alumnos ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-cuerpo-sm">{s.planInteres ? NOMBRE_PLAN[s.planInteres] : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="pr-4"><InsigniaEstadoSolicitud estado={s.estado} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Tarjeta>
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Solicitudes">
            {filas.map((s) => (
              <li key={s.id}>
                <Link href={`/solicitudes/${s.id}`} className="flex flex-col gap-1.5 rounded-lg border bg-card p-4 outline-none hover:bg-accent focus-visible:bg-accent">
                  <span className="text-sm font-semibold">{s.colegio}</span>
                  <span className="text-cuerpo-sm text-muted-foreground">{s.ciudad ?? "Ciudad sin indicar"} · {s.nombre}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <InsigniaEstadoSolicitud estado={s.estado} />
                    <span className="text-cuerpo-sm text-muted-foreground">{fecha.format(s.createdAt)}</span>
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
