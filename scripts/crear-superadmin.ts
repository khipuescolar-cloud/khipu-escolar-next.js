// Crea o promueve un super administrador de la plataforma (specs/16). Solo para el equipo de Khipu; nunca desde la web.
// Uso: pnpm khipu:crear-superadmin --email x@khipuescolar.pe --nombres "Ana" --apellidos "Pérez" [--documento 12345678]
// - Cuenta nueva: contraseña inicial = documento (si se da) o una contraseña temporal que se muestra UNA vez.
// - Cuenta existente: conserva su contraseña.
// - En ambos casos queda `debeCambiarPassword = true` y `admins_plataforma.activo = true`.
// Se ejecuta con `tsx --conditions=react-server`, como khipu:borrar-colegio.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";

const esquema = z.object({
  email: z.email("Falta --email o no es un correo válido").transform((v) => v.trim().toLowerCase()),
  nombres: z.string("Falta --nombres").trim().min(1, "Falta --nombres").max(80),
  apellidos: z.string("Falta --apellidos").trim().min(1, "Falta --apellidos").max(80),
  documento: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{8,12}$/, "--documento debe tener entre 8 y 12 letras o números (DNI: 8 dígitos)")
    .optional(),
});

function leerArgs(argv: string[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--") && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) r[a.slice(2)] = argv[++i];
  }
  return r;
}

async function main() {
  const datos = esquema.safeParse(leerArgs(process.argv.slice(2)));
  if (!datos.success) {
    console.error(`Rechazado: ${datos.error.issues[0].message}.`);
    console.error('Uso: pnpm khipu:crear-superadmin --email x --nombres "…" --apellidos "…" [--documento 12345678]');
    process.exit(1);
  }
  const { email, nombres, apellidos, documento } = datos.data;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    let perfil = await prisma.profile.findUnique({ where: { email } });
    let temporal: string | null = null;
    const nueva = !perfil;
    if (!perfil) {
      const password = documento ?? (temporal = randomBytes(9).toString("base64url"));
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombres, apellidos },
      });
      if (error || !data.user) {
        console.error(`No se pudo crear la cuenta en Auth: ${error?.message ?? "sin respuesta"}`);
        process.exit(1);
      }
      perfil = await prisma.profile.create({
        data: {
          id: data.user.id,
          email,
          nombres,
          apellidos,
          ...(documento ? { tipoDocumento: /^\d{8}$/.test(documento) ? "dni" : "ce", numeroDocumento: documento } : {}),
          debeCambiarPassword: true,
        },
      });
      console.log(`Cuenta creada: ${email}.`);
    } else {
      await prisma.profile.update({ where: { id: perfil.id }, data: { debeCambiarPassword: true } });
      console.log(`La cuenta ${email} ya existía: conserva su contraseña y deberá cambiarla al entrar.`);
    }
    await prisma.adminPlataforma.upsert({ where: { userId: perfil.id }, update: { activo: true }, create: { userId: perfil.id } });
    console.log(`${email} es super administrador de la plataforma.`);
    if (temporal) console.log(`Contraseña temporal (se muestra solo ahora; deberá cambiarla al entrar): ${temporal}`);
    else if (nueva) console.log("Contraseña inicial: su número de documento (deberá cambiarla al entrar).");
  } finally {
    await prisma.$disconnect();
  }
}

main();
