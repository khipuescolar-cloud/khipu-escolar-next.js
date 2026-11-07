import type { ResolverAcceso } from "./tipos";
import { alumnoIdsVisibles, salonIdsVisibles } from "../tenant";

export const resolverAccesoMaterial: ResolverAcceso = async (ctx, archivo) => {
  const enlace = await ctx.db.materialVersionArchivo.findFirst({ where: { archivoId: archivo.id }, include: { version: { include: { material: true } } } });
  if (!enlace) return null;
  const material = enlace.version.material;
  if (ctx.rol === "direccion" && !ctx.soporte) return "permitir";
  if (ctx.rol === "profesor" && material.creadoPorId === ctx.membership.id && !ctx.soporte) return "permitir";
  if (ctx.rol === "alumno" || ctx.rol === "apoderado") {
    const salones = await salonIdsVisibles(ctx);
    if (!material.eliminadoAt && material.estado === "publicado" && await ctx.db.materialSeccion.count({ where: { materialId: material.id, curso: { salonId: { in: salones } } } })) return "permitir";
    const alumnos = await alumnoIdsVisibles(ctx);
    const tarea = await ctx.db.tareaMaterial.findFirst({ where: { versionId: enlace.versionId,
      tarea: { estado: { in: ["publicada", "cerrada"] }, OR: [{ publicarEn: null }, { publicarEn: { lte: new Date() } }], asignaciones: { some: { alumnoId: { in: alumnos }, retiradaAt: null } } } } });
    if (tarea) return "permitir";
  }
  return "denegar";
};
