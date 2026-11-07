import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";
import { db } from "@/lib/server/db";
import { iniciarSubida, confirmarSubida, liberarArchivo } from "@/lib/server/almacenamiento";
import { reservar, liberarReserva } from "@/lib/server/almacenamiento/cuotas";
import { RAIZ_LOCAL } from "@/lib/server/storage/local";
import { requireArchivoVisible } from "@/lib/server/archivos";
import { actualizarAvisoCuota } from "@/lib/server/almacenamiento/alertas";

const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
let colegio: ColegioPrueba, ajeno: ColegioPrueba;
beforeAll(async () => { colegio = await crearColegioPrueba({ plan: "pro", prefijo: "almacenamiento" }); ajeno = await crearColegioPrueba({ plan: "pro", prefijo: "almacenamiento" }); });
afterAll(async () => { await colegio?.limpiar(); await ajeno?.limpiar(); });
describe("almacenamiento central", () => {
  it("8: preserva espacio crítico para entregas", async () => {
    const ctx = colegio.ctxDe("direccion");
    await db.almacenamientoColegio.upsert({ where: { tenantId: colegio.tenant.id }, create: { tenantId: colegio.tenant.id, limiteBytes: BigInt(100), reservaCriticaPct: 5 }, update: { limiteBytes: BigInt(100), reservaCriticaPct: 5 } });
    expect(await reservar(ctx, 96)).toBe(false);
    expect(await reservar(ctx, 96, true)).toBe(true);
    await liberarReserva(ctx, BigInt(96));
  });
  it("9: dos reservas simultáneas no superan la cuota", async () => {
    const ctx = colegio.ctxDe("direccion");
    const [a, b] = await Promise.all([reservar(ctx, 60), reservar(ctx, 60)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const medidor = await db.almacenamientoColegio.findUniqueOrThrow({ where: { tenantId: colegio.tenant.id } });
    expect(medidor.reservadoBytes).toBe(BigInt(60));
    await liberarReserva(ctx, BigInt(60));
  });
  it("6 y 10: confirma una sola vez y aísla subida y descarga", async () => {
    const ctx = colegio.ctxDe("direccion");
    await db.almacenamientoColegio.update({ where: { tenantId: colegio.tenant.id }, data: { limiteBytes: BigInt(100000) } });
    const s = await iniciarSubida(ctx, { categoria: "documento", nombre: "prueba.pdf", bytes: pdf.length, mimeDeclarado: "application/pdf" });
    await expect(confirmarSubida(ajeno.ctxDe("direccion"), s.subidaId)).rejects.toThrow("Subida no encontrada");
    const ruta = path.join(RAIZ_LOCAL, s.publicId);
    await mkdir(path.dirname(ruta), { recursive: true }); await writeFile(ruta, pdf);
    const primero = await confirmarSubida(ctx, s.subidaId);
    const segundo = await confirmarSubida(ctx, s.subidaId);
    expect(segundo.archivo.id).toBe(primero.archivo.id);
    await expect(requireArchivoVisible(ajeno.ctxDe("direccion"), primero.archivo.id)).rejects.toBeTruthy();
    await liberarArchivo(ctx, primero.archivo.id);
  });
  it("18: la matriz heredada permite logos públicos y niega archivos privados sin vínculo", async () => {
    const publico = await colegio.db.archivo.create({ data: { tenantId: colegio.tenant.id, proveedor: "local", publicId: "test-publico", mimeType: "application/pdf", bytes: 1, privado: false } });
    const privado = await colegio.db.archivo.create({ data: { tenantId: colegio.tenant.id, proveedor: "local", publicId: "test-privado", mimeType: "application/pdf", bytes: 1, privado: true } });
    expect((await requireArchivoVisible(colegio.ctxDe("madre"), publico.id)).id).toBe(publico.id);
    await expect(requireArchivoVisible(colegio.ctxDe("madre"), privado.id)).rejects.toBeTruthy();
    await colegio.db.archivo.deleteMany({ where: { id: { in: [publico.id, privado.id] } } });
  });
  it("avisa a dirección una sola vez por umbral y rearma tras bajar", async () => {
    await db.almacenamientoColegio.update({ where: { tenantId: colegio.tenant.id }, data: { limiteBytes: BigInt(100), usadoBytes: BigInt(70), umbralNotificado: 0 } });
    expect(await actualizarAvisoCuota(colegio.tenant.id)).toBe(70);
    expect(await actualizarAvisoCuota(colegio.tenant.id)).toBeNull();
    await db.almacenamientoColegio.update({ where: { tenantId: colegio.tenant.id }, data: { usadoBytes: BigInt(64) } });
    await actualizarAvisoCuota(colegio.tenant.id);
    expect((await db.almacenamientoColegio.findUniqueOrThrow({ where: { tenantId: colegio.tenant.id } })).umbralNotificado).toBe(0);
  });
});
