import { AlertTriangle, CalendarClock, CheckCircle2, Hourglass, Inbox, Wallet, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta, formatoDia } from "@/lib/fechas";
import { formatoMonto, textoMeses } from "@/lib/nudito-plus";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { pagosPendientes, resumenNuditoPlus } from "@/lib/server/plataforma-nudito-plus";
import { rechazarPagoAction, verificarPagoAction } from "./actions";
import { CampoMotivo } from "./CampoMotivo";
import { DialogoAccion } from "./DialogoAccion";
import { Pestanas } from "./Pestanas";

export const metadata: Metadata = { title: "Nudito+" };

/** Nudito+ (specs/28): cola de pagos por verificar y resumen por colegio. Sin conversaciones de los alumnos. */
export default async function NuditoPlusPlataforma() {
  const admin = await requireAdminPlataforma();
  const [pagos, { colegios, totales }] = await Promise.all([pagosPendientes(admin), resumenNuditoPlus(admin)]);

  const tiles = [
    { titulo: "Pagos por verificar", valor: String(totales.pendientes), nota: "Reportados por las familias", Icono: Hourglass },
    { titulo: "Licencias vigentes", valor: String(totales.vigentes), nota: "Alumnos que pueden usarlo hoy", Icono: CheckCircle2 },
    { titulo: "Vencen en 7 días", valor: String(totales.porVencer), nota: "Recordatorio a 3 días", Icono: CalendarClock },
    { titulo: "Verificado este mes", valor: formatoMonto(totales.ingresosMes), nota: "Pagos de Yape confirmados", Icono: Wallet },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Nudito+"
        descripcion="Tutor con IA que compra cada familia (Yape, prepago). Verifica el abono en la app de Yape antes de activar. Aquí nunca se ven las conversaciones."
      />
      <Pestanas actual="/nudito-plus" />

      <section aria-labelledby="resumen-nudito" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <h2 id="resumen-nudito" className="sr-only">Resumen</h2>
        {tiles.map(({ titulo, valor, nota, Icono }) => (
          <Tarjeta key={titulo} className="flex flex-col gap-1 p-4">
            <p className="flex items-center gap-1.5 text-cuerpo-sm font-medium text-muted-foreground">
              <Icono className="size-4 shrink-0" strokeWidth={2} aria-hidden /> {titulo}
            </p>
            <p className="font-heading text-titulo-2 tabular-nums">{valor}</p>
            <p className="text-cuerpo-sm text-muted-foreground">{nota}</p>
          </Tarjeta>
        ))}
      </section>

      <section aria-labelledby="titulo-pendientes" className="flex flex-col gap-3">
        <h2 id="titulo-pendientes" className="text-lg font-semibold">Pagos por verificar</h2>
        {pagos.length === 0 ? (
          <EstadoVacio icono={Inbox} titulo="No hay pagos por verificar." descripcion="Cuando una familia reporte un Yape, aparecerá aquí." />
        ) : (
          <ul className="flex flex-col gap-3" data-testid="pagos-pendientes">
            {pagos.map((p) => {
              const difiere = Math.abs(p.monto - p.esperado) >= 0.01;
              return (
                <li key={p.id}>
                  <Tarjeta className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" data-testid={`pago-${p.referencia ?? p.id}`}>
                    <div className="grid min-w-0 gap-1">
                      <p className="font-semibold">
                        {p.alumno.nombre} <span className="font-normal text-muted-foreground">· {p.alumno.salon} · {p.colegio.nombre}</span>
                      </p>
                      <p className="text-cuerpo-sm">
                        <span className="font-semibold tabular-nums">{formatoMonto(p.monto)}</span> por {textoMeses(p.meses)} · Yape del {fechaCorta(p.fechaPago)} · operación{" "}
                        <span className="font-mono">{p.referencia ?? "—"}</span>
                      </p>
                      {difiere && (
                        <p className="inline-flex items-center gap-1 text-cuerpo-sm font-semibold text-tarde">
                          <AlertTriangle className="size-4" strokeWidth={2} aria-hidden /> Monto distinto: se esperaban {formatoMonto(p.esperado)}
                        </p>
                      )}
                      {p.colegio.plan !== "pro" && (
                        <p className="inline-flex items-center gap-1 text-cuerpo-sm font-semibold text-falta">
                          <XCircle className="size-4" strokeWidth={2} aria-hidden /> El colegio ya no tiene Khipu Pro
                        </p>
                      )}
                      <p className="text-cuerpo-sm text-muted-foreground">
                        Reportó {p.apoderado ? `${p.apoderado.nombre} (${p.apoderado.email})` : "una familia"} el {formatoDia(p.reportadoAt, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <BotonConfirmar
                        etiqueta={<><CheckCircle2 strokeWidth={2} aria-hidden /> Verificar</>}
                        titulo="¿Verificar este pago?"
                        descripcion={`Confirma que recibiste ${formatoMonto(p.monto)} en Yape con la operación ${p.referencia ?? "—"}. Se activará o extenderá Nudito+ de ${p.alumno.nombre} por ${textoMeses(p.meses)} y avisaremos a la familia.`}
                        confirmar="Verificar y activar"
                        accion={verificarPagoAction}
                        campos={{ pagoId: p.id }}
                        variante="default"
                        tamano="sm"
                      />
                      <DialogoAccion
                        etiqueta={<><XCircle strokeWidth={2} aria-hidden /> Rechazar</>}
                        titulo="Rechazar pago"
                        descripcion="La familia que lo reportó verá el motivo y podrá volver a reportarlo."
                        confirmar="Rechazar pago"
                        accion={rechazarPagoAction}
                        campos={{ pagoId: p.id }}
                        peligro
                      >
                        <CampoMotivo id={`motivo-${p.id}`} ayuda="P. ej. «No encontramos esa operación en Yape»." />
                      </DialogoAccion>
                    </div>
                  </Tarjeta>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-colegios" className="flex flex-col gap-3">
        <h2 id="titulo-colegios" className="text-lg font-semibold">Por colegio</h2>
        {colegios.length === 0 ? (
          <EstadoVacio icono={Inbox} titulo="Aún no hay colegios con Khipu Pro." />
        ) : (
          <Tarjeta className="overflow-x-auto p-0">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sobretitulo pl-4">Colegio</TableHead>
                  <TableHead className="sobretitulo text-right">Vigentes</TableHead>
                  <TableHead className="sobretitulo text-right">Por verificar</TableHead>
                  <TableHead className="sobretitulo text-right">Vencidas</TableHead>
                  <TableHead className="sobretitulo pr-4 text-right">Cobrado (total)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colegios.map((c) => (
                  <TableRow key={c.tenantId}>
                    <TableCell className="pl-4">
                      <Link href={`/nudito-plus/licencias?colegio=${c.tenantId}`} className="enlace font-semibold">{c.nombre}</Link>
                      {c.plan !== "pro" && <span className="block text-cuerpo-sm text-muted-foreground">Ya no es Khipu Pro</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.vigentes}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.pendientes}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.vencidas}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{formatoMonto(c.ingresos)}</TableCell>
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
