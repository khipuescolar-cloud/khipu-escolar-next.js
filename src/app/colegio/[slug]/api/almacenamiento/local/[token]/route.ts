import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { firmaValida } from "@/lib/server/tokens";
import { RAIZ_LOCAL } from "@/lib/server/storage/local";
import { requireTenantContext } from "@/lib/server/tenant";

export async function PUT(request: NextRequest, ctx: RouteContext<"/colegio/[slug]/api/almacenamiento/local/[token]">) {
  const { slug, token } = await ctx.params;
  const tenant = await requireTenantContext(slug);
  const punto = token.lastIndexOf(".");
  if (punto < 0) return new NextResponse("Enlace inválido", { status: 403 });
  const payload = token.slice(0, punto);
  if (!firmaValida(payload, token.slice(punto + 1))) return new NextResponse("Enlace inválido", { status: 403 });
  let datos: { publicId: string; bytes: number; mimeType: string; exp: number };
  try { datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { return new NextResponse("Enlace inválido", { status: 403 }); }
  if (datos.exp <= Date.now() || !datos.publicId.startsWith(`${tenant.tenant.id}/`) || !Number.isSafeInteger(datos.bytes) || datos.bytes < 1 || datos.bytes > 26_214_400) return new NextResponse("Enlace vencido", { status: 403 });
  const subida = await tenant.db.subidaArchivo.findFirst({ where: { publicId: datos.publicId, membershipId: tenant.membership.id, estado: "pendiente", expiraAt: { gt: new Date() } } });
  if (!subida || subida.bytesDeclarados !== datos.bytes || subida.mimeDeclarado !== datos.mimeType) return new NextResponse("Subida no autorizada", { status: 403 });
  if (request.headers.get("content-length") !== String(datos.bytes) || request.headers.get("content-type") !== datos.mimeType) return new NextResponse("Cabeceras inválidas", { status: 400 });
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length !== datos.bytes) return new NextResponse("Tamaño inválido", { status: 400 });
  const ruta = path.resolve(RAIZ_LOCAL, datos.publicId);
  if (!ruta.startsWith(RAIZ_LOCAL + path.sep)) return new NextResponse("Ruta inválida", { status: 403 });
  await mkdir(path.dirname(ruta), { recursive: true });
  await writeFile(ruta, bytes);
  return new NextResponse(null, { status: 204 });
}
