import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { usuarioActual } from "@/lib/server/tenant";
import { cambiarPasswordAction } from "./actions";

export const metadata: Metadata = { title: "Crea tu contraseña" };

const ERRORES: Record<string, string> = {
  corta: "La contraseña debe tener al menos 8 caracteres.",
  distintas: "Las dos contraseñas no coinciden.",
  documento: "No uses tu número de documento como contraseña.",
  guardar: "No se pudo guardar. Intenta con otra contraseña.",
};

/** Primer ingreso: la contraseña inicial es el documento y se debe cambiar (specs/16). */
export default async function CambiarPasswordPage({ searchParams }: PageProps<"/cambiar-password">) {
  const { error, siguiente } = await searchParams;
  const user = await usuarioActual();
  if (!user) redirect("/login");
  const destino = typeof siguiente === "string" ? siguiente : "/elegir-colegio";

  return (
    <Tarjeta className="p-6 shadow-sm sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">Crea tu contraseña</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Hola, {user.nombres}. Entraste con tu contraseña inicial. Elige una nueva para proteger tu cuenta.
      </p>
      <form action={cambiarPasswordAction} className="flex flex-col gap-4">
        <input type="hidden" name="siguiente" value={destino} />
        <Campo etiqueta="Nueva contraseña" name="password" type="password" minLength={8} autoComplete="new-password" required ayuda="Mínimo 8 caracteres. No uses tu DNI." />
        <Campo etiqueta="Repite la contraseña" name="confirmacion" type="password" minLength={8} autoComplete="new-password" required />
        {typeof error === "string" && ERRORES[error] && <Alerta tipo="error">{ERRORES[error]}</Alerta>}
        <Boton type="submit" tamano="lg">Guardar y entrar</Boton>
      </form>
    </Tarjeta>
  );
}
