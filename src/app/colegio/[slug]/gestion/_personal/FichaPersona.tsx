import { ArrowLeft, Info, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { NOMBRE_ROL } from "@/lib/roles";
import { obtenerFicha, ROLES_NO_DOCENTES, type RolPersonal } from "@/lib/server/personal";
import type { TenantContext } from "@/lib/server/tenant";
import { cambiarEstadoMembresiaAction, editarPersonaAction, reenviarBienvenidaAction, reenviarInvitacionAction, restablecerPasswordAction } from "../actions";
import { AccionesFila } from "../_componentes/AccionesFila";
import { AvatarPersona } from "../_componentes/AvatarPersona";
import { PanelFormulario } from "../_componentes/PanelFormulario";
import { CamposPersona, InsigniaEstado, type Ambito } from "./PanelPersonal";

const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });
const GENERO: Record<string, string> = { femenino: "Femenino", masculino: "Masculino", no_especifica: "Prefiere no indicar" };
const fechaCorta = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "UTC" });
const ACCION: Record<string, string> = { ver: "Vio la ficha", crear: "Alta", editar: "Edición", enviar: "Envío", borrar: "Borrado", exportar: "Exportación", login: "Ingreso" };

function resumen(d: Record<string, unknown> | null): string {
  if (!d) return "";
  const partes: string[] = [];
  if (Array.isArray(d.campos)) partes.push(d.campos.length > 0 ? `Cambió: ${d.campos.join(", ")}` : "Sin cambios en los datos");
  if (typeof d.estado === "string") partes.push(`Estado: ${d.estado}`);
  if (typeof d.rol === "string") partes.push(`Rol: ${d.rol}`);
  if (typeof d.reinicioPassword === "string") partes.push("Contraseña restablecida al documento");
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
  const volver = `${base}/${f.id}`;
  const datos: [string, string][] = [
    ["Documento", u.numeroDocumento ? `${(u.tipoDocumento ?? "dni").toUpperCase()} ${u.numeroDocumento}` : "—"],
    ["Correo (usuario)", u.email],
    ["Teléfono", u.telefono ?? "—"],
    ["Género", u.genero ? (GENERO[u.genero] ?? u.genero) : "—"],
    ["Fecha de nacimiento", u.fechaNacimiento ? fechaCorta.format(u.fechaNacimiento) : "—"],
    ["Dirección", u.direccion ?? "—"],
    ["Cargo", f.cargo ?? "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href={base} className="inline-flex w-fit items-center gap-1.5 enlace">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> {ambito === "profesores" ? "Profesores" : "Personal"}
      </Link>

      <Tarjeta className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AvatarPersona nombres={u.nombres} apellidos={u.apellidos} grande />
        <div className="min-w-0 flex-1">
          <h1 className="text-titulo-1 text-balance">{u.nombres} {u.apellidos}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InsigniaEstado estado={f.estado} />
            <Badge variant="outline" className="h-6 px-2.5">{NOMBRE_ROL[f.rol]}</Badge>
            {f.cargo && <span className="text-cuerpo-sm text-muted-foreground">{f.cargo}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PanelFormulario
            tipo="sheet"
            variante="outline"
            boton={<><Pencil strokeWidth={2} aria-hidden /> Editar datos</>}
            titulo="Datos personales"
            descripcion="Estos datos son de la persona en todos los colegios donde trabaje. Cambiar el documento no cambia su contraseña: para eso usa «Restablecer contraseña al documento» en «Más acciones»."
          >
            <form action={editarPersonaAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="volver" value={volver} />
              <input type="hidden" name="ambito" value={ambito === "personal" ? "personal" : "profesores"} />
              <CamposPersona
                conEmail={false}
                valores={{
                  nombres: u.nombres, apellidos: u.apellidos, tipoDocumento: u.tipoDocumento, numeroDocumento: u.numeroDocumento, telefono: u.telefono,
                  genero: u.genero, fechaNacimiento: u.fechaNacimiento?.toISOString().slice(0, 10), direccion: u.direccion, cargo: f.cargo,
                }}
              />
              {f.otrosColegios > 0 && (
                <p role="note" className="flex items-start gap-2 rounded-lg border border-tarde/40 bg-tarde-fondo p-3 text-sm text-tarde sm:col-span-2">
                  <Info className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
                  Estos datos también se ven en los otros colegios de esta persona. El cambio queda en la auditoría de cada colegio.
                </p>
              )}
              <p className="text-cuerpo-sm text-muted-foreground sm:col-span-2">Correo (usuario): <strong className="text-foreground">{u.email}</strong></p>
              <Boton type="submit" className="justify-self-start sm:col-span-2">Guardar datos</Boton>
            </form>
          </PanelFormulario>
          <AccionesFila
            etiqueta={`Más acciones para ${u.nombres} ${u.apellidos}`}
            items={[
              {
                tipo: "confirmar", texto: "Reenviar bienvenida", icono: "enviar", titulo: "¿Reenviar el correo de bienvenida?",
                descripcion: `Enviaremos de nuevo el correo de bienvenida a ${u.email}.`, confirmar: "Reenviar bienvenida",
                accion: reenviarBienvenidaAction, campos: { id: f.id, volver },
              },
              ...(u.numeroDocumento
                ? [
                    {
                      tipo: "confirmar" as const, texto: "Restablecer contraseña al documento", icono: "reactivar" as const, peligro: true,
                      titulo: "¿Restablecer la contraseña al documento?",
                      descripcion: `La contraseña de ${u.nombres} volverá a ser su número de documento actual y tendrá que cambiarla al entrar. Úsalo si corregiste el documento y la contraseña inicial quedó con el número anterior. No se muestra la contraseña.${f.otrosColegios > 0 ? " Su cuenta es la misma en los otros colegios donde está." : ""}`,
                      confirmar: "Restablecer contraseña", accion: restablecerPasswordAction, campos: { id: f.id, volver },
                    },
                    {
                      tipo: "confirmar" as const, texto: "Restablecer y avisar por correo", icono: "enviar" as const, peligro: true,
                      titulo: "¿Restablecer la contraseña y reenviar la bienvenida?",
                      descripcion: `Además de volver la contraseña al documento, enviaremos de nuevo el correo de bienvenida a ${u.email} (sin el número de documento).`,
                      confirmar: "Restablecer y avisar", accion: restablecerPasswordAction, campos: { id: f.id, volver, avisar: "1" },
                    },
                  ]
                : []),
              ...(f.estado === "invitada"
                ? [{
                    tipo: "confirmar" as const, texto: "Reenviar invitación", icono: "enviar" as const, titulo: "¿Reenviar la invitación?",
                    descripcion: "Enviaremos un enlace para que cree su contraseña.", confirmar: "Reenviar invitación",
                    accion: reenviarInvitacionAction, campos: { id: f.id, volver },
                  }]
                : []),
              f.estado === "inactiva"
                ? {
                    tipo: "confirmar" as const, texto: "Reactivar", icono: "reactivar" as const, titulo: `¿Reactivar a ${u.nombres}?`,
                    descripcion: "Podrá volver a entrar a Khipu con su cuenta.", confirmar: "Reactivar",
                    accion: cambiarEstadoMembresiaAction, campos: { id: f.id, volver, estado: "activa" },
                  }
                : {
                    tipo: "confirmar" as const, texto: "Desactivar", icono: "retirar" as const, peligro: true, titulo: `¿Desactivar a ${u.nombres}?`,
                    descripcion: `Dejará de entrar${f.rol === "profesor" ? " y se liberarán sus tutorías y cursos" : ""}. Nunca se borra a una persona: puedes reactivarla cuando quieras.`,
                    confirmar: "Desactivar", accion: cambiarEstadoMembresiaAction, campos: { id: f.id, volver, estado: "inactiva" },
                  },
            ]}
          />
        </div>
      </Tarjeta>
      <Flash ok={searchParams.ok} error={searchParams.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Tarjeta>
            <h2 className="mb-4 text-titulo-2">Datos personales</h2>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {datos.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-cuerpo-sm font-medium text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 text-sm break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-cuerpo-sm text-muted-foreground">El documento solo lo ve la dirección. Abrir esta ficha queda registrado en la auditoría.</p>
          </Tarjeta>

          {ambito === "profesores" && (
            <Tarjeta>
              <h2 className="mb-3 text-titulo-2">Cursos y tutoría</h2>
              <p className="text-sm">
                <strong>Tutoría:</strong> {f.salonesTutor.length > 0 ? f.salonesTutor.map((s) => s.nombre).join(", ") : "Sin tutoría."}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {f.cursosDictados.length === 0 && <li className="text-muted-foreground">Sin cursos asignados.</li>}
                {f.cursosDictados.map((c) => <li key={c.id}>{c.nombre} · {c.salon.nombre}</li>)}
              </ul>
              <p className="mt-3 text-cuerpo-sm text-muted-foreground">Los cursos y la tutoría se asignan en <Link href="/gestion/salones" className="enlace">Grados y salones</Link>.</p>
            </Tarjeta>
          )}

          <Tarjeta>
            <h2 className="mb-4 text-titulo-2">Historial de cambios</h2>
            <ol className="flex flex-col gap-4 border-l pl-4 text-sm">
              {f.historial.length === 0 && <li className="text-muted-foreground">Sin movimientos todavía.</li>}
              {f.historial.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute top-1.5 -left-[1.3125rem] size-2.5 rounded-full border-2 border-card bg-primary" aria-hidden />
                  <p className="flex flex-wrap gap-x-2">
                    <span className="font-semibold">{ACCION[e.accion] ?? e.accion}</span>
                    <span className="text-muted-foreground">por {e.actor}</span>
                  </p>
                  <p className="text-cuerpo-sm text-muted-foreground">{fechaHora.format(e.fecha)}</p>
                  {resumen(e.detalle) && <p className="mt-0.5 text-muted-foreground">{resumen(e.detalle)}</p>}
                </li>
              ))}
            </ol>
          </Tarjeta>
        </div>

        <Tarjeta className="h-fit">
          <h2 className="mb-3 text-titulo-2">Cuenta</h2>
          <div className="flex flex-col gap-3 text-sm">
            <InsigniaEstado estado={f.estado} />
            <p>{u.debeCambiarPassword ? "Aún no cambia su contraseña inicial." : "Ya cambió su contraseña inicial."}</p>
            <p className="text-cuerpo-sm text-muted-foreground">
              Nunca se borra a una persona: al desactivarla deja de entrar{f.rol === "profesor" ? " y se liberan sus tutorías y cursos" : ""}. Las acciones de la cuenta están en el menú «Más acciones».
            </p>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}
