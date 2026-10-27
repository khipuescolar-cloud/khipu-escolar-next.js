import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { CarnetsPdf, paginar, parseFormatoCarnets, type CarnetPdf } from "@/lib/server/carnets-pdf";

async function carnets(n: number): Promise<CarnetPdf[]> {
  const qr = await QRCode.toDataURL("https://khipu.test/q/prueba", { margin: 1, width: 200 });
  return Array.from({ length: n }, (_, i) => ({ alumnoId: `id-${i}`, nombres: `Alumno ${i}`, apellidos: "Prueba", codigo: `C-${i}`, qr }));
}

const paginasDe = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

describe("PDF de carnets", () => {
  it("reparte 8 carnets por hoja", () => {
    expect(paginar([1, 2, 3, 4, 5, 6, 7, 8, 9], 8).map((p) => p.length)).toEqual([8, 1]);
    expect(paginar([], 8)).toEqual([]);
  });

  it("el formato por defecto es A4", () => {
    expect(parseFormatoCarnets(null)).toBe("a4");
    expect(parseFormatoCarnets("cr80")).toBe("cr80");
    expect(parseFormatoCarnets("otro")).toBe("a4");
  });

  it("genera un PDF A4 con 9 carnets en 2 hojas", async () => {
    const pdf = await renderToBuffer(CarnetsPdf({ colegio: "Colegio de Prueba", salon: "3.° B", carnets: await carnets(9), formato: "a4" }));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(paginasDe(pdf)).toBe(2);
  });

  it("genera un PDF CR80 con una página por carnet", async () => {
    const pdf = await renderToBuffer(CarnetsPdf({ colegio: "Colegio de Prueba", salon: "3.° B", carnets: await carnets(3), formato: "cr80" }));
    expect(paginasDe(pdf)).toBe(3);
  });
});
