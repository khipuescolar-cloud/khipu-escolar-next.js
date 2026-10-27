// Construcción y lectura de URLs por colegio: <slug>.<APP_BASE_DOMAIN>.
// Sin dependencias de servidor: se usa también en proxy.ts.

export const SUBDOMINIOS_RESERVADOS: ReadonlySet<string> = new Set(["www", "app", "api", "admin"]);

export function baseDomain(): string {
  return process.env.APP_BASE_DOMAIN ?? "lvh.me:3000";
}

function protocolo(): string {
  return process.env.APP_PROTOCOL ?? "http";
}

/** URL raíz (login, elegir colegio, justificar). */
export function urlRaiz(path = "/"): string {
  return `${protocolo()}://${baseDomain()}${path}`;
}

/** URL dentro del colegio, p. ej. urlColegio("nuevohorizonte", "/inicio"). */
export function urlColegio(slug: string, path = "/inicio"): string {
  return `${protocolo()}://${slug}.${baseDomain()}${path}`;
}

export const SUBDOMINIO_PLATAFORMA = "admin";

/** URL del panel de plataforma (super administrador): admin.<APP_BASE_DOMAIN>. */
export function urlPlataforma(path = "/"): string {
  return `${protocolo()}://${SUBDOMINIO_PLATAFORMA}.${baseDomain()}${path}`;
}

/** true si el host es el panel de plataforma. */
export function esHostPlataforma(host: string | null | undefined, base = baseDomain()): boolean {
  return !!host && host.toLowerCase() === `${SUBDOMINIO_PLATAFORMA}.${base.toLowerCase()}`;
}

/** Devuelve el slug si el host es un subdominio de colegio; null si es el dominio raíz. */
export function slugDesdeHost(host: string | null | undefined, base = baseDomain()): string | null {
  if (!host) return null;
  const h = host.toLowerCase();
  const b = base.toLowerCase();
  if (h === b || !h.endsWith(`.${b}`)) return null;
  const sub = h.slice(0, -(b.length + 1));
  if (!sub || sub.includes(".") || SUBDOMINIOS_RESERVADOS.has(sub)) return null;
  return /^[a-z0-9-]+$/.test(sub) ? sub : null;
}

/** Dominio de un correo en minúsculas ("" si no es válido). */
export function dominioDeCorreo(email: string): string {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  return at > 0 ? email.trim().toLowerCase().slice(at + 1) : "";
}

const DOMINIOS_PERSONALES = new Set([
  "gmail.com", "hotmail.com", "outlook.com", "outlook.es", "live.com", "yahoo.com", "yahoo.es", "icloud.com", "proton.me",
]);

export function esCorreoPersonal(email: string): boolean {
  return DOMINIOS_PERSONALES.has(dominioDeCorreo(email));
}
