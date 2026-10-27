import { NextResponse, type NextRequest } from "next/server";
import { baseDomain, urlPlataforma } from "@/lib/dominio";
import { requireAdminPlataforma, terminarAccesoSoporte } from "@/lib/server/plataforma";

// «Terminar» desde el banner del modo soporte (subdominio del colegio → panel, specs/16).
// Es un POST de formulario entre subdominios del mismo sitio: solo se acepta si el Origin es de nuestro dominio.
function origenPermitido(origen: string | null): boolean {
  if (!origen) return false;
  try {
    const host = new URL(origen).host;
    const base = baseDomain();
    return host === base || host.endsWith(`.${base}`);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!origenPermitido(request.headers.get("origin"))) return new NextResponse("Origen no permitido", { status: 403 });
  const admin = await requireAdminPlataforma();
  const datos = await request.formData();
  const r = await terminarAccesoSoporte(admin, String(datos.get("accesoId") ?? ""));
  const destino = r ? `/colegios/${r.tenantId}?ok=${encodeURIComponent("Acceso de soporte terminado.")}` : "/";
  return NextResponse.redirect(urlPlataforma(destino), 303);
}
