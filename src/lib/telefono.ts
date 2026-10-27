// Teléfonos celulares de Perú para WhatsApp y SMS (specs/06). Funciones puras.

/**
 * Devuelve el celular en formato E.164 (`+51` + 9 dígitos que empiezan en 9) o null si no es válido.
 * Acepta «987654321», «987 654 321», «+51 987-654-321», «51987654321», «0051987654321» y «(+51) 987654321».
 */
export function normalizarTelefonoPeru(entrada: string | null | undefined): string | null {
  if (!entrada) return null;
  let digitos = entrada.replace(/[\s().-]/g, "");
  if (digitos.startsWith("+")) digitos = digitos.slice(1);
  else if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (!/^\d+$/.test(digitos)) return null;
  if (digitos.length === 11 && digitos.startsWith("51")) digitos = digitos.slice(2);
  return /^9\d{8}$/.test(digitos) ? `+51${digitos}` : null;
}

/** «+51987654321» → «+51 *** *** 321». Solo se muestran los 3 últimos dígitos. */
export function enmascararTelefono(e164: string): string {
  const m = /^\+51(\d{6})(\d{3})$/.exec(e164);
  return m ? `+51 *** *** ${m[2]}` : "***";
}

/** Para mostrar en formularios: «+51 987 654 321». */
export function formatearTelefono(e164: string): string {
  const m = /^\+51(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+51 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
