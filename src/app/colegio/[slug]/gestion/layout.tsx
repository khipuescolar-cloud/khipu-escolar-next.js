import { requireTenantContext } from "@/lib/server/tenant";
import { NavGestion } from "./_componentes/NavGestion";

export default async function LayoutGestion({ children, params }: LayoutProps<"/colegio/[slug]/gestion">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  return (
    <div className="flex flex-col gap-6">
      <NavGestion soloAlumnosFamilias={ctx.rol === "administrativo"} />
      {children}
    </div>
  );
}
