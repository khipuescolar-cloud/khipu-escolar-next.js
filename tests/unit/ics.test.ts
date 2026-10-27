import { describe, expect, it } from "vitest";
import { construirIcs, escaparTextoIcs, fechaHoraUtcIcs, fechaLimaIcs, plegarLineaIcs } from "@/lib/ics";

describe("escaparTextoIcs", () => {
  it("escapa barra, punto y coma, coma y saltos de línea", () => {
    expect(escaparTextoIcs("a,b;c\\d\ne\r\nf")).toBe("a\\,b\;c\\\\d\\ne\\nf");
  });
});

describe("plegarLineaIcs", () => {
  it("no corta líneas de hasta 75 octetos", () => {
    expect(plegarLineaIcs("x".repeat(75))).toEqual(["x".repeat(75)]);
  });
  it("corta a 75 octetos y las continuaciones empiezan con un espacio (máx. 75 en total)", () => {
    const partes = plegarLineaIcs("x".repeat(200));
    expect(partes.length).toBe(3);
    expect(partes.every((p) => Buffer.byteLength(p) <= 75)).toBe(true);
    expect(partes.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(partes.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe("x".repeat(200));
  });
  it("cuenta octetos UTF-8 y no parte caracteres", () => {
    const linea = "SUMMARY:" + "ñ".repeat(80);
    const partes = plegarLineaIcs(linea);
    expect(partes.every((p) => Buffer.byteLength(p) <= 75)).toBe(true);
    expect(partes.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(linea);
  });
});

describe("fechas", () => {
  it("formatea UTC y el día de Lima", () => {
    expect(fechaHoraUtcIcs(new Date("2026-10-27T13:00:00Z"))).toBe("20261027T130000Z");
    // 02:00 UTC del 28 es todavía el 27 en Lima (UTC−5).
    expect(fechaLimaIcs(new Date("2026-10-28T02:00:00Z"))).toBe("20261027");
  });
});

describe("construirIcs", () => {
  const ahora = new Date("2026-10-26T15:00:00Z");
  const ics = construirIcs({
    nombre: "Agenda · Colegio, Prueba",
    ahora,
    eventos: [
      { uid: "e1@khipuescolar", titulo: "Reunión; padres, 3.° B", descripcion: "Línea 1\nLínea 2 " + "y".repeat(120), lugar: "3.° B", inicio: new Date("2026-10-27T13:30:00Z") },
      { uid: "t1@khipuescolar", titulo: "Entrega: fichas", inicio: new Date("2026-10-28T13:00:00Z"), diaCompleto: true },
    ],
  });

  it("usa CRLF, termina en CRLF y no tiene LF sueltos", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
  it("tiene la estructura de calendario, UID estable y DTSTAMP", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("UID:e1@khipuescolar\r\n");
    expect(ics).toContain("DTSTAMP:20261026T150000Z\r\n");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
  it("escapa el texto y pliega las líneas largas", () => {
    expect(ics).toContain("X-WR-CALNAME:Agenda · Colegio\\, Prueba");
    expect(ics).toContain("SUMMARY:Reunión\; padres\\, 3.° B");
    for (const linea of ics.split("\r\n")) expect(Buffer.byteLength(linea)).toBeLessThanOrEqual(75);
    expect(ics).toContain("\r\n y");
  });
  it("eventos con hora en UTC y entregas de día completo", () => {
    expect(ics).toContain("DTSTART:20261027T133000Z");
    expect(ics).toContain("DTEND:20261027T143000Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261028");
    expect(ics).toContain("DTEND;VALUE=DATE:20261029");
  });
});
