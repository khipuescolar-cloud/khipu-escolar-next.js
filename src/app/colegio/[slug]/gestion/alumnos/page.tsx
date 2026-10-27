import { CheckCircle2, FileUp, GraduationCap, Search, UserPlus, UserRoundX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarAlumnos, listarSalones } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarEstadoAlumnoAction, crearAlumnoAction, editarAlumnoAction, importarAlumnosAction } from "../actions";
import { AccionesFila } from "../_componentes/AccionesFila";
import { AvatarPersona } from "../_componentes/AvatarPersona";
import { CampoArchivoCsv } from "../_componentes/CargaCsv";
import { PanelFormulario } from "../_componentes/PanelFormulario";

export const metadata: Metadata = { title: "Alumnos" };

export default async function AlumnosPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/alumnos">) {
  const { slug } = await params;
  const { ok, error, salon, retirados } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const salonId = typeof salon === "string" && salon ? salon : undefined;
  const verRetirados = retirados === "1";
  const [salones, alumnos] = await Promise.all([listarSalones(ctx), listarAlumnos(ctx, { salonId, incluirRetirados: verRetirados })]);
  const opcionesSalon = salones.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.anio})</option>);

  const acciones = (
    <>
      <PanelFormulario
        variante="outline"
        boton={<><FileUp strokeWidth={2} aria-hidden /> Importar CSV</>}
        titulo="Importar desde un archivo CSV"
        descripcion={<>Columnas: <code>nombres, apellidos, codigo, salon</code>. El salón debe existir con el mismo nombre. Si alguna fila falla, no se importa ninguna.</>}
      >
        <form action={importarAlumnosAction} className="flex flex-col gap-4">
          <CampoArchivoCsv />
          <Boton type="submit" className="self-start">Importar</Boton>
        </form>
      </PanelFormulario>
      <PanelFormulario boton={<><UserPlus strokeWidth={2} aria-hidden /> Agregar alumno</>} titulo="Agregar un alumno" descripcion="Queda dentro del salón que elijas.">
        <form action={crearAlumnoAction} className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombres" name="nombres" required />
          <Campo etiqueta="Apellidos" name="apellidos" required />
          <Campo etiqueta="Código (opcional)" name="codigo" />
          <Selector etiqueta="Salón" name="salonId" required>{opcionesSalon}</Selector>
          <Boton type="submit" className="justify-self-start sm:col-span-2">Agregar alumno</Boton>
        </form>
      </PanelFormulario>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <EncabezadoPagina titulo="Alumnos" descripcion="Alumnos matriculados, su salón y su estado." acciones={acciones} />
        <Flash ok={ok} error={error} />
      </div>

      <Tarjeta className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3" role="search">
          <Selector etiqueta="Filtrar por salón" name="salon" defaultValue={salonId ?? ""}>
            <option value="">Todos</option>
            {opcionesSalon}
          </Selector>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="retirados" value="1" defaultChecked={verRetirados} className="size-5 accent-primary" /> Incluir retirados
          </label>
          <Boton type="submit" variante="secundario"><Search strokeWidth={2} aria-hidden /> Filtrar</Boton>
          <Link href="/gestion/alumnos" className="inline-flex h-10 items-center px-2 text-sm font-semibold text-primary hover:underline">Limpiar</Link>
        </form>
      </Tarjeta>

      {alumnos.length === 0 ? (
        <EstadoVacio icono={GraduationCap} titulo="No hay alumnos con ese filtro" descripcion="Prueba con otro salón o agrega a un alumno con el botón de arriba." />
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <Table>
            <caption className="sr-only">Alumnos del colegio</caption>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-11 px-4">Alumno</TableHead>
                <TableHead className="hidden h-11 px-4 sm:table-cell">Código</TableHead>
                <TableHead className="hidden h-11 px-4 sm:table-cell">Salón</TableHead>
                <TableHead className="h-11 px-4">Estado</TableHead>
                <TableHead className="h-11 w-14 px-4"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnos.map((a) => {
                const activo = a.estado === "activo";
                const nombre = `${a.nombres} ${a.apellidos}`;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AvatarPersona nombres={a.nombres} apellidos={a.apellidos} />
                        <span className="min-w-0"><span className="font-semibold">{nombre}</span><span className="block text-xs text-muted-foreground sm:hidden">{a.salon.nombre}</span></span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 sm:table-cell">{a.codigo ?? "—"}</TableCell>
                    <TableCell className="hidden px-4 py-3 sm:table-cell">{a.salon.nombre}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={`h-6 px-2.5 text-xs font-semibold ${activo ? "bg-llego-fondo text-llego" : "bg-muted text-muted-foreground"}`}>
                        {activo ? <CheckCircle2 strokeWidth={2} aria-hidden /> : <UserRoundX strokeWidth={2} aria-hidden />}
                        {activo ? "Activo" : "Retirado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <AccionesFila
                        etiqueta={`Acciones para ${nombre}`}
                        items={[
                          {
                            tipo: "panel", texto: "Editar", icono: "editar", titulo: `Editar a ${nombre}`,
                            contenido: (
                              <form action={editarAlumnoAction} className="grid gap-4 sm:grid-cols-2">
                                <input type="hidden" name="id" value={a.id} />
                                <Campo etiqueta="Nombres" name="nombres" defaultValue={a.nombres} required />
                                <Campo etiqueta="Apellidos" name="apellidos" defaultValue={a.apellidos} required />
                                <Campo etiqueta="Código" name="codigo" defaultValue={a.codigo ?? ""} />
                                <Selector etiqueta="Salón" name="salonId" defaultValue={a.salonId}>{opcionesSalon}</Selector>
                                <Boton type="submit" className="justify-self-start sm:col-span-2">Guardar</Boton>
                              </form>
                            ),
                          },
                          activo
                            ? {
                                tipo: "confirmar", texto: "Retirar del colegio", icono: "retirar", peligro: true, titulo: `¿Retirar a ${nombre}?`,
                                descripcion: "Dejará de aparecer en las listas del día. Podrás reactivarlo cuando quieras.", confirmar: "Retirar",
                                accion: cambiarEstadoAlumnoAction, campos: { id: a.id, estado: "retirado" },
                              }
                            : {
                                tipo: "confirmar", texto: "Reactivar", icono: "reactivar", titulo: `¿Reactivar a ${nombre}?`,
                                descripcion: "Volverá a aparecer en las listas de su salón.", confirmar: "Reactivar",
                                accion: cambiarEstadoAlumnoAction, campos: { id: a.id, estado: "activo" },
                              },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Tarjeta>
      )}
      <p className="text-xs text-muted-foreground">{alumnos.length} {alumnos.length === 1 ? "alumno" : "alumnos"}.</p>
    </div>
  );
}
