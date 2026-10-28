// Service worker de Khipu Escolar: app instalable (specs/24), notificaciones push de avisos (specs/06) y uso sin
// conexión de portería y pasar lista (specs/04, specs/05).
//
// Versionado: al cambiar VERSION el navegador instala el nuevo service worker, que QUEDA EN ESPERA (no hay
// recarga sorpresa). La página muestra «Hay una nueva versión · Actualizar» y, al tocarlo, envía
// { tipo: "ACTUALIZAR" }: recién ahí se activa (skipWaiting) y la página se recarga.
//
// Caché (solo GET del mismo origen, siempre red primero para no servir código viejo):
//  - Cascarón precacheado al instalar: /sin-conexion (estática, sin datos de personas), su CSS y fuentes,
//    logotipo e íconos de la marca.
//  - /_next/static/** y /marca/**: archivos del programa y la marca, sin datos de personas.
//  - Navegación a /porteria: solo el cascarón de la página (no trae datos de alumnos), para reabrir el quiosco sin red.
// Las páginas con datos de alumnos (p. ej. /asistencia, /inicio) NO se guardan en caché: podrían quedar en un
// equipo compartido. Si una navegación falla por falta de red se muestra /sin-conexion.
// Una lista o un escaneo hechos sin conexión se guardan en IndexedDB desde la página abierta y se reenvían solos.
const VERSION = "2026-10-28.1";
const CACHE = `khipu-offline-${VERSION}`;
const PAGINA_SIN_CONEXION = "/sin-conexion";
const CASCARON = [
  PAGINA_SIN_CONEXION,
  "/marca/logotipo-escolar.svg",
  "/marca/logotipo-horizontal-blanco.svg",
  "/marca/isotipo.svg",
  "/marca/icono-192.png",
  "/marca/icono-maskable-192.png",
  "/marca/favicon-32.png",
];

/** Guarda la página sin conexión y lo que necesita para verse (CSS y fuentes de /_next/static) sin red. */
async function precachear() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CASCARON);
  try {
    const html = await (await cache.match(PAGINA_SIN_CONEXION)).text();
    const recursos = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+\.(?:css|woff2))"/g)].map((m) => m[1]);
    await cache.addAll([...new Set(recursos)]);
  } catch {
    // Sin estilos precacheados la página igual se muestra (texto y logotipo).
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precachear());
  // Sin skipWaiting aquí: si ya hay una versión activa, la nueva espera a que la persona toque «Actualizar».
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.tipo === "ACTUALIZAR") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith("khipu-offline-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

function esCacheable(request, url) {
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/marca/")) return true;
  return request.mode === "navigate" && (url.pathname === "/porteria" || url.pathname === PAGINA_SIN_CONEXION);
}

function guardar(event, respuesta) {
  if (respuesta.ok && respuesta.type === "basic") {
    const copia = respuesta.clone();
    event.waitUntil(caches.open(CACHE).then((c) => c.put(event.request, copia)));
  }
  return respuesta;
}

async function sinConexion() {
  return (await caches.match(PAGINA_SIN_CONEXION)) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (esCacheable(request, url)) {
    event.respondWith(
      fetch(request)
        .then((respuesta) => guardar(event, respuesta))
        .catch(async () => (await caches.match(request)) || (request.mode === "navigate" ? sinConexion() : Response.error())),
    );
    return;
  }

  // Resto de navegaciones (páginas con datos): solo red, nunca caché; sin red, la página sin conexión.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => sinConexion()));
  }
});

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { cuerpo: event.data ? event.data.text() : "" };
  }
  const titulo = datos.titulo || "Khipu Escolar";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || "",
      icon: "/marca/icono-192.png",
      badge: "/marca/favicon-32.png",
      lang: "es-PE",
      data: { url: datos.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url === url && "focus" in v) return v.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
