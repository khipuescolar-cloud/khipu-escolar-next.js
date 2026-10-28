"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const ID_TOAST = "khipu-nueva-version";

/**
 * Registra /sw.js (app instalable, caché del programa y uso sin conexión; también atiende push). Está en el layout
 * raíz (specs/24); portería y pasar lista lo montan también (registrar dos veces es inocuo).
 * Si hay una versión nueva esperando, muestra «Hay una nueva versión · Actualizar» en vez de recargar por sorpresa:
 * al tocarlo la nueva versión se activa y la página se recarga una sola vez.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let recargando = false;
    let pedida = false;

    const ofrecer = (nueva: ServiceWorker) => {
      toast("Hay una nueva versión", {
        id: ID_TOAST,
        duration: Infinity,
        action: {
          label: "Actualizar",
          onClick: () => {
            pedida = true;
            nueva.postMessage({ tipo: "ACTUALIZAR" });
          },
        },
      });
    };

    const alCambiar = () => {
      if (!pedida || recargando) return;
      recargando = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", alCambiar);

    let intervalo: ReturnType<typeof setInterval> | undefined;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registro) => {
        // Solo hay «nueva versión» si ya existía una activa controlando la página.
        if (registro.waiting && navigator.serviceWorker.controller) ofrecer(registro.waiting);
        registro.addEventListener("updatefound", () => {
          const instalando = registro.installing;
          instalando?.addEventListener("statechange", () => {
            if (instalando.state === "installed" && navigator.serviceWorker.controller) ofrecer(instalando);
          });
        });
        // Las apps instaladas quedan abiertas días: revisa cada hora si hay versión nueva.
        intervalo = setInterval(() => registro.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch(() => {
        // Sin service worker todo sigue funcionando; solo se pierde la caché sin conexión.
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", alCambiar);
      if (intervalo) clearInterval(intervalo);
    };
  }, []);
  return null;
}
