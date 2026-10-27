import * as React from "react"

const MOBILE_BREAKPOINT = 768
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function suscribir(aviso: () => void) {
  const mql = window.matchMedia(CONSULTA)
  mql.addEventListener("change", aviso)
  return () => mql.removeEventListener("change", aviso)
}

/** true en pantallas < 768px. Usa useSyncExternalStore (sin setState dentro de un efecto). */
export function useIsMobile() {
  return React.useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  )
}
