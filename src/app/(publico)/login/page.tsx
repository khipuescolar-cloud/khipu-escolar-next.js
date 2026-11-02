import { Info, Lock, School, Users } from "lucide-react";
import type { Metadata } from "next";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { email } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta className="p-6 sm:p-8">
        <p className="sobretitulo mb-2">Bienvenido de vuelta</p>
        <h1 className="font-heading text-titulo-1">Entrar</h1>
        <ul className="mt-3 mb-7 flex flex-col gap-3 text-cuerpo text-muted-foreground">
          <li className="flex items-start gap-3">
            <School className="mt-0.5 size-5 shrink-0 text-indigo" strokeWidth={2} aria-hidden />
            <span>
              <span className="font-semibold text-foreground">Dirección y profesores:</span> el correo de tu colegio.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Users className="mt-0.5 size-5 shrink-0 text-indigo" strokeWidth={2} aria-hidden />
            <span>
              <span className="font-semibold text-foreground">Familias:</span> tu correo personal.
            </span>
          </li>
        </ul>
        <LoginForm emailInicial={typeof email === "string" ? email : undefined} />
      </Tarjeta>
      <div className="flex items-start gap-3 rounded-lg bg-superficie-2 px-4 py-3 text-cuerpo-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-foreground" strokeWidth={2} aria-hidden />
        <p>
          <span className="font-semibold text-foreground">¿Primera vez?</span> Tu colegio te envía una invitación a tu correo. Si no la
          encuentras, revisa la carpeta de spam o escríbele a tu colegio.
        </p>
      </div>
      <p className="flex items-center justify-center gap-2 text-cuerpo-sm text-muted-foreground">
        <Lock className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        Tus datos se cuidan según la Ley 29733.
      </p>
    </div>
  );
}
