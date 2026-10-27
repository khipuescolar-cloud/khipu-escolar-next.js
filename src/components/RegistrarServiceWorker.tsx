"use client";

import { useEffect } from "react";

/** Registra /sw.js (caché del programa y uso sin conexión; también atiende push). No muestra nada. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker todo sigue funcionando; solo se pierde la caché sin conexión.
    });
  }, []);
  return null;
}
