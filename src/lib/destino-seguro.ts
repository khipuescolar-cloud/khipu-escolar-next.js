// Destinos de redirección que vienen del usuario (`?next=`, `siguiente`): solo rutas propias (specs/02).
// Evita la redirección abierta: «//evil.example», «/\evil.example» (el navegador trata «\» como «/») y caracteres de control
// que el parser de URL descarta («/\t/evil.example»).

const ORIGEN_PRUEBA = "http://khipu.invalid";

/** Devuelve `siguiente` si es una ruta relativa del mismo origen (una sola «/» inicial, sin «\» ni «//»); si no, `porDefecto`. */
export function destinoSeguro(siguiente: string | null | undefined, porDefecto = "/"): string {
  if (!siguiente || !siguiente.startsWith("/") || siguiente.startsWith("//") || siguiente.includes("\\")) return porDefecto;
  if (/[\u0000-\u001f\u007f]/.test(siguiente)) return porDefecto;
  try {
    return new URL(siguiente, ORIGEN_PRUEBA).origin === ORIGEN_PRUEBA ? siguiente : porDefecto;
  } catch {
    return porDefecto;
  }
}
