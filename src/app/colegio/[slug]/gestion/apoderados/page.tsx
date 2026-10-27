import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarAlumnos, listarApoderados } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarEstadoMembresiaAction, desvincularApoderadoAction, invitarApoderadoAction, vincularApoderadoAction } from "../actions";

export const metadata: Metadata = { title: "Familias" };

const CONSENTIMIENTO = {
  vigente: { texto: "Consentimiento aceptado", Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  pendiente: { texto: "Consentimiento pendiente", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  revocado: { texto: "Consentimiento retirado", Icono: XCircle, clase: "bg-falta-fondo text-falta" },
} as const;

export default async function ApoderadosPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/apoderados">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const [apoderados, alumnos] = await Promise.all([listarApoderados(ctx), listarAlumnos(ctx)]);
  const opcionesAlumno = alumnos.map((a) => <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres} ({a.salon.nombre})</option>);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Familias</h1>
      <Flash ok={ok} error={error} />

      <Tarjeta>
        <h2 className="mb-1 text-lg font-semibold">Invitar a un apoderado</h2>
        <p className="mb-3 text-sm text-pizarra">Usa su correo personal. Al entrar por primera vez aceptará el consentimiento; sin él no recibe avisos.</p>
        <form action={invitarApoderadoAction} className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombres" name="nombres" required />
          <Campo etiqueta="Apellidos" name="apellidos" required />
          <Campo etiqueta="Correo personal" name="email" type="email" required />
          <Campo etiqueta="Parentesco" name="parentesco" placeholder="madre, padre, tutor legal…" required />
          <Selector etiqueta="Alumno" name="alumnoId" required className="sm:col-span-2">{opcionesAlumno}</Selector>
          <Boton type="submit" className="self-start sm:col-span-2">Enviar invitación</Boton>
        </form>
      </Tarjeta>

      <ul className="flex flex-col gap-3">
        {apoderados.map((a) => {
          const c = CONSENTIMIENTO[a.consentimiento];
          return (
            <li key={a.id}>
              <Tarjeta className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.user.nombres} {a.user.apellidos}</p>
                    <p className="text-sm text-pizarra">{a.user.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${c.clase}`}>
                    <c.Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {c.texto}
                  </span>
                </div>
                <ul className="text-sm">
                  {a.hijos.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span>{h.parentesco} de {h.alumno.nombres} {h.alumno.apellidos} ({h.alumno.salon.nombre})</span>
                      <form action={desvincularApoderadoAction}>
                        <input type="hidden" name="id" value={h.id} />
                        <button className="text-xs font-semibold text-acento">Quitar</button>
                      </form>
                    </li>
                  ))}
                  {a.hijos.length === 0 && <li className="text-pizarra">Sin alumnos vinculados.</li>}
                </ul>
                <form action={vincularApoderadoAction} className="flex flex-wrap items-end gap-2 border-t border-arena pt-3">
                  <input type="hidden" name="apoderadoId" value={a.id} />
                  <Selector etiqueta="Vincular otro alumno" name="alumnoId">{opcionesAlumno}</Selector>
                  <Campo etiqueta="Parentesco" name="parentesco" required />
                  <Boton type="submit" variante="secundario">Vincular</Boton>
                </form>
                <form action={cambiarEstadoMembresiaAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="volver" value="apoderados" />
                  <input type="hidden" name="estado" value={a.estado === "activa" ? "inactiva" : "activa"} />
                  <Boton type="submit" variante="fantasma">{a.estado === "activa" ? "Desactivar cuenta" : "Reactivar cuenta"}</Boton>
                </form>
              </Tarjeta>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
