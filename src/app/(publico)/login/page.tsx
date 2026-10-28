import type { Metadata } from "next";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { email } = await searchParams;
  return (
    <Tarjeta className="p-6 sm:p-8">
      <h1 className="mb-1 font-heading text-titulo-2">Entrar</h1>
      <p className="mb-6 text-cuerpo-sm text-muted-foreground">Usa el correo del colegio o tu correo personal si eres familia.</p>
      <LoginForm emailInicial={typeof email === "string" ? email : undefined} />
    </Tarjeta>
  );
}
