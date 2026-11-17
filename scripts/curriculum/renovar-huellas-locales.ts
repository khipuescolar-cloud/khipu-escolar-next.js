// Renueva la huella editorial de claves ya aprobadas (una a una, solo BD local).
// Uso: pnpm exec tsx scripts/curriculum/renovar-huellas-locales.ts <correo-superadmin> <clave...>
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { huellaActualDeTema } from "../../src/lib/curriculum/huella";

async function main() {
  const [correo, ...claves] = process.argv.slice(2);
  if (!correo || !claves.length) throw new Error("Uso: <correo> <clave...>");
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error("Solo BD local.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    const rev = await prisma.profile.findUnique({ where: { email: correo.toLowerCase().trim() } });
    if (!rev || !(await prisma.adminPlataforma.findFirst({ where: { userId: rev.id, activo: true } }))) throw new Error("Revisor no es super admin activo.");
    for (const clave of claves) {
      const tema = await prisma.temaCurricular.findUnique({ where: { clave } });
      const huella = await huellaActualDeTema(clave);
      if (!tema || !huella || !["revisado", "publicado"].includes(tema.estado)) { console.log(clave, "OMITIDA", tema?.estado ?? "sin-tema", huella ? "" : "sin-huella"); continue; }
      const anterior = tema.huellaContenidoRevisado;
      const n = (await prisma.$transaction(async (tx) => {
        const r = await tx.temaCurricular.updateMany({ where: { clave, huellaContenidoRevisado: anterior, estado: tema.estado }, data: { huellaContenidoRevisado: huella } });
        if (r.count) await tx.auditoriaPlataforma.create({ data: { actorId: rev.id, accion: "curriculum_revision_local_claude", tenantId: null, detalle: { clave, anterior, nueva: huella } } });
        return r.count;
      }));
      console.log(clave, n ? "RENOVADA" : "SIN_CAMBIO", tema.estado, anterior === huella ? "(ya vigente)" : "");
    }
  } finally { await prisma.$disconnect(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
