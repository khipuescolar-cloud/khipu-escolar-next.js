// Armado común de los correos: HTML simple y accesible + versión en texto.
// Estado siempre con símbolo + palabra (nunca solo color). Sin emojis.

export type Mensaje = {
  asunto: string;
  html: string;
  texto: string;
  /** Versión corta para notificaciones push. */
  push: { titulo: string; cuerpo: string; url?: string };
};

export type EstadoInsignia = "llego" | "tarde" | "falta" | "problema" | "info";

// Símbolos tipográficos (no emojis) + palabra. Colores = tokens de marca de estado.
const INSIGNIAS: Record<EstadoInsignia, { simbolo: string; palabra: string; color: string; fondo: string }> = {
  llego: { simbolo: "✓", palabra: "Llegó", color: "#166534", fondo: "#e8f5ec" },
  tarde: { simbolo: "◷", palabra: "Tarde", color: "#9a4a07", fondo: "#fdf2e3" },
  falta: { simbolo: "✕", palabra: "Falta", color: "#b91c1c", fondo: "#fbeaea" },
  problema: { simbolo: "!", palabra: "Problema", color: "#6b21a8", fondo: "#f3e8fb" },
  info: { simbolo: "i", palabra: "Aviso", color: "#1e2a78", fondo: "#eef0fb" },
};

export function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type Contenido = {
  colegio: string;
  asunto: string;
  /** Estado mostrado arriba como insignia (símbolo + palabra). */
  insignia?: EstadoInsignia;
  /** Palabra de la insignia si se quiere otra (p. ej. «Aceptada»). */
  palabraInsignia?: string;
  /** Una idea por párrafo. */
  parrafos: string[];
  boton?: { texto: string; url: string };
  /** Enlace para ajustar las preferencias de aviso (se agrega al pie). */
  urlPreferencias?: string;
  push?: { cuerpo?: string; url?: string };
};

export function armarMensaje(c: Contenido): Mensaje {
  const ins = c.insignia ? INSIGNIAS[c.insignia] : null;
  const palabra = c.palabraInsignia ?? ins?.palabra;

  const insigniaHtml = ins
    ? `<p style="margin:0 0 16px"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${ins.fondo};color:${ins.color};font-weight:600;font-size:14px"><span aria-hidden="true">${ins.simbolo}</span> ${escaparHtml(palabra ?? "")}</span></p>`
    : "";
  const parrafosHtml = c.parrafos
    .map((p) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#1b1f2a">${escaparHtml(p)}</p>`)
    .join("");
  const botonHtml = c.boton
    ? `<p style="margin:20px 0"><a href="${escaparHtml(c.boton.url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1e2a78;color:#ffffff;font-weight:600;text-decoration:none">${escaparHtml(c.boton.texto)}</a></p>`
    : "";
  const pieHtml = [
    `Este aviso lo envía ${escaparHtml(c.colegio)} con Khipu Escolar.`,
    c.urlPreferencias
      ? `<a href="${escaparHtml(c.urlPreferencias)}" style="color:#3a4bb5">Ajustar mis avisos</a>`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const html = `<!doctype html>
<html lang="es-PE">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escaparHtml(c.asunto)}</title></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:Inter,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e1da;border-radius:14px"><tr><td style="padding:24px">
<p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#1e2a78">${escaparHtml(c.colegio)}</p>
${insigniaHtml}${parrafosHtml}${botonHtml}
<p style="margin:24px 0 0;font-size:12px;color:#5b6170">${pieHtml}</p>
</td></tr></table>
</td></tr></table>
</body>
</html>`;

  const texto = [
    c.colegio,
    "",
    ...(ins ? [`[${palabra}]`, ""] : []),
    ...c.parrafos,
    ...(c.boton ? ["", `${c.boton.texto}: ${c.boton.url}`] : []),
    "",
    "--",
    `Este aviso lo envía ${c.colegio} con Khipu Escolar.`,
    ...(c.urlPreferencias ? [`Ajustar mis avisos: ${c.urlPreferencias}`] : []),
  ].join("\n");

  return {
    asunto: c.asunto,
    html,
    texto,
    push: { titulo: c.asunto, cuerpo: c.push?.cuerpo ?? c.parrafos[0] ?? "", url: c.push?.url ?? c.boton?.url },
  };
}
