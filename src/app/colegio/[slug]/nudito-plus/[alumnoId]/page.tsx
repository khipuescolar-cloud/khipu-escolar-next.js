import { ArrowLeft, Bell, BellOff, BookOpenCheck, CheckCircle2, Clock, Hourglass, MessageCircle, Play, Receipt, ShieldCheck, ShieldQuestion, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonEnvio } from "../BotonEnvio";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { fechaCorta, formatoDia } from "@/lib/fechas";
import { formatoMonto, NOMBRE_TIPO_ALERTA, textoMeses } from "@/lib/nudito-plus";
import { panelHijo } from "@/lib/server/nudito-plus/familia";
import { requireTenantContext } from "@/lib/server/tenant";
import { marcarAlertaVistaAction, revocarConsentimientoIaAction } from "../actions";
import { EstadoLicencia } from "../EstadoLicencia";

export const metadata: Metadata = { title: "Nudito+ de tu hijo" };

const ESTADO_PAGO = {
  pendiente: { Icono: Hourglass, texto: "En revisión", clase: "text-tarde" },
  verificado: { Icono: CheckCircle2, texto: "Confirmado", clase: "text-llego" },
  rechazado: { Icono: XCircle, texto: "No confirmado", clase: "text-falta" },
} as const;

/** Panel de Nudito+ de un hijo (specs/28): licencia, autorización, uso del mes, resúmenes y alertas. Sin conversaciones. */
export default async function PanelNuditoHijo({ params, searchParams }: PageProps<"/colegio/[slug]/nudito-plus/[alumnoId]">) {
  const { slug, alumnoId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  const p = await panelHijo(ctx, alumnoId);
  const nombre = p.alumno.nombres.split(" ")[0];
  const porcentaje = p.uso.limite > 0 ? Math.min(100, Math.round((p.uso.mensajes / p.uso.limite) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/nudito-plus" className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Nudito+
      </Link>
      <EncabezadoPagina
        titulo={`Nudito+ de ${nombre}`}
        descripcion={`${p.alumno.nombres} ${p.alumno.apellidos} · ${p.alumno.salon}`}
        acciones={
          p.puedeUsar ? (
            <Link href={`/nudito-plus/hijo/${p.alumno.id}`} className={buttonVariants()}>
              <Play strokeWidth={2} aria-hidden /> Usar en modo hijo
            </Link>
          ) : undefined
        }
      />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Licencia</h2>
          <EstadoLicencia estado={p.estado} />
          {p.vigente && p.vigente.origen !== "pago" && (
            <p className="text-cuerpo-sm text-muted-foreground">Licencia {p.vigente.origen === "cortesia" ? "de cortesía" : "de prueba"} del equipo Khipu.</p>
          )}
          {p.estado.tipo === "revision" && <p className="text-cuerpo-sm text-muted-foreground">Estamos revisando tu pago. Te avisaremos cuando Nudito+ esté activo.</p>}
          {p.alumno.activo && p.estado.tipo !== "revision" && (
            <Link href={`/nudito-plus/${p.alumno.id}/activar`} className={`${buttonVariants({ variant: p.estado.tipo === "activa" ? "outline" : "default" })} w-fit`}>
              {p.estado.tipo === "activa" ? "Renovar" : "Activar Nudito+"}
            </Link>
          )}
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Tu autorización</h2>
          {p.consentimiento ? (
            <>
              <p className="inline-flex items-center gap-1.5 font-medium text-llego">
                <ShieldCheck className="size-5" strokeWidth={2} aria-hidden /> Autorizado
              </p>
              <p className="text-cuerpo-sm text-muted-foreground">
                {p.consentimiento.mio ? "Diste" : "Otro apoderado dio"} la autorización el {formatoDia(p.consentimiento.aceptadoAt, { day: "numeric", month: "long", year: "numeric" })} (versión {p.consentimiento.version}).
              </p>
              <form action={revocarConsentimientoIaAction}>
                <input type="hidden" name="alumnoId" value={p.alumno.id} />
                <BotonEnvio variante="secundario">Retirar autorización</BotonEnvio>
              </form>
              <p className="text-cuerpo-sm text-muted-foreground">Si la retiras, {nombre} deja de usar Nudito+ hasta que la vuelvas a dar.</p>
            </>
          ) : (
            <>
              <p className="inline-flex items-center gap-1.5 font-medium">
                <ShieldQuestion className="size-5" strokeWidth={2} aria-hidden /> Falta tu autorización
              </p>
              <p className="text-cuerpo-sm text-muted-foreground">Antes de usar Nudito+, necesitamos que aceptes cómo funciona el tutor con IA.</p>
              <Link href={`/nudito-plus/${p.alumno.id}/consentimiento`} className={`${buttonVariants()} w-fit`}>Leer y autorizar</Link>
            </>
          )}
        </Tarjeta>
      </div>

      {!p.puedeUsar && (p.vigente || p.consentimiento) && (
        <Alerta tipo="info">
          {!p.vigente ? "Cuando Nudito+ esté activo, podrás abrirlo en modo hijo desde aquí." : "Cuando des tu autorización, podrás abrir Nudito+ en modo hijo desde aquí."}
        </Alerta>
      )}

      <Tarjeta className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Uso de este mes</h2>
        <p className="text-cuerpo">
          <span className="font-heading text-titulo-2 tabular-nums">{p.uso.mensajes}</span>
          <span className="text-muted-foreground"> de {p.uso.limite} mensajes</span>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} aria-label="Uso del mes">
          <div className="h-full rounded-full bg-indigo-cielo" style={{ width: `${porcentaje}%` }} />
        </div>
      </Tarjeta>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-alertas">
        <h2 id="titulo-alertas" className="text-lg font-semibold">Alertas</h2>
        {p.alertas.length === 0 ? (
          <p className="text-cuerpo-sm text-muted-foreground">No hay alertas. Te avisaremos si notamos algo que debas saber.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {p.alertas.map((a) => (
              <li key={a.id}>
                <Tarjeta className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    {a.vista ? <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden /> : <Bell className="mt-0.5 size-5 shrink-0 text-cochinilla" strokeWidth={2} aria-hidden />}
                    <div>
                      <p className="text-cuerpo-sm font-semibold">
                        {NOMBRE_TIPO_ALERTA[a.tipo]} · {a.vista ? "Vista" : "Nueva"}
                      </p>
                      <p>{a.detalle}</p>
                      <p className="text-cuerpo-sm text-muted-foreground">{formatoDia(a.creadaAt, { day: "numeric", month: "long" })}</p>
                    </div>
                  </div>
                  {!a.vista && (
                    <form action={marcarAlertaVistaAction} className="shrink-0">
                      <input type="hidden" name="alumnoId" value={p.alumno.id} />
                      <input type="hidden" name="alertaId" value={a.id} />
                      <BotonEnvio variante="secundario" tamano="sm">Marcar como vista</BotonEnvio>
                    </form>
                  )}
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-resumenes">
        <h2 id="titulo-resumenes" className="text-lg font-semibold">Resúmenes</h2>
        {p.resumenes.length === 0 ? (
          <p className="text-cuerpo-sm text-muted-foreground">Cuando {nombre} use Nudito+, aquí verás un resumen de lo que trabajó.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {p.resumenes.map((r) => (
              <li key={r.id}>
                <Tarjeta className="flex flex-col gap-2">
                  <p className="inline-flex items-center gap-1.5 text-cuerpo-sm font-semibold">
                    <BookOpenCheck className="size-4" strokeWidth={2} aria-hidden /> Del {fechaCorta(r.desde)} al {fechaCorta(r.hasta)}
                  </p>
                  <p>{r.texto}</p>
                  {r.temas.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {r.temas.map((t) => (
                        <li key={`${t.area}-${t.tema}`} className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-2.5 py-0.5 text-cuerpo-sm">
                          <MessageCircle className="size-3.5" strokeWidth={2} aria-hidden /> {t.area ? `${t.area}: ` : ""}{t.tema}
                        </li>
                      ))}
                    </ul>
                  )}
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>

      {p.pagos.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="titulo-pagos">
          <h2 id="titulo-pagos" className="text-lg font-semibold">Pagos</h2>
          <ul className="flex flex-col gap-2">
            {p.pagos.map((pg) => {
              const e = ESTADO_PAGO[pg.estado];
              return (
                <li key={pg.id}>
                  <Tarjeta className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2.5">
                      <Receipt className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
                      <div>
                        <p className="font-medium">{formatoMonto(pg.monto, pg.moneda)} · {textoMeses(pg.meses)}</p>
                        <p className="text-cuerpo-sm text-muted-foreground">Yape del {fechaCorta(pg.fechaPago)}{pg.referencia ? ` · operación ${pg.referencia}` : ""}</p>
                        {pg.motivo && <p className="text-cuerpo-sm">Motivo: {pg.motivo}</p>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-cuerpo-sm font-semibold ${e.clase}`}>
                      <e.Icono className="size-4" strokeWidth={2} aria-hidden /> {e.texto}
                    </span>
                  </Tarjeta>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="inline-flex max-w-prose items-start gap-1.5 text-cuerpo-sm text-muted-foreground">
        <Clock className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden /> Tú ves reportes, alertas y resúmenes, nunca las conversaciones de {nombre}.
      </p>
    </div>
  );
}
