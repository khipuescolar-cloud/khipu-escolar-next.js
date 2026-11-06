import { Info } from "lucide-react";
import type { Metadata } from "next";
import { TarjetaPublica } from "../_componentes/TarjetaPublica";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { email } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <TarjetaPublica className="p-6 sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-titulo-1">Entrar</h1>
            <p className="mt-2 text-cuerpo text-pretty text-muted-foreground">Usa el correo de tu colegio. Si eres familia, usa tu correo personal.</p>
          </div>
          <NuditoMascota tamano={52} estado="saludo" />
        </div>
        <LoginForm emailInicial={typeof email === "string" ? email : undefined} />
      </TarjetaPublica>
      <div className="flex items-start gap-3 rounded-[14px] bg-superficie-2/70 px-4 py-3 text-cuerpo-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-foreground" strokeWidth={2} aria-hidden />
        <p>
          <span className="font-semibold text-foreground">¿Primera vez?</span> Tu colegio te envía una invitación a tu correo. Si no la
          encuentras, revisa la carpeta de spam o escríbele a tu colegio.
        </p>
      </div>
    </div>
  );
}
