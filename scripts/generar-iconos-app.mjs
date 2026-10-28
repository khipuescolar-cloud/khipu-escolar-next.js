// Genera los íconos de la app instalable (specs/24-app-instalable.md) a partir del isotipo de la marca:
//  - public/marca/icono-maskable-192.png y -512.png: fondo índigo a sangre y el isotipo dentro de la zona segura
//    (círculo del 80 %), para que Android lo recorte en círculo, gota o cuadrado sin cortar el nudo.
//  - public/marca/atajo-*.png (96 px): íconos de los atajos del manifiesto (lucide, trazo 2, blanco sobre índigo).
// Uso: node scripts/generar-iconos-app.mjs  (los PNG resultantes se versionan; no hace falta correrlo en el despliegue).
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";

const INDIGO = "#1E2A78";
const MARCA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "marca");

// Isotipo (viewBox 40×40) a escala 14 y centrado: su punto más lejano queda a ~29 % del centro (< 40 % de la zona segura).
const ESCALA = 14;
const desplazamiento = 512 - 20 * ESCALA;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect width="1024" height="1024" fill="${INDIGO}"/><g transform="translate(${desplazamiento} ${desplazamiento}) scale(${ESCALA})"><path d="M13 6v28" stroke="#FFFFFF" stroke-width="5"/><path d="M14 21 28 9M16 19l12 13" stroke="#FFFFFF" stroke-width="5"/><circle cx="29" cy="8" r="4" fill="#F2B84B"/><circle cx="29" cy="33" r="4" fill="#FFFFFF"/></g></svg>`;

const ATAJOS = { asistencia: L.ClipboardCheck, mensajes: L.MessagesSquare, comunicados: L.Megaphone, inicio: L.House };

function atajo(Icono) {
  const glifo = renderToStaticMarkup(React.createElement(Icono, { size: 56, color: "#FFFFFF", strokeWidth: 2, x: 20, y: 20 }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${INDIGO}"/>${glifo}</svg>`;
}

async function main() {
  for (const lado of [192, 512]) {
    await sharp(Buffer.from(maskable)).resize(lado, lado).png({ compressionLevel: 9 }).toFile(path.join(MARCA, `icono-maskable-${lado}.png`));
  }
  for (const [nombre, Icono] of Object.entries(ATAJOS)) {
    await sharp(Buffer.from(atajo(Icono))).png({ compressionLevel: 9 }).toFile(path.join(MARCA, `atajo-${nombre}.png`));
  }
  console.log("Íconos generados en public/marca/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
