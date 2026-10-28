import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Imagen para compartir la landing (Open Graph, specs/25): fondo índigo, logotipo blanco oficial, lema y
// las cuerdas del khipu con nudos en los tonos claros de la paleta. Sin fotos ni monedas.

export const alt = "Khipu Escolar · Cada día de tu hijo, bien anudado.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INDIGO = "#1E2A78";
const NUDOS = ["#F2B84B", "#E8789F", "#4FC3BF", "rgba(255,255,255,0.55)"];
const LARGOS = [0.62, 0.9, 0.5, 1, 0.7, 0.45, 0.82, 0.58, 0.95, 0.66, 0.86, 0.52, 0.76, 0.6];

export default async function Image() {
  const svg = await readFile(join(process.cwd(), "public/marca/logotipo-horizontal-blanco.svg"));
  const logo = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: INDIGO, color: "white", padding: "64px 72px 0" }}>
        <img src={logo} width={254} height={75} alt="" />
        <div style={{ display: "flex", flexDirection: "column", marginTop: 44, gap: 18 }}>
          <div style={{ fontSize: 22, letterSpacing: 4, opacity: 0.75 }}>PARA COLEGIOS DEL PERÚ</div>
          <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.08, maxWidth: 900 }}>Cada día de tu hijo, bien anudado.</div>
          <div style={{ fontSize: 28, opacity: 0.82, maxWidth: 940, lineHeight: 1.35 }}>Asistencia con aviso a la familia, chat con el tutor, notas, tareas y Nudito.</div>
        </div>
        <div style={{ display: "flex", flex: 1, position: "relative", marginTop: 36, marginLeft: -72, marginRight: -72 }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.7)" }} />
          {LARGOS.map((l, i) => (
            <div
              key={i}
              style={{ position: "absolute", top: 0, left: 50 + i * 80, width: 5, height: `${Math.round(l * 100)}%`, background: NUDOS[i % NUDOS.length], display: "flex" }}
            >
              <div style={{ position: "absolute", top: `${Math.round(l * 45)}%`, left: -6, width: 17, height: 17, borderRadius: 999, background: NUDOS[i % NUDOS.length] }} />
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
