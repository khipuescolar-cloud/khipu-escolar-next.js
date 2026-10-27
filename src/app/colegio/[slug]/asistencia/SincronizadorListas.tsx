"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import { IndicadorSinConexion } from "@/components/IndicadorSinConexion";
import { textoPendientes, type ResultadoEnvio } from "@/lib/registro-offline";
import { useColaOffline } from "@/lib/cliente/cola-offline";
import { guardarListaAction } from "./actions";
import { colaListas, type ListaPendiente } from "./colaListas";

async function enviar(item: ListaPendiente): Promise<ResultadoEnvio> {
  try {
    const r = await guardarListaAction(item.slug, {
      salonId: item.salonId, ambito: item.ambito, registros: item.registros, registradoAt: item.registradoAt,
    });
    return r.ok ? "enviado" : "descartar";
  } catch {
    // Sin red o servidor caído: la lista se conserva en el dispositivo y se reintenta en la próxima conexión.
    return "reintentar";
  }
}

/** Indicador de listas pendientes y reenvío automático al abrir la página y al volver la conexión. */
export function SincronizadorListas() {
  const router = useRouter();
  const { pendientes, enLinea, enviando } = useColaOffline(colaListas, enviar, ({ enviados, descartados }) => {
    if (enviados > 0) {
      toast.success(enviados === 1 ? "Se envió la lista guardada sin conexión" : `Se enviaron ${enviados} listas guardadas sin conexión`);
      router.refresh();
    }
    if (descartados > 0) toast.error("Una lista guardada sin conexión no se pudo enviar. Vuelve a pasar lista.");
  });
  return (
    <>
      <RegistrarServiceWorker />
      <IndicadorSinConexion enLinea={enLinea} enviando={enviando} pendientes={pendientes} textoPendientes={textoPendientes(pendientes, "lista", "listas")} />
    </>
  );
}
