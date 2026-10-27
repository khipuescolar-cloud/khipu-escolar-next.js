import { Lock } from "lucide-react";
import Link from "next/link";

export default function Prohibido() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <Lock className="h-10 w-10 text-pizarra" aria-hidden />
      <h1 className="text-2xl font-bold">No tienes acceso a esta sección</h1>
      <p className="max-w-md text-pizarra">Puede que tu rol no lo permita o que el plan de tu colegio no lo incluya.</p>
      <Link href="/" className="font-semibold text-acento underline-offset-4 hover:underline">Volver al inicio</Link>
    </main>
  );
}
