import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { convertirAPng } from "@/lib/imagen-png";

// Firma de marca para los PDF (manual de marca): isotipo oficial de public/marca/isotipo.svg convertido a PNG,
// porque @react-pdf/renderer solo admite PNG y JPG.

export type ImagenPdf = { data: Buffer; format: "png" | "jpg" };

/** Lado mínimo del isotipo según el manual (24 px); en el PDF se dibuja a 24 pt o más. */
export const LADO_ISOTIPO_PDF = 24;

/** PNG del isotipo oficial (con caché en memoria); null si no se puede leer. */
export async function isotipoParaPdf(): Promise<ImagenPdf | null> {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", "marca", "isotipo.svg"));
    return { data: await convertirAPng(svg, "marca:isotipo"), format: "png" };
  } catch {
    return null;
  }
}
