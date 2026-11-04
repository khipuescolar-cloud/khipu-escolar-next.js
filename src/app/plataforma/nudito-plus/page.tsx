import { Ban, CheckCircle2, History, Inbox, PauseCircle, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta } from "@/lib/fechas";
import { formatoMonto, textoMeses } from "@/lib/nudito-plus";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { colegiosNudito, pagosPendientes, resumenNuditoPlus } from "@/lib/server/plataforma-nudito-plus";
import { bloquearNuditoColegioAction } from "./actions";
import { CampoMotivo } from "./CampoMotivo";
import { DialogoAccion } from "./DialogoAccion";
import { Pestanas } from "./Pestanas";

export const metadata: Metadata = { title: "Nudito" };

const usd = (n: number) => `US$ ${n.toFixed(2)}`;

/**
 * Nudito en el panel (specs/44): estado por colegio, consumo agregado del mes y bloqueo de plataforma. Licencias y pagos
 * de Yape (specs/28) solo como histórico, sin acciones. Nunca se ven conversaciones.
 */
export default async function NuditoPlataforma() {
  const admin = await requireAdminPlataforma();
  const [colegios, pagos, historico] = await Promise.all([colegiosNudito(admin), pagosPendientes(admin), resumenNuditoPlus(admin)]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Nudito"
        descripcion="Tutor de práctica incluido en Khipu Pro. Cada colegio lo activa desde su configuración. Aquí ves el consumo agregado y puedes bloquearlo; nunca las conversaciones."
      />
      <Pestanas actual="/nudito-plus" />

      <section aria-labelledby="titulo-colegios" className="flex flex-col gap-3">
        <h2 id="titulo-colegios" className="text-lg font-semibold">Colegios</h2>
        {colegios.length === 0 ? (
          <EstadoVacio icono={Inbox} titulo="Aún no hay colegios con Khipu Pro." />
        ) : (
          <Tarjeta className="overflow-x-auto p-0">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sobretitulo pl-4">Colegio</TableHead>
                  <TableHead className="sobretitulo">Estado</TableHead>
                  <TableHead className="sobretitulo text-right">Sesiones del mes</TableHead>
                  <TableHead className="sobretitulo text-right">Costo IA del mes</TableHead>
                  <TableHead className="sobretitulo pr-4 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colegios.map((c) => (
                  <TableRow key={c.tenantId} data-testid={`nudito-colegio-${c.tenantId}`}>
                    <TableCell className="pl-4 font-semibold">
                      {c.nombre}
                      {c.plan !== "pro" && <span className="block text-cuerpo-sm font-normal text-muted-foreground">Ya no es Khipu Pro</span>}
                    </TableCell>
                    <TableCell>
                      {c.bloqueado ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-falta"><Ban className="size-4" strokeWidth={2} aria-hidden /> Bloqueado</span>
                      ) : c.activo ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-llego"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden /> Activo</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><PauseCircle className="size-4" strokeWidth={2} aria-hidden /> Apagado por el colegio</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.sesionesMes}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(c.costoMesUsd)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <DialogoAccion
                        etiqueta={c.bloqueado ? <><ShieldCheck strokeWidth={2} aria-hidden /> Desbloquear</> : <><Ban strokeWidth={2} aria-hidden /> Bloquear</>}
                        titulo={c.bloqueado ? `Desbloquear Nudito en ${c.nombre}` : `Bloquear Nudito en ${c.nombre}`}
                        descripcion={c.bloqueado ? "El colegio vuelve a decidir si usa Nudito." : "Nadie del colegio podrá usar Nudito hasta que lo desbloquees. Queda en la auditoría de plataforma."}
                        confirmar={c.bloqueado ? "Desbloquear" : "Bloquear"}
                        accion={bloquearNuditoColegioAction}
                        campos={{ tenantId: c.tenantId, bloquear: String(!c.bloqueado) }}
                        peligro={!c.bloqueado}
                      >
                        <CampoMotivo id={`motivo-${c.tenantId}`} ayuda="P. ej. «Incidente de seguridad en revisión»." />
                      </DialogoAccion>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Tarjeta>
        )}
      </section>

      <section aria-labelledby="titulo-historico" className="flex flex-col gap-3">
        <h2 id="titulo-historico" className="inline-flex items-center gap-2 text-lg font-semibold">
          <History className="size-5" strokeWidth={2} aria-hidden /> Histórico de licencias familiares
        </h2>
        <p className="text-cuerpo-sm text-muted-foreground">
          Licencias vigentes: {historico.totales.vigentes} · Pagos sin revisar: {historico.totales.pendientes} · Cobrado este mes: {formatoMonto(historico.totales.ingresosMes)}.
          Solo consulta: ya no se verifican pagos ni se activan licencias. <Link href="/nudito-plus/licencias" className="enlace">Ver licencias</Link>
        </p>
        {pagos.length > 0 && (
          <ul className="flex flex-col gap-2" data-testid="pagos-historico">
            {pagos.map((p) => (
              <li key={p.id}>
                <Tarjeta className="flex flex-col gap-1">
                  <p className="font-semibold">{p.alumno.nombre} <span className="font-normal text-muted-foreground">· {p.colegio.nombre}</span></p>
                  <p className="text-cuerpo-sm">{formatoMonto(p.monto)} por {textoMeses(p.meses)} · Yape del {fechaCorta(p.fechaPago)} · operación <span className="font-mono">{p.referencia ?? "—"}</span> · sin revisar</p>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
