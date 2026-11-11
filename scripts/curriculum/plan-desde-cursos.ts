// Reconstruye la definición institucional y la oferta anual desde cursos existentes. Solo BD local.
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { normalizar } from "../../src/lib/cneb/catalogo";
import { detectarCursoKhipu } from "../../src/lib/cursos-khipu/catalogo";

type Cliente = PrismaClient;
export async function armarPlanDesdeCursos(prisma: Cliente, tenantId?: string) {
  const cursos = await prisma.curso.findMany({
    where: tenantId ? { tenantId } : undefined,
    include: { salon: { select: { nivel: true, grado: true, anio: true } } },
    orderBy: { id: "asc" },
  });
  let definiciones = 0, ofertas = 0, enlaces = 0;
  for (const curso of cursos) {
    const { nivel, grado, anio } = curso.salon;
    if (grado === null || grado <= 0) continue;
    const ficha = detectarCursoKhipu(curso.nombre, nivel === "academia" ? undefined : nivel);
    let definicion = curso.cursoColegioId
      ? await prisma.cursoColegio.findFirst({ where: { id: curso.cursoColegioId, tenantId: curso.tenantId } })
      : null;
    if (!definicion) {
      definicion = ficha
        ? await prisma.cursoColegio.findFirst({ where: { tenantId: curso.tenantId, cursoKhipu: ficha.clave } })
        : (await prisma.cursoColegio.findMany({ where: { tenantId: curso.tenantId, cursoKhipu: null } }))
          .find((x) => normalizar(x.nombre) === normalizar(curso.nombre)) ?? null;
    }
    if (!definicion) {
      definicion = await prisma.cursoColegio.create({
        data: { tenantId: curso.tenantId, cursoKhipu: ficha?.clave ?? null, nombre: ficha?.nombre ?? curso.nombre },
      });
      definiciones++;
    }
    if (curso.cursoColegioId !== definicion.id) {
      await prisma.curso.update({ where: { id: curso.id }, data: { cursoColegioId: definicion.id } });
      enlaces++;
    }
    const claveOferta = { cursoColegioId: definicion.id, anio, nivel, grado };
    const oferta = await prisma.cursoColegioGrado.findUnique({ where: { cursoColegioId_anio_nivel_grado: claveOferta } });
    if (!oferta) {
      await prisma.cursoColegioGrado.create({ data: { tenantId: curso.tenantId, ...claveOferta } });
      ofertas++;
    }
  }
  return { cursos: cursos.length, definiciones, enlaces, ofertas };
}

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error("Este script solo admite la BD local.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    const resultado = await armarPlanDesdeCursos(prisma);
    console.log("Plan de estudios reconstruido:", resultado);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
