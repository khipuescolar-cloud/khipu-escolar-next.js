import { School, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { baseDomain } from "@/lib/dominio";
import { NOMBRE_PLAN } from "@/lib/planes";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { crearColegioAction } from "../../actions";
import { CamposAdministrador } from "../CamposAdministrador";
import { FormularioPlataforma } from "../FormularioPlataforma";
import { CamposColegio } from "./CamposColegio";

export const metadata: Metadata = { title: "Nuevo colegio" };

export default async function NuevoColegio() {
  await requireAdminPlataforma();
  return (
    <div className="flex max-w-3xl flex-col">
      <EncabezadoPagina
        titulo="Nuevo colegio"
        descripcion="Al guardar se crea el colegio y la cuenta del administrador principal. Le llega un correo de bienvenida con su usuario (el correo) y el botón para entrar. Su contraseña inicial es su número de documento y la cambia en su primer ingreso."
      />
      <FormularioPlataforma accion={crearColegioAction} etiqueta="Crear colegio" className="flex flex-col gap-6">
        <Tarjeta className="flex flex-col gap-5">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-titulo-2">
              <School className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Colegio
            </h2>
            <p className="mt-1 text-cuerpo-sm text-muted-foreground">Identidad, plan y dirección web del colegio.</p>
          </div>
          <CamposColegio baseDomain={baseDomain()} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Ciudad" name="ciudad" placeholder="Arequipa" />
            <Selector etiqueta="Plan" name="plan" defaultValue="basico">
              <option value="basico">{NOMBRE_PLAN.basico}</option>
              <option value="fase2">{NOMBRE_PLAN.fase2}</option>
              <option value="promax">{NOMBRE_PLAN.promax}</option>
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
          <CamposAdministrador />
        </Tarjeta>
      </FormularioPlataforma>
    </div>
  );
}
