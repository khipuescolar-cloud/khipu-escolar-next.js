import { CheckCircle2, CircleOff, School } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { ICONOS_NAV } from "@/components/shell/iconos";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INFO_MODULO, MODULO_ESENCIAL, MODULOS } from "@/lib/modulos";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { planesDelCatalogo } from "@/lib/server/plataforma-planes";
import { cambiarModuloDePlanAction, editarPlanAction } from "./actions";
import { CeldaPlanModulo } from "./CeldaPlanModulo";
import { HojaEditarPlan } from "./HojaEditarPlan";

export const metadata: Metadata = { title: "Planes y módulos" };

const soles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const entero = new Intl.NumberFormat("es-PE");

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-cuerpo-sm text-muted-foreground">{titulo}</dt>
      <dd className="font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}

/** Catálogo de planes y qué módulos incluye cada uno (specs/19). La BD es la fuente de verdad. */
export default async function PlanesPage() {
  const admin = await requireAdminPlataforma();
  const planes = await planesDelCatalogo(admin);

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Planes y módulos"
        descripcion="Lo que ofrece cada plan. Los cambios rigen para todos los colegios del plan en menos de un minuto; los ajustes por colegio se hacen en su ficha."
      />

      <section aria-labelledby="planes" className="flex flex-col gap-3">
        <h2 id="planes" className="text-titulo-2">Planes</h2>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {planes.map((p) => (
            <li key={p.plan}>
              <Tarjeta className="flex h-full flex-col gap-3" data-testid={`plan-${p.plan}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="sobretitulo">{p.plan}</p>
                    <h3 className="text-titulo-2">{p.nombre}</h3>
                  </div>
                  {p.activo ? (
                    <span className="inline-flex items-center gap-1 rounded-pildora bg-llego-fondo px-2 py-0.5 text-etiqueta text-llego">
                      <CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-2 py-0.5 text-etiqueta text-muted-foreground">
                      <CircleOff className="size-3.5" strokeWidth={2} aria-hidden /> No se ofrece
                    </span>
                  )}
                </div>
                {p.descripcion && <p className="text-cuerpo-sm text-muted-foreground">{p.descripcion}</p>}
                <dl className="grid grid-cols-2 gap-3 text-cuerpo-sm">
                  <Dato titulo="Por alumno al mes" valor={p.precioPorAlumno === null ? "A convenir" : soles.format(p.precioPorAlumno)} />
                  <Dato titulo="Mínimo mensual" valor={p.precioMinimoMensual === null ? "—" : soles.format(p.precioMinimoMensual)} />
                  <Dato titulo="Tope de alumnos" valor={p.maxAlumnos === null ? "Sin tope" : entero.format(p.maxAlumnos)} />
                  <Dato titulo="Módulos" valor={String(p.modulos.length)} />
                </dl>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <span className="inline-flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground">
                    <School className="size-4" strokeWidth={2} aria-hidden />
                    {p.colegios === 1 ? "1 colegio lo usa" : `${p.colegios} colegios lo usan`}
                  </span>
                  <HojaEditarPlan
                    datos={{
                      plan: p.plan, nombre: p.nombre, descripcion: p.descripcion, precioPorAlumno: p.precioPorAlumno,
                      precioMinimoMensual: p.precioMinimoMensual, maxAlumnos: p.maxAlumnos, activo: p.activo,
                    }}
                    accion={editarPlanAction}
                  />
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="matriz" className="flex flex-col gap-3">
        <div>
          <h2 id="matriz" className="text-titulo-2">Módulos por plan</h2>
          <p className="text-cuerpo-sm text-muted-foreground">
            Marca qué módulos incluye cada plan. Gestión es esencial y está en todos. Quitar un módulo que usan colegios pide confirmación.
          </p>
        </div>
        <Tarjeta className="overflow-x-auto p-0 sm:p-0">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sobretitulo pl-4">Módulo</TableHead>
                {planes.map((p) => (
                  <TableHead key={p.plan} className="sobretitulo text-center">{p.nombre}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULOS.map((m) => {
                const info = INFO_MODULO[m];
                const Icono = ICONOS_NAV[info.icono];
                return (
                  <TableRow key={m} data-testid={`fila-modulo-${m}`}>
                    <TableCell className="max-w-80 pl-4 whitespace-normal">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-superficie-2 text-primary">
                          <Icono className="size-4" strokeWidth={2} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold">{info.nombre}</p>
                          <p className="text-cuerpo-sm text-muted-foreground">{info.descripcion}</p>
                        </div>
                      </div>
                    </TableCell>
                    {planes.map((p) => (
                      <TableCell key={p.plan} className="text-center">
                        <CeldaPlanModulo
                          plan={p.plan}
                          nombrePlan={p.nombre}
                          modulo={m}
                          nombreModulo={info.nombre}
                          incluido={p.modulos.includes(m)}
                          esencial={m === MODULO_ESENCIAL}
                          afectados={p.colegios}
                          accion={cambiarModuloDePlanAction}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Tarjeta>
      </section>
    </div>
  );
}
