import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

// Una sola instancia por proceso (en dev sobrevive al HMR).
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente() {
  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  return new PrismaClient({ adapter });
}

/**
 * Cliente sin filtro de colegio. Úsalo SOLO para tablas globales (profiles, tenants, login_intentos,
 * push_suscripciones) o en flujos sin sesión ya validados (token de justificación, webhooks, cron).
 * Para datos de un colegio usa `dbTenant(ctx.tenant.id)`.
 */
export const db = globalParaPrisma.prisma ?? crearCliente();
if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;

// AuditoriaPlataforma tiene tenantId pero es del equipo Khipu (specs/16): no se filtra ni se exporta al colegio.
export const MODELOS_GLOBALES = new Set([
  "Tenant", "Profile", "LoginIntento", "PushSuscripcion", "AdminPlataforma", "AuditoriaPlataforma",
  // Panel de plataforma v2 (specs/19): catálogo y ajustes globales; `FeriadoExtra` mezcla filas globales y por colegio y se filtra a mano.
  "PlanCatalogo", "PlanModulo", "RolModulo", "AnuncioPlataforma", "FeriadoExtra", "ConfigPlataforma",
]);

const OPERACIONES_CON_WHERE = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany",
  "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany", "count", "aggregate", "groupBy", "upsert",
]);

/** Operaciones de escritura que bloquea el modo soporte (specs/16 · acceso de soporte). */
export const OPERACIONES_DE_ESCRITURA = new Set([
  "create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert", "delete", "deleteMany",
]);

export const MENSAJE_SOLO_LECTURA = "Modo soporte: solo lectura";

/** Se lanza al intentar escribir con un cliente de solo lectura (super administrador en modo soporte). */
export class ErrorSoloLectura extends Error {
  constructor(public readonly modelo?: string, public readonly operacion?: string) {
    super(MENSAJE_SOLO_LECTURA);
    this.name = "ErrorSoloLectura";
  }
}

/** SQL crudo de un `$queryRaw`: solo se permite en modo soporte si es una lectura (SELECT o WITH sin escrituras). */
export function esSqlDeSoloLectura(sql: string): boolean {
  const limpio = sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").trim();
  if (!/^(select|with)\b/i.test(limpio)) return false;
  if (/;\s*\S/.test(limpio)) return false; // una sola sentencia
  return !/\b(insert|update|delete|merge|truncate|alter|drop|create|grant|revoke|copy|call|do|lock|vacuum|refresh|reindex|cluster|comment|set_config|nextval|setval|pg_advisory\w*)\b/i.test(limpio)
    && !/\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/i.test(limpio);
}

/** Texto SQL de los argumentos de un `$queryRaw` (plantilla etiquetada o `Prisma.sql`) o `$queryRawUnsafe`. */
function textoSql(args: unknown): string {
  if (typeof args === "string") return args;
  if (Array.isArray(args)) {
    const [primero] = args as unknown[];
    if (typeof primero === "string") return primero;
    if (Array.isArray(primero)) return (primero as string[]).join("?");
    if (primero && typeof primero === "object" && "sql" in primero) return String((primero as { sql: string }).sql);
  }
  if (args && typeof args === "object") {
    const a = args as { sql?: unknown; strings?: unknown };
    if (typeof a.sql === "string") return a.sql;
    if (Array.isArray(a.strings)) return (a.strings as string[]).join("?");
  }
  return "";
}

/**
 * Cliente con aislamiento por colegio: agrega `tenantId` a todo where/create de los modelos de negocio.
 * Es la barrera principal multitenant (Prisma salta RLS). Las escrituras anidadas deben pasar tenantId a mano.
 * Con `soloLectura` toda escritura (de cualquier modelo, también los globales) lanza `ErrorSoloLectura`:
 * también `$executeRaw`/`$executeRawUnsafe` y los `$queryRaw`/`$queryRawUnsafe` que no sean lecturas puras.
 * `$transaction` (en lote o interactiva) pasa por estas mismas intercepciones.
 */
export function dbTenant(tenantId: string, opciones: { soloLectura?: boolean } = {}) {
  const soloLectura = opciones.soloLectura === true;
  return db.$extends({
    name: "aislamiento-tenant",
    query: {
      async $executeRaw({ args, query }) {
        if (soloLectura) throw new ErrorSoloLectura(undefined, "$executeRaw");
        return query(args);
      },
      async $executeRawUnsafe({ args, query }) {
        if (soloLectura) throw new ErrorSoloLectura(undefined, "$executeRawUnsafe");
        return query(args);
      },
      async $queryRaw({ args, query }) {
        if (soloLectura && !esSqlDeSoloLectura(textoSql(args))) throw new ErrorSoloLectura(undefined, "$queryRaw");
        return query(args);
      },
      async $queryRawUnsafe({ args, query }) {
        if (soloLectura && !esSqlDeSoloLectura(textoSql(args))) throw new ErrorSoloLectura(undefined, "$queryRawUnsafe");
        return query(args);
      },
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (soloLectura && OPERACIONES_DE_ESCRITURA.has(operation)) throw new ErrorSoloLectura(model, operation);
          if (MODELOS_GLOBALES.has(model)) return query(args);
          const a = (args ?? {}) as Record<string, unknown>;
          if (OPERACIONES_CON_WHERE.has(operation)) {
            a.where = { ...(a.where as object | undefined), tenantId };
          }
          if (operation === "create" || operation === "upsert") {
            const key = operation === "create" ? "data" : "create";
            a[key] = { ...(a[key] as object), tenantId };
          }
          if (operation === "createMany" || operation === "createManyAndReturn") {
            const data = a.data as object | object[];
            a.data = Array.isArray(data) ? data.map((d) => ({ ...d, tenantId })) : { ...data, tenantId };
          }
          if ((operation === "update" || operation === "updateMany") && a.data && typeof a.data === "object") {
            // Nunca se permite mover una fila a otro colegio.
            delete (a.data as Record<string, unknown>).tenantId;
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

export type DbTenant = ReturnType<typeof dbTenant>;
