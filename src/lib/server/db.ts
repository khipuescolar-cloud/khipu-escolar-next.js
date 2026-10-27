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

export const MODELOS_GLOBALES = new Set(["Tenant", "Profile", "LoginIntento", "PushSuscripcion"]);

const OPERACIONES_CON_WHERE = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany",
  "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany", "count", "aggregate", "groupBy", "upsert",
]);

/**
 * Cliente con aislamiento por colegio: agrega `tenantId` a todo where/create de los modelos de negocio.
 * Es la barrera principal multitenant (Prisma salta RLS). Las escrituras anidadas deben pasar tenantId a mano.
 */
export function dbTenant(tenantId: string) {
  return db.$extends({
    name: "aislamiento-tenant",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
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
