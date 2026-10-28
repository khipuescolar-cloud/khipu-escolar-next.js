import type { Metadata } from "next";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { usuarioActual } from "@/lib/server/tenant";
import { restablecerAction } from "./actions";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function RestablecerPage({ searchParams }: PageProps<"/restablecer">) {
  const { error } = await searchParams;
  const user = await usuarioActual();
  return (
    <Tarjeta className="p-6 sm:p-8">
      <h1 className="mb-6 font-heading text-titulo-2">Nueva contraseña</h1>
      {!user ? (
        <Alerta tipo="aviso">El enlace venció o ya se usó. Pide uno nuevo desde «¿Olvidaste tu contraseña?».</Alerta>
      ) : (
        <form action={restablecerAction} className="flex flex-col gap-4">
          <Campo etiqueta="Nueva contraseña" name="password" type="password" minLength={8} autoComplete="new-password" required ayuda="Mínimo 8 caracteres." />
          {error && <Alerta tipo="error">No se pudo guardar. Intenta con otra contraseña.</Alerta>}
          <Boton type="submit" tamano="lg">Guardar contraseña</Boton>
        </form>
      )}
    </Tarjeta>
  );
}
