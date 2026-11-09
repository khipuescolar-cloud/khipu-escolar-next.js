// Temarios demo de Nudito. Idempotente y sin lecciones publicadas obligatorias.
import type { Nivel, PrismaClient } from "../src/generated/prisma/client";
import { temasDe } from "../src/lib/nudito/catalogo";
import type { AreaNudito, NivelNudito } from "../src/lib/nudito/contratos";
import { SLUG_COLEGIO } from "./seed-utilidades";

const AREAS: AreaNudito[] = ["matematica", "comunicacion", "ciencia-tecnologia"];
const NOMBRE_AREA: Record<AreaNudito, string> = { matematica: "Matemática", comunicacion: "Comunicación", "ciencia-tecnologia": "Ciencia y Tecnología" };
/** Grupo que se deja sin plan para la demostración manual del flujo. */
export const GRUPO_SIN_PLAN = { nivel: "primaria" as Nivel, grado: 3, area: "matematica" as AreaNudito };

export async function sembrarPlanesAnuales(prisma: PrismaClient, slug = SLUG_COLEGIO): Promise<{ creados: number; lecciones: number }> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug } });
  const direccion = await prisma.membership.findFirstOrThrow({ where: { tenantId: tenant.id, rol: "direccion" } });
  const cursos = await prisma.curso.findMany({
    where: { tenantId: tenant.id, areaCneb: { in: AREAS }, profesorId: { not: null }, salon: { archivadoAt: null, grado: { not: null }, nivel: { in: ["primaria", "secundaria"] } } },
    select: { areaCneb: true, profesorId: true, salon: { select: { anio: true, nivel: true, grado: true } } },
  });
  const grupos = new Map<string, { anio: number; nivel: Nivel; grado: number; area: AreaNudito; docentes: Set<string> }>();
  for (const c of cursos) {
    const k = [c.salon.anio, c.salon.nivel, c.salon.grado, c.areaCneb].join("|");
    const g = grupos.get(k) ?? { anio: c.salon.anio, nivel: c.salon.nivel, grado: c.salon.grado!, area: c.areaCneb as AreaNudito, docentes: new Set<string>() };
    g.docentes.add(c.profesorId!);
    grupos.set(k, g);
  }
  let creados = 0;
  const lecciones = 0;
  let revisionSembrada = false;
  for (const g of grupos.values()) {
    if (g.nivel === GRUPO_SIN_PLAN.nivel && g.grado === GRUPO_SIN_PLAN.grado && g.area === GRUPO_SIN_PLAN.area) continue;
    const temas = temasDe(g.area, g.nivel as NivelNudito, g.grado);
    if (temas.length === 0) continue;
    const existe = await prisma.planAnual.findUnique({ where: { tenantId_anio_nivel_grado_area: { tenantId: tenant.id, anio: g.anio, nivel: g.nivel, grado: g.grado, area: g.area } } });
    if (existe) continue;
    const docentes = [...g.docentes].sort();
    const coordinador = docentes[0];
    const enRevision = !revisionSembrada && docentes.length > 1 && g.grado !== 5;
    if (enRevision) revisionSembrada = true;
    const ahora = new Date();
    await prisma.$transaction(async (tx) => {
      const plan = await tx.planAnual.create({
        data: {
          tenantId: tenant.id, anio: g.anio, nivel: g.nivel, grado: g.grado, area: g.area, nombreCurso: NOMBRE_AREA[g.area],
          estado: enRevision ? "en_revision" : "publicado", rondaRevision: 1, versionPublicada: enRevision ? 0 : 1, creadoPorId: direccion.id,
          publicadoPorId: enRevision ? null : coordinador, publicadoAt: enRevision ? null : ahora,
        },
      });
      await tx.planAnualParticipante.createMany({
        data: docentes.map((m) => ({ tenantId: tenant.id, planId: plan.id, membershipId: m, rol: "docente" as const, activo: true })),
      });
      await tx.planAnualTema.createMany({
        data: temas.map((t, orden) => ({ tenantId: tenant.id, planId: plan.id, temaClave: t.clave, orden, propuestoPorId: coordinador })),
      });
      await tx.planAnualConformidad.createMany({
        data: (enRevision ? docentes.slice(0, 1) : docentes).map((m) => ({ tenantId: tenant.id, planId: plan.id, ronda: 1, membershipId: m, decision: "conforme" as const })),
      });
      if (!enRevision) await tx.planAnualVersion.create({ data: {
        tenantId: tenant.id, planId: plan.id, numero: 1,
        temas: temas.map((t, orden) => ({ temaClave: t.clave, orden })),
        unidades: [], conformidades: docentes.map(m => ({ membershipId: m, decision: "conforme" })),
        motivo: "Temario demo", publicadoPorId: coordinador,
      } });
    });
    creados++;
  }
  return { creados, lecciones };
}
