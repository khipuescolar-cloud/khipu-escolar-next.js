// Service worker de Khipu Escolar: notificaciones push de avisos (specs/06) y uso sin conexión de portería y
// pasar lista (specs/04, specs/05).
//
// Caché (solo GET del mismo origen, siempre red primero para no servir código viejo):
//  - /_next/static/** y /marca/**: archivos del programa y la marca, sin datos de personas.
//  - Navegación a /porteria: solo el cascarón de la página (no trae datos de alumnos), para reabrir el quiosco sin red.
// Las páginas con datos de alumnos (p. ej. /asistencia) NO se guardan en caché: podrían quedar en un equipo compartido.
// Una lista o un escaneo hechos sin conexión se guardan en IndexedDB desde la página abierta y se reenvían solos.
const CACHE = "khipu-offline-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith("khipu-offline-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

function esCacheable(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/marca/")) return true;
  return request.mode === "navigate" && url.pathname === "/porteria";
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!esCacheable(event.request, url)) return;
  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        if (respuesta.ok && respuesta.type === "basic") {
          const copia = respuesta.clone();
          event.waitUntil(caches.open(CACHE).then((c) => c.put(event.request, copia)));
        }
        return respuesta;
      })
      .catch(() => caches.match(event.request).then((guardada) => guardada || Response.error())),
  );
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
      icon: "/marca/isotipo.svg",
      badge: "/marca/isotipo.svg",
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
