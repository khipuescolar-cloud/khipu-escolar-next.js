// Utilidades compartidas por los módulos del seed (prisma/seed*.ts). Datos ficticios, solo para desarrollo y QA local.
import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { esDiaHabil } from "../src/lib/dias-habiles";
import { fechaLima } from "../src/lib/fechas";

export const SLUG_COLEGIO = "nuevohorizonte";
export const NOMBRE_COLEGIO = "I.E.P. Nuevo Horizonte";
export const PASSWORD_DEMO = "demo123";
export const DOMINIO_COLEGIO = "nuevohorizonte.demo";
export const DOMINIO_FAMILIAS = "familia.demo";
/** Misma versión que guarda la app al aceptar (src/lib/consentimiento.ts). */
export const VERSION_CONSENTIMIENTO = "v1-2026-10";

// ───────────── Azar con semilla (mulberry32): el mismo seed da los mismos datos ─────────────

export type Azar = ReturnType<typeof crearAzar>;

export function crearAzar(semilla: number) {
  let s = semilla >>> 0;
  const num = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    num,
    entero: (min: number, max: number) => min + Math.floor(num() * (max - min + 1)),
    elegir: <T,>(xs: readonly T[]): T => xs[Math.floor(num() * xs.length)],
    prob: (p: number) => num() < p,
  };
}

// ───────────── Fechas (hora de Lima) ─────────────

export const hoyLima = () => fechaLima(new Date());
export const anioEscolar = () => Number(hoyLima().slice(0, 4));
/** Columna `@db.Date`: medianoche UTC del día. */
export const fechaDb = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** Instante de un día y hora de Lima. */
export const instante = (iso: string, hora = "08:00") => new Date(`${iso}T${hora}:00-05:00`);
export const sumarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** El n-ésimo día hábil (lunes a viernes sin feriados nacionales) después (n > 0) o antes (n < 0) de `iso`. */
export function diaHabil(iso: string, n: number): string {
  let f = iso;
  let restantes = Math.abs(n);
  const paso = n >= 0 ? 1 : -1;
  while (restantes > 0) {
    f = sumarDias(f, paso);
    if (esDiaHabil(f)) restantes--;
  }
  return f;
}

/** Los `n` días hábiles anteriores a `hasta` (sin incluirlo) que cumplan `filtro`, en orden ascendente. */
export function diasHabilesAntes(hasta: string, n: number, filtro: (iso: string) => boolean = () => true): string[] {
  const dias: string[] = [];
  for (let f = sumarDias(hasta, -1), guarda = 0; dias.length < n && guarda < 400; f = sumarDias(f, -1), guarda++) {
    if (esDiaHabil(f) && filtro(f)) dias.push(f);
  }
  return dias.reverse();
}

// ───────────── Textos ─────────────

export const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

// ───────────── Carnets QR (igual que src/lib/server/tokens.ts, sin `server-only`) ─────────────

export const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");
export function tokenCarnet(carnetId: string): string {
  const secreto = process.env.APP_SECRET;
  if (!secreto) throw new Error("Falta APP_SECRET en .env (se usa para los carnets QR).");
  return createHmac("sha256", secreto).update(`carnet:${carnetId}`, "utf8").digest("base64url");
}

// ───────────── Lotes ─────────────

export async function enParalelo<T>(items: readonly T[], concurrencia: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrencia, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

// ───────────── Supabase Auth (local) ─────────────

export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Todos los usuarios de Auth (paginado de 1000 en 1000) como correo → id. */
export async function usuariosAuthExistentes(): Promise<Map<string, string>> {
  const supabase = supabaseAdmin();
  const mapa = new Map<string, string>();
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) mapa.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }
  return mapa;
}

/**
 * Asegura una cuenta de Auth con contraseña `demo123` (confirmada) para cada correo y devuelve correo → id.
 * Las que ya existen se reutilizan (y se les restablece la contraseña).
 */
export async function asegurarUsuariosAuth(correos: readonly string[]): Promise<Map<string, string>> {
  const supabase = supabaseAdmin();
  const existentes = await usuariosAuthExistentes();
  const resultado = new Map<string, string>();
  await enParalelo([...new Set(correos.map((c) => c.toLowerCase()))], 8, async (email) => {
    const id = existentes.get(email);
    if (id) {
      const { error } = await supabase.auth.admin.updateUserById(id, { password: PASSWORD_DEMO });
      if (error) throw error;
      resultado.set(email, id);
      return;
    }
    const { data, error } = await supabase.auth.admin.createUser({ email, password: PASSWORD_DEMO, email_confirm: true });
    if (error || !data.user) throw error ?? new Error(`No se creó ${email}`);
    resultado.set(email, data.user.id);
  });
  return resultado;
}
