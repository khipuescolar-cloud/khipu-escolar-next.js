"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Convierte un `?ok=` / `?error=` de la URL en notificación emergente (alternativa a <Flash/>). */
export function Notificar({ ok, error }: { ok?: string; error?: string }) {
  const mostrado = useRef(false);
  useEffect(() => {
    if (mostrado.current) return;
    mostrado.current = true;
    if (error) toast.error(error);
    else if (ok) toast.success(ok);
  }, [ok, error]);
  return null;
}
