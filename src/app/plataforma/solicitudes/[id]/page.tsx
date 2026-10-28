import { ArrowLeft, ExternalLink, School, Trash2, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { buttonVariants } from "@/components/ui/button";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { NOMBRE_PLAN } from "@/lib/planes";
import { ESTADOS_SOLICITUD, NOMBRE_ESTADO_SOLICITUD, queryNuevoColegio } from "@/lib/solicitudes";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { obtenerSolicitud } from "@/lib/server/plataforma-solicitudes";
import { BotonAccionCampo, FormularioCampo } from "../../mesa-ayuda/[id]/FormularioCampo";
import { asignarSolicitudAction, cambiarEstadoSolicitudAction, eliminarSolicitudAction, guardarNotasSolicitudAction } from "../actions";
import { InsigniaEstadoSolicitud } from "../InsigniaEstadoSolicitud";
import { NotasSolicitud } from "./NotasSolicitud";

export const metadata: Metadata = { title: "Solicitud de demo" };

const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" });

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="sobretitulo">{etiqueta}</dt>
      <dd className="text-cuerpo">{children ?? <span className="text-muted-foreground">Sin indicar</span>}</dd>
    </div>
  );
}

export default async function DetalleSolicitud({ params }: PageProps<"/plataforma/solicitudes/[id]">) {
  const admin = await requireAdminPlataforma();
  const { id } = await params;
  const d = await obtenerSolicitud(admin, id);
  const s = d.solicitud;

  return (
    <div className="flex max-w-5xl flex-col">
      <Link href="/solicitudes" className="enlace mb-2 inline-flex min-h-10 items-center gap-1 self-start text-cuerpo-sm font-semibold">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Solicitudes de demo
      </Link>
      <EncabezadoPagina
        titulo={s.colegio}
        descripcion={<>Recibida el {fecha.format(s.createdAt)}. <InsigniaEstadoSolicitud estado={s.estado} className="ml-1 align-middle" /></>}
        acciones={
          d.colegio ? (
            <Link href={`/colegios/${d.colegio.id}`} className={buttonVariants({ variant: "outline" })}>
              <ExternalLink strokeWidth={2} aria-hidden /> Ver colegio {d.colegio.nombre}
            </Link>
          ) : (
            <Link href={`/colegios/nuevo?${queryNuevoColegio(s)}`} className={buttonVariants()}>
              <School strokeWidth={2} aria-hidden /> Crear colegio con estos datos
            </Link>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          <Tarjeta className="flex flex-col gap-4">
            <h2 className="font-heading text-titulo-2">Datos del pedido</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato etiqueta="Nombre">{s.nombre}</Dato>
              <Dato etiqueta="Cargo">{s.cargo}</Dato>
              <Dato etiqueta="Correo"><a className="enlace" href={`mailto:${s.correo}`}>{s.correo}</a></Dato>
              <Dato etiqueta="Teléfono">{s.telefono}</Dato>
              <Dato etiqueta="Colegio">{s.colegio}</Dato>
              <Dato etiqueta="Ciudad">{s.ciudad}</Dato>
              <Dato etiqueta="Alumnos (aprox.)">{s.alumnos}</Dato>
              <Dato etiqueta="Plan de interés">{s.planInteres ? NOMBRE_PLAN[s.planInteres] : null}</Dato>
            </dl>
            {s.mensaje && (
              <div className="flex flex-col gap-0.5">
                <h3 className="sobretitulo">Mensaje</h3>
                <p className="whitespace-pre-wrap text-cuerpo">{s.mensaje}</p>
              </div>
            )}
          </Tarjeta>
          <Tarjeta className="p-4">
            <NotasSolicitud id={s.id} notas={s.notas ?? ""} accion={guardarNotasSolicitudAction} />
          </Tarjeta>
        </div>

        <aside className="flex flex-col gap-4" aria-label="Gestión de la solicitud">
          <Tarjeta className="flex flex-col gap-3 p-4">
            <h2 className="sobretitulo">Gestión</h2>
            <FormularioCampo id={s.id} nombre="estado" etiqueta="Estado" valor={s.estado} accion={cambiarEstadoSolicitudAction}>
              {ESTADOS_SOLICITUD.map((e) => <option key={e} value={e}>{NOMBRE_ESTADO_SOLICITUD[e]}</option>)}
            </FormularioCampo>
            <FormularioCampo id={s.id} nombre="asignado" etiqueta="Atiende" valor={s.atendidaPor ?? ""} accion={asignarSolicitudAction}>
              <option value="">Sin asignar</option>
              {d.equipo.map((e) => <option key={e.userId} value={e.userId}>{e.nombre}</option>)}
            </FormularioCampo>
            {s.atendidaPor !== admin.user.id && (
              <BotonAccionCampo id={s.id} campos={{ asignado: "yo" }} accion={asignarSolicitudAction}>
                <UserPlus strokeWidth={2} aria-hidden /> Asignármela
              </BotonAccionCampo>
            )}
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-2 p-4">
            <h2 className="sobretitulo">Datos personales</h2>
            <p className="text-cuerpo-sm text-muted-foreground">Si la persona pide que borremos sus datos, elimina la solicitud. No se puede deshacer.</p>
            <BotonConfirmar
              etiqueta={<><Trash2 strokeWidth={2} aria-hidden /> Eliminar solicitud</>}
              titulo="¿Eliminar esta solicitud?"
              descripcion="Se borran el nombre, correo, teléfono y mensaje de la persona. Queda el registro de que se eliminó, sin sus datos."
              confirmar="Eliminar"
              accion={eliminarSolicitudAction}
              campos={{ id: s.id }}
              peligro
            />
          </Tarjeta>
        </aside>
      </div>
    </div>
  );
}
