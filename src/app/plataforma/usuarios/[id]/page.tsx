import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { nombreRol } from "@/lib/roles";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { fichaUsuario } from "@/lib/server/plataforma-usuarios";
import { fechaHora, fechaSimple } from "../../EstadoColegio";
import { cambiarMembresiaAction, enviarRecuperacionAction, forzarCambioPasswordAction, restablecerPasswordAction } from "../actions";
import { EstadoMembresia } from "../EstadoMembresia";

export const metadata: Metadata = { title: "Persona" };

export default async function FichaUsuario({ params }: PageProps<"/plataforma/usuarios/[id]">) {
  const admin = await requireAdminPlataforma();
  const { id } = await params;
  const u = await fichaUsuario(admin, id);
  if (!u) notFound();
  const nombre = `${u.nombres} ${u.apellidos}`.trim();
  const esYo = u.id === admin.user.id;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/usuarios" className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm"><ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Usuarios</Link>
      <EncabezadoPagina
        titulo={nombre}
        descripcion={u.email}
        acciones={
          <>
            <BotonConfirmar
              etiqueta={<><Mail strokeWidth={2} aria-hidden /> Enviar enlace de recuperación</>}
              titulo="¿Enviar el enlace de recuperación?"
              descripcion={`Enviaremos un correo a ${u.email} para que elija una contraseña nueva. Queda registrado en la auditoría.`}
              confirmar="Enviar enlace"
              accion={enviarRecuperacionAction}
              campos={{ userId: u.id }}
            />
            {u.tieneDocumento && !esYo && (
              <BotonConfirmar
                etiqueta={<><KeyRound strokeWidth={2} aria-hidden /> Restablecer al documento</>}
                titulo="¿Restablecer la contraseña?"
                descripcion="La contraseña volverá a ser su número de documento y tendrá que cambiarla al entrar. Si trabaja o tiene hijos en varios colegios, el cambio vale para todos. Nunca se muestra la contraseña."
                confirmar="Restablecer"
                accion={restablecerPasswordAction}
                campos={{ userId: u.id }}
                peligro
              />
            )}
          </>
        }
      />

      <div className="-mt-2 grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="font-heading text-titulo-2">Datos de la cuenta</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-cuerpo-sm">
            <dt className="text-muted-foreground">Teléfono</dt><dd>{u.telefono ?? "—"}</dd>
            <dt className="text-muted-foreground">Documento</dt><dd>{u.tieneDocumento ? `Registrado (${(u.tipoDocumento ?? "dni").toUpperCase()})` : "Sin documento válido"}</dd>
            <dt className="text-muted-foreground">Alta</dt><dd>{fechaSimple(u.createdAt)}</dd>
            <dt className="text-muted-foreground">Último ingreso</dt><dd>{fechaHora(u.ultimoIngresoAt)}</dd>
            <dt className="text-muted-foreground">Contraseña</dt>
            <dd className="flex flex-wrap items-center gap-2">
              {u.debeCambiarPassword ? <span className="inline-flex items-center gap-1 text-tarde"><KeyRound className="size-4" strokeWidth={2} aria-hidden /> Debe cambiarla al entrar</span> : <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden /> Ya la cambió</span>}
              {!u.debeCambiarPassword && (
                <BotonConfirmar
                  etiqueta="Forzar cambio"
                  titulo="¿Obligar a cambiar la contraseña?"
                  descripcion="En su próximo ingreso tendrá que elegir una contraseña nueva."
                  confirmar="Forzar cambio"
                  accion={forzarCambioPasswordAction}
                  campos={{ userId: u.id }}
                  tamano="sm"
                />
              )}
            </dd>
            {u.esSuperAdmin && <><dt className="text-muted-foreground">Equipo</dt><dd className="inline-flex items-center gap-1 font-medium"><ShieldCheck className="size-4" strokeWidth={2} aria-hidden /> Super administrador</dd></>}
          </dl>
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-heading text-titulo-2">Últimos intentos de ingreso</h2>
          {u.intentos.length === 0 ? (
            <p className="mt-3 text-cuerpo-sm text-muted-foreground">Aún no hay intentos registrados.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-cuerpo-sm">
              {u.intentos.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {i.exito
                    ? <span className="inline-flex items-center gap-1 text-llego"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden /> Ingresó</span>
                    : <span className="inline-flex items-center gap-1 text-falta"><XCircle className="size-4" strokeWidth={2} aria-hidden /> No pudo entrar</span>}
                  <span>{fechaHora(i.fecha)}</span>
                  <span className="font-mono text-muted-foreground">IP {i.ip}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <section aria-labelledby="membresias" className="flex flex-col gap-3">
        <h2 id="membresias" className="font-heading text-titulo-2">Colegios y roles</h2>
        {u.memberships.length === 0 ? (
          <p className="text-cuerpo-sm text-muted-foreground">Esta persona no pertenece a ningún colegio.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {u.memberships.map((m) => (
              <li key={m.id}>
                <Tarjeta className="flex flex-col gap-3">
                  <div>
                    <Link href={`/colegios/${m.tenant.id}`} className="enlace font-semibold">{m.tenant.nombre}</Link>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-cuerpo-sm">
                      <span className="rounded-pildora border px-2 py-0.5 text-etiqueta">{nombreRol(m.rol, null)}</span>
                      <EstadoMembresia estado={m.estado} />
                      {m.cargo && <span className="text-muted-foreground">{m.cargo}</span>}
                    </p>
                  </div>
                  {m.estado === "inactiva" ? (
                    <BotonConfirmar
                      etiqueta="Reactivar membresía"
                      titulo="¿Reactivar esta membresía?"
                      descripcion={`${nombre} volverá a entrar a ${m.tenant.nombre} con este rol.`}
                      confirmar="Reactivar"
                      accion={cambiarMembresiaAction}
                      campos={{ userId: u.id, membershipId: m.id, activa: "1" }}
                      tamano="sm"
                      className="w-fit"
                    />
                  ) : (
                    <BotonConfirmar
                      etiqueta="Desactivar membresía"
                      titulo="¿Desactivar esta membresía?"
                      descripcion={`${nombre} dejará de entrar a ${m.tenant.nombre} con este rol. Conserva su cuenta y sus otros colegios.`}
                      confirmar="Desactivar"
                      accion={cambiarMembresiaAction}
                      campos={{ userId: u.id, membershipId: m.id, activa: "0" }}
                      tamano="sm"
                      peligro
                      className="w-fit"
                    />
                  )}
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
