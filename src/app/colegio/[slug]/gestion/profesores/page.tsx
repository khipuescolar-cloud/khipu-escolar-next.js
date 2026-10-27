import { CheckCircle2, MailPlus, UserRoundX } from "lucide-react";
import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarProfesores } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarEstadoMembresiaAction, invitarProfesorAction } from "../actions";

export const metadata: Metadata = { title: "Profesores" };

export default async function ProfesoresPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/profesores">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const profesores = await listarProfesores(ctx);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Profesores</h1>
      <Flash ok={ok} error={error} />
      <Tarjeta>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><MailPlus className="h-5 w-5 text-acento" strokeWidth={2} aria-hidden /> Invitar a un profesor</h2>
        <form action={invitarProfesorAction} className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombres" name="nombres" required />
          <Campo etiqueta="Apellidos" name="apellidos" required />
          <Campo etiqueta="Correo del colegio" name="email" type="email" required className="sm:col-span-2" />
          <Boton type="submit" className="self-start sm:col-span-2">Enviar invitación</Boton>
        </form>
        <p className="mt-2 text-xs text-pizarra">La tutoría y los cursos se asignan en «Salones y cursos».</p>
      </Tarjeta>

      <ul className="flex flex-col gap-3">
        {profesores.map((p) => (
          <li key={p.id}>
            <Tarjeta className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{p.user.nombres} {p.user.apellidos}</p>
                <p className="text-sm text-pizarra">{p.user.email}</p>
                <p className="mt-1 text-sm">
                  {p.salonesTutor.length > 0 && <>Tutor(a) de {p.salonesTutor.map((s) => s.nombre).join(", ")}. </>}
                  {p.cursosDictados.length > 0 ? <>Dicta {p.cursosDictados.map((c) => `${c.nombre} (${c.salon.nombre})`).join(", ")}.</> : "Sin cursos asignados."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${p.estado === "activa" ? "bg-llego-fondo text-llego" : "bg-superficie-2 text-pizarra"}`}>
                  {p.estado === "activa" ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : <UserRoundX className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
                  {p.estado === "activa" ? "Activo" : "Inactivo"}
                </span>
                <form action={cambiarEstadoMembresiaAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="estado" value={p.estado === "activa" ? "inactiva" : "activa"} />
                  <Boton type="submit" variante={p.estado === "activa" ? "secundario" : "fantasma"}>{p.estado === "activa" ? "Desactivar" : "Reactivar"}</Boton>
                </form>
              </div>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </div>
  );
}
