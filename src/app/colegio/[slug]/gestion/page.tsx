import { BookOpen, GraduationCap, HeartHandshake, School } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestion } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Gestión" };

export default async function GestionPage({ params }: PageProps<"/colegio/[slug]/gestion">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  exigirGestion(ctx);
  const [profesores, salones, alumnos, familias] = await Promise.all([
    ctx.db.membership.count({ where: { rol: "profesor", estado: "activa" } }),
    ctx.db.salon.count(),
    ctx.db.alumno.count({ where: { estado: "activo" } }),
    ctx.db.membership.count({ where: { rol: "apoderado", estado: "activa" } }),
  ]);
  const tarjetas = [
    { href: "/gestion/profesores", titulo: "Profesores", detalle: `${profesores} activos`, Icono: GraduationCap },
    { href: "/gestion/salones", titulo: "Salones y cursos", detalle: `${salones} salones`, Icono: School },
    { href: "/gestion/alumnos", titulo: "Alumnos", detalle: `${alumnos} activos`, Icono: BookOpen },
    { href: "/gestion/apoderados", titulo: "Familias", detalle: `${familias} cuentas`, Icono: HeartHandshake },
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Gestión</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {tarjetas.map(({ href, titulo, detalle, Icono }) => (
          <li key={href}>
            <Link href={href} className="flex flex-col gap-2 rounded-lg border border-arena bg-superficie p-5 transition hover:border-acento">
              <Icono className="h-7 w-7 text-acento" strokeWidth={2} aria-hidden />
              <span className="font-titulo text-lg font-semibold">{titulo}</span>
              <span className="text-sm text-pizarra">{detalle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
