import { CheckCircle2, Clock, MailPlus, Send, UserRoundX } from "lucide-react";
import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarProfesores } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { tituloProfesor } from "@/lib/roles";
import { cambiarEstadoMembresiaAction, cambiarGeneroProfesorAction, invitarProfesorAction, reenviarInvitacionAction } from "../actions";

export const metadata: Metadata = { title: "Profesores" };

const OPCIONES_GENERO = [
  <option key="" value="">Sin indicar (Profesor(a))</option>,
  <option key="f" value="femenino">Profesora / Tutora</option>,
  <option key="m" value="masculino">Profesor / Tutor</option>,
  <option key="n" value="no_especifica">Prefiere no indicar</option>,
];

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
          <Selector etiqueta="Se le nombra como (opcional)" name="genero" defaultValue="">
            {OPCIONES_GENERO}
          </Selector>
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
                  {p.salonesTutor.length > 0 && <>{tituloProfesor(p.user.genero, "tutor")} de {p.salonesTutor.map((s) => s.nombre).join(", ")}. </>}
                  {p.cursosDictados.length > 0 ? <>Dicta {p.cursosDictados.map((c) => `${c.nombre} (${c.salon.nombre})`).join(", ")}.</> : "Sin cursos asignados."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {p.estado === "invitada" ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-pildora bg-tarde-fondo px-2.5 py-1 text-xs font-semibold text-tarde">
                      <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> Invitación pendiente
                    </span>
                    <form action={reenviarInvitacionAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <Boton type="submit" variante="secundario"><Send className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden /> Reenviar invitación</Boton>
                    </form>
                  </>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${p.estado === "activa" ? "bg-llego-fondo text-llego" : "bg-superficie-2 text-pizarra"}`}>
                    {p.estado === "activa" ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : <UserRoundX className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
                    {p.estado === "activa" ? "Activo" : "Inactivo"}
                  </span>
                )}
                <form action={cambiarEstadoMembresiaAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="estado" value={p.estado === "inactiva" ? "activa" : "inactiva"} />
                  <Boton type="submit" variante={p.estado === "inactiva" ? "fantasma" : "secundario"}>{p.estado === "inactiva" ? "Reactivar" : "Desactivar"}</Boton>
                </form>
                <form action={cambiarGeneroProfesorAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="sr-only" htmlFor={`genero-${p.id}`}>Se le nombra como</label>
                  <select id={`genero-${p.id}`} name="genero" defaultValue={p.user.genero ?? ""} className="rounded-md border border-arena bg-superficie px-2 py-1.5 text-sm">
                    {OPCIONES_GENERO}
                  </select>
                  <Boton type="submit" variante="fantasma">Guardar</Boton>
                </form>
              </div>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </div>
  );
}
