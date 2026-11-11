// Aprobación editorial inicial en bloque. Por defecto solo acepta la BD local.
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { temasGlobales, idDeFuente } from "../../src/lib/nudito/catalogo";

type TemaIndice = {
  clave: string; areaCneb: string; disciplinas: string[]; nivel: "primaria" | "secundaria"; grado: number;
  procedencia: string; fuenteId: string | null; fuenteLocator: string | null; version: number;
};

async function temasDelBanco(): Promise<TemaIndice[]> {
  const raiz = path.resolve("src/lib/nudito/conocimiento/banco");
  const salida = new Map<string, TemaIndice>();
  async function recorrer(dir: string): Promise<void> {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, e.name);
      if (e.isDirectory()) { await recorrer(ruta); continue; }
      if (e.name !== "temario-propuesto.json") continue;
      const doc = JSON.parse(await readFile(ruta, "utf8")) as { area: string; nivel: "primaria" | "secundaria"; grado: number; competencias?: unknown[] };
      function visitar(x: unknown) {
        if (!x || typeof x !== "object") return;
        const o = x as Record<string, unknown>;
        if (typeof o.clave === "string" && typeof o.nombre === "string") {
          const previo = salida.get(o.clave);
          const disciplina = typeof o.disciplina === "string" ? o.disciplina : null;
          salida.set(o.clave, {
            clave: o.clave, areaCneb: doc.area, disciplinas: [...new Set([...(previo?.disciplinas ?? []), ...(disciplina ? [disciplina] : [])])],
            nivel: doc.nivel, grado: doc.grado, procedencia: "banco_nudito",
            fuenteId: null, fuenteLocator: path.relative(process.cwd(), ruta), version: 1,
          });
        }
        for (const v of Object.values(o)) if (Array.isArray(v)) v.forEach(visitar);
      }
      doc.competencias?.forEach(visitar);
    }
  }
  await recorrer(raiz);
  return [...salida.values()];
}

export async function aprobarTodosLosTemas(prisma: PrismaClient, correoRevisor: string) {
  const revisor = await prisma.profile.findUnique({ where: { email: correoRevisor.toLowerCase().trim() } });
  if (!revisor || !(await prisma.adminPlataforma.findFirst({ where: { userId: revisor.id, activo: true } }))) {
    throw new Error("El revisor debe ser un super administrador activo de Khipu.");
  }
  const indice = new Map((await temasDelBanco()).map((t) => [t.clave, t]));
  for (const tema of temasGlobales()) {
    const previo = indice.get(tema.clave);
    indice.set(tema.clave, {
      clave: tema.clave, areaCneb: tema.area, disciplinas: previo?.disciplinas ?? [], nivel: tema.nivel, grado: tema.grado,
      procedencia: previo?.procedencia ?? "catalogo_nudito", fuenteId: idDeFuente(tema.fuente),
      fuenteLocator: previo?.fuenteLocator ?? null, version: tema.version,
    });
  }
  const filas = [...indice.values()];
  let creados = 0;
  for (let i = 0; i < filas.length; i += 500) {
    creados += (await prisma.temaCurricular.createMany({ data: filas.slice(i, i + 500), skipDuplicates: true })).count;
  }
  const fecha = new Date();
  const revisados = (await prisma.temaCurricular.updateMany({
    where: { estado: "borrador" },
    data: { estado: "revisado", revisadoPorId: revisor.id, revisadoAt: fecha },
  })).count;
  if (creados || revisados) await prisma.auditoriaPlataforma.create({
    data: { actorId: revisor.id, accion: "curriculum_aprobacion_inicial", tenantId: null,
      detalle: { nota: "aprobación inicial en bloque", creados, revisados, fecha: fecha.toISOString() } },
  });
  return { catalogo: filas.length, creados, revisados };
}

async function main() {
  const args = process.argv.slice(2);
  const pos = args.indexOf("--revisor");
  const correo = pos >= 0 ? args[pos + 1] : undefined;
  if (!correo || !correo.includes("@")) throw new Error("Uso: pnpm curriculum:aprobar-todo --revisor <correo> [--permitir-nube]");
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) && !args.includes("--permitir-nube")) {
    throw new Error("La aprobación fuera de la BD local requiere --permitir-nube y autorización del supervisor.");
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try { console.log("Aprobación inicial:", await aprobarTodosLosTemas(prisma, correo)); }
  finally { await prisma.$disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
