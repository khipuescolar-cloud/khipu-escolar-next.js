import { urlRaiz } from "@/lib/dominio";

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

// Símbolos tipográficos (no emojis) + palabra. Colores = estados fijos de la marca.
const INSIGNIAS: Record<EstadoInsignia, { simbolo: string; palabra: string; color: string; fondo: string }> = {
  llego: { simbolo: "✓", palabra: "Llegó", color: "#166534", fondo: "#E8F5EC" },
  tarde: { simbolo: "◷", palabra: "Tarde", color: "#9A4A07", fondo: "#FDF2E3" },
  falta: { simbolo: "!", palabra: "No llegó", color: "#B91C1C", fondo: "#FBEAEA" },
  problema: { simbolo: "!", palabra: "Aviso", color: "#B91C1C", fondo: "#FBEAEA" },
  info: { simbolo: "i", palabra: "Aviso", color: "#1E2A78", fondo: "#EEF0FB" },
};

const FUENTE = "Inter,Arial,Helvetica,sans-serif";
const FUENTE_TITULO = "Sora,Inter,Arial,Helvetica,sans-serif";

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
  /** URL absoluta del logo del colegio (opcional); se muestra junto al de Khipu Escolar. */
  logoColegioUrl?: string;
  /** Muestra a Nudito (PNG fijo) tras el mensaje: solo recordatorios, tareas y libretas; nunca en faltas ni problemas. */
  nudito?: boolean;
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
    ? `<p style="margin:0 0 16px"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${ins.fondo};color:${ins.color};font-family:${FUENTE};font-weight:600;font-size:14px;line-height:20px"><span aria-hidden="true">${ins.simbolo}</span> ${escaparHtml(palabra ?? "")}</span></p>`
    : "";
  const parrafosHtml = c.parrafos
    .map((p) => `<p style="margin:0 0 12px;font-family:${FUENTE};font-size:16px;line-height:24px;color:#1B1F2A">${escaparHtml(p)}</p>`)
    .join("");
  const botonHtml = c.boton
    ? `<p style="margin:20px 0"><a href="${escaparHtml(c.boton.url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1E2A78;color:#FFFFFF;font-family:${FUENTE};font-weight:600;font-size:16px;text-decoration:none">${escaparHtml(c.boton.texto)}</a></p>`
    : "";
  const noditoHtml = c.nudito
    ? `<p style="margin:16px 0 0"><img src="${urlRaiz("/marca/nudito@2x.png")}" width="64" height="64" alt="Nudito, el asistente de Khipu" style="display:block;border:0;width:64px;height:64px"></p>`
    : "";
  const logoColegioHtml = c.logoColegioUrl
    ? `<img src="${escaparHtml(c.logoColegioUrl)}" height="48" alt="${escaparHtml(c.colegio)}" style="display:block;border:0;height:48px;width:auto;max-width:120px">`
    : "";
  const cabeceraHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-bottom:1px solid #E4E1DA"><tr>
<td valign="middle" style="padding:0 0 16px">${logoColegioHtml}<p style="margin:${logoColegioHtml ? "6px" : "0"} 0 0;font-family:${FUENTE_TITULO};font-size:16px;line-height:22px;font-weight:600;color:#1E2A78">${escaparHtml(c.colegio)}</p></td>
<td valign="middle" align="right" style="padding:0 0 16px"><img src="${urlRaiz("/marca/logotipo-horizontal@2x.png")}" width="190" height="56" alt="Khipu Escolar" style="display:block;border:0;width:190px;max-width:100%;height:auto"></td>
</tr></table>`;
  const pieHtml = [
    `Este aviso lo envía ${escaparHtml(c.colegio)} con Khipu Escolar.`,
    c.urlPreferencias
      ? `<a href="${escaparHtml(c.urlPreferencias)}" style="color:#3A4BB5">Ajustar mis avisos</a>`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const html = `<!doctype html>
<html lang="es-PE">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escaparHtml(c.asunto)}</title></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:${FUENTE}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E4E1DA;border-radius:14px"><tr><td style="padding:24px">
${cabeceraHtml}
${insigniaHtml}${parrafosHtml}${botonHtml}${noditoHtml}
<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #E4E1DA;font-family:${FUENTE};font-size:13px;line-height:20px;color:#5B6170">${pieHtml}</p>
<p style="margin:8px 0 0;font-family:${FUENTE};font-size:13px;line-height:20px;color:#5B6170">Khipu Escolar · Cada día de tu hijo, bien anudado.</p>
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
    "Khipu Escolar · Cada día de tu hijo, bien anudado.",
  ].join("\n");

  return {
    asunto: c.asunto,
    html,
    texto,
    push: { titulo: c.asunto, cuerpo: c.push?.cuerpo ?? c.parrafos[0] ?? "", url: c.push?.url ?? c.boton?.url },
  };
}
