import type { Metadata } from "next";
import { FormJustificar } from "@/components/FormJustificar";
import { Alerta } from "@/components/ui/Alerta";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { fechaLarga } from "@/lib/fechas";
import { consultarTokenJustificacion, mensajePlazoVencido, MENSAJE_TOKEN_INVALIDO } from "@/lib/server/justificaciones";
import { justificarConTokenAction } from "./actions";

export const metadata: Metadata = { title: "Justificar falta", robots: { index: false, follow: false } };

export default async function JustificarPublicoPage({ params }: PageProps<"/justificar/[token]">) {
  const { token } = await params;
  const consulta = await consultarTokenJustificacion(token);

  if (!consulta.ok) {
    return (
      <Tarjeta className="flex flex-col gap-4 p-6 sm:p-8">
        <h1 className="font-heading text-titulo-2">Justificar falta</h1>
        <Alerta tipo="aviso">{consulta.motivo === "vencido" ? mensajePlazoVencido(consulta.plazoDias) : MENSAJE_TOKEN_INVALIDO}</Alerta>
      </Tarjeta>
    );
  }

  const datos = consulta.datos;
  return (
    <Tarjeta className="flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <p className="text-etiqueta text-primary">{datos.tenant.nombre}</p>
        <h1 className="font-heading text-titulo-2 text-balance">Justificar la falta de {datos.alumno}</h1>
        <p className="mt-1 text-cuerpo-sm text-muted-foreground first-letter:uppercase">{fechaLarga(datos.fecha)}</p>
      </div>
      <FormJustificar accion={justificarConTokenAction.bind(null, token)} />
    </Tarjeta>
  );
}
