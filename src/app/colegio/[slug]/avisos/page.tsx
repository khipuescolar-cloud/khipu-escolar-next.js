import { Ban, Bell, Hourglass, Mail, MailOpen, MailX, Megaphone, Send, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatoDia } from "@/lib/fechas";
import { panelAvisos, type VistaAvisos } from "@/lib/server/avisos-panel";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { ESTADOS, Indicador, PanelIndicadores, NOMBRE_TIPO, TablaAvisos, TIPOS, fecha } from "./componentes";

export const metadata: Metadata = { title: "Avisos enviados" };

const NUM = new Intl.NumberFormat("es-PE");

/** «Masivos» | «Individuales»: la vista va en la URL (`?vista=individuales`). */
function Pestanas({ vista }: { vista: VistaAvisos }) {
  const opciones = [
    { valor: "masivos" as const, texto: "Masivos", Icono: Megaphone, href: "/avisos" },
    { valor: "individuales" as const, texto: "Individuales", Icono: UserRound, href: "/avisos?vista=individuales" },
  ];
  return (
    <nav aria-label="Tipos de envío" className="-mt-2 inline-flex w-fit rounded-[10px] bg-superficie-2 p-1">
      {opciones.map(({ valor, texto, Icono, href }) => {
        const activa = vista === valor;
        return (
          <Link
            key={valor}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-cuerpo-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
              activa ? "bg-sec-suave text-sec-tinta" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icono className={cn("size-4", activa && "text-sec-trazo")} strokeWidth={2} aria-hidden /> {texto}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function AvisosPage({ params, searchParams }: PageProps<"/colegio/[slug]/avisos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  requireFeature(ctx, "avisos");
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const vista: VistaAvisos = uno(sp.vista) === "individuales" ? "individuales" : "masivos";
  const estado = uno(sp.estado) === "fallidos" ? "fallidos" : ESTADOS.find((e) => e === uno(sp.estado));
  const tipo = TIPOS.find((t) => t === uno(sp.tipo));
  const q = uno(sp.q)?.trim() || undefined;
  const { avisos, envios, hoy, semana } = await panelAvisos(ctx, { vista, estado, tipo, q });
  const filtrado = Boolean(estado || tipo || q);
  const masivos = vista === "masivos";
  const base = masivos ? "/avisos" : "/avisos?vista=individuales";
  const con = (param: string) => `${base}${masivos ? "?" : "&"}${param}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Avisos enviados" seccion="dia" descripcion="Correos y notificaciones que el colegio envió a las familias." />
      <Pestanas vista={vista} />
      <p className="-mt-3 text-cuerpo-sm text-muted-foreground">
        {masivos
          ? "Una acción que avisó a varias familias a la vez: listas cerradas, avisos automáticos de ingreso, comunicados, tareas, libretas, documentos y reuniones con varias familias."
          : "Avisos a una sola familia: llegadas por portería, una lista con un solo aviso, mensajes, justificaciones, reuniones con una familia e invitaciones."}
      </p>

      <section aria-labelledby="avisos-hoy" data-seccion="dia" className="flex flex-col gap-3">
        <h2 id="avisos-hoy" className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold">
          <span aria-hidden className="size-2.5 rounded-full bg-sec-nudo" />
          Hoy <span className="font-sans text-cuerpo-sm font-normal text-muted-foreground">· {formatoDia(new Date())}</span>
        </h2>
        <PanelIndicadores>
          <Indicador icono={Mail} titulo="Correos enviados" valor={NUM.format(hoy.correosEnviados)} detalle={`de ${NUM.format(hoy.generados)} avisos generados hoy`} />
          <Indicador
            icono={MailOpen}
            titulo="Correos abiertos"
            valor={NUM.format(hoy.abiertos)}
            detalle={hoy.apertura === null ? "Aún no hay correos enviados" : `${hoy.apertura} % de los enviados hoy`}
            tono={hoy.apertura === null ? "neutro" : hoy.apertura >= semana.meta ? "bien" : "atencion"}
          />
          <Indicador
            icono={MailX}
            titulo="Con error"
            valor={NUM.format(hoy.fallidos)}
            detalle={hoy.fallidos === 0 ? "Ningún envío falló hoy" : "Errores, rebotes o quejas"}
            tono={hoy.fallidos === 0 ? "bien" : "mal"}
            enlace={hoy.fallidos > 0 ? { href: con("estado=fallidos"), texto: "Ver cuáles" } : undefined}
          />
          <Indicador
            icono={Hourglass}
            titulo="En cola"
            valor={NUM.format(hoy.enCola)}
            detalle={hoy.enCola === 0 ? "Todo está enviado" : "Por enviar en los próximos minutos"}
            tono={hoy.enCola === 0 ? "neutro" : "atencion"}
            enlace={hoy.enCola > 0 ? { href: con("estado=pendiente"), texto: "Ver pendientes" } : undefined}
          />
          <Indicador icono={Bell} titulo="Notificaciones push" valor={NUM.format(hoy.pushEnviados)} detalle="Enviadas a celulares y computadoras" />
          <Indicador
            icono={Ban}
            titulo="No enviados"
            valor={NUM.format(hoy.omitidos)}
            detalle="La familia no tiene correo o apagó ese aviso"
            enlace={hoy.omitidos > 0 ? { href: con("estado=omitido"), texto: "Ver cuáles" } : undefined}
          />
        </PanelIndicadores>
        {hoy.porTipo.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Avisos de hoy por tipo">
            <span className="text-cuerpo-sm text-muted-foreground">Por tipo:</span>
            {hoy.porTipo.map((t) => (
              <Link
                key={t.tipo}
                href={con(`tipo=${t.tipo}`)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-pildora bg-superficie-2 px-3 text-etiqueta transition-colors duration-150 hover:bg-sec-suave hover:text-sec-tinta focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <Send className="size-3.5 text-sec-trazo" strokeWidth={2} aria-hidden />
                {NOMBRE_TIPO[t.tipo]} <span className="tabular-nums font-semibold">{NUM.format(t.total)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <form method="get" className="grid gap-3 rounded-[14px] border border-borde-sutil bg-superficie p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        {!masivos && <input type="hidden" name="vista" value="individuales" />}
        <Selector etiqueta={masivos ? "Con avisos en estado" : "Estado"} name="estado" defaultValue={estado ?? ""}>
          <option value="">Todos</option>
          <option value="fallidos">Con error (error, rebote o queja)</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </Selector>
        <Selector etiqueta="Tipo" name="tipo" defaultValue={tipo ?? ""}>
          <option value="">Todos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}
        </Selector>
        <Campo etiqueta={masivos ? "Título contiene" : "Correo contiene"} name="q" defaultValue={q ?? ""} />
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
          <Boton type="submit" variante="secundario">Filtrar</Boton>
          <Link href={base} className="inline-flex min-h-10 items-center text-cuerpo-sm enlace">Limpiar</Link>
        </div>
      </form>

      {masivos ? (
        envios.length === 0 ? (
          <EstadoVacio
            icono={Megaphone}
            titulo={filtrado ? "No hay envíos con ese filtro" : "Aún no hay envíos masivos"}
            descripcion={filtrado ? "Prueba con otro estado, tipo o título." : "Cuando cierres una lista o publiques un comunicado para varias familias, el envío aparecerá aquí."}
            accion={filtrado ? <Link href={base} className="text-cuerpo-sm enlace">Limpiar filtros</Link> : undefined}
          />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil md:hidden">
              {envios.map((e) => (
                <li key={e.id}>
                  <div className="flex flex-col gap-2 py-3.5 text-cuerpo-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-muted-foreground">{NOMBRE_TIPO[e.tipo]}</span>
                        <span className="text-cuerpo-sm text-muted-foreground">{fecha.format(e.createdAt)}</span>
                      </div>
                      <Link href={`/avisos/envios/${e.id}`} className="text-cuerpo font-semibold enlace">{e.titulo}</Link>
                      <p className="text-muted-foreground">{e.autor}</p>
                      <ResumenEnvio e={e} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-11 px-4">Fecha</TableHead>
                    <TableHead className="h-11 px-4">Envío</TableHead>
                    <TableHead className="h-11 px-4 text-right">Familias</TableHead>
                    <TableHead className="h-11 px-4 text-right">Enviados</TableHead>
                    <TableHead className="h-11 px-4 text-right">Abiertos</TableHead>
                    <TableHead className="h-11 px-4 text-right">Con error</TableHead>
                    <TableHead className="h-11 px-4 text-right">En cola</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envios.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="px-4 py-3 whitespace-nowrap">{fecha.format(e.createdAt)}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-normal">
                        <Link href={`/avisos/envios/${e.id}`} className="font-semibold enlace">{e.titulo}</Link>
                        <p className="text-cuerpo-sm text-muted-foreground">{NOMBRE_TIPO[e.tipo]} · {e.autor}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums">{NUM.format(e.familias)}</TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums">{NUM.format(e.correosEnviados + e.pushEnviados)}</TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums">
                        {NUM.format(e.abiertos)}
                        {e.apertura !== null && <span className="text-muted-foreground"> · {e.apertura} %</span>}
                      </TableCell>
                      <TableCell className={cn("px-4 py-3 text-right tabular-nums", e.fallidos > 0 && "font-semibold text-falta")}>{NUM.format(e.fallidos)}</TableCell>
                      <TableCell className={cn("px-4 py-3 text-right tabular-nums", e.enCola > 0 && "font-semibold text-tarde")}>{NUM.format(e.enCola)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-cuerpo-sm text-muted-foreground">Se muestran los 50 envíos más recientes. Toca un envío para ver el detalle por familia.</p>
          </>
        )
      ) : avisos.length === 0 ? (
        <EstadoVacio
          icono={Mail}
          titulo={filtrado ? "No hay avisos con ese filtro" : "Aún no se envió ningún aviso individual"}
          descripcion={filtrado ? "Prueba con otro estado, tipo o correo." : "Las llegadas por portería, los mensajes y las justificaciones aparecerán aquí."}
          accion={filtrado ? <Link href={base} className="text-cuerpo-sm enlace">Limpiar filtros</Link> : undefined}
        />
      ) : (
        <TablaAvisos avisos={avisos} />
      )}
    </div>
  );
}

function ResumenEnvio({ e }: { e: { familias: number; correosEnviados: number; pushEnviados: number; abiertos: number; fallidos: number; enCola: number } }) {
  const datos = [
    { texto: "familias", valor: e.familias },
    { texto: "enviados", valor: e.correosEnviados + e.pushEnviados },
    { texto: "abiertos", valor: e.abiertos },
    { texto: "con error", valor: e.fallidos, clase: e.fallidos > 0 ? "text-falta font-semibold" : "" },
    { texto: "en cola", valor: e.enCola, clase: e.enCola > 0 ? "text-tarde font-semibold" : "" },
  ];
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
      {datos.map((d) => (
        <span key={d.texto} className={d.clase}>{NUM.format(d.valor)} {d.texto}</span>
      ))}
    </p>
  );
}
