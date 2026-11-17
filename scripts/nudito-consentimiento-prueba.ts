// Siembra el consentimiento de IA (specs/44) de unas pocas familias DEMO para poder probar Nudito en 1.° a 6.° de primaria
// (el seed solo lo deja en Mateo y Lucas). Solo BD local, idempotente. Uso:
//   pnpm exec tsx scripts/nudito-consentimiento-prueba.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CONSENTIMIENTO_POR_DEFECTO } from "../src/lib/nudito-plus";

// Correo del apoderado → nombres de los hijos que se autorizan (solo estos; el resto de familias queda sin consentimiento).
const FAMILIAS: Record<string, string[]> = {
  "mariela.palomino@familia.demo": ["Adriana", "Martín"], // 2.° A y 4.° A
  "janet.aguilar@familia.demo": ["Josué"], // 1.° A
};
// Un alumno de 6.° A (cuenta propia): se autoriza con su primer apoderado.
const SALON_6 = "6.° A";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error("Solo BD local.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: "nuevohorizonte" } });
    const version = CONSENTIMIENTO_POR_DEFECTO.version;
    const pares: { apoderadoId: string; alumnoId: string; etiqueta: string }[] = [];
    for (const [correo, hijos] of Object.entries(FAMILIAS)) {
      const m = await prisma.membership.findFirst({ where: { tenantId: tenant.id, rol: "apoderado", user: { email: correo } }, select: { id: true } });
      if (!m) { console.log("sin apoderado", correo); continue; }
      const alumnos = await prisma.alumno.findMany({ where: { tenantId: tenant.id, apoderados: { some: { apoderadoId: m.id } }, nombres: { in: hijos } }, select: { id: true, nombres: true, salon: { select: { nombre: true } } } });
      for (const a of alumnos) pares.push({ apoderadoId: m.id, alumnoId: a.id, etiqueta: `${a.nombres} (${a.salon.nombre}) ← ${correo}` });
    }
    const a6 = await prisma.alumno.findFirst({ where: { tenantId: tenant.id, estado: "activo", salon: { nombre: SALON_6 } }, select: { id: true, nombres: true, apoderados: { select: { apoderadoId: true }, take: 1 } }, orderBy: { nombres: "asc" } });
    if (a6?.apoderados[0]) pares.push({ apoderadoId: a6.apoderados[0].apoderadoId, alumnoId: a6.id, etiqueta: `${a6.nombres} (6.° A)` });

    for (const p of pares) {
      const ya = await prisma.consentimientoIa.findFirst({ where: { tenantId: tenant.id, alumnoId: p.alumnoId, versionTexto: version, revocadoAt: null } });
      if (ya) { console.log("ya tenía:", p.etiqueta); continue; }
      await prisma.consentimientoIa.create({ data: { tenantId: tenant.id, apoderadoId: p.apoderadoId, alumnoId: p.alumnoId, versionTexto: version, ip: "127.0.0.1" } });
      console.log("sembrado:", p.etiqueta);
    }
  } finally { await prisma.$disconnect(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
