import { ArrowLeft, Contact, School, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { baseDomain } from "@/lib/dominio";
import { NOMBRE_TIPO_CONTACTO, TIPOS_ELEGIBLES } from "@/lib/comercial";
import { planesOfrecidos } from "@/lib/server/modulos";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { crearColegioAction } from "../../actions";
import { CamposAdministrador } from "../CamposAdministrador";
import { FormularioPlataforma } from "../FormularioPlataforma";
import { CamposColegio } from "./CamposColegio";

export const metadata: Metadata = { title: "Nuevo colegio" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 200) ?? "";

export default async function NuevoColegio({ searchParams }: PageProps<"/plataforma/colegios/nuevo">) {
  await requireAdminPlataforma();
  const [planes, sp] = await Promise.all([planesOfrecidos(), searchParams]);
  // Prellenado desde una solicitud de demo (specs/25): solo valores iniciales; `solicitud` se envía oculto.
  const inicial = {
    solicitudId: uno(sp.solicitud),
    nombre: uno(sp.nombre),
    ciudad: uno(sp.ciudad),
    plan: planes.find((p) => p.plan === uno(sp.plan))?.plan,
    admin: { nombres: uno(sp.admin_nombres), email: uno(sp.admin_email), telefono: uno(sp.admin_telefono), cargo: uno(sp.admin_cargo) },
  };
  return (
    <div className="flex max-w-3xl flex-col">
      {/* «Nuevo colegio» es una acción del módulo Colegios: se vuelve a la lista, no es un módulo propio. */}
      <Link href="/colegios" className="enlace mb-2 inline-flex min-h-10 items-center gap-1 self-start text-cuerpo-sm font-semibold">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Colegios
      </Link>
      <EncabezadoPagina
        titulo="Nuevo colegio"
        descripcion="Al guardar se crea el colegio y la cuenta del administrador principal. Le llega un correo de bienvenida con su usuario (el correo) y el botón para entrar. Su contraseña inicial es su número de documento y la cambia en su primer ingreso."
      />
      <FormularioPlataforma accion={crearColegioAction} etiqueta="Crear colegio" className="flex flex-col gap-6">
        {inicial.solicitudId && <input type="hidden" name="solicitudId" value={inicial.solicitudId} />}
        <Tarjeta className="flex flex-col gap-5">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-titulo-2">
              <School className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Colegio
            </h2>
            <p className="mt-1 text-cuerpo-sm text-muted-foreground">Identidad, plan y dirección web del colegio.</p>
          </div>
          <CamposColegio baseDomain={baseDomain()} nombreInicial={inicial.nombre} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Ciudad" name="ciudad" defaultValue={inicial.ciudad} placeholder="Arequipa" />
            <Selector etiqueta="Plan" name="plan" defaultValue={inicial.plan ?? planes.find((p) => p.plan === "basico")?.plan ?? planes[0]?.plan}>
              {planes.map((p) => <option key={p.plan} value={p.plan}>{p.nombre}</option>)}
            </Selector>
            <Selector etiqueta="Estado" name="estado" defaultValue="piloto">
              <option value="piloto">Piloto</option>
              <option value="activo">Activo</option>
            </Selector>
            <Selector etiqueta="Escala de notas" name="escalaCalificacion" defaultValue="literal">
              <option value="literal">Literal (AD, A, B, C)</option>
              <option value="vigesimal">Vigesimal (0 a 20)</option>
            </Selector>
            <Campo etiqueta="Dominios de correo (opcional)" name="emailDomains" placeholder="micolegio.edu.pe" ayuda="Separados por coma. Sirven para detectar el colegio al iniciar sesión." />
          </div>
        </Tarjeta>
        <Tarjeta className="flex flex-col gap-5">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-titulo-2">
              <UserRound className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Administrador principal
            </h2>
            <p className="mt-1 text-cuerpo-sm text-muted-foreground">Tendrá el rol de dirección. Si el correo ya tiene cuenta en Khipu, conserva su contraseña.</p>
          </div>
          <CamposAdministrador inicial={inicial.admin} />
        </Tarjeta>
        <Tarjeta className="flex flex-col gap-5">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-titulo-2">
              <Contact className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Segundo responsable (opcional)
            </h2>
            <p className="mt-1 text-cuerpo-sm text-muted-foreground">Por ejemplo, la persona de facturación. Queda como contacto del colegio, sin acceso al sistema. Más responsables se agregan luego desde la ficha.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombres" name="resp2_nombres" autoComplete="off" />
            <Campo etiqueta="Apellidos" name="resp2_apellidos" autoComplete="off" />
            <Campo etiqueta="Correo" name="resp2_email" type="email" autoComplete="off" />
            <Campo etiqueta="Teléfono" name="resp2_telefono" type="tel" autoComplete="off" />
            <Campo etiqueta="Cargo" name="resp2_cargo" placeholder="Contadora" />
            <Selector etiqueta="Tipo" name="resp2_tipo" defaultValue="facturacion">
              {TIPOS_ELEGIBLES.map((t) => (
                <option key={t} value={t}>{NOMBRE_TIPO_CONTACTO[t]}</option>
              ))}
            </Selector>
          </div>
        </Tarjeta>
      </FormularioPlataforma>
    </div>
  );
}
