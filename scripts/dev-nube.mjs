// App local conectada a los servicios reales de .env.nube (Supabase cloud, Cloudinary, Gmail).
// Uso: pnpm dev:nube  →  http://lvh.me:3100 · panel: http://admin.lvh.me:3100 · colegios: http://<slug>.lvh.me:3100
// Solo cambia el dominio (lvh.me, http) para poder entrar desde este equipo; el resto sale de .env.nube.
// Next no sobrescribe variables que ya vienen en el entorno, así que .env (local/Docker) no interfiere.
// OJO: escribe en la base REAL y envía correos REALES por Gmail.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

const PUERTO = process.env.PUERTO_NUBE ?? "3100";

if (!existsSync(".env.nube")) {
  console.error("No encuentro .env.nube en khipu-escolar/ (ver docs/despliegue.md).");
  process.exit(1);
}
const nube = parse(readFileSync(".env.nube"));
for (const clave of ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "APP_SECRET"]) {
  if (!nube[clave]) {
    console.error(`Falta ${clave} en .env.nube.`);
    process.exit(1);
  }
}

const env = {
  ...process.env,
  ...nube,
  APP_BASE_DOMAIN: `lvh.me:${PUERTO}`,
  APP_PROTOCOL: "http",
  COOKIE_DOMAIN: ".lvh.me",
  // Carpeta de compilación propia: así puede convivir con `pnpm dev` (Docker) en el puerto 3000.
  NEXT_DIST_DIR: ".next-nube",
};

console.log(`Khipu Escolar con servicios REALES → http://lvh.me:${PUERTO} (panel: http://admin.lvh.me:${PUERTO})`);
const hijo = spawn("pnpm", ["exec", "next", "dev", "--port", PUERTO], { env, stdio: "inherit" });
hijo.on("exit", (codigo) => process.exit(codigo ?? 0));
