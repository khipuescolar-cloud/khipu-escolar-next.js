import { describe, expect, it, vi } from "vitest";
import { encontrarArchivosHuerfanos } from "@/lib/server/mantenimiento-archivos";
describe("limpiador de huérfanos", () => {
  it("excluye entregas, reuniones y sesiones de Nudito", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { tenant: { findMany: vi.fn().mockResolvedValue([]) }, alumno: { findMany: vi.fn().mockResolvedValue([]) }, archivo: { findMany } };
    await encontrarArchivosHuerfanos(prisma as never);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ categoria: "otro", entregaId: null, reunionId: null, nuditoSesionId: null }) }));
  });
});
