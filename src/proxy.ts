import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { esHostPlataforma, slugDesdeHost, urlColegio, urlPlataforma, urlRaiz } from "@/lib/dominio";

// Resolución de colegio por subdominio (specs/01-arquitectura-multitenant.md):
//   <slug>.<APP_BASE_DOMAIN>/asistencia  →  rewrite interno a /colegio/<slug>/asistencia
//   <APP_BASE_DOMAIN>/colegio/<slug>/…   →  redirect al subdominio (las rutas del colegio solo viven ahí)
//   admin.<APP_BASE_DOMAIN>/x            →  rewrite a /plataforma/x (super administrador, specs/16)
// Además refresca la sesión de Supabase Auth en cada request.

const RUTAS_GLOBALES = /^\/api\/(webhooks|cron)\//;
// App instalable (specs/24): públicas y sin reescribir en la raíz, en cada colegio y en el panel, porque cada
// subdominio es su propio origen y se instala desde su dirección. (/manifest.webmanifest, /sw.js, /marca/** y
// las imágenes de /app/** ya quedan fuera del `matcher`.)
const RUTAS_APP = /^\/(instalar|sin-conexion|\.well-known\/assetlinks\.json)$/;

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const slug = slugDesdeHost(host);
  const { pathname, search } = request.nextUrl;

  let response: NextResponse;
  if (esHostPlataforma(host)) {
    // Panel del super administrador: admin.<dominio>/x → /plataforma/x
    if (pathname === "/login") return NextResponse.redirect(urlRaiz("/login"));
    if (RUTAS_GLOBALES.test(pathname) || RUTAS_APP.test(pathname) || pathname.startsWith("/plataforma")) {
      response = NextResponse.next({ request });
    } else {
      const destino = request.nextUrl.clone();
      destino.pathname = `/plataforma${pathname === "/" ? "" : pathname}`;
      response = NextResponse.rewrite(destino, { request });
    }
  } else if (slug) {
    if (pathname === "/login") {
      return NextResponse.redirect(urlRaiz(`/login?colegio=${slug}`));
    }
    if (RUTAS_GLOBALES.test(pathname) || RUTAS_APP.test(pathname) || pathname.startsWith("/colegio/")) {
      response = NextResponse.next({ request });
    } else {
      const destino = request.nextUrl.clone();
      destino.pathname = `/colegio/${slug}${pathname === "/" ? "/inicio" : pathname}`;
      response = NextResponse.rewrite(destino, { request });
    }
  } else {
    const match = pathname.match(/^\/colegio\/([a-z0-9-]+)(\/.*)?$/);
    if (match) return NextResponse.redirect(urlColegio(match[1], (match[2] ?? "/inicio") + search));
    if (pathname.startsWith("/plataforma")) return NextResponse.redirect(urlPlataforma(pathname.slice("/plataforma".length) || "/"));
    if (pathname === "/") return NextResponse.redirect(urlRaiz("/login"));
    response = NextResponse.next({ request });
  }

  return refrescarSesion(request, response);
}

async function refrescarSesion(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookieOptions: { domain: process.env.COOKIE_DOMAIN || undefined, sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|marca/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
