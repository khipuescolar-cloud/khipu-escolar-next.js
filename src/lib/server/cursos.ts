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
    include: { salon: { select: { id: true, nombre: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { nombre: "asc" }],
  });
}
