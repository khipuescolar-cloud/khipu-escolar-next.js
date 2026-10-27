import { ScanLine } from "lucide-react";
import type { Metadata } from "next";
import { Tarjeta } from "@/components/ui/Tarjeta";

export const metadata: Metadata = { title: "Carnet escolar", robots: { index: false, follow: false } };

/** Lo que ve quien abre el QR del carnet fuera de la portería: ningún dato del alumno (specs/05). */
export default function CarnetPublicoPage() {
  return (
    <Tarjeta className="flex flex-col items-center gap-3 text-center">
      <ScanLine className="h-10 w-10 text-acento" strokeWidth={2} aria-hidden />
      <h1 className="text-xl font-bold">Carnet escolar de Khipu</h1>
      <p className="text-pizarra">Este código solo sirve en la portería del colegio. Si encontraste este carnet, por favor entrégalo al colegio.</p>
    </Tarjeta>
  );
}
