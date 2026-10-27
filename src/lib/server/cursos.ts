import "server-only";
import { requireRol, type TenantContext } from "./tenant";

/** Cursos que el usuario puede gestionar: dirección → todos; profesor → los que dicta o de los salones que tutorea. */
export async function cursosDelDocente(ctx: TenantContext) {
  requireRol(ctx, ["profesor", "direccion"]);
  const where =
    ctx.rol === "direccion"
      ? {}
      : { OR: [{ profesorId: ctx.membership.id }, { salon: { tutorId: ctx.membership.id } }] };
  return ctx.db.curso.findMany({
    where,
    include: { salon: { select: { id: true, nombre: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { nombre: "asc" }],
  });
}
