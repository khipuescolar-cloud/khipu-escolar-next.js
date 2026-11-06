import { BookOpen, BriefcaseBusiness, ChevronRight, FileUp, GraduationCap, HeartHandshake, IdCard, School, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TituloBloque } from "@/app/colegio/[slug]/inicio/TituloBloque";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { exigirAlumnosFamilias } from "@/lib/server/gestion";
import { whereSalonActivo } from "@/lib/server/salones-activos";
import { requireTenantContext } from "@/lib/server/tenant";
import { SUPERFICIE_LISTA } from "./_componentes/BarraFiltros";

export const metadata: Metadata = { title: "Gestión" };

type Entrada = { href: string; titulo: string; detalle: string; cifra?: number; unidad?: string; Icono: LucideIcon };

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
  const personas: Entrada[] = [
    { href: "/gestion/profesores", titulo: "Profesores", detalle: "Datos personales, correos, cursos y tutoría", cifra: profesores, unidad: "activos", Icono: GraduationCap },
    { href: "/gestion/personal", titulo: "Personal", detalle: "Administrativos y portería", cifra: personal, unidad: "activos", Icono: BriefcaseBusiness },
    { href: "/gestion/alumnos", titulo: "Alumnos", detalle: "Matrícula, salón y cuenta propia del alumno", cifra: alumnos, unidad: "activos", Icono: BookOpen },
    { href: "/gestion/apoderados", titulo: "Familias", detalle: "Apoderados, vínculos y consentimiento", cifra: familias, unidad: "cuentas", Icono: HeartHandshake },
  ];
  const organizacion: Entrada[] = [
    { href: "/gestion/salones", titulo: "Grados y salones", detalle: "Tutores y cursos de cada salón", cifra: salones, unidad: "salones", Icono: School },
    { href: "/gestion/carnets", titulo: "Carnets", detalle: "Carnets QR por salón, para portería", Icono: IdCard },
    { href: "/gestion/carga-masiva", titulo: "Carga masiva", detalle: esDireccion ? "Salones, cursos y familias desde un CSV o Excel" : "Familias desde un CSV o Excel", Icono: FileUp },
  ];
  const visibles = (lista: Entrada[]) => (esDireccion ? lista : lista.filter((t) => ["/gestion/alumnos", "/gestion/apoderados", "/gestion/carga-masiva"].includes(t.href)));
  const bloques = [
    { id: "gestion-personas", titulo: "Personas", lista: visibles(personas) },
    { id: "gestion-organizacion", titulo: esDireccion ? "Salones y documentos" : "Cargas", lista: visibles(organizacion) },
  ].filter((b) => b.lista.length > 0);

  return (
    <div>
      <EncabezadoPagina
        seccion="colegio"
        titulo="Gestión"
        descripcion={esDireccion ? "Personas, salones y carnets del colegio en un solo lugar." : "Alumnos y familias del colegio."}
      />
      <div className="flex flex-col gap-10">
        {bloques.map((b) => (
          <section key={b.id} aria-labelledby={b.id} className="flex flex-col gap-3">
            <TituloBloque id={b.id}>{b.titulo}</TituloBloque>
            <ul className={`${SUPERFICIE_LISTA} divide-y divide-borde-sutil`}>
              {b.lista.map(({ href, titulo, detalle, cifra, unidad, Icono }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex min-h-16 items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-sec-suave/50 focus-visible:bg-sec-suave/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                  >
                    <Icono className="size-5 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{titulo}</span>
                      <span className="block text-cuerpo-sm text-pretty text-muted-foreground">{detalle}</span>
                    </span>
                    {cifra !== undefined && (
                      <span className="shrink-0 text-right text-cuerpo-sm text-muted-foreground">
                        <span className="font-heading text-[18px] font-semibold text-foreground tabular-nums">{cifra}</span> {unidad}
                      </span>
                    )}
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
