import { CheckCircle2, Clock, Mail, MailX, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { panelAvisos } from "@/lib/server/avisos-panel";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import type { EstadoAviso, TipoAviso } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Avisos enviados" };

const ESTADOS: EstadoAviso[] = ["pendiente", "enviando", "enviado", "entregado", "abierto", "rebotado", "queja", "error", "omitido"];
const TIPOS: TipoAviso[] = ["asistencia", "mensaje", "comunicado", "invitacion", "justificacion", "tarea", "alerta_direccion"];
function EstadoEnvio({ estado }: { estado: EstadoAviso }) {
  const malo = estado === "error" || estado === "rebotado" || estado === "queja";
  const [Icono, clase] = malo ? [MailX, "text-falta"] : estado === "abierto" ? [CheckCircle2, "text-llego"] : [Clock, "text-muted-foreground"];
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold capitalize ${clase}`}>
      <Icono className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      {estado}
    </span>
  );
}

const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });

export default async function AvisosPage({ params, searchParams }: PageProps<"/colegio/[slug]/avisos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  requireFeature(ctx, "avisos");
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const estado = ESTADOS.find((e) => e === uno(sp.estado));
  const tipo = TIPOS.find((t) => t === uno(sp.tipo));
  const q = uno(sp.q)?.trim() || undefined;
  const { avisos, semana } = await panelAvisos(ctx, { estado, tipo, q });
  const cumple = semana.porcentaje !== null && semana.porcentaje >= semana.meta;

  const filtrado = Boolean(estado || tipo || q);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Avisos enviados" descripcion="Correos y notificaciones que el colegio envió a las familias." />

      <Card className="-mt-2">
        <CardContent className="flex flex-wrap items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-6" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Apertura de la semana (últimos 7 días)</p>
            <p className="text-titulo-1">{semana.porcentaje === null ? "Sin envíos" : `${semana.porcentaje} %`}</p>
            <p className="text-sm text-muted-foreground">{semana.abiertos} abiertos de {semana.enviados} enviados · meta {semana.meta} %</p>
          </div>
          {semana.porcentaje !== null && (
            <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta ${cumple ? "bg-llego-fondo text-llego" : "bg-tarde-fondo text-tarde"}`}>
              {cumple ? <CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden /> : <Clock className="size-3.5" strokeWidth={2} aria-hidden />}
              {cumple ? "Meta alcanzada" : "Por debajo de la meta"}
            </span>
          )}
        </CardContent>
      </Card>

      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <Selector etiqueta="Estado" name="estado" defaultValue={estado ?? ""}>
          <option value="">Todos</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </Selector>
        <Selector etiqueta="Tipo" name="tipo" defaultValue={tipo ?? ""}>
          <option value="">Todos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </Selector>
        <Campo etiqueta="Correo contiene" name="q" defaultValue={q ?? ""} />
        <div className="flex items-center gap-3 sm:col-span-2">
          <Boton type="submit" variante="secundario">Filtrar</Boton>
          <Link href="/avisos" className="inline-flex min-h-10 items-center text-cuerpo-sm enlace">Limpiar</Link>
        </div>
      </form>

      {avisos.length === 0 ? (
        <EstadoVacio
          icono={Mail}
          titulo={filtrado ? "No hay avisos con ese filtro" : "Aún no se envió ningún aviso"}
          descripcion={filtrado ? "Prueba con otro estado, tipo o correo." : "Cuando pases lista o envíes comunicados, los avisos aparecerán aquí."}
          accion={filtrado ? <Link href="/avisos" className="text-cuerpo-sm enlace">Limpiar filtros</Link> : undefined}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {avisos.map((a) => (
              <li key={a.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-1.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <EstadoEnvio estado={a.estado} />
                      <span className="text-cuerpo-sm text-muted-foreground">{fecha.format(a.createdAt)}</span>
                    </div>
                    <p className="font-medium">{a.asunto}</p>
                    <p className="text-muted-foreground break-all">{a.destinatario} · <span className="capitalize">{a.tipo.replace("_", " ")}</span></p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <Card className="hidden py-0 md:flex">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 px-4">Fecha</TableHead>
                  <TableHead className="h-11 px-4">Tipo</TableHead>
                  <TableHead className="h-11 px-4">Para</TableHead>
                  <TableHead className="h-11 px-4">Asunto</TableHead>
                  <TableHead className="h-11 px-4">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avisos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="px-4 py-3 whitespace-nowrap">{fecha.format(a.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3 capitalize">{a.tipo.replace("_", " ")}</TableCell>
                    <TableCell className="px-4 py-3">{a.destinatario}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-normal">{a.asunto}</TableCell>
                    <TableCell className="px-4 py-3"><EstadoEnvio estado={a.estado} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
