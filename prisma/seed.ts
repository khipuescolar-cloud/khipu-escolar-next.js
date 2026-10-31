// Datos demo (ficticios) para desarrollo y QA: un solo colegio, I.E.P. Nuevo Horizonte (Khipu Pro), con muchos datos.
// Uso: pnpm db:seed (o pnpm db:reconstruir para dejar la BD local solo con esto). Contraseña de todas las cuentas: demo123.
// Idempotente: borra el colegio demo (cascade) y lo vuelve a crear; los usuarios de Auth y los perfiles se reutilizan.
// Cada área vive en su módulo `prisma/seed-*.ts`; se llaman al final de main(), en orden.
import "dotenv/config";
import { rm } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { sembrarAsistencia } from "./seed-asistencia";
import { sembrarCneb } from "./seed-cneb";
import { sembrarColegio } from "./seed-colegio";
import { sembrarComunicacion } from "./seed-comunicacion";
import { sembrarDocumentos } from "./seed-documentos";
import { sembrarHorario } from "./seed-horario";
import { sembrarNotas } from "./seed-notas";
import { sembrarNuditoPlus } from "./seed-nudito-plus";
import { sembrarNuditoPlusTutor } from "./seed-nudito-plus-tutor";
import { sembrarReuniones } from "./seed-reuniones";
import { SLUG_COLEGIO, asegurarUsuariosAuth } from "./seed-utilidades";

/** Colegios demo de versiones anteriores del seed: se borran si existen. */
const SLUGS_ANTERIORES = ["losolivos", "academiaeuler"];

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

if (process.env.NODE_ENV === "production") throw new Error("El seed demo no se ejecuta en producción.");

/** Responsable principal (la dirección) y suscripción de ejemplo para /suscripciones (specs/20). */
async function responsableYSuscripcion() {
  const t = await prisma.tenant.findUniqueOrThrow({ where: { slug: SLUG_COLEGIO } });
  const dir = await prisma.membership.findFirstOrThrow({ where: { tenantId: t.id, rol: "direccion" }, include: { user: true } });
  await prisma.contactoColegio.create({
    data: { tenantId: t.id, tipo: "principal", principal: true, nombres: dir.user.nombres, apellidos: dir.user.apellidos, cargo: dir.cargo, email: dir.user.email, telefono: dir.user.telefono, membershipId: dir.id },
  });
  const dia = (n: number) => new Date(Date.now() + n * 86_400_000);
  await prisma.suscripcion.create({
    data: { tenantId: t.id, plan: "pro", ciclo: "anual", estado: "activa", montoPorCiclo: 5400, alumnosContratados: 400, inicio: dia(-240), proximaRenovacion: dia(120) },
  });
}

async function paso(nombre: string, fn: () => Promise<unknown>) {
  const t0 = Date.now();
  await fn();
  console.log(`  ✓ ${nombre} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

async function main() {
  const t0 = Date.now();
  // Borra el colegio demo (y los de versiones anteriores) con todos sus datos y sus archivos locales.
  const previos = await prisma.tenant.findMany({ where: { slug: { in: [SLUG_COLEGIO, ...SLUGS_ANTERIORES] } }, select: { id: true } });
  for (const { id } of previos) await rm(path.resolve(process.cwd(), ".uploads", id), { recursive: true, force: true });
  await prisma.tenant.deleteMany({ where: { id: { in: previos.map((p) => p.id) } } });

  // Plataforma: super administrador del equipo Khipu.
  const superadminId = (await asegurarUsuariosAuth(["admin@khipuescolar.demo"])).get("admin@khipuescolar.demo")!;
  await prisma.profile.upsert({
    where: { id: superadminId },
    update: { email: "admin@khipuescolar.demo", nombres: "Equipo", apellidos: "Khipu" },
    create: { id: superadminId, email: "admin@khipuescolar.demo", nombres: "Equipo", apellidos: "Khipu" },
  });
  await prisma.adminPlataforma.upsert({ where: { userId: superadminId }, update: { activo: true }, create: { userId: superadminId } });

  console.log("Sembrando I.E.P. Nuevo Horizonte…");
  await paso("colegio, personas, salones, cursos y carnets", () => sembrarColegio(prisma));
  await paso("responsable y suscripción", responsableYSuscripcion);
  await paso("competencias del CNEB", () => sembrarCneb(prisma));
  await paso("notas", () => sembrarNotas(prisma));
  // Horario semanal por salón (specs/34): antes de la asistencia, porque las listas de curso siguen sus bloques.
  await paso("horario", () => sembrarHorario(prisma));
  await paso("asistencia, justificaciones y avisos", () => sembrarAsistencia(prisma));
  await paso("tareas, agenda, comunicados, mensajes y soporte", () => sembrarComunicacion(prisma));
  await paso("documentos", () => sembrarDocumentos(prisma, {}));
  await paso("reuniones", () => sembrarReuniones(prisma, {}));
  // Nudito+: primero el tutor (conversaciones de Lucas), luego licencias, sitios y configuración (specs/28–29).
  await paso("Nudito+ (tutor)", () => sembrarNuditoPlusTutor(prisma, {}));
  await paso("Nudito+ (licencias)", () => sembrarNuditoPlus(prisma, { superadminId }));

  console.log(`Seed listo en ${((Date.now() - t0) / 1000).toFixed(1)} s. Contraseña de todas las cuentas: demo123`);
  console.log("  direccion@nuevohorizonte.demo · lucia.garcia@nuevohorizonte.demo · rosa.quispe@gmail.com · admin@khipuescolar.demo");
  console.log("  Todas las cuentas: pnpm db:credenciales (escribe credenciales-pruebas.md fuera del repo).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
