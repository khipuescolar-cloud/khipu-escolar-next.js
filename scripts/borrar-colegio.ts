// Borra un colegio y TODOS sus datos (cascade por tenant_id). Solo para el equipo de Khipu.
// Uso: pnpm khipu:borrar-colegio <slug> --confirmar <slug>
// Los archivos del proveedor (Cloudinary/S3) se borran cuando exista FileStorage (specs/14); hoy solo se listan.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const args = process.argv.slice(2);
  const slug = args[0] && !args[0].startsWith("--") ? args[0] : undefined;
  const i = args.indexOf("--confirmar");
  const confirmacion = i >= 0 ? args[i + 1] : undefined;

  if (!slug) {
    console.error("Uso: pnpm khipu:borrar-colegio <slug> --confirmar <slug>");
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
    const archivos = await prisma.archivo.findMany({ where: { tenantId: tenant.id }, select: { proveedor: true, publicId: true } });
    if (archivos.length > 0) {
      console.warn(`PENDIENTE: ${archivos.length} archivo(s) en el proveedor no se borran aún (falta FileStorage). Ejemplos:`);
      archivos.slice(0, 5).forEach((a) => console.warn(`  ${a.proveedor}:${a.publicId}`));
    }
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log(`Colegio «${slug}» borrado con todos sus datos.`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
