import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { pedirRecuperacionAction } from "./actions";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function RecuperarPage({ searchParams }: PageProps<"/recuperar">) {
  const { enviado } = await searchParams;
  return (
    <Tarjeta className="p-6 shadow-sm sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">Recuperar contraseña</h1>
      <p className="mb-6 text-sm text-muted-foreground">Te enviaremos un enlace a tu correo.</p>
      {enviado ? (
        <Alerta tipo="exito">Si el correo está registrado, te llegará un enlace en unos minutos.</Alerta>
      ) : (
        <form action={pedirRecuperacionAction} className="flex flex-col gap-4">
          <Campo etiqueta="Correo" name="email" type="email" autoComplete="email" required />
          <Boton type="submit" tamano="lg">Enviar enlace</Boton>
        </form>
      )}
          <Link href="/login" className="mt-4 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Volver a entrar
      </Link>
    </Tarjeta>
  );
}
