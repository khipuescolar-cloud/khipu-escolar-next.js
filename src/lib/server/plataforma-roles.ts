import "server-only";
import { z } from "zod";
import type { Rol } from "@/generated/prisma/enums";
import { esModulo, MODULO_ESENCIAL, MODULOS, ROLES, rolSoporta } from "@/lib/modulos";
import type { Feature } from "@/lib/planes";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { invalidarCacheModulos } from "./modulos";
import { auditarPlataforma, type AdminContext } from "./plataforma";

// Panel de plataforma · «Roles y permisos» (specs/19-planes-modulos-y-roles.md): roles por defecto de todos los
// colegios y qué módulos ve cada uno. El código fija qué combinaciones existen (ROLES_SOPORTADOS); el panel solo
// puede desactivar (o volver a activar) las que el código soporta. Sin fila en `rol_modulos` = habilitado.

export type EstadoCelda = "habilitado" | "desactivado" | "no_disponible" | "esencial";

export type MatrizRoles = Record<Rol, Record<Feature, EstadoCelda>>;

export async function matrizRoles(_admin: AdminContext): Promise<MatrizRoles> {
  void _admin; // solo se llama con un super administrador verificado
  const filas = await db.rolModulo.findMany({ where: { habilitado: false } });
  const desactivado = new Set(filas.map((f) => `${f.rol}:${f.modulo}`));
  return Object.fromEntries(
    ROLES.map((rol) => [
      rol,
      Object.fromEntries(
        MODULOS.map((m): [Feature, EstadoCelda] => [
          m,
          !rolSoporta(rol, m) ? "no_disponible" : m === MODULO_ESENCIAL ? "esencial" : desactivado.has(`${rol}:${m}`) ? "desactivado" : "habilitado",
        ]),
      ),
    ]),
  ) as MatrizRoles;
}

const esquemaCambio = z.object({
  rol: z.enum(["direccion", "profesor", "apoderado", "alumno", "porteria", "administrativo"], "Elige un rol válido."),
  modulo: z.string().refine(esModulo, "Elige un módulo válido."),
  habilitado: z.boolean(),
});

/** Activa o desactiva un módulo para un rol en todos los colegios. */
export async function cambiarModuloDeRol(admin: AdminContext, entrada: z.input<typeof esquemaCambio>): Promise<void> {
  const r = esquemaCambio.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  const { rol, habilitado } = r.data;
  const modulo = r.data.modulo as Feature;
  if (!rolSoporta(rol, modulo)) throw new ErrorDeNegocio("Ese módulo no está disponible para este rol.");
  if (modulo === MODULO_ESENCIAL) throw new ErrorDeNegocio("Gestión es un módulo esencial: no se puede desactivar.");
  if (habilitado) await db.rolModulo.deleteMany({ where: { rol, modulo } });
  else await db.rolModulo.upsert({ where: { rol_modulo: { rol, modulo } }, create: { rol, modulo, habilitado: false }, update: { habilitado: false } });
  invalidarCacheModulos();
  await auditarPlataforma(admin, "rol_modulo", null, { rol, modulo, habilitado });
}

/** Vuelve a los valores por defecto del código (borra todos los ajustes por rol). */
export async function restablecerRoles(admin: AdminContext): Promise<number> {
  const { count } = await db.rolModulo.deleteMany({});
  invalidarCacheModulos();
  await auditarPlataforma(admin, "restablecer_roles", null, { filasBorradas: count });
  return count;
}
