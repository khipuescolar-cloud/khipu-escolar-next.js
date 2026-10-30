// Borra TODO lo que creó la prueba de estrés: el colegio «estres-1000» (cascade por tenant_id), los perfiles
// y usuarios de Supabase Auth con correo @estres1000.test y sus intentos de login.
// Uso: pnpm exec tsx scripts/estres/limpiar.ts
import { rmSync } from "node:fs";
import path from "node:path";
import { DOMINIO, SLUG, crearPrisma, crearSupabaseAdmin, enParalelo } from "./comun";

const prisma = crearPrisma();
const supabase = crearSupabaseAdmin();

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (tenant) {
    const archivos = await prisma.archivo.count({ where: { tenantId: tenant.id } });
    if (archivos > 0) throw new Error(`El colegio sintético tiene ${archivos} archivo(s): usa pnpm khipu:borrar-colegio para borrarlos del proveedor.`);
    const t0 = Date.now();
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log(`Colegio «${SLUG}» borrado (cascade) en ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
  } else console.log(`No existe «${SLUG}» (nada que borrar en la BD del colegio).`);

  const sufijo = `@${DOMINIO}`;
  // Usuarios de Auth con el dominio sintético (paginado: listUsers devuelve como máximo 1000 por página).
  const ids: string[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    ids.push(...data.users.filter((u) => u.email?.endsWith(sufijo)).map((u) => u.id));
    if (data.users.length < 1000) break;
  }
  await enParalelo(ids, 8, async (id) => {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
  });
  console.log(`Usuarios de Auth borrados: ${ids.length}.`);

  const perfiles = await prisma.profile.deleteMany({ where: { email: { endsWith: sufijo } } });
  const logins = await prisma.loginIntento.deleteMany({ where: { email: { endsWith: sufijo } } });
  console.log(`Perfiles borrados: ${perfiles.count}. Intentos de login borrados: ${logins.count}.`);

  rmSync(path.join(import.meta.dirname, ".salida"), { recursive: true, force: true });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
