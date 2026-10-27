import "server-only";
import { forbidden } from "next/navigation";
import type { EstadoAviso } from "@/generated/prisma/enums";
import { auditar } from "./auditoria";
import { requireFeature } from "./plan";
import type { TenantContext } from "./tenant";

// Panel de avisos enviados para dirección (specs/06): estados y tasa de apertura.

export async function panelAvisos(ctx: TenantContext, dias = 30) {
  requireFeature(ctx, "avisos");
  if (ctx.rol !== "direccion") forbidden();
  const desde = new Date(Date.now() - dias * 86_400_000);
  const [grupos, recientes] = await Promise.all([
    ctx.db.aviso.groupBy({ by: ["estado"], where: { canal: "correo", createdAt: { gte: desde } }, _count: { _all: true } }),
    ctx.db.aviso.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, canal: true, plantilla: true, asunto: true, destinatario: true, estado: true, createdAt: true, enviadoAt: true, error: true },
    }),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "aviso", detalle: { dias } });
  const conteo = Object.fromEntries(grupos.map((g) => [g.estado, g._count._all])) as Partial<Record<EstadoAviso, number>>;
  const enviados = (conteo.enviado ?? 0) + (conteo.entregado ?? 0) + (conteo.abierto ?? 0) + (conteo.rebotado ?? 0) + (conteo.queja ?? 0);
  const apertura = enviados > 0 ? Math.round(((conteo.abierto ?? 0) / enviados) * 100) : null;
  return { conteo, enviados, apertura, recientes };
}
