import "server-only";
import { db, dbTenant } from "../db";
import { storageDe } from "../storage";
import { descontarPorTenant } from "./cuotas";
import { registrarMetrica } from "./metricas";

/** Conservador: solo documentos no oficiales. El interruptor está apagado por defecto. */
export async function purgarPapeleraVencida(ahora = new Date()): Promise<{ documentos: number; archivos: number }> {
  const limite = new Date(ahora.getTime() - 30 * 86_400_000);
  const medidores = await db.almacenamientoColegio.findMany({ where: { purgaAutomaticaActiva: true, tenant: { estado: { in: ["activo", "piloto"] } } }, select: { tenantId: true } });
  let documentos = 0, archivos = 0;
  for (const m of medidores) {
    const tdb = dbTenant(m.tenantId);
    const candidatos = await tdb.documento.findMany({ where: { eliminadoAt: { lte: limite }, oficial: false, ambito: "unidad" }, select: { id: true, archivos: true } });
    for (const d of candidatos) {
      // Un archivo compartido por otro flujo permanece; una falla del proveedor detiene el borrado de ese documento.
      for (const a of d.archivos) await storageDe(a.proveedor).borrar(a);
      await tdb.documento.delete({ where: { id: d.id } });
      for (const a of d.archivos) { await descontarPorTenant(m.tenantId, a.categoria, BigInt(a.bytes)); await registrarMetrica(m.tenantId, a.categoria, "borrados", a.bytes); archivos++; }
      documentos++;
    }
  }
  return { documentos, archivos };
}
