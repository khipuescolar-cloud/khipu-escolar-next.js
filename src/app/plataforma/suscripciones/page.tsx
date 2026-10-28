import { CalendarClock, Download, FileText, Filter, FlaskConical, Receipt, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatoSoles, NOMBRE_CICLO, NOMBRE_ESTADO_SUSCRIPCION } from "@/lib/comercial";
import { fechaCorta } from "@/lib/fechas";
import { nombresDePlanes } from "@/lib/server/modulos";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { esquemaFiltroSuscripciones, reporteSuscripciones } from "@/lib/server/plataforma-suscripciones";
import { EstadoDeSuscripcion, EtiquetaRenovacion } from "../_componentes/EtiquetasComerciales";

export const metadata: Metadata = { title: "Suscripciones" };

export default async function Suscripciones({ searchParams }: PageProps<"/plataforma/suscripciones">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const filtro = esquemaFiltroSuscripciones.parse({ estado: sp.estado || undefined, plan: sp.plan || undefined });
  const [{ filas, resumen, diasAviso }, nombres] = await Promise.all([reporteSuscripciones(admin, filtro), nombresDePlanes()]);
  const query = new URLSearchParams(Object.entries(filtro).flatMap(([k, v]): [string, string][] => (v ? [[k, v]] : []))).toString();

  const tiles = [
    { titulo: "Ingreso mensual estimado", valor: formatoSoles(resumen.ingresoMensual), nota: "Activas; lo anual se divide entre 12", Icono: Receipt },
    { titulo: "Colegios en prueba", valor: String(resumen.enPrueba), nota: "Aún sin pago", Icono: FlaskConical },
    { titulo: "Renuevan en 30 días", valor: String(resumen.porRenovar), nota: `Próximos ${diasAviso} días`, Icono: CalendarClock },
    { titulo: "Vencidas sin pago", valor: String(resumen.vencidas), nota: "Renovación pasada, sin registrar pago", Icono: FileText },
  ];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Suscripciones"
        descripcion="Plan, monto y renovación de cada colegio. Los pagos se registran a mano desde la ficha del colegio."
        acciones={
          <a href={`/suscripciones/reporte.csv${query ? `?${query}` : ""}`} className={buttonVariants({ variant: "outline" })}>
            <Download strokeWidth={2} aria-hidden /> Descargar CSV
          </a>
        }
      />

      <section aria-labelledby="resumen-suscripciones" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <h2 id="resumen-suscripciones" className="sr-only">Resumen</h2>
        {tiles.map(({ titulo, valor, nota, Icono }) => (
          <Tarjeta key={titulo} className="flex flex-col gap-1 p-4">
            <p className="flex items-center gap-1.5 text-cuerpo-sm font-medium text-muted-foreground">
              <Icono className="size-4" strokeWidth={2} aria-hidden /> {titulo}
            </p>
            <p className="font-heading text-titulo-2 tabular-nums">{valor}</p>
            <p className="text-cuerpo-sm text-muted-foreground">{nota}</p>
          </Tarjeta>
        ))}
      </section>
      {resumen.sinSuscripcion > 0 && (
        <p className="-mt-3 text-cuerpo-sm text-muted-foreground">
          {resumen.sinSuscripcion === 1 ? "1 colegio aún no tiene suscripción." : `${resumen.sinSuscripcion} colegios aún no tienen suscripción.`}{" "}
          <Link href="/suscripciones?estado=sin" className="enlace font-semibold">Verlos</Link>
        </p>
      )}

      <Tarjeta className="p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
          <Selector etiqueta="Estado" name="estado" defaultValue={filtro.estado ?? ""}>
            <option value="">Todos</option>
            {Object.entries(NOMBRE_ESTADO_SUSCRIPCION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="sin">Sin suscripción</option>
          </Selector>
          <Selector etiqueta="Plan" name="plan" defaultValue={filtro.plan ?? ""}>
            <option value="">Todos</option>
            {Object.entries(nombres).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Selector>
          <div className="flex items-center gap-2">
            <Boton type="submit"><Filter strokeWidth={2} aria-hidden /> Filtrar</Boton>
            {query && (
              <Link href="/suscripciones" className={buttonVariants({ variant: "ghost" })}>
                <X strokeWidth={2} aria-hidden /> Quitar filtros
              </Link>
            )}
          </div>
        </form>
      </Tarjeta>

      {filas.length === 0 ? (
        <EstadoVacio
          icono={Receipt}
          titulo="Ningún colegio coincide con los filtros."
          descripcion="Prueba con otros filtros o quítalos para ver todos."
          accion={<Link href="/suscripciones" className={buttonVariants({ variant: "outline" })}>Quitar filtros</Link>}
        />
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sobretitulo pl-4">Colegio</TableHead>
                <TableHead className="sobretitulo">Plan</TableHead>
                <TableHead className="sobretitulo">Estado</TableHead>
                <TableHead className="sobretitulo text-right">Monto</TableHead>
                <TableHead className="sobretitulo text-right">Alumnos</TableHead>
                <TableHead className="sobretitulo">Próxima renovación</TableHead>
                <TableHead className="sobretitulo pr-4">Último pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => {
                const s = f.suscripcion;
                const excede = !!s && s.alumnosContratados !== null && f.alumnosActivos > s.alumnosContratados;
                return (
                  <TableRow key={f.tenantId}>
                    <TableCell className="pl-4">
                      <Link href={`/colegios/${f.tenantId}`} className="enlace font-semibold">{f.nombre}</Link>
                      <p className="font-mono text-cuerpo-sm text-muted-foreground">{f.slug}</p>
                    </TableCell>
                    <TableCell>Plan {nombres[s?.plan ?? f.planColegio]}</TableCell>
                    <TableCell>
                      {s ? <EstadoDeSuscripcion estado={s.estado} /> : <span className="text-muted-foreground">Sin suscripción</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s ? <>{formatoSoles(s.montoPorCiclo)}<span className="block text-cuerpo-sm text-muted-foreground">{NOMBRE_CICLO[s.ciclo].toLowerCase()}</span></> : "—"}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${excede ? "font-semibold text-tarde" : ""}`}>
                      {f.alumnosActivos}{s?.alumnosContratados != null ? ` / ${s.alumnosContratados}` : ""}
                      {excede && <span className="block text-cuerpo-sm">Pasa el contrato</span>}
                    </TableCell>
                    <TableCell>
                      {s && f.renovacion ? (
                        <div className="flex flex-col items-start gap-1">
                          <span>{fechaCorta(s.proximaRenovacion)}</span>
                          <EtiquetaRenovacion renovacion={f.renovacion} />
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="pr-4">{f.ultimoPago ? fechaCorta(f.ultimoPago) : "Sin pagos"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Tarjeta>
      )}
    </div>
  );
}
