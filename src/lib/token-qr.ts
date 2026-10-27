// Lectura del texto de un QR de carnet (specs/05). Puro: lo usan el servidor y el navegador (portería sin conexión).

/** Formato de token aceptado (evita consultas con basura). */
export function formatoTokenQrValido(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** Saca el token del texto leído: la URL /q/<token> o el token solo. */
export function tokenDesdeQr(texto: string): string | null {
  const limpio = texto.trim();
  const match = limpio.match(/\/q\/([A-Za-z0-9_-]{43})(?:[/?#].*)?$/);
  const token = match ? match[1] : limpio;
  return formatoTokenQrValido(token) ? token : null;
}
