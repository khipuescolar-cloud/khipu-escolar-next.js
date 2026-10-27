// Migra archivos entre proveedores de almacenamiento y actualiza Archivo.proveedor/publicId/url.
// Uso: pnpm tsx --conditions=react-server scripts/migrar-archivos.ts --de cloudinary|local --a s3 [--dry-run]
// Necesita las credenciales de ambos proveedores en el entorno (CLOUDINARY_* o .uploads/ local, y S3_*).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { migrarArchivos } from "../src/lib/server/mantenimiento-archivos";

const VALIDOS = ["local", "cloudinary", "s3"] as const;
type Proveedor = (typeof VALIDOS)[number];

function opcion(nombre: string): Proveedor | undefined {
  const i = process.argv.indexOf(nombre);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return VALIDOS.find((p) => p === v);
}

async function main() {
  const de = opcion("--de");
  const a = opcion("--a");
  if (!de || !a || de === a) {
    console.error("Uso: pnpm tsx --conditions=react-server scripts/migrar-archivos.ts --de cloudinary|local --a s3 [--dry-run]");
    process.exit(1);
  }
  const simulacro = process.argv.includes("--dry-run");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const r = await migrarArchivos(prisma, { de, a, simulacro });
    if (simulacro) console.log(`[dry-run] se migrarían ${r.encontrados} archivo(s) de ${de} a ${a}. No se tocó nada.`);
    else console.log(`${r.migrados} de ${r.encontrados} archivo(s) migrados de ${de} a ${a}.`);
    if (r.fallidos.length) {
      r.fallidos.forEach((f) => console.error(`  falló ${f.id}: ${f.error}`));
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
