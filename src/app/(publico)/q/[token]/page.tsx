import { ScanLine } from "lucide-react";
import type { Metadata } from "next";
import { Tarjeta } from "@/components/ui/Tarjeta";

export const metadata: Metadata = { title: "Carnet escolar", robots: { index: false, follow: false } };

/** Lo que ve quien abre el QR del carnet fuera de la portería: ningún dato del alumno (specs/05). */
export default function CarnetPublicoPage() {
  return (
    <Tarjeta className="flex flex-col items-center gap-3 p-8 text-center shadow-sm">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary"><ScanLine className="size-7" strokeWidth={2} aria-hidden /></span>
      <h1 className="text-xl font-bold">Carnet escolar de Khipu</h1>
      <p className="text-muted-foreground">Este código solo sirve en la portería del colegio. Si encontraste este carnet, por favor entrégalo al colegio.</p>
    </Tarjeta>
  );
}
