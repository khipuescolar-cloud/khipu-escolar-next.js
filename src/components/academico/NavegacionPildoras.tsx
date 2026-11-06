import Link from "next/link";

/** Navegación por enlaces con forma de píldora (secciones, periodos, hijos). El activo lleva `aria-current`. */
export function NavegacionPildoras({ etiqueta, items }: { etiqueta: string; items: { href: string; texto: string; activo: boolean }[] }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-wrap gap-x-4 gap-y-1 border-b border-borde-sutil">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.activo ? "page" : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-medium transition-colors ${
            i.activo ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {i.texto}
        </Link>
      ))}
    </nav>
  );
}
