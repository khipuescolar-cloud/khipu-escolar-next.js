import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Captura } from "./capturas";

// Marcos de dispositivo dibujados con CSS (sin imágenes ni sombras): laptop y celular con capturas reales.

type Props = { captura: Captura; prioridad?: boolean; tamanos?: string; className?: string };

export function Laptop({ captura, prioridad, tamanos = "(min-width: 1024px) 720px, 100vw", className }: Props) {
  return (
    <figure className={cn("flex w-full flex-col items-center", className)}>
      <div className="w-full rounded-t-[14px] border border-tinta/90 bg-tinta p-[1.6%] pb-[2.2%]">
        <div className="mx-auto mb-[1%] size-1.5 rounded-full bg-pizarra" aria-hidden />
        <Image
          src={captura.src}
          width={captura.width}
          height={captura.height}
          alt={captura.alt}
          priority={prioridad}
          loading={prioridad ? undefined : "lazy"}
          sizes={tamanos}
          className="block h-auto w-full rounded-[3px] bg-background"
        />
      </div>
      <div className="h-3 w-[calc(100%+1rem)] rounded-b-[14px] border border-t-0 border-arena bg-superficie-2" aria-hidden>
        <div className="mx-auto h-1.5 w-[14%] rounded-b-md bg-arena" />
      </div>
    </figure>
  );
}

export function Celular({ captura, prioridad, tamanos = "(min-width: 1024px) 220px, 45vw", className }: Props) {
  return (
    <figure className={cn("relative rounded-[1.9rem] border border-tinta/90 bg-tinta p-[3.5%]", className)}>
      <div className="absolute top-[2.4%] left-1/2 z-10 h-[1.6%] w-[26%] -translate-x-1/2 rounded-full bg-tinta" aria-hidden />
      <Image
        src={captura.src}
        width={captura.width}
        height={captura.height}
        alt={captura.alt}
        priority={prioridad}
        loading={prioridad ? undefined : "lazy"}
        sizes={tamanos}
        className="block h-auto w-full rounded-[1.4rem] bg-background"
      />
    </figure>
  );
}

/** Captura de escritorio en una ventana simple (para las funciones): borde arena, sin sombra. */
export function Ventana({ captura, tamanos = "(min-width: 1024px) 640px, 100vw", className }: Omit<Props, "prioridad">) {
  return (
    <figure className={cn("overflow-hidden rounded-lg border border-arena bg-superficie", className)}>
      <div className="flex items-center gap-1.5 border-b border-arena bg-superficie-2 px-3 py-2" aria-hidden>
        <span className="size-2.5 rounded-full bg-arena" />
        <span className="size-2.5 rounded-full bg-arena" />
        <span className="size-2.5 rounded-full bg-arena" />
      </div>
      <Image src={captura.src} width={captura.width} height={captura.height} alt={captura.alt} loading="lazy" sizes={tamanos} className="block h-auto w-full" />
    </figure>
  );
}
