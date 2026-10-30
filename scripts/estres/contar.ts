// Foto de conteos de la BD local: filas por tabla (total y por colegio) + usuarios de Auth.
// Uso: pnpm exec tsx scripts/estres/contar.ts --guardar <archivo.json>
//      pnpm exec tsx scripts/estres/contar.ts --comparar <antes.json>   (sale con código 1 si algo cambió)
import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "pg";
import { DOMINIO, exigirLocal } from "./comun";

type Foto = { tablas: Record<string, number>; porColegio: Record<string, Record<string, number>>; auth: Record<string, number> };

async function foto(): Promise<Foto> {
  exigirLocal();
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  try {
    const { rows: tablas } = await pg.query<{ table_name: string; tiene_tenant: boolean }>(`
      SELECT t.table_name, EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'tenant_id') AS tiene_tenant
      FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND t.table_name <> '_prisma_migrations' ORDER BY 1`);
    const resultado: Foto = { tablas: {}, porColegio: {}, auth: {} };
    for (const t of tablas) {
      const { rows } = await pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM "${t.table_name}"`);
      resultado.tablas[t.table_name] = rows[0].n;
      if (t.tiene_tenant) {
        const { rows: g } = await pg.query<{ slug: string | null; n: number }>(
          `SELECT ten.slug, count(*)::int AS n FROM "${t.table_name}" x LEFT JOIN tenants ten ON ten.id = x.tenant_id GROUP BY 1`);
        for (const r of g) (resultado.porColegio[r.slug ?? "(global)"] ??= {})[t.table_name] = r.n;
      }
    }
    const auth = await pg.query<{ usuarios: number; sinteticos: number; sesiones: number; identidades: number; refresh: number }>(`
      SELECT (SELECT count(*)::int FROM auth.users) AS usuarios,
             (SELECT count(*)::int FROM auth.users WHERE email LIKE '%@${DOMINIO}') AS sinteticos,
             (SELECT count(*)::int FROM auth.sessions) AS sesiones,
             (SELECT count(*)::int FROM auth.identities) AS identidades,
             (SELECT count(*)::int FROM auth.refresh_tokens) AS refresh`);
    resultado.auth = auth.rows[0];
    const sint = await pg.query<{ perfiles: number; logins: number }>(`
      SELECT (SELECT count(*)::int FROM profiles WHERE email LIKE '%@${DOMINIO}') AS perfiles,
             (SELECT count(*)::int FROM login_intentos WHERE email LIKE '%@${DOMINIO}') AS logins`);
    resultado.auth.perfilesSinteticos = sint.rows[0].perfiles;
    resultado.auth.loginsSinteticos = sint.rows[0].logins;
    return resultado;
  } finally {
    await pg.end();
  }
}

/** Tablas que la app escribe por sí sola con el uso normal (sesiones, logins): se informan, no fallan. */
const VOLATILES = new Set(["login_intentos", "auth.sessions", "auth.refresh_tokens"]);

async function main() {
  const args = process.argv.slice(2);
  const actual = await foto();
  const i = args.indexOf("--guardar");
  if (i >= 0) {
    writeFileSync(args[i + 1], JSON.stringify(actual, null, 2));
    console.log(`Foto guardada en ${args[i + 1]} (${Object.keys(actual.tablas).length} tablas, ${actual.auth.usuarios} usuarios de Auth).`);
  }
  const j = args.indexOf("--comparar");
  if (j >= 0) {
    const antes = JSON.parse(readFileSync(args[j + 1], "utf8")) as Foto;
    const diferencias: string[] = [];
    const comparar = (clave: string, a: number | undefined, b: number | undefined) => {
      if ((a ?? 0) !== (b ?? 0)) diferencias.push(`${VOLATILES.has(clave.split(".").at(-1)!) || VOLATILES.has(clave) ? "(volátil) " : ""}${clave}: ${a ?? 0} → ${b ?? 0}`);
    };
    for (const t of new Set([...Object.keys(antes.tablas), ...Object.keys(actual.tablas)])) comparar(t, antes.tablas[t], actual.tablas[t]);
    for (const c of new Set([...Object.keys(antes.porColegio), ...Object.keys(actual.porColegio)])) {
      const a = antes.porColegio[c] ?? {}, b = actual.porColegio[c] ?? {};
      for (const t of new Set([...Object.keys(a), ...Object.keys(b)])) comparar(`${c}.${t}`, a[t], b[t]);
    }
    for (const k of new Set([...Object.keys(antes.auth), ...Object.keys(actual.auth)])) comparar(`auth.${k}`, antes.auth[k], actual.auth[k]);
    if (diferencias.length === 0) console.log("Sin diferencias: la BD quedó igual que en la foto.");
    else {
      console.log("Diferencias:");
      diferencias.forEach((d) => console.log(`  ${d}`));
      if (diferencias.some((d) => !d.startsWith("(volátil)"))) process.exitCode = 1;
    }
  }
  if (i < 0 && j < 0) console.log(JSON.stringify(actual, null, 2));
}

main();
