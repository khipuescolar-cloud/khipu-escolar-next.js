import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const archivo = vi.hoisted(() => ({ mimeType: "application/pdf", nombre: "clase.pdf" }));
vi.mock("@/lib/server/tenant", () => ({ requireTenantContext: vi.fn(async () => ({ tenant: { id: "tenant" }, db: { materialVersionArchivo: { count: async () => 1 } } })) }));
vi.mock("@/lib/server/archivos", () => ({ requireArchivoVisible: vi.fn(async () => ({ id: "12345678-1234-1234-1234-123456789012", categoria: "material_clase", proveedor: "local", publicId: "test", bytes: 12, ...archivo })) }));
vi.mock("@/lib/server/storage", () => ({ storageDe: vi.fn() }));
vi.mock("@/lib/server/almacenamiento/metricas", () => ({ registrarMetrica: vi.fn(async () => {}) }));
vi.mock("@/lib/server/storage/local", () => ({ leerArchivoLocal: vi.fn(async () => Buffer.from("%PDF-1.4")), verificarFirmaArchivoLocal: vi.fn(() => true) }));

import { GET } from "@/app/colegio/[slug]/archivos/[id]/route";

const id = "12345678-1234-1234-1234-123456789012";
const contexto = { params: Promise.resolve({ slug: "colegio", id }) } as RouteContext<"/colegio/[slug]/archivos/[id]">;

beforeEach(() => { archivo.mimeType = "application/pdf"; archivo.nombre = "clase.pdf"; });

describe("cabeceras de descarga y vista previa", () => {
  it("entrega PDF inline solo con vista=1", async () => {
    const vista = await GET(new NextRequest(`http://colegio.lvh.me/archivos/${id}?vista=1`), contexto);
    const descarga = await GET(new NextRequest(`http://colegio.lvh.me/archivos/${id}`), contexto);
    expect(vista.headers.get("Content-Disposition")).toMatch(/^inline;/);
    expect(descarga.headers.get("Content-Disposition")).toMatch(/^attachment;/);
    expect(vista.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
  it("descarga DOCX aunque se solicite vista=1", async () => {
    archivo.mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    archivo.nombre = "clase.docx";
    const vista = await GET(new NextRequest(`http://colegio.lvh.me/archivos/${id}?vista=1`), contexto);
    expect(vista.headers.get("Content-Disposition")).toMatch(/^attachment;/);
    expect(vista.headers.get("Content-Disposition")).toContain("clase.docx");
  });
});
