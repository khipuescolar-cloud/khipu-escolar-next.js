import "server-only";
import { z } from "zod";
import { urlColegio } from "@/lib/dominio";
import { fechaCorta, fechaLima } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { auditar } from "../auditoria";
import type { TenantContext } from "../tenant";
import { conEnvio } from "./envios";
import { cuentasDeAlumnos, entregarNotificaciones, porFamilia, unirNombres, vinculosFamilias, type Entrega } from "./internas";

// Aviso «tarea nueva» a las familias del salón (specs/12). Solo si el profesor marcó «Avisar a las familias».
// Bandeja + push (sin correo: no es una comunicación importante, specs/38). Una notificación por familia (aunque tenga
// varios hijos en el salón) y por alumno con cuenta propia; push por dispositivo con consentimiento y preferencias.
// En lote: alumnos, vínculos (con consentimiento, preferencias y dispositivos) y cuentas en 3 consultas; createMany.
// Idempotente: clave `tarea:<id>` en la bandeja y push único por notificación y dispositivo.

const esquemaAvisar = z.object({
  avisarFamilias: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
});

/** true si la entrada del formulario pide avisar a las familias (`avisarFamilias`: true / "on"). */
export function pideAvisarFamilias(entrada: unknown): boolean {
  const r = esquemaAvisar.safeParse(entrada ?? {});
  return r.success && r.data.avisarFamilias;
}

/**
 * Notifica una tarea recién creada si `entrada.avisarFamilias` lo pide.
 * Devuelve cuántas familias la recibirán en su bandeja.
 */
export async function avisarTareaNueva(ctx: TenantContext, tareaId: string, entrada: unknown): Promise<number> {
  if (!pideAvisarFamilias(entrada)) return 0;
  const tarea = await ctx.db.tarea.findFirst({
    where: { id: tareaId },
    select: { id: true, titulo: true, fechaEntrega: true, curso: { select: { nombre: true, salonId: true } } },
  });
  if (!tarea) return 0;

  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: tarea.curso.salonId, estado: "activo" },
    select: { id: true, nombres: true },
    orderBy: { nombres: "asc" },
  });
  const ids = alumnos.map((a) => a.id);
  const nombres = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  const [vinculos, cuentas] = await Promise.all([vinculosFamilias(ctx.db, ids), cuentasDeAlumnos(ctx.db, ids)]);
  const familias = porFamilia(vinculos, ids);

  const fechaEntrega = fechaLima(tarea.fechaEntrega);
  const base = { colegio: ctx.tenant.nombre, curso: tarea.curso.nombre, titulo: tarea.titulo, fechaEntrega, url: urlColegio(ctx.tenant.slug, "/tareas") };
  /** «Mateo tiene…» (familia) o «Tienes…» (el alumno con cuenta). */
  const texto = (quien: string | null) => ({
    titulo: `Nueva tarea de ${tarea.curso.nombre}`,
    cuerpo: `${quien ? `${quien} tiene` : "Tienes"} una tarea nueva de ${tarea.curso.nombre}: «${tarea.titulo}». Se entrega el ${fechaCorta(fechaEntrega)}.`,
    url: "/tareas",
  });
  const entregas: Entrega<"tarea_nueva">[] = [...familias.values()].map(({ vinculo, alumnoIds }) => {
    const hijos = unirNombres(alumnoIds.map((id) => nombres.get(id) ?? ""));
    return {
      membershipId: vinculo.apoderadoId, alumnoId: alumnoIds[0], ...texto(hijos),
      email: null, endpoints: vinculo.endpoints, apoderadoId: vinculo.apoderadoId, payload: { ...base, alumno: hijos },
    };
  });
  for (const c of cuentas) {
    entregas.push({ membershipId: c.membershipId, alumnoId: c.alumnoId, ...texto(null), email: null, endpoints: [], apoderadoId: null, payload: base });
  }

  const envio = { tenantId: ctx.tenant.id, tipo: "tarea" as const, titulo: `Tarea: ${tarea.titulo} · ${tarea.curso.nombre}`, creadoPorId: ctx.membership.id };
  await conEnvio(ctx.db, envio, () =>
    entregarNotificaciones(ctx.db, {
      tenant: ctx.tenant, tipo: "tarea", clave: `tarea:${tarea.id}`, tipoAviso: "tarea", plantilla: "tarea_nueva", referenciaId: tarea.id, entregas,
    }),
  );
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "tarea", entidadId: tarea.id,
    detalle: { aviso: "tarea_nueva", familias: familias.size, alumnos: cuentas.length },
  });
  return familias.size;
}
