import { ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, HeartHandshake, IdCard, School } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { exigirAlumnosFamilias } from "@/lib/server/gestion";
import { whereSalonActivo } from "@/lib/server/salones-activos";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Gestión" };

export default async function GestionPage({ params }: PageProps<"/colegio/[slug]/gestion">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  exigirAlumnosFamilias(ctx);
  const esDireccion = ctx.rol === "direccion";
  const [profesores, personal, salones, alumnos, familias] = await Promise.all([
    ctx.db.membership.count({ where: { rol: "profesor", estado: "activa" } }),
    ctx.db.membership.count({ where: { rol: { in: ["administrativo", "porteria"] }, estado: "activa" } }),
    ctx.db.salon.count({ where: whereSalonActivo }),
    ctx.db.alumno.count({ where: { estado: "activo" } }),
    ctx.db.membership.count({ where: { rol: "apoderado", estado: "activa" } }),
  ]);
  const todas = [
    { href: "/gestion/profesores", titulo: "Profesores", detalle: `${profesores} activos · datos personales y correos`, Icono: GraduationCap },
    { href: "/gestion/personal", titulo: "Personal", detalle: `${personal} activos · administrativos y portería`, Icono: BriefcaseBusiness },
    { href: "/gestion/salones", titulo: "Grados y salones", detalle: `${salones} salones · tutores y cursos`, Icono: School },
    { href: "/gestion/alumnos", titulo: "Alumnos", detalle: `${alumnos} activos`, Icono: BookOpen },
    { href: "/gestion/apoderados", titulo: "Familias", detalle: `${familias} cuentas`, Icono: HeartHandshake },
    { href: "/gestion/carnets", titulo: "Carnets", detalle: "Carnets QR por salón", Icono: IdCard },
  ];
  const tarjetas = esDireccion ? todas : todas.filter((t) => t.href === "/gestion/alumnos" || t.href === "/gestion/apoderados");
  return (
    <div>
      <EncabezadoPagina titulo="Gestión" descripcion={esDireccion ? "Personas, salones y carnets del colegio en un solo lugar." : "Alumnos y familias del colegio."} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map(({ href, titulo, detalle, Icono }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full min-h-40 flex-col gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
                  <Icono className="size-6" strokeWidth={2} aria-hidden />
                </span>
                <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2} aria-hidden />
              </span>
              <span className="font-heading text-lg font-semibold">{titulo}</span>
              <span className="text-sm text-muted-foreground">{detalle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
