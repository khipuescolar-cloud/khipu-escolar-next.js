import "server-only";
import { whereSalonActivo } from "./salones-activos";
import { requireRol, type TenantContext } from "./tenant";

/** Cursos que el usuario puede gestionar: dirección → todos; profesor → los que dicta o de los salones que tutorea. */
export async function cursosDelDocente(ctx: TenantContext) {
  requireRol(ctx, ["profesor", "direccion"]);
  const where =
    ctx.rol === "direccion"
      ? {}
      : { OR: [{ profesorId: ctx.membership.id }, { salon: { tutorId: ctx.membership.id } }] };
  return ctx.db.curso.findMany({
    where: { AND: [where, { salon: whereSalonActivo }] },
    include: { salon: { select: { id: true, nombre: true, nivel: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { nombre: "asc" }],
  });
}

/**
 * Cursos que el usuario DICTA: dirección → todos; profesor → solo aquellos donde es el profesor del curso. Ser tutor
 * de un salón no cuenta: el tutor no publica tareas ni revisa entregas de los cursos que dictan otros (specs/39).
 */
export async function cursosQueDicta(ctx: TenantContext) {
  requireRol(ctx, ["profesor", "direccion"]);
  return ctx.db.curso.findMany({
    where: { AND: [ctx.rol === "direccion" ? {} : { profesorId: ctx.membership.id }, { salon: whereSalonActivo }] },
    include: { salon: { select: { id: true, nombre: true, nivel: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { nombre: "asc" }],
  });
}
