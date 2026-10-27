import { Lock } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Prohibido() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-7" strokeWidth={2} aria-hidden />
      </span>
      <h1 className="text-2xl font-bold text-balance">No tienes acceso a esta sección</h1>
      <p className="max-w-md text-muted-foreground">Puede que tu rol no lo permita o que el plan de tu colegio no lo incluya.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>Volver al inicio</Link>
    </main>
  );
}
