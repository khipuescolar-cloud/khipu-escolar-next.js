import { Logo } from "@/components/marca/Logo";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Prohibido() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Logo variante="isotipo" alto={48} />
      <h1 className="font-heading text-titulo-1 text-balance">No tienes acceso a esta sección</h1>
      <p className="max-w-md text-cuerpo text-muted-foreground">Puede que tu rol no lo permita o que el plan de tu colegio no la incluya.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>Volver al inicio</Link>
    </main>
  );
}
