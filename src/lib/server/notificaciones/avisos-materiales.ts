import "server-only";
import { urlColegio } from "@/lib/dominio";
import { auditar } from "../auditoria";
import type { TenantContext } from "../tenant";
import { destinatariosPorAlumno, encolarParaDestinatario, tieneCanalAviso } from "./encolar";
import { conEnvio } from "./envios";

/** Encola una vez por apoderado y material publicado; la cola hace el envío fuera de la acción. */
export async function avisarMaterialNuevo(ctx: TenantContext, materialId: string): Promise<number> {
  const m = await ctx.db.materialClase.findFirst({ where: { id: materialId, estado: "publicado", eliminadoAt: null }, include: { secciones: { include: { curso: true } } } });
  if (!m || await ctx.db.aviso.count({ where: { plantilla: "material_nuevo", referenciaId: m.id } })) return 0;
  const salones = [...new Set(m.secciones.map((s) => s.curso.salonId))];
  const alumnos = await ctx.db.alumno.findMany({ where: { salonId: { in: salones }, estado: "activo" }, select: { id: true } });
  const destinatarios = await destinatariosPorAlumno(ctx.db, alumnos.map((a) => a.id));
  const vistos = new Set<string>();
  let total = 0;
  await conEnvio(ctx.db, { tenantId: ctx.tenant.id, tipo: "documento", titulo: `Material: ${m.titulo}`, creadoPorId: ctx.membership.id }, async () => {
    for (const lista of destinatarios.values()) for (const d of lista) {
      if (vistos.has(d.apoderadoId) || !tieneCanalAviso(d)) continue;
      vistos.add(d.apoderadoId);
      await encolarParaDestinatario(ctx.db, d, { tenantId: ctx.tenant.id, tipo: "documento", plantilla: "material_nuevo", referenciaId: m.id,
        payload: { colegio: ctx.tenant.nombre, titulo: m.titulo, url: urlColegio(ctx.tenant.slug, "/documentos/materiales") } });
      total++;
    }
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "material_clase", entidadId: m.id, detalle: { familias: total } });
  return total;
}
