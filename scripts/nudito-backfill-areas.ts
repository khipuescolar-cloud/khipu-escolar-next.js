// Rellena `cursos.area_cneb` por el nombre del curso en todos los colegios (o en uno con --colegio <slug>), sin tocar
// los cursos con área fijada a mano por dirección (specs/42). Idempotente.
// Uso: pnpm nudito:areas [--colegio <slug>]
// Se ejecuta con `--conditions=react-server`, como khipu:borrar-colegio, para poder importar src/lib/server.
import "dotenv/config";
import { db } from "../src/lib/server/db";
import { rellenarAreasCursos } from "../src/lib/server/nudito/areas-cursos";

async function main() {
  const i = process.argv.indexOf("--colegio");
  const slug = i >= 0 ? process.argv[i + 1] : undefined;
  const tenantId = slug ? (await db.tenant.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id : undefined;
  const r = await rellenarAreasCursos(tenantId);
  console.log(`Cursos sin área revisados: ${r.revisados} · áreas guardadas: ${r.actualizados}${slug ? ` (colegio ${slug})` : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
