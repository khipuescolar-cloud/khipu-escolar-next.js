import { describe, expect, it } from "vitest";
import { disposicionArchivo } from "@/lib/disposicion-archivo";

describe("disposición de archivos", () => {
  it("muestra PDF e imágenes seguras solo al pedir vista previa", () => {
    expect(disposicionArchivo("guía.pdf", "application/pdf", true)).toMatch(/^inline;/);
    expect(disposicionArchivo("foto.png", "image/png", true)).toMatch(/^inline;/);
    expect(disposicionArchivo("guía.pdf", "application/pdf", false)).toMatch(/^attachment;/);
  });
  it("descarga DOCX y tipos no admitidos aunque se pida vista previa", () => {
    expect(disposicionArchivo("guía.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", true)).toMatch(/^attachment;/);
    expect(disposicionArchivo("imagen.svg", "image/svg+xml", true)).toMatch(/^attachment;/);
    expect(disposicionArchivo("guía.docx", "application/octet-stream", false)).toContain("filename*=UTF-8''gu%C3%ADa.docx");
  });
});
