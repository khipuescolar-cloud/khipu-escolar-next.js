import Link from "next/link";
import { CuerdaSeccion } from "@/components/marca/Cuerda";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { buttonVariants } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <NuditoMascota tamano={96} estado="reposo" />
      <CuerdaSeccion className="w-40" />
      <h1 className="font-heading text-titulo-1 text-balance">No encontramos esta página</h1>
      <p className="max-w-md text-cuerpo text-pretty text-muted-foreground">Puede que el enlace haya cambiado. Vuelve al inicio y sigue desde ahí.</p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>Ir al inicio</Link>
    </main>
  );
}
