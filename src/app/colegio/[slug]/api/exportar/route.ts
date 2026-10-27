import { forbidden } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { requireTenantContext } from "@/lib/server/tenant";

// Compatibilidad (specs/15): la exportación ahora es asíncrona; este enlace antiguo lleva a la página de exportaciones. Solo dirección.
export async function GET(request: NextRequest, { params }: RouteContext<"/colegio/[slug]/api/exportar">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  if (ctx.rol !== "direccion" || ctx.soporte) forbidden(); // el ZIP incluye chats y notas: nunca en modo soporte
  return NextResponse.redirect(new URL("/configuracion/exportar", request.url));
}
