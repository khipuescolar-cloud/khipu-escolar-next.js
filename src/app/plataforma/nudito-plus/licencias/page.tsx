import { Ban, CalendarPlus, CalendarX2, CheckCircle2, Filter, Gift, KeyRound, Plus, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta, fechaLima } from "@/lib/fechas";
import { diasParaVencer, NOMBRE_ESTADO_LICENCIA, NOMBRE_ORIGEN } from "@/lib/nudito-plus";
import { licenciasFamiliaresNudito } from "@/lib/planes";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { colegiosConLicencias, esquemaFiltroLicencias, listarLicencias, type FilaLicencia } from "@/lib/server/plataforma-nudito-plus";
import { cancelarLicenciaAction, extenderLicenciaAction } from "../actions";
import { CampoMotivo } from "../CampoMotivo";
import { DialogoAccion } from "../DialogoAccion";
import { Pestanas } from "../Pestanas";

export const metadata: Metadata = { title: "Licencias de Nudito+" };

const ICONO_ESTADO = {
  activa: { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  vencida: { Icono: CalendarX2, clase: "bg-muted text-foreground" },
  cancelada: { Icono: Ban, clase: "bg-falta-fondo text-falta" },
} as const;

function EstadoFila({ l, hoy }: { l: FilaLicencia; hoy: string }) {
  const { Icono, clase } = ICONO_ESTADO[l.estado];
  const dias = diasParaVencer(l.hasta, hoy);
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta ${clase}`}>
        <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {NOMBRE_ESTADO_LICENCIA[l.estado]}
      </span>
      {l.estado === "activa" && dias <= 7 && <span className="text-cuerpo-sm font-semibold text-tarde">{dias === 0 ? "Vence hoy" : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`}</span>}
    </div>
  );
}

/** Licencias de Nudito+ con filtros y acciones manuales (extender, cancelar) con motivo auditado. */
export default async function LicenciasNudito({ searchParams }: PageProps<"/plataforma/nudito-plus/licencias">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const filtro = esquemaFiltroLicencias.parse({ colegio: sp.colegio || undefined, estado: sp.estado || undefined, vence: sp.vence || undefined });
  const hoy = fechaLima(new Date());
  const [licencias, colegios] = await Promise.all([listarLicencias(admin, filtro, hoy), colegiosConLicencias(admin)]);
  const conAcciones = licenciasFamiliaresNudito();
  const hayFiltro = !!(filtro.colegio || filtro.estado || filtro.vence);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Licencias (histórico)"
        descripcion={conAcciones ? "Licencias por alumno. Las de pago se crean al verificar un Yape; aquí puedes dar cortesías o pruebas, extender y cancelar." : "Licencias familiares de Nudito+ (ya no se usan: Nudito es parte de Khipu Pro). Solo consulta."}
        acciones={
          conAcciones && <Link href="/nudito-plus/licencias/nueva" className={buttonVariants()}>
            <Plus strokeWidth={2} aria-hidden /> Cortesía o prueba
          </Link>
        }
      />
      <Pestanas actual="/nudito-plus/licencias" />

      <Tarjeta className="p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
          <Selector etiqueta="Colegio" name="colegio" defaultValue={filtro.colegio ?? ""}>
            <option value="">Todos</option>
            {colegios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Selector>
          <Selector etiqueta="Estado" name="estado" defaultValue={filtro.estado ?? ""}>
            <option value="">Todos</option>
            {Object.entries(NOMBRE_ESTADO_LICENCIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Selector>
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="vence" value="7" defaultChecked={!!filtro.vence} className="size-4" /> Vencen en 7 días
          </label>
          <div className="flex items-center gap-2">
            <Boton type="submit"><Filter strokeWidth={2} aria-hidden /> Filtrar</Boton>
            {hayFiltro && (
              <Link href="/nudito-plus/licencias" className={buttonVariants({ variant: "ghost" })}>
                <X strokeWidth={2} aria-hidden /> Quitar filtros
              </Link>
            )}
          </div>
        </form>
      </Tarjeta>

      {licencias.length === 0 ? (
        <EstadoVacio icono={KeyRound} titulo={hayFiltro ? "Ninguna licencia coincide con los filtros." : "Aún no hay licencias de Nudito+."} descripcion="Se crean al verificar el primer pago de una familia." />
      ) : (
        <Tarjeta className="overflow-x-auto p-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sobretitulo pl-4">Alumno</TableHead>
                <TableHead className="sobretitulo">Colegio</TableHead>
                <TableHead className="sobretitulo">Estado</TableHead>
                <TableHead className="sobretitulo">Origen</TableHead>
                <TableHead className="sobretitulo">Periodo</TableHead>
                <TableHead className="sobretitulo pr-4">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licencias.map((l) => (
                <TableRow key={l.id} className="align-top">
                  <TableCell className="pl-4">
                    <p className="font-semibold">{l.alumno.nombre}</p>
                    <p className="text-cuerpo-sm text-muted-foreground">{l.alumno.salon}</p>
                  </TableCell>
                  <TableCell>{l.colegio.nombre}</TableCell>
                  <TableCell><EstadoFila l={l} hoy={hoy} /></TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      {l.origen !== "pago" && <Gift className="size-4" strokeWidth={2} aria-hidden />}
                      {NOMBRE_ORIGEN[l.origen]}
                      {l.pagos > 0 && <span className="text-cuerpo-sm text-muted-foreground">({l.pagos} {l.pagos === 1 ? "pago" : "pagos"})</span>}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {fechaCorta(l.desde)} – {fechaCorta(l.hasta)}
                    {l.notas && (
                      <details className="mt-1 max-w-xs whitespace-normal text-cuerpo-sm text-muted-foreground">
                        <summary className="cursor-pointer">Historial</summary>
                        <p className="whitespace-pre-line">{l.notas}</p>
                      </details>
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    {conAcciones && l.estado !== "cancelada" && (
                      <div className="flex flex-wrap gap-2">
                        <DialogoAccion
                          etiqueta={<><CalendarPlus strokeWidth={2} aria-hidden /> Extender</>}
                          titulo={`Extender licencia de ${l.alumno.nombre}`}
                          descripcion={l.estado === "vencida" ? "Está vencida: el nuevo periodo empieza hoy." : `Se suma al final del periodo actual (${fechaCorta(l.hasta)}).`}
                          confirmar="Extender"
                          accion={extenderLicenciaAction}
                          campos={{ licenciaId: l.id }}
                        >
                          <Selector etiqueta="Meses" name="meses" defaultValue="1">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "1 mes" : `${n} meses`}</option>)}
                          </Selector>
                          <CampoMotivo id={`motivo-ext-${l.id}`} ayuda="P. ej. «Compensación por caída del servicio»." />
                        </DialogoAccion>
                        <DialogoAccion
                          etiqueta={<><Ban strokeWidth={2} aria-hidden /> Cancelar</>}
                          titulo={`Cancelar licencia de ${l.alumno.nombre}`}
                          descripcion="El alumno deja de usar Nudito+ de inmediato. La licencia queda en el historial."
                          confirmar="Cancelar licencia"
                          accion={cancelarLicenciaAction}
                          campos={{ licenciaId: l.id }}
                          peligro
                          variante="ghost"
                        >
                          <CampoMotivo id={`motivo-can-${l.id}`} />
                        </DialogoAccion>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Tarjeta>
      )}
    </div>
  );
}
