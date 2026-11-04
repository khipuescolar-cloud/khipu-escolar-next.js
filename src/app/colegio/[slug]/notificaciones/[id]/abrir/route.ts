import { redirect } from "next/navigation";
import { abrirNotificacion, ROLES_BANDEJA } from "@/lib/server/notificaciones/bandeja";
import { requireTenantContext } from "@/lib/server/tenant";

// Abre una notificación de la bandeja (también desde el push): la marca leída y lleva a la actividad (specs/38).
// Redirección relativa: queda en el subdominio del colegio (la URL interna reescrita por proxy.ts no sirve de base).
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug, ROLES_BANDEJA);
  redirect((await abrirNotificacion(ctx, id)) ?? "/notificaciones");
}
