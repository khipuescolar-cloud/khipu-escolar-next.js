import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <Link href="/" className="font-semibold text-acento underline-offset-4 hover:underline">Ir al inicio</Link>
    </main>
  );
}
