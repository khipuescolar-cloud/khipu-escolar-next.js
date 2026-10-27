"use client";

import { Printer } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

export function BotonImprimir() {
  return (
    <Boton type="button" onClick={() => window.print()}>
      <Printer className="h-4 w-4" strokeWidth={2} aria-hidden /> Imprimir
    </Boton>
  );
}
