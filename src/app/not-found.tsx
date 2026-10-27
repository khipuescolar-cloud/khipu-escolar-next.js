import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-7" strokeWidth={2} aria-hidden />
      </span>
      <h1 className="text-2xl font-bold text-balance">No encontramos esta página</h1>
      <p className="max-w-md text-muted-foreground">Puede que el enlace haya cambiado. Vuelve al inicio y sigue desde ahí.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>Ir al inicio</Link>
    </main>
  );
}
