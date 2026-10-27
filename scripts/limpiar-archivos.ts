// Borra archivos huérfanos (sin logo, foto, justificación, comunicado, tarea ni exportación, y con más de 24 h).
// Uso: pnpm tsx --conditions=react-server scripts/limpiar-archivos.ts [--confirmar]
// Sin --confirmar es un simulacro (--dry-run, por defecto): solo lista lo que se borraría.
// Se ejecuta con `--conditions=react-server`, como khipu:borrar-colegio, para poder importar src/lib/server.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encontrarArchivosHuerfanos, limpiarArchivosHuerfanos } from "../src/lib/server/mantenimiento-archivos";

async function main() {
  const confirmar = process.argv.includes("--confirmar");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    if (!confirmar) {
      const huerfanos = await encontrarArchivosHuerfanos(prisma);
      console.log(`[dry-run] ${huerfanos.length} archivo(s) huérfano(s).`);
      huerfanos.slice(0, 20).forEach((a) => console.log(`  ${a.proveedor}:${a.publicId} (${a.bytes} B, ${a.createdAt.toISOString()})`));
      if (huerfanos.length > 20) console.log(`  … y ${huerfanos.length - 20} más`);
      console.log("No se borró nada. Agrega --confirmar para borrar.");
      return;
    }
    const r = await limpiarArchivosHuerfanos(prisma, { confirmar: true });
    console.log(`${r.borrados} de ${r.encontrados} archivo(s) borrados.`);
    if (r.fallidos.length) {
      r.fallidos.forEach((f) => console.error(`  falló ${f.id}: ${f.error}`));
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
