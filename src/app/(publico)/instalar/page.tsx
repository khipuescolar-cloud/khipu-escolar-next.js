import { ArrowLeft, Laptop, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { InstalarAqui, PasosIOS, PasosMenuNavegador } from "@/components/app/InstalarApp";
import { Tarjeta } from "@/components/ui/Tarjeta";

export const metadata: Metadata = {
  title: "Instalar la app",
  description: "Instala Khipu Escolar en tu celular, tablet o computador, sin tienda de apps.",
};

const CAPTURAS = [
  { src: "/app/capturas/inicio-celular.png", alt: "Inicio del colegio en Khipu, en un celular" },
  { src: "/app/capturas/asistencia-celular.png", alt: "Pasar lista en Khipu, en un celular" },
];

/** Página pública (specs/24): pasos por plataforma, capturas y el botón de instalar cuando el navegador lo ofrece. */
export default function InstalarPage() {
  return (
    <Tarjeta className="flex flex-col gap-6 p-6 sm:p-8" data-testid="pagina-instalar">
      <div className="flex flex-col gap-1">
        <p className="sobretitulo">App de Khipu Escolar</p>
        <h1 className="font-heading text-titulo-2">Lleva el colegio en tu celular</h1>
        <p className="text-cuerpo-sm text-muted-foreground">
          Se instala desde aquí, sin tienda de apps. Ocupa poco espacio, recibe avisos y abre con un toque.
        </p>
      </div>

      <InstalarAqui soloBoton />

      <ul className="grid grid-cols-2 gap-3" aria-label="Capturas de la app">
        {CAPTURAS.map((c) => (
          <li key={c.src}>
            {/* eslint-disable-next-line @next/next/no-img-element -- capturas estáticas ya optimizadas */}
            <img src={c.src} alt={c.alt} width={390} height={844} loading="lazy" className="h-auto w-full rounded-lg border border-arena" />
          </li>
        ))}
      </ul>

      <section aria-labelledby="pasos-android" className="flex flex-col gap-3">
        <h2 id="pasos-android" className="flex items-center gap-2 text-cuerpo font-semibold">
          <Smartphone className="size-5 text-primary" strokeWidth={2} aria-hidden /> Android (Chrome)
        </h2>
        <p className="text-cuerpo-sm text-muted-foreground">Si ves el botón <strong>Instalar app</strong>, tócalo. Si no:</p>
        <PasosMenuNavegador plataforma="android" />
      </section>

      <section aria-labelledby="pasos-ios" className="flex flex-col gap-3">
        <h2 id="pasos-ios" className="flex items-center gap-2 text-cuerpo font-semibold">
          <Smartphone className="size-5 text-primary" strokeWidth={2} aria-hidden /> iPhone y iPad (Safari)
        </h2>
        <PasosIOS />
      </section>

      <section aria-labelledby="pasos-computador" className="flex flex-col gap-3">
        <h2 id="pasos-computador" className="flex items-center gap-2 text-cuerpo font-semibold">
          <Laptop className="size-5 text-primary" strokeWidth={2} aria-hidden /> Computador (Chrome o Edge)
        </h2>
        <PasosMenuNavegador plataforma="escritorio" />
      </section>

      <p className="rounded-lg bg-superficie-2 p-3 text-cuerpo-sm">
        Instala la app desde la dirección de tu colegio (por ejemplo, <strong>tucolegio.khipuescolar.pe</strong>): cada colegio
        tiene su propia app. Si tienes hijos en dos colegios, instala una por cada uno.
      </p>

      <Link href="/" className="enlace inline-flex min-h-10 items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Volver
      </Link>
    </Tarjeta>
  );
}
