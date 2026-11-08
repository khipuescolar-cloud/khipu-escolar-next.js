import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { MisCursos } from "./MisCursos";
import { VistaFamilia } from "./VistaFamilia";

export const metadata: Metadata = { title: "Registro de notas" };

export default async function NotasPage({ params, searchParams }: PageProps<"/colegio/[slug]/notas">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "notas");
  // Solo la familia ve las notas de sus hijos (solo lectura). El alumno no: las conoce en clase (specs/11).
  if (ctx.rol === "apoderado") return <VistaFamilia ctx={ctx} sp={sp} />;
  if (ctx.rol === "profesor" || ctx.rol === "direccion") {
    // Enlaces viejos de la vista por pestañas (`?curso=…&seccion=…`, `?pestana=…`): van al registro del curso o a Mis cursos.
    const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
    const curso = uno(sp.curso);
    if (curso && /^[0-9a-f-]{36}$/i.test(curso)) {
      const periodo = uno(sp.periodo);
      redirect(`/notas/${curso}${periodo && /^[0-9a-f-]{36}$/i.test(periodo) ? `?periodo=${periodo}` : ""}`);
    }
    if (sp.vista || sp.seccion || sp.pestana || sp.curso) redirect("/notas");
    return <MisCursos ctx={ctx} />;
  }
  forbidden();
}
