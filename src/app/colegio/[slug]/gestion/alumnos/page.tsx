import { CheckCircle2, UserRoundX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarAlumnos, listarSalones } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarEstadoAlumnoAction, crearAlumnoAction, editarAlumnoAction, importarAlumnosAction } from "../actions";

export const metadata: Metadata = { title: "Alumnos" };

export default async function AlumnosPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/alumnos">) {
  const { slug } = await params;
  const { ok, error, salon, retirados } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const salonId = typeof salon === "string" && salon ? salon : undefined;
  const verRetirados = retirados === "1";
  const [salones, alumnos] = await Promise.all([listarSalones(ctx), listarAlumnos(ctx, { salonId, incluirRetirados: verRetirados })]);
  const opcionesSalon = salones.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.anio})</option>);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Alumnos</h1>
      <Flash ok={ok} error={error} />

      <Tarjeta>
        <h2 className="mb-3 text-lg font-semibold">Agregar un alumno</h2>
        <form action={crearAlumnoAction} className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombres" name="nombres" required />
          <Campo etiqueta="Apellidos" name="apellidos" required />
          <Campo etiqueta="Código (opcional)" name="codigo" />
          <Selector etiqueta="Salón" name="salonId" required>{opcionesSalon}</Selector>
          <Boton type="submit" className="self-start sm:col-span-2">Agregar alumno</Boton>
        </form>
      </Tarjeta>

      <Tarjeta>
        <h2 className="mb-1 text-lg font-semibold">Importar desde un archivo CSV</h2>
        <p className="mb-3 text-sm text-pizarra">Columnas: <code>nombres, apellidos, codigo, salon</code>. El salón debe existir con el mismo nombre. Si alguna fila falla, no se importa ninguna.</p>
        <form action={importarAlumnosAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Archivo CSV</span>
            <input type="file" name="archivo" accept=".csv,text/csv" required className="text-sm" />
          </label>
          <Boton type="submit">Importar</Boton>
        </form>
      </Tarjeta>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <Selector etiqueta="Filtrar por salón" name="salon" defaultValue={salonId ?? ""}>
          <option value="">Todos</option>
          {opcionesSalon}
        </Selector>
        <label className="flex items-center gap-2 pb-3 text-sm">
          <input type="checkbox" name="retirados" value="1" defaultChecked={verRetirados} /> Incluir retirados
        </label>
        <Boton type="submit" variante="secundario">Filtrar</Boton>
        <Link href="/gestion/alumnos" className="pb-3 text-sm text-acento">Limpiar</Link>
      </form>

      <ul className="flex flex-col gap-3">
        {alumnos.map((a) => (
          <li key={a.id}>
            <Tarjeta className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{a.nombres} {a.apellidos} <span className="font-normal text-pizarra">· {a.salon.nombre}</span></p>
                <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${a.estado === "activo" ? "bg-llego-fondo text-llego" : "bg-superficie-2 text-pizarra"}`}>
                  {a.estado === "activo" ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : <UserRoundX className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
                  {a.estado === "activo" ? "Activo" : "Retirado"}
                </span>
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-acento">Editar</summary>
                <form action={editarAlumnoAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={a.id} />
                  <Campo etiqueta="Nombres" name="nombres" defaultValue={a.nombres} required />
                  <Campo etiqueta="Apellidos" name="apellidos" defaultValue={a.apellidos} required />
                  <Campo etiqueta="Código" name="codigo" defaultValue={a.codigo ?? ""} />
                  <Selector etiqueta="Salón" name="salonId" defaultValue={a.salonId}>{opcionesSalon}</Selector>
                  <Boton type="submit" variante="secundario" className="self-start">Guardar</Boton>
                </form>
              </details>
              <form action={cambiarEstadoAlumnoAction}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="estado" value={a.estado === "activo" ? "retirado" : "activo"} />
                <Boton type="submit" variante="fantasma">{a.estado === "activo" ? "Retirar del colegio" : "Reactivar"}</Boton>
              </form>
            </Tarjeta>
          </li>
        ))}
        {alumnos.length === 0 && <li className="text-sm text-pizarra">No hay alumnos con ese filtro.</li>}
      </ul>
    </div>
  );
}
