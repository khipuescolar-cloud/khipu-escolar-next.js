import { CloudOff, Loader2, RefreshCw } from "lucide-react";

/**
 * Indicador de conexión y cola local: «Sin conexión · 1 lista pendiente de enviar».
 * Ícono + palabra; se anuncia a lectores de pantalla al cambiar. No muestra nada si todo está en orden.
 */
export function IndicadorSinConexion({
  enLinea, enviando, pendientes, textoPendientes,
}: { enLinea: boolean; enviando: boolean; pendientes: number; textoPendientes: string }) {
  const visible = !enLinea || pendientes > 0 || enviando;
  return (
    <div aria-live="polite" data-testid="indicador-sin-conexion">
      {visible && (
        <p
          role="status"
          className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold ${
            enLinea ? "border-tarde/20 bg-tarde-fondo text-tarde" : "border-problema/20 bg-problema-fondo text-problema"
          }`}
        >
          {!enLinea ? (
            <CloudOff className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          ) : enviando ? (
            <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <RefreshCw className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          )}
          <span>
            {!enLinea ? "Sin conexión" : enviando ? "Enviando" : "Conexión recuperada"}
            {pendientes > 0 && ` · ${textoPendientes}`}
          </span>
        </p>
      )}
    </div>
  );
}
