import { Ban, Bell, CheckCircle2, Clock, Hourglass, Mail, MailOpen, MailX, Send, TrendingUp, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatoDia } from "@/lib/fechas";
import { panelAvisos } from "@/lib/server/avisos-panel";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import type { EstadoAviso, TipoAviso } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Avisos enviados" };

const ESTADOS: EstadoAviso[] = ["pendiente", "enviando", "enviado", "entregado", "abierto", "rebotado", "queja", "error", "omitido"];
const NOMBRE_TIPO: Record<TipoAviso, string> = {
  asistencia: "Asistencia",
  mensaje: "Mensajes",
  comunicado: "Comunicados",
  invitacion: "Invitaciones",
  justificacion: "Justificaciones",
  tarea: "Tareas",
  alerta_direccion: "Alertas a dirección",
  resumen_llegadas: "Resumen de llegadas",
  libreta: "Libretas",
  soporte: "Soporte",
  reunion: "Reuniones",
  documento: "Documentos",
  nudito: "Nudito+",
};
const TIPOS = Object.keys(NOMBRE_TIPO) as TipoAviso[];

type TonoIndicador = "neutro" | "bien" | "mal" | "atencion";
const TONOS: Record<TonoIndicador, string> = {
  neutro: "bg-primary/10 text-primary",
  bien: "bg-llego-fondo text-llego",
  mal: "bg-falta-fondo text-falta",
  atencion: "bg-tarde-fondo text-tarde",
};

function Indicador({ icono: Icono, titulo, valor, detalle, tono = "neutro", enlace }: {
  icono: LucideIcon;
  titulo: string;
  valor: string;
  detalle: string;
  tono?: TonoIndicador;
  enlace?: { href: string; texto: string };
}) {
  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${TONOS[tono]}`}>
            <Icono className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
        </div>
        <p className="text-titulo-1 tabular-nums">{valor}</p>
        <p className="text-cuerpo-sm text-muted-foreground">{detalle}</p>
        {enlace && <Link href={enlace.href} className="mt-auto text-cuerpo-sm enlace">{enlace.texto}</Link>}
      </CardContent>
    </Card>
  );
}

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
  const estado = uno(sp.estado) === "fallidos" ? "fallidos" : ESTADOS.find((e) => e === uno(sp.estado));
  const tipo = TIPOS.find((t) => t === uno(sp.tipo));
  const q = uno(sp.q)?.trim() || undefined;
  const { avisos, hoy, semana } = await panelAvisos(ctx, { estado, tipo, q });
  const cumple = semana.porcentaje !== null && semana.porcentaje >= semana.meta;

  const filtrado = Boolean(estado || tipo || q);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Avisos enviados" descripcion="Correos y notificaciones que el colegio envió a las familias." />

      <section aria-labelledby="avisos-hoy" className="-mt-2 flex flex-col gap-3">
        <h2 id="avisos-hoy" className="text-titulo-2">
          Hoy <span className="text-base font-normal text-muted-foreground first-letter:uppercase">· {formatoDia(new Date())}</span>
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Indicador icono={Mail} titulo="Correos enviados" valor={String(hoy.correosEnviados)} detalle={`de ${hoy.generados} avisos generados hoy`} />
          <Indicador
            icono={MailOpen}
            titulo="Correos abiertos"
            valor={String(hoy.abiertos)}
            detalle={hoy.apertura === null ? "Aún no hay correos enviados" : `${hoy.apertura} % de los enviados hoy`}
            tono={hoy.apertura === null ? "neutro" : hoy.apertura >= semana.meta ? "bien" : "atencion"}
          />
          <Indicador
            icono={MailX}
            titulo="Con error"
            valor={String(hoy.fallidos)}
            detalle={hoy.fallidos === 0 ? "Ningún envío falló hoy" : "Errores, rebotes o quejas"}
            tono={hoy.fallidos === 0 ? "bien" : "mal"}
            enlace={hoy.fallidos > 0 ? { href: "/avisos?estado=fallidos", texto: "Ver cuáles" } : undefined}
          />
          <Indicador
            icono={Hourglass}
            titulo="En cola"
            valor={String(hoy.enCola)}
            detalle={hoy.enCola === 0 ? "Todo está enviado" : "Por enviar en los próximos minutos"}
            tono={hoy.enCola === 0 ? "neutro" : "atencion"}
            enlace={hoy.enCola > 0 ? { href: "/avisos?estado=pendiente", texto: "Ver pendientes" } : undefined}
          />
          <Indicador icono={Bell} titulo="Notificaciones push" valor={String(hoy.pushEnviados)} detalle="Enviadas a celulares y computadoras" />
          <Indicador
            icono={Ban}
            titulo="No enviados"
            valor={String(hoy.omitidos)}
            detalle="La familia no tiene correo o apagó ese aviso"
            enlace={hoy.omitidos > 0 ? { href: "/avisos?estado=omitido", texto: "Ver cuáles" } : undefined}
          />
        </div>
        {hoy.porTipo.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Avisos de hoy por tipo">
            <span className="text-cuerpo-sm text-muted-foreground">Por tipo:</span>
            {hoy.porTipo.map((t) => (
              <Link
                key={t.tipo}
                href={`/avisos?tipo=${t.tipo}`}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-pildora bg-muted px-3 text-etiqueta hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Send className="size-3.5" strokeWidth={2} aria-hidden />
                {NOMBRE_TIPO[t.tipo]} <span className="tabular-nums font-semibold">{t.total}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Card>
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
          <option value="fallidos">Con error (error, rebote o queja)</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </Selector>
        <Selector etiqueta="Tipo" name="tipo" defaultValue={tipo ?? ""}>
          <option value="">Todos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}
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
