import { redirect } from "next/navigation";
import { requireTenantContext } from "@/lib/server/tenant";
export default async function PlanificacionAnterior({ params }: { params: Promise<{ slug: string; rest?: string[] }> }) {
  const { slug, rest } = await params;
  await requireTenantContext(slug, ["profesor", "direccion"]);
  redirect(rest?.[0] ? "/nudito/temario/" + encodeURIComponent(rest[0]) : "/nudito/temario");
}
