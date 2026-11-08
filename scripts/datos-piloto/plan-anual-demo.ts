// `pnpm db:demo-plan-anual`: siembra en la BD LOCAL los planes anuales demo de Nuevo Horizonte (prisma/seed-plan-anual.ts)
// sin reconstruir todo. Aborta si DATABASE_URL no apunta a 127.0.0.1/localhost. Idempotente.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { GRUPO_SIN_PLAN, sembrarPlanesAnuales } from "../../prisma/seed-plan-anual";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error("Solo para la BD local (127.0.0.1/localhost).");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const r = await sembrarPlanesAnuales(prisma);
    console.log(`Planes publicados creados: ${r.creados} · lecciones publicadas nuevas: ${r.lecciones}.`);
    console.log(`Sin plan (para probar el flujo a mano): ${GRUPO_SIN_PLAN.grado}.° ${GRUPO_SIN_PLAN.nivel} · ${GRUPO_SIN_PLAN.area}.`);
    console.log("Cuentas: dirección, docentes de Matemática de 3.° primaria, alumno lucas.huaman (5.° A). Ver StartUp/credenciales-pruebas.md.");
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
