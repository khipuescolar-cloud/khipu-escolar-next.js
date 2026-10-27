"use client";

import { useEffect } from "react";

export function Redireccion({ url }: { url: string }) {
  useEffect(() => {
    const t = setTimeout(() => window.location.assign(url), 900);
    return () => clearTimeout(t);
  }, [url]);
  return null;
}
