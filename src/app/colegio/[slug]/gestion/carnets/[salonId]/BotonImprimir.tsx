"use client";

import { Printer } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

export function BotonImprimir() {
  return (
    <Boton type="button" onClick={() => window.print()}>
      <Printer strokeWidth={2} aria-hidden /> Imprimir
    </Boton>
  );
}
