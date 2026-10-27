import "server-only";
import { z } from "zod";
import { urlColegio } from "@/lib/dominio";
import { fechaLima } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { auditar } from "../auditoria";
import type { TenantContext } from "../tenant";
import { destinatariosDeAlumno, encolarParaDestinatario, tieneCanalAviso, type Destinatario } from "./encolar";

// Aviso «tarea nueva» a las familias del salón (specs/12). Solo si el profesor marcó «Avisar a las familias».
// Una fila por familia y canal (consentimiento y preferencias vía destinatariosDeAlumno), `referenciaId = tareaId`.
// Es idempotente: si la tarea ya tiene avisos, no vuelve a encolar.

const esquemaAvisar = z.object({
  avisarFamilias: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
});

/** true si la entrada del formulario pide avisar a las familias (`avisarFamilias`: true / "on"). */
export function pideAvisarFamilias(entrada: unknown): boolean {
  const r = esquemaAvisar.safeParse(entrada ?? {});
  return r.success && r.data.avisarFamilias;
}

/** Une nombres: «Mateo», «Mateo y Ana», «Mateo, Ana y Luis». */
function unirNombres(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/**
 * Encola el aviso de una tarea recién creada si `entrada.avisarFamilias` lo pide.
 * Devuelve cuántas familias recibirán aviso.
 */
export async function avisarTareaNueva(ctx: TenantContext, tareaId: string, entrada: unknown): Promise<number> {
  if (!pideAvisarFamilias(entrada)) return 0;
  const tarea = await ctx.db.tarea.findFirst({
    where: { id: tareaId },
    select: { id: true, titulo: true, fechaEntrega: true, curso: { select: { nombre: true, salonId: true } } },
  });
  if (!tarea) return 0;
  if ((await ctx.db.aviso.count({ where: { plantilla: "tarea_nueva", referenciaId: tarea.id } })) > 0) return 0;

  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: tarea.curso.salonId, estado: "activo" },
    select: { id: true, nombres: true },
    orderBy: { nombres: "asc" },
  });
  // Una sola fila por familia aunque tenga varios hijos en el salón.
  const porFamilia = new Map<string, { destinatario: Destinatario; hijos: string[] }>();
  for (const a of alumnos) {
    for (const d of await destinatariosDeAlumno(ctx.db, a.id)) {
      if (!tieneCanalAviso(d)) continue;
      const actual = porFamilia.get(d.apoderadoId) ?? { destinatario: d, hijos: [] };
      actual.hijos.push(primerNombre(a.nombres));
      porFamilia.set(d.apoderadoId, actual);
    }
  }

  const base = {
    colegio: ctx.tenant.nombre,
    curso: tarea.curso.nombre,
    titulo: tarea.titulo,
    fechaEntrega: fechaLima(tarea.fechaEntrega),
    url: urlColegio(ctx.tenant.slug, "/tareas"),
  };
  for (const { destinatario, hijos } of porFamilia.values()) {
    await encolarParaDestinatario(ctx.db, destinatario, {
      tenantId: ctx.tenant.id,
      tipo: "tarea",
      plantilla: "tarea_nueva",
      referenciaId: tarea.id,
      payload: { ...base, alumno: unirNombres(hijos) },
    });
  }
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "tarea", entidadId: tarea.id,
    detalle: { aviso: "tarea_nueva", familias: porFamilia.size },
  });
  return porFamilia.size;
}
