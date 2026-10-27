// CSV para descargas (reportes de la plataforma). Puro.

/** Texto CSV (separador coma, comillas dobles, CRLF) con BOM para que Excel lea bien las tildes. */
export function aCsv(encabezados: string[], filas: (string | number | null | undefined)[][]): string {
  const celda = (v: string | number | null | undefined) => {
    const t = v == null ? "" : String(v);
    // Evita inyección de fórmulas al abrir en Excel o Sheets.
    const seguro = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
    return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return "﻿" + [encabezados, ...filas].map((f) => f.map(celda).join(",")).join("\r\n") + "\r\n";
}
