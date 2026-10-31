// Reconstruye la BD LOCAL de desarrollo para QA: borra TODOS los colegios (cascade por tenant_id) con sus archivos locales,
// todos los usuarios de Supabase Auth y perfiles que no sean del equipo Khipu (admins_plataforma) y vuelve a correr el seed
// (prisma/seed.ts → solo I.E.P. Nuevo Horizonte). No usa `prisma migrate reset`: las migraciones y las tablas de plataforma
// (planes, configuración, sitios permitidos…) quedan intactas.
// Uso: pnpm db:reconstruir [--credenciales <ruta.md>]   (se niega a correr si la BD o el Auth no son 127.0.0.1/localhost)
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../../src/generated/prisma/client";

const esLocal = (u: string) => /@(127\.0\.0\.1|localhost)[:/]/.test(u) || /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u);

async function main() {
  const db = process.env.DATABASE_URL ?? "";
  const auth = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!esLocal(db) || !esLocal(auth) || process.env.NODE_ENV === "production") {
    console.error("Rechazado: solo se reconstruye la BD y el Auth LOCALES (127.0.0.1 / localhost). No se borró nada.");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: db }) });
  const supabase = createClient(auth, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const t0 = Date.now();
  try {
    // 1. Colegios: archivos locales y luego la BD (cascade). Los archivos de proveedores en la nube NO se tocan.
    const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
    const remotos = await prisma.archivo.count({ where: { proveedor: { not: "local" } } });
    if (remotos > 0) console.warn(`Aviso: ${remotos} archivo(s) de un proveedor en la nube; se borra su fila, no el archivo remoto.`);
    for (const t of tenants) await rm(path.resolve(process.cwd(), ".uploads", t.id), { recursive: true, force: true });
    await prisma.tenant.deleteMany({});
    console.log(`Colegios borrados: ${tenants.length} (${tenants.map((t) => t.slug).join(", ") || "ninguno"}).`);

    // 2. Usuarios: se conservan solo los del equipo Khipu (admins_plataforma).
    const admins = await prisma.adminPlataforma.findMany({ include: { user: { select: { email: true } } } });
    const conservar = new Set(admins.map((a) => a.userId));
    const borrar: string[] = [];
    for (let pagina = 1; ; pagina++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1000 });
      if (error) throw error;
      borrar.push(...data.users.filter((u) => !conservar.has(u.id)).map((u) => u.id));
      if (data.users.length < 1000) break;
    }
    let i = 0;
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (i < borrar.length) {
        const id = borrar[i++];
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error && error.status !== 404) throw error;
      }
    }));
    const perfiles = await prisma.profile.deleteMany({ where: { id: { notIn: [...conservar] } } });
    const logins = await prisma.loginIntento.deleteMany({});
    console.log(`Usuarios de Auth borrados: ${borrar.length}. Perfiles borrados: ${perfiles.count}. Intentos de ingreso borrados: ${logins.count}.`);
    console.log(`Equipo Khipu conservado: ${admins.map((a) => a.user.email).join(", ") || "(ninguno; el seed crea admin@khipuescolar.demo)"}.`);
  } finally {
    await prisma.$disconnect();
  }

  // 3. Seed.
  execFileSync("pnpm", ["exec", "tsx", "prisma/seed.ts"], { stdio: "inherit" });

  // 4. Opcional: archivo de credenciales (fuera del repo).
  const k = process.argv.indexOf("--credenciales");
  if (k >= 0 && process.argv[k + 1]) {
    execFileSync("pnpm", ["exec", "tsx", "scripts/datos-piloto/credenciales.ts", "--salida", process.argv[k + 1]], { stdio: "inherit" });
  }
  console.log(`Reconstrucción lista en ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
