import Link from "next/link";

/** Navegación por enlaces con forma de píldora (secciones, periodos, hijos). El activo lleva `aria-current`. */
export function NavegacionPildoras({ etiqueta, items }: { etiqueta: string; items: { href: string; texto: string; activo: boolean }[] }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.activo ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-pildora border px-4 text-sm font-medium transition-colors ${
            i.activo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent"
          }`}
        >
          {i.texto}
        </Link>
      ))}
    </nav>
  );
}
