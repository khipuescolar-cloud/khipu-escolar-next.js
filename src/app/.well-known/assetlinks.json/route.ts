import { declaracionesAssetLinks } from "@/lib/app-tiendas";

// Digital Asset Links para publicar la app en Google Play como TWA (docs/app-tiendas.md, specs/24).
// Sin ANDROID_PACKAGE_NAME o sin huellas responde una lista vacía (válida y sin efecto).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(declaracionesAssetLinks(process.env.ANDROID_PACKAGE_NAME, process.env.ANDROID_SHA256_FINGERPRINTS), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
