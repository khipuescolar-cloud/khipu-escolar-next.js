// Borra un colegio y TODOS sus datos (cascade por tenant_id). Solo para el equipo de Khipu.
// Uso: pnpm khipu:borrar-colegio <slug> --confirmar <slug> [--dry-run]
// Antes del cascade borra los archivos del colegio en el proveedor (FileStorage: local, Cloudinary o S3; cada archivo con su propio proveedor).
// Si algún archivo no se puede borrar, se aborta SIN tocar la BD (se puede reintentar).
// --dry-run: solo cuenta y lista lo que se borraría. Se ejecuta con `tsx --conditions=react-server` para poder importar src/lib/server.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { borrarArchivoDelProveedor } from "../src/lib/server/storage";

async function main() {
  const args = process.argv.slice(2);
  const slug = args[0] && !args[0].startsWith("--") ? args[0] : undefined;
  const i = args.indexOf("--confirmar");
  const confirmacion = i >= 0 ? args[i + 1] : undefined;
  const simulacro = args.includes("--dry-run");

  if (!slug) {
    console.error("Uso: pnpm khipu:borrar-colegio <slug> --confirmar <slug> [--dry-run]");
    process.exit(1);
  }
  if (confirmacion !== slug) {
    console.error(`Rechazado: falta --confirmar ${slug}. No se borró nada.`);
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && process.env.KHIPU_PERMITIR_BORRADO !== "1") {
    console.error("Rechazado: en producción define KHIPU_PERMITIR_BORRADO=1 de forma explícita.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      console.error(`No existe el colegio «${slug}».`);
      process.exit(1);
    }
    const archivos = await prisma.archivo.findMany({ where: { tenantId: tenant.id } });
    console.log(`Colegio «${slug}»: ${archivos.length} archivo(s) en el almacenamiento.`);
    if (simulacro) {
      archivos.slice(0, 10).forEach((a) => console.log(`  [dry-run] borraría ${a.proveedor}:${a.publicId}`));
      if (archivos.length > 10) console.log(`  … y ${archivos.length - 10} más`);
      console.log("[dry-run] No se borró nada (ni archivos ni la BD).");
      return;
    }
    const fallidos: string[] = [];
    for (const a of archivos) {
      try {
        await borrarArchivoDelProveedor(a);
      } catch (error) {
        fallidos.push(`${a.proveedor}:${a.publicId} (${error instanceof Error ? error.message : "error"})`);
      }
    }
    if (fallidos.length > 0) {
      console.error(`Abortado: ${fallidos.length} archivo(s) no se pudieron borrar; la BD sigue intacta. Reintenta tras corregir:`);
      fallidos.forEach((f) => console.error(`  ${f}`));
      process.exitCode = 1;
      return;
    }
    if (archivos.length > 0) console.log(`${archivos.length} archivo(s) borrados del proveedor.`);
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log(`Colegio «${slug}» borrado con todos sus datos.`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
