// Crea o promueve un super administrador de la plataforma (specs/16). Solo para el equipo de Khipu; nunca desde la web.
// Uso: pnpm khipu:crear-superadmin --email x@khipuescolar.pe --nombres "Ana" --apellidos "Pérez" [--documento 12345678]
// - Cuenta nueva: contraseña inicial = documento (si se da) o una contraseña temporal que se muestra UNA vez.
// - Cuenta existente: conserva su contraseña.
// - En ambos casos queda `debeCambiarPassword = true` y `admins_plataforma.activo = true`.
// La lógica vive en src/lib/server/plataforma-equipo.ts (la misma del módulo «Equipo Khipu»).
// Se ejecuta con `tsx --conditions=react-server`, como khipu:borrar-colegio.
import "dotenv/config";
import { db } from "../src/lib/server/db";
import { ErrorDeNegocio } from "../src/lib/server/contexto-accion";
import { provisionarSuperadmin } from "../src/lib/server/plataforma-equipo";

function leerArgs(argv: string[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--") && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) r[a.slice(2)] = argv[++i];
  }
  return r;
}

async function main() {
  const a = leerArgs(process.argv.slice(2));
  try {
    const r = await provisionarSuperadmin({ email: a.email ?? "", nombres: a.nombres ?? "", apellidos: a.apellidos ?? "", documento: a.documento }, "consola");
    console.log(r.cuentaNueva ? `Cuenta creada: ${a.email}.` : `La cuenta ${a.email} ya existía: conserva su contraseña y deberá cambiarla al entrar.`);
    console.log(`${a.email} es super administrador de la plataforma.`);
    if (r.contrasenaTemporal) console.log(`Contraseña temporal (se muestra solo ahora; deberá cambiarla al entrar): ${r.contrasenaTemporal}`);
    else if (r.cuentaNueva) console.log("Contraseña inicial: su número de documento (deberá cambiarla al entrar).");
  } catch (e) {
    if (e instanceof ErrorDeNegocio) {
      console.error(`Rechazado: ${e.message}`);
      console.error('Uso: pnpm khipu:crear-superadmin --email x --nombres "…" --apellidos "…" [--documento 12345678]');
      process.exit(1);
    }
    throw e;
  } finally {
    await db.$disconnect();
  }
}

main();
