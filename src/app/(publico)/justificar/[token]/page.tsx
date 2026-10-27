import type { Metadata } from "next";
import { FormJustificar } from "@/components/FormJustificar";
import { Alerta } from "@/components/ui/Alerta";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { fechaLarga } from "@/lib/fechas";
import { buscarTokenJustificacion, MENSAJE_TOKEN_INVALIDO } from "@/lib/server/justificaciones";
import { justificarConTokenAction } from "./actions";

export const metadata: Metadata = { title: "Justificar falta", robots: { index: false, follow: false } };

export default async function JustificarPublicoPage({ params }: PageProps<"/justificar/[token]">) {
  const { token } = await params;
  const datos = await buscarTokenJustificacion(token);

  if (!datos) {
    return (
      <Tarjeta className="flex flex-col gap-4 p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">Justificar falta</h1>
        <Alerta tipo="aviso">{MENSAJE_TOKEN_INVALIDO}</Alerta>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta className="flex flex-col gap-5 p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold text-primary">{datos.tenant.nombre}</p>
        <h1 className="text-2xl font-bold text-balance">Justificar la falta de {datos.alumno}</h1>
        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{fechaLarga(datos.fecha)}</p>
      </div>
      <FormJustificar accion={justificarConTokenAction.bind(null, token)} />
    </Tarjeta>
  );
}
