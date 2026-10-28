import { AlertTriangle, CalendarClock, FileText, Receipt } from "lucide-react";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { estadoRenovacion, finDePeriodo, formatoSoles, NOMBRE_CICLO, nombreMetodo } from "@/lib/comercial";
import { fechaCorta, sumarDias } from "@/lib/fechas";
import type { Plan } from "@/generated/prisma/enums";
import type { suscripcionDelColegio } from "@/lib/server/plataforma-suscripciones";
import { cambiarPlanAction } from "../../../actions";
import { EstadoDeSuscripcion, EtiquetaRenovacion } from "../../../_componentes/EtiquetasComerciales";
import { anularPagoAction } from "../_acciones";
import { DialogoPago } from "./DialogoPago";
import { HojaSuscripcion } from "./HojaSuscripcion";

type Datos = Awaited<ReturnType<typeof suscripcionDelColegio>>;

/** «Suscripción» de la ficha del colegio (specs/20): contrato, alumnos contratados vs. activos y pagos manuales. */
export function SeccionSuscripcion({ datos, nombres, ofrecidos }: { datos: Datos; nombres: Record<Plan, string>; ofrecidos: { plan: Plan; nombre: string }[] }) {
  const { tenant, suscripcion: s, pagos, alumnosActivos, hoy } = datos;
  // Solo se ofrecen planes activos; si el actual ya no se ofrece, se conserva marcado para no perderlo al guardar.
  const planActual = s?.plan ?? tenant.plan;
  const opcionesPlan = ofrecidos.some((p) => p.plan === planActual) ? ofrecidos : [...ofrecidos, { plan: planActual, nombre: `${nombres[planActual]} (no se ofrece)` }];
  const renovacion = s ? estadoRenovacion(s.proximaRenovacion, hoy) : null;
  const excede = !!s && s.alumnosContratados !== null && alumnosActivos > s.alumnosContratados;
  const ciclo = s?.ciclo ?? "mensual";
  const desde = s && renovacion?.tipo !== "vencida" ? s.proximaRenovacion : hoy;
  const porDefecto = {
    plan: s?.plan ?? tenant.plan,
    ciclo,
    estado: s?.estado ?? "prueba",
    montoPorCiclo: s?.montoPorCiclo ?? null,
    alumnosContratados: s?.alumnosContratados ?? null,
    inicio: s?.inicio ?? hoy,
    proximaRenovacion: s?.proximaRenovacion ?? sumarDias(hoy, 30),
    notas: s?.notas ?? null,
  };

  return (
    <section aria-labelledby="suscripcion" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="suscripcion" className="flex items-center gap-2 font-heading text-titulo-2">
          <Receipt className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Suscripción
        </h2>
        <div className="flex flex-wrap gap-2">
          <HojaSuscripcion tenantId={tenant.id} datos={porDefecto} existe={!!s} planes={opcionesPlan} />
          <DialogoPago
            tenantId={tenant.id}
            monto={s?.montoPorCiclo ?? null}
            fechaPago={hoy}
            periodoDesde={desde}
            periodoHasta={finDePeriodo(desde, ciclo)}
            hayRenovacion={!!s}
          />
        </div>
      </div>

      {!s ? (
        <EstadoVacio icono={FileText} titulo="Este colegio aún no tiene suscripción." descripcion="Crea la suscripción para llevar su plan, monto, renovación y pagos." />
      ) : (
        <Tarjeta className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <Dato titulo="Plan">Plan {nombres[s.plan]}</Dato>
            <Dato titulo="Estado"><EstadoDeSuscripcion estado={s.estado} /></Dato>
            <Dato titulo="Ciclo">{NOMBRE_CICLO[s.ciclo]}</Dato>
            <Dato titulo={`Monto ${s.ciclo === "anual" ? "anual" : "mensual"}`}><span className="tabular-nums">{formatoSoles(s.montoPorCiclo)}</span></Dato>
            <Dato titulo="Alumnos activos / contratados">
              <span className="tabular-nums">{alumnosActivos} / {s.alumnosContratados ?? "sin tope"}</span>
            </Dato>
            <Dato titulo="Inicio">{fechaCorta(s.inicio)}</Dato>
            <Dato titulo="Próxima renovación">
              <span className="flex flex-wrap items-center gap-2">
                {fechaCorta(s.proximaRenovacion)}
                {renovacion && <EtiquetaRenovacion renovacion={renovacion} />}
              </span>
            </Dato>
            <Dato titulo="Notas">{s.notas ?? "—"}</Dato>
          </dl>
          {excede && (
            <Alerta tipo="aviso">
              El colegio tiene {alumnosActivos} alumnos activos y contrató {s.alumnosContratados}. Conviene hablar de ampliar el contrato.
            </Alerta>
          )}
          {s.plan !== tenant.plan && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-tarde/20 bg-tarde-fondo px-3.5 py-3 text-cuerpo-sm text-tarde">
              <p className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                <span>La suscripción dice plan {nombres[s.plan]}, pero el colegio usa el plan {nombres[tenant.plan]}.</span>
              </p>
              <BotonConfirmar
                etiqueta="Aplicar plan al colegio"
                titulo={`¿Pasar el colegio al plan ${nombres[s.plan]}?`}
                descripcion="Cambia las funciones disponibles para todo el colegio de inmediato."
                confirmar="Aplicar plan"
                accion={cambiarPlanAction}
                campos={{ tenantId: tenant.id, plan: s.plan }}
                tamano="sm"
              />
            </div>
          )}
        </Tarjeta>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 font-heading text-lg"><CalendarClock className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden /> Pagos registrados</h3>
        {pagos.length === 0 ? (
          <p className="text-cuerpo-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
        ) : (
          <Tarjeta className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sobretitulo pl-4">Fecha</TableHead>
                    <TableHead className="sobretitulo text-right">Monto</TableHead>
                    <TableHead className="sobretitulo">Periodo</TableHead>
                    <TableHead className="sobretitulo">Método</TableHead>
                    <TableHead className="sobretitulo">Comprobante</TableHead>
                    <TableHead className="sobretitulo">Registró</TableHead>
                    <TableHead className="pr-4"><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((p) => (
                    <TableRow key={p.id} data-testid="pago">
                      <TableCell className="pl-4">{fechaCorta(p.fechaPago)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatoSoles(p.monto)}</TableCell>
                      <TableCell>{fechaCorta(p.periodoDesde)} – {fechaCorta(p.periodoHasta)}</TableCell>
                      <TableCell>{nombreMetodo(p.metodo)}</TableCell>
                      <TableCell>{p.comprobante ?? "—"}</TableCell>
                      <TableCell>{p.registradoPor}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <BotonConfirmar
                          etiqueta="Anular"
                          titulo="¿Anular este pago?"
                          descripcion={`Se borra el registro de ${formatoSoles(p.monto)} del ${fechaCorta(p.fechaPago)}. Queda constancia en la auditoría.`}
                          confirmar="Anular pago"
                          accion={anularPagoAction}
                          campos={{ tenantId: tenant.id, pagoId: p.id }}
                          variante="ghost"
                          tamano="sm"
                          peligro
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Tarjeta>
        )}
      </div>
    </section>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-cuerpo-sm font-medium text-muted-foreground">{titulo}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
