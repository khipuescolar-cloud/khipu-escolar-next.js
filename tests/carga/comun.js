// Utilidades comunes de las pruebas de carga con k6 (specs/55).
// Seguridad: por defecto solo se permite apuntar a la máquina local (lvh.me / localhost).
// Para otro destino hay que pasar ALLOW_REMOTE=1 a propósito (nunca contra la nube real sin permiso de Carlos).
export const BASE = (__ENV.BASE_URL || "http://nuevohorizonte.lvh.me:3000").replace(/\/$/, "");

export function exigirDestinoLocal() {
  const local = /^(https?:\/\/)?([a-z0-9-]+\.)?(lvh\.me|localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(BASE);
  if (!local && __ENV.ALLOW_REMOTE !== "1") {
    throw new Error(`Destino no local (${BASE}). Si de verdad quieres probar ahí, pasa ALLOW_REMOTE=1 (pregunta antes a Carlos).`);
  }
}

// Cookies de una sesión ya iniciada (copiadas del navegador) para probar páginas autenticadas: K6_COOKIE="sb-...=..."
export function cabeceras() {
  return __ENV.K6_COOKIE ? { headers: { Cookie: __ENV.K6_COOKIE } } : {};
}

export const umbrales = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<1200"],
  checks: ["rate>0.99"],
};
