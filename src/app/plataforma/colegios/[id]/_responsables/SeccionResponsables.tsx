import { KeyRound, Mail, Phone, ShieldCheck, Star, UserCheck, UserX, Users } from "lucide-react";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { NOMBRE_TIPO_CONTACTO } from "@/lib/comercial";
import type { Responsable } from "@/lib/server/plataforma-responsables";
import { reenviarBienvenidaAction } from "../../../actions";
import { fechaHora } from "../../../EstadoColegio";
import { marcarPrincipalAction } from "../_acciones";
import { HojaResponsable } from "./HojaResponsable";
import { QuitarResponsable } from "./QuitarResponsable";

const nombreCompleto = (r: Pick<Responsable, "nombres" | "apellidos">) => `${r.nombres} ${r.apellidos}`.trim();

/** «Responsables» de la ficha del colegio (specs/20): contactos ante Khipu y quién de ellos entra al sistema. */
export function SeccionResponsables({ tenantId, responsables }: { tenantId: string; responsables: Responsable[] }) {
  return (
    <section aria-labelledby="responsables" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="responsables" className="flex items-center gap-2 font-heading text-titulo-2">
          <Users className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Responsables
        </h2>
        <HojaResponsable tenantId={tenantId} />
      </div>
      <p className="-mt-1 text-cuerpo-sm text-muted-foreground">Personas del colegio con las que habla Khipu. Hay un responsable principal; quien tiene acceso entra al sistema como dirección.</p>

      {responsables.length === 0 ? (
        <EstadoVacio icono={Users} titulo="Aún no hay responsables." descripcion="Agrega a la persona de contacto del colegio para tener a quién escribir." />
      ) : (
        <Tarjeta className="p-0">
          <ul className="flex flex-col divide-y">
            {responsables.map((r) => {
              const otros = responsables.filter((o) => o.id !== r.id).map((o) => ({ id: o.id, nombre: nombreCompleto(o) }));
              return (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between" data-testid="responsable">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{nombreCompleto(r)}</p>
                      {r.principal ? (
                        <span className="inline-flex items-center gap-1 rounded-pildora bg-accent px-2 py-0.5 text-etiqueta text-accent-foreground">
                          <Star className="size-3.5" strokeWidth={2} aria-hidden /> Principal
                        </span>
                      ) : (
                        <span className="rounded-pildora border px-2 py-0.5 text-etiqueta">{NOMBRE_TIPO_CONTACTO[r.tipo]}</span>
                      )}
                      {r.cargo && <span className="text-cuerpo-sm text-muted-foreground">{r.cargo}</span>}
                    </div>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-cuerpo-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="size-3.5" strokeWidth={2} aria-hidden /> {r.email}</span>
                      {r.telefono && <span className="inline-flex items-center gap-1"><Phone className="size-3.5" strokeWidth={2} aria-hidden /> {r.telefono}</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-cuerpo-sm">
                      {r.acceso ? (
                        <>
                          <span className={`inline-flex items-center gap-1 font-medium ${r.acceso.estado === "activa" ? "text-llego" : "text-tarde"}`}>
                            {r.acceso.estado === "activa" ? <UserCheck className="size-3.5" strokeWidth={2} aria-hidden /> : <ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />}
                            {r.acceso.estado === "activa" ? "Con acceso al sistema" : `Acceso ${r.acceso.estado}`}
                          </span>
                          <span className="text-muted-foreground">Último ingreso: {fechaHora(r.acceso.ultimoIngresoAt)}</span>
                          {r.acceso.debeCambiarPassword && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground"><KeyRound className="size-3.5" strokeWidth={2} aria-hidden /> Aún no cambia su contraseña inicial</span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><UserX className="size-3.5" strokeWidth={2} aria-hidden /> Sin acceso al sistema</span>
                      )}
                    </p>
                    {r.notas && <p className="text-cuerpo-sm text-muted-foreground">{r.notas}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 lg:justify-end">
                    <HojaResponsable
                      tenantId={tenantId}
                      responsable={{ id: r.id, tipo: r.tipo, principal: r.principal, nombres: r.nombres, apellidos: r.apellidos, cargo: r.cargo, email: r.email, telefono: r.telefono, notas: r.notas, tieneAcceso: !!r.acceso }}
                    />
                    {!r.principal && (
                      <BotonConfirmar
                        etiqueta={<><Star strokeWidth={2} aria-hidden /> Marcar como principal</>}
                        titulo="¿Marcar como responsable principal?"
                        descripcion={`${nombreCompleto(r)} pasa a ser el contacto principal del colegio. Quien lo era queda como «Dirección académica».`}
                        confirmar="Marcar como principal"
                        accion={marcarPrincipalAction}
                        campos={{ tenantId, id: r.id }}
                        variante="ghost"
                        tamano="sm"
                      />
                    )}
                    {r.acceso && (
                      <BotonConfirmar
                        etiqueta={<><Mail strokeWidth={2} aria-hidden /> Reenviar bienvenida</>}
                        titulo="¿Reenviar la bienvenida?"
                        descripcion={`Enviaremos otra vez el correo con el acceso a ${r.email}.`}
                        confirmar="Reenviar correo"
                        accion={reenviarBienvenidaAction}
                        campos={{ tenantId, membershipId: r.acceso.membershipId }}
                        variante="ghost"
                        tamano="sm"
                      />
                    )}
                    <QuitarResponsable tenantId={tenantId} id={r.id} nombre={nombreCompleto(r)} principal={r.principal} tieneAcceso={!!r.acceso} otros={otros} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}
    </section>
  );
}
