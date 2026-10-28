// App instalable (specs/24-app-instalable.md): lógica pura de plataforma, sin dependencias del navegador
// para poder probarla en unit tests. El componente `InstalarApp` le pasa lo que lee de `window`/`navigator`.

export type PlataformaInstalacion =
  /** Ya abierta como app (pantalla completa o `navigator.standalone` en iOS): no se muestra nada. */
  | "instalada"
  /** Chrome/Edge/Samsung Internet con `beforeinstallprompt` disponible: botón «Instalar app». */
  | "nativa"
  /** iPhone/iPad (sin `beforeinstallprompt`): instrucciones «Compartir → Agregar a inicio». */
  | "ios"
  /** Android sin el evento (Firefox, otro navegador o aún no listo): instrucciones del menú del navegador. */
  | "android"
  /** Computador sin el evento (Safari de Mac, Firefox): instrucciones del navegador. */
  | "escritorio";

export type SenalesNavegador = {
  userAgent: string;
  /** `navigator.maxTouchPoints`: el iPad moderno se presenta como Mac pero con pantalla táctil. */
  maxTouchPoints?: number;
  /** `matchMedia("(display-mode: standalone)")` o `window-controls-overlay`. */
  modoApp?: boolean;
  /** `navigator.standalone` (solo Safari de iOS). */
  standaloneIOS?: boolean;
  /** Se recibió `beforeinstallprompt`. */
  avisoNativo?: boolean;
};

export function esIOS({ userAgent, maxTouchPoints = 0 }: Pick<SenalesNavegador, "userAgent" | "maxTouchPoints">): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  // iPadOS 13+ se identifica como «Macintosh»; se distingue por la pantalla táctil.
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

export function detectarPlataforma(s: SenalesNavegador): PlataformaInstalacion {
  if (s.modoApp || s.standaloneIOS) return "instalada";
  if (s.avisoNativo) return "nativa";
  if (esIOS(s)) return "ios";
  if (/Android/i.test(s.userAgent)) return "android";
  return "escritorio";
}

/** La tarjeta del inicio, cerrada, no vuelve a salir en 30 días. */
export const DIAS_SIN_TARJETA = 30;
export const CLAVE_TARJETA_CERRADA = "khipu:instalar-cerrada";

export function tarjetaVisible(cerradaEn: number | null, ahora: number): boolean {
  if (!cerradaEn || !Number.isFinite(cerradaEn)) return true;
  return ahora - cerradaEn >= DIAS_SIN_TARJETA * 24 * 60 * 60 * 1000;
}
