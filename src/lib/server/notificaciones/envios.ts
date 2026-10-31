import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { TipoAviso } from "@/generated/prisma/enums";
import type { DbTenant } from "../db";

// Envíos de avisos (specs/06): una acción que avisa a familias (cerrar una lista, publicar un comunicado, el control de
// ingreso…) se envuelve en `conEnvio`. Cada fila que `encolarAviso` crea dentro queda con su `envioId`; al terminar se
// guarda a cuántas familias llegó y si fue masivo (más de una). La fila del envío se crea con el primer aviso: una
// acción que no avisa a nadie no deja envío vacío. Lo que no pasa por `conEnvio` es un aviso individual.

type EnvioEnCurso = {
  tdb: DbTenant;
  datos: { tenantId: string; tipo: TipoAviso; titulo: string; creadoPorId: string | null };
  id: Promise<string> | null;
  /** Familias avisadas: alumno (asistencia, reuniones) o apoderado (por defecto). */
  unidades: Set<string>;
};

const almacen = new AsyncLocalStorage<EnvioEnCurso>();

/** Corre `accion` como un envío. Devuelve lo que devuelva `accion`. */
export async function conEnvio<T>(
  tdb: DbTenant,
  datos: { tenantId: string; tipo: TipoAviso; titulo: string; creadoPorId?: string | null },
  accion: () => Promise<T>,
): Promise<T> {
  const envio: EnvioEnCurso = { tdb, datos: { ...datos, titulo: datos.titulo.slice(0, 200), creadoPorId: datos.creadoPorId ?? null }, id: null, unidades: new Set() };
  const resultado = await almacen.run(envio, accion);
  if (envio.id) {
    const familias = envio.unidades.size;
    // updateMany: si el colegio se borró mientras tanto (cascade), no hay nada que actualizar y no es un error.
    await tdb.envioAviso.updateMany({ where: { id: await envio.id }, data: { familias, masivo: familias > 1 } });
  }
  return resultado;
}

/**
 * Id del envío en curso para un aviso nuevo (o null si no hay envío). `unidad` identifica a la familia avisada
 * (por defecto el apoderado): dos apoderados del mismo alumno cuentan como una familia si se pasa el alumno.
 */
export async function envioParaAviso(unidad: string | null | undefined): Promise<string | null> {
  const envio = almacen.getStore();
  if (!envio) return null;
  envio.id ??= envio.tdb.envioAviso.create({ data: envio.datos, select: { id: true } }).then((e) => e.id);
  if (unidad) envio.unidades.add(unidad);
  return envio.id;
}
