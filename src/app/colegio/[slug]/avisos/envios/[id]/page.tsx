import { ArrowLeft, Ban, Bell, Hourglass, Mail, MailOpen, MailX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { detalleEnvio } from "@/lib/server/avisos-panel";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { ESTADOS, Indicador, NOMBRE_TIPO, TablaAvisos, fecha } from "../../componentes";

export const metadata: Metadata = { title: "Detalle del envío" };

const NUM = new Intl.NumberFormat("es-PE");

/** Detalle de un envío (specs/06): sus totales y un aviso por familia y canal. */
export default async function EnvioPage({ params, searchParams }: PageProps<"/colegio/[slug]/avisos/envios/[id]">) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  requireFeature(ctx, "avisos");
  const valor = Array.isArray(sp.estado) ? sp.estado[0] : sp.estado;
  const estado = valor === "fallidos" ? "fallidos" : ESTADOS.find((e) => e === valor);
  const { envio, totales: t, avisos } = await detalleEnvio(ctx, id, { estado });
  const ruta = `/avisos/envios/${envio.id}`;
  const filtros = [
    { texto: "Todos", href: ruta, activo: !estado, total: t.avisos },
    { texto: "Con error", href: `${ruta}?estado=fallidos`, activo: estado === "fallidos", total: t.fallidos },
    { texto: "En cola", href: `${ruta}?estado=pendiente`, activo: estado === "pendiente", total: t.enCola },
    { texto: "No enviados", href: `${ruta}?estado=omitido`, activo: estado === "omitido", total: t.omitidos },
    { texto: "Abiertos", href: `${ruta}?estado=abierto`, activo: estado === "abierto", total: t.abiertos },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={envio.titulo}
        descripcion={`${NOMBRE_TIPO[envio.tipo]} · ${envio.autor} · ${fecha.format(envio.createdAt)} · ${NUM.format(envio.familias)} ${envio.familias === 1 ? "familia" : "familias"}`}
        acciones={
          <Link href={envio.masivo ? "/avisos" : "/avisos?vista=individuales"} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Avisos enviados
          </Link>
        }
      />

      <div className="-mt-2 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Indicador icono={Mail} titulo="Correos enviados" valor={NUM.format(t.correosEnviados)} detalle={`de ${NUM.format(t.avisos)} avisos de este envío`} />
        <Indicador
          icono={MailOpen}
          titulo="Correos abiertos"
          valor={NUM.format(t.abiertos)}
          detalle={t.apertura === null ? "Aún no hay correos enviados" : `${t.apertura} % de los enviados`}
        />
        <Indicador
          icono={MailX}
          titulo="Con error"
          valor={NUM.format(t.fallidos)}
          detalle={t.fallidos === 0 ? "Ningún envío falló" : "Errores, rebotes o quejas"}
          tono={t.fallidos === 0 ? "bien" : "mal"}
        />
        <Indicador icono={Hourglass} titulo="En cola" valor={NUM.format(t.enCola)} detalle={t.enCola === 0 ? "Todo está enviado" : "Por enviar en los próximos minutos"} tono={t.enCola === 0 ? "neutro" : "atencion"} />
        <Indicador icono={Bell} titulo="Notificaciones push" valor={NUM.format(t.pushEnviados)} detalle="Enviadas a celulares y computadoras" />
        <Indicador icono={Ban} titulo="No enviados" valor={NUM.format(t.omitidos)} detalle="La familia no tiene correo o apagó ese aviso" />
      </div>

      <nav aria-label="Filtrar avisos del envío" className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Link
            key={f.texto}
            href={f.href}
            aria-current={f.activo ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-pildora border px-3.5 text-sm font-medium transition-colors",
              f.activo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.texto} <span className="tabular-nums">{NUM.format(f.total)}</span>
          </Link>
        ))}
      </nav>

      {avisos.length === 0 ? (
        <EstadoVacio icono={Mail} titulo="No hay avisos con ese filtro" descripcion="Prueba con otro filtro." accion={<Link href={ruta} className="text-cuerpo-sm enlace">Ver todos</Link>} />
      ) : (
        <TablaAvisos avisos={avisos} conTipo={false} />
      )}
    </div>
  );
}
