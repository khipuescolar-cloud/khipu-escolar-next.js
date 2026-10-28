import { Logo } from "@/components/marca/Logo";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Logo variante="isotipo" alto={48} />
      <h1 className="font-heading text-titulo-1 text-balance">No encontramos esta página</h1>
      <p className="max-w-md text-cuerpo text-muted-foreground">Puede que el enlace haya cambiado. Vuelve al inicio y sigue desde ahí.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>Ir al inicio</Link>
    </main>
  );
}
