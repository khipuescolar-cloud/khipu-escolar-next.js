import Link from "next/link";

const SECCIONES = [
  { href: "/gestion/profesores", texto: "Profesores" },
  { href: "/gestion/salones", texto: "Salones y cursos" },
  { href: "/gestion/alumnos", texto: "Alumnos" },
  { href: "/gestion/apoderados", texto: "Familias" },
];

export default function LayoutGestion({ children }: LayoutProps<"/colegio/[slug]/gestion">) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Secciones de gestión" className="flex flex-wrap gap-2">
        <Link href="/gestion" className="rounded-pildora border border-arena px-3 py-1.5 text-sm font-semibold hover:bg-superficie-2">Gestión</Link>
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-pildora border border-arena px-3 py-1.5 text-sm hover:bg-superficie-2">{s.texto}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
