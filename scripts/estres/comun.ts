// Configuración común de la prueba de estrés local (docs/pruebas-de-estres.md).
// SOLO para la BD local de Supabase CLI: se niega a correr contra cualquier otra.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../../src/generated/prisma/client";

/** Colegio sintético: se crea y se borra entero; nunca toca los colegios demo. */
export const SLUG = "estres-1000";
/** Dominio de correo de todas las cuentas sintéticas (para encontrarlas y borrarlas). */
export const DOMINIO = "estres1000.test";
export const PASSWORD = "Estres-1000!";
export const PUERTO = Number(process.env.ESTRES_PUERTO ?? 3100);
export const BASE_DOMINIO = `lvh.me:${PUERTO}`;
export const URL_COLEGIO = `http://${SLUG}.${BASE_DOMINIO}`;
export const URL_RAIZ = `http://${BASE_DOMINIO}`;

export function exigirLocal() {
  const url = process.env.DATABASE_URL ?? "";
  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const local = (u: string) => /@(127\.0\.0\.1|localhost)[:/]/.test(u) || /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u);
  if (!local(url) || !local(supa)) {
    console.error("Rechazado: la prueba de estrés solo corre contra la BD y el Auth LOCALES (127.0.0.1).");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && process.env.ESTRES_PERMITIR !== "1") {
    console.error("Rechazado: NODE_ENV=production sin ESTRES_PERMITIR=1.");
    process.exit(1);
  }
}

export function crearPrisma() {
  exigirLocal();
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
}

export function crearSupabaseAdmin() {
  exigirLocal();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Ejecuta `tarea` sobre `items` con `n` en paralelo. */
export async function enParalelo<T, R>(items: T[], n: number, tarea: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (siguiente < items.length) {
        const i = siguiente++;
        resultados[i] = await tarea(items[i], i);
      }
    }),
  );
  return resultados;
}

export function percentil(ordenados: number[], p: number): number {
  if (ordenados.length === 0) return NaN;
  const i = Math.min(ordenados.length - 1, Math.max(0, Math.ceil((p / 100) * ordenados.length) - 1));
  return ordenados[i];
}

export type Medicion = { nombre: string; n: number; errores: number; segundos: number; p50: number; p95: number; p99: number; max: number; rps: number };

/** Resume latencias (ms) de una tanda: p50/p95/p99, errores y throughput. */
export function resumir(nombre: string, latencias: number[], errores: number, segundos: number): Medicion {
  const o = [...latencias].sort((a, b) => a - b);
  const r = (x: number) => Math.round(x);
  return {
    nombre, n: latencias.length + errores, errores, segundos: Math.round(segundos * 10) / 10,
    p50: r(percentil(o, 50)), p95: r(percentil(o, 95)), p99: r(percentil(o, 99)), max: r(o.at(-1) ?? NaN),
    rps: Math.round(((latencias.length + errores) / segundos) * 10) / 10,
  };
}
