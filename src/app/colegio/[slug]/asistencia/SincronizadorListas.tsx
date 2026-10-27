"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import { IndicadorSinConexion } from "@/components/IndicadorSinConexion";
import { AvisoColaFallida } from "@/components/AvisoColaFallida";
import { esErrorDeRed, textoPendientes, type ResultadoEnvio } from "@/lib/registro-offline";
import { useColaOffline } from "@/lib/cliente/cola-offline";
import { guardarListaAction } from "./actions";
import { colaListas, type ListaPendiente } from "./colaListas";

async function enviar(item: ListaPendiente): Promise<ResultadoEnvio> {
  try {
    const r = await guardarListaAction(item.slug, {
      salonId: item.salonId, ambito: item.ambito, registros: item.registros, registradoAt: item.registradoAt,
    });
    return r.ok ? "enviado" : "descartar";
  } catch (error) {
    // Sin red: se conserva y se reintenta al volver la conexión (no cuenta intento).
    // Error del servidor: cuenta un intento; tras MAX_INTENTOS_COLA queda como «No se pudo enviar».
    return esErrorDeRed(error, navigator.onLine) ? "reintentar" : "fallo";
  }
}

/** Indicador de listas pendientes y reenvío automático al abrir la página y al volver la conexión. */
export function SincronizadorListas() {
  const router = useRouter();
  const { pendientes, agotados, enLinea, enviando, descartar } = useColaOffline(colaListas, enviar, ({ enviados, descartados, agotados }) => {
    if (enviados > 0) {
      toast.success(enviados === 1 ? "Se envió la lista guardada sin conexión" : `Se enviaron ${enviados} listas guardadas sin conexión`);
      router.refresh();
    }
    if (descartados > 0) toast.error("Una lista guardada sin conexión no se pudo enviar. Vuelve a pasar lista.");
    if (agotados > 0) toast.error("No se pudo enviar una lista guardada sin conexión después de varios intentos. Descártala y vuelve a pasar lista.");
  });
  return (
    <>
      <RegistrarServiceWorker />
      <IndicadorSinConexion enLinea={enLinea} enviando={enviando} pendientes={pendientes} textoPendientes={textoPendientes(pendientes, "lista", "listas")} />
      <AvisoColaFallida cantidad={agotados.length} singular="lista" plural="listas" onDescartar={() => void Promise.all(agotados.map((l) => descartar(l.id)))} />
    </>
  );
}
