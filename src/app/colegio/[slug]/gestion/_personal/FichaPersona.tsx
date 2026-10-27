import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boton } from "@/components/ui/Boton";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { NOMBRE_ROL } from "@/lib/roles";
import { obtenerFicha, ROLES_NO_DOCENTES, type RolPersonal } from "@/lib/server/personal";
import type { TenantContext } from "@/lib/server/tenant";
import { cambiarEstadoMembresiaAction, editarPersonaAction, reenviarBienvenidaAction, reenviarInvitacionAction } from "../actions";
import { CamposPersona, InsigniaEstado, type Ambito } from "./PanelPersonal";

const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });
const ACCION: Record<string, string> = { ver: "Vio la ficha", crear: "Alta", editar: "Edición", enviar: "Envío", borrar: "Borrado", exportar: "Exportación", login: "Ingreso" };

function resumen(d: Record<string, unknown> | null): string {
  if (!d) return "";
  const partes: string[] = [];
  if (Array.isArray(d.campos)) partes.push(d.campos.length > 0 ? `Cambió: ${d.campos.join(", ")}` : "Sin cambios en los datos");
  if (typeof d.estado === "string") partes.push(`Estado: ${d.estado}`);
  if (typeof d.rol === "string") partes.push(`Rol: ${d.rol}`);
  if (typeof d.reenvio === "string") partes.push(`Reenvío de ${d.reenvio}`);
  return partes.join(" · ");
}

export async function FichaPersona({ ctx, ambito, id, searchParams }: { ctx: TenantContext; ambito: Ambito; id: string; searchParams: Record<string, string | string[] | undefined> }) {
  const roles: RolPersonal[] = ambito === "profesores" ? ["profesor"] : ROLES_NO_DOCENTES;
  const base = `/gestion/${ambito}`;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const f = await obtenerFicha(ctx, id, roles);
  if (!f) notFound();
  const u = f.user;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href={base} className="inline-flex items-center gap-1.5 text-sm font-semibold text-acento">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden /> {ambito === "profesores" ? "Profesores" : "Personal"}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{u.nombres} {u.apellidos}</h1>
        <InsigniaEstado estado={f.estado} />
        <span className="text-sm text-pizarra">{NOMBRE_ROL[f.rol]}{f.cargo ? ` · ${f.cargo}` : ""}</span>
      </div>
      <Flash ok={searchParams.ok} error={searchParams.error} />

      <Tarjeta>
        <h2 className="mb-3 text-lg font-semibold">Datos personales</h2>
        <form action={editarPersonaAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="volver" value={`${base}/${f.id}`} />
          <input type="hidden" name="ambito" value={ambito === "personal" ? "personal" : "profesores"} />
          <CamposPersona
            conEmail={false}
            valores={{
              nombres: u.nombres, apellidos: u.apellidos, tipoDocumento: u.tipoDocumento, numeroDocumento: u.numeroDocumento, telefono: u.telefono,
              genero: u.genero, fechaNacimiento: u.fechaNacimiento?.toISOString().slice(0, 10), direccion: u.direccion, cargo: f.cargo,
            }}
          />
          <p className="text-sm text-pizarra sm:col-span-2">
            Correo (usuario): <strong>{u.email}</strong>. Estos datos son de la persona en todos los colegios donde trabaje. Cambiar el documento no cambia su contraseña.
          </p>
          <Boton type="submit" className="justify-self-start">Guardar datos</Boton>
        </form>
      </Tarjeta>

      {ambito === "profesores" && (
        <Tarjeta>
          <h2 className="mb-3 text-lg font-semibold">Cursos y tutoría</h2>
          <p className="text-sm">
            <strong>Tutoría:</strong> {f.salonesTutor.length > 0 ? f.salonesTutor.map((s) => s.nombre).join(", ") : "Sin tutoría."}
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {f.cursosDictados.length === 0 && <li className="list-none text-pizarra">Sin cursos asignados.</li>}
            {f.cursosDictados.map((c) => <li key={c.id}>{c.nombre} · {c.salon.nombre}</li>)}
          </ul>
          <p className="mt-3 text-xs text-pizarra">Los cursos y la tutoría se asignan en <Link href="/gestion/salones" className="font-semibold text-acento">Grados y salones</Link>.</p>
        </Tarjeta>
      )}

      <Tarjeta className="flex flex-wrap items-center gap-3">
        <h2 className="w-full text-lg font-semibold">Cuenta</h2>
        <form action={cambiarEstadoMembresiaAction}>
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="volver" value={`${base}/${f.id}`} />
          <input type="hidden" name="estado" value={f.estado === "inactiva" ? "activa" : "inactiva"} />
          <Boton type="submit" variante={f.estado === "inactiva" ? "primario" : "secundario"}>{f.estado === "inactiva" ? "Reactivar" : "Desactivar"}</Boton>
        </form>
        <form action={reenviarBienvenidaAction}>
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="volver" value={`${base}/${f.id}`} />
          <Boton type="submit" variante="secundario"><Send className="h-4 w-4" strokeWidth={2} aria-hidden /> Reenviar bienvenida</Boton>
        </form>
        {f.estado === "invitada" && (
          <form action={reenviarInvitacionAction}>
            <input type="hidden" name="id" value={f.id} />
            <input type="hidden" name="volver" value={`${base}/${f.id}`} />
            <Boton type="submit" variante="secundario">Reenviar invitación (enlace para crear contraseña)</Boton>
          </form>
        )}
        <p className="w-full text-xs text-pizarra">
          {u.debeCambiarPassword ? "Aún no cambia su contraseña inicial." : "Ya cambió su contraseña inicial."} Nunca se borra a una persona: al desactivarla deja de entrar{f.rol === "profesor" ? " y se liberan sus tutorías y cursos" : ""}.
        </p>
      </Tarjeta>

      <Tarjeta>
        <h2 className="mb-3 text-lg font-semibold">Historial de cambios</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {f.historial.length === 0 && <li className="text-pizarra">Sin movimientos todavía.</li>}
          {f.historial.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3 border-b border-arena pb-2 last:border-0">
              <span className="text-pizarra">{fechaHora.format(e.fecha)}</span>
              <span className="font-semibold">{ACCION[e.accion] ?? e.accion}</span>
              <span>{e.actor}</span>
              <span className="text-pizarra">{resumen(e.detalle)}</span>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}
