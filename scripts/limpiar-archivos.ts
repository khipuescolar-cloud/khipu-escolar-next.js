// Borra archivos huérfanos (sin logo, foto, justificación, comunicado, tarea ni exportación, y con más de 24 h).
// Uso: pnpm tsx --conditions=react-server scripts/limpiar-archivos.ts [--confirmar] [--proveedor]
// Sin --confirmar es un simulacro (--dry-run, por defecto): solo lista lo que se borraría.
// Con --proveedor: en lugar de las filas de `archivos`, lista (o con --confirmar borra) los objetos del almacenamiento LOCAL
// (.uploads/) que no tienen fila en `archivos`. Límite: Cloudinary y S3 no se listan desde aquí (se revisan en su consola bajo khipu/<tenantId>/).
// Se ejecuta con `--conditions=react-server`, como khipu:borrar-colegio, para poder importar src/lib/server.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encontrarArchivosHuerfanos, encontrarObjetosLocalesHuerfanos, limpiarArchivosHuerfanos, limpiarObjetosLocalesHuerfanos } from "../src/lib/server/mantenimiento-archivos";

async function main() {
  const confirmar = process.argv.includes("--confirmar");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    if (process.argv.includes("--proveedor")) {
      if (!confirmar) {
        const objetos = await encontrarObjetosLocalesHuerfanos(prisma);
        console.log(`[dry-run] ${objetos.length} objeto(s) local(es) sin fila en archivos.`);
        objetos.slice(0, 20).forEach((o) => console.log(`  local:${o.publicId} (${o.bytes} B, ${o.modificadoAt.toISOString()})`));
        if (objetos.length > 20) console.log(`  … y ${objetos.length - 20} más`);
        console.log("No se borró nada. Agrega --confirmar para borrar. (Cloudinary/S3 no se listan desde aquí.)");
        return;
      }
      const r = await limpiarObjetosLocalesHuerfanos(prisma, { confirmar: true });
      console.log(`${r.borrados} de ${r.encontrados} objeto(s) local(es) borrados.`);
      return;
    }
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
