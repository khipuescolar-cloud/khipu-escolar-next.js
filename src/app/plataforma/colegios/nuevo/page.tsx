import { School, UserRound } from "lucide-react";
import type { Metadata } from "next";
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
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Nuevo colegio</h1>
        <p className="text-sm text-pizarra">
          Al guardar se crea el colegio y la cuenta del administrador principal. Le llega un correo de bienvenida con su usuario
          (el correo) y el botón para entrar. Su contraseña inicial es su número de documento y la cambia en su primer ingreso.
        </p>
      </div>
      <FormularioPlataforma accion={crearColegioAction} etiqueta="Crear colegio">
        <Tarjeta className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <School className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Colegio
          </h2>
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
        <Tarjeta className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserRound className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Administrador principal
          </h2>
          <p className="text-sm text-pizarra">Tendrá el rol de dirección. Si el correo ya tiene cuenta en Khipu, conserva su contraseña.</p>
          <CamposAdministrador />
        </Tarjeta>
      </FormularioPlataforma>
    </div>
  );
}
