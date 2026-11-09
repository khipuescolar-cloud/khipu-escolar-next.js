// Datos demo de la planificación anual y los contenidos de Nudito (specs/48–49). Ficticios. Se llama al final de
// prisma/seed.ts y desde `pnpm db:demo-plan-anual` (scripts/datos-piloto/plan-anual-demo.ts).
// - Por cada grupo curricular (año, nivel, grado, área de Nudito) con cursos y docentes: un plan PUBLICADO (versión 1)
//   con todos los temas del catálogo de ese grado, sus participantes, conformidades y lecciones `catalogo` publicadas.
//   Así el demo de Nudito (Lucas, 5.° A; Mateo, 3.° B) sigue teniendo temas.
// - EXCEPCIÓN: 3.° de primaria · Matemática queda SIN plan para recorrer a mano el flujo completo (crear, revisar,
//   aprobar, publicar, preparar materiales). Mientras tanto, sus alumnos ven «Tu colegio está preparando los temas».
// - Las lecciones de catálogo están pendientes de revisión pedagógica real (specs/42): aquí se marcan publicadas solo
//   como dato demo, aprobadas por el coordinador ficticio.
// Idempotente: no toca un grupo que ya tenga plan. No usa src/lib/server (el seed no corre con `react-server`).
import type { Nivel, PrismaClient } from "../src/generated/prisma/client";
import { temasDe } from "../src/lib/nudito/catalogo";
import type { AreaNudito, NivelNudito } from "../src/lib/nudito/contratos";
import { hashContenido } from "../src/lib/nudito/leccion";
import { armarLeccionCatalogo } from "../src/lib/server/nudito/lecciones/muestras";
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
  let lecciones = 0;
  const leccionesHechas = new Set((await prisma.nuditoLeccion.findMany({ where: { tenantId: tenant.id, estado: "publicada" }, select: { temaClave: true } })).map((l) => l.temaClave));
  for (const g of grupos.values()) {
    if (g.nivel === GRUPO_SIN_PLAN.nivel && g.grado === GRUPO_SIN_PLAN.grado && g.area === GRUPO_SIN_PLAN.area) continue;
    const temas = temasDe(g.area, g.nivel as NivelNudito, g.grado);
    if (temas.length === 0) continue;
    const existe = await prisma.planAnual.findUnique({ where: { tenantId_anio_nivel_grado_area: { tenantId: tenant.id, anio: g.anio, nivel: g.nivel, grado: g.grado, area: g.area } } });
    if (existe) continue;
    const docentes = [...g.docentes].sort();
    const coordinador = docentes[0];
    const ahora = new Date();
    await prisma.$transaction(async (tx) => {
      const plan = await tx.planAnual.create({
        data: {
          tenantId: tenant.id, anio: g.anio, nivel: g.nivel, grado: g.grado, area: g.area, nombreCurso: NOMBRE_AREA[g.area],
          estado: "publicado", coordinadorId: coordinador, rondaRevision: 1, versionPublicada: 1, creadoPorId: direccion.id,
          aprobadoPorId: coordinador, aprobadoAt: ahora, publicadoPorId: coordinador, publicadoAt: ahora,
        },
      });
      await tx.planAnualParticipante.createMany({
        data: docentes.map((m) => ({ tenantId: tenant.id, planId: plan.id, membershipId: m, rol: m === coordinador ? "coordinador" as const : "docente" as const, activo: true })),
      });
      await tx.planAnualTema.createMany({
        data: temas.map((t, orden) => ({ tenantId: tenant.id, planId: plan.id, temaClave: t.clave, orden, propuestoPorId: coordinador })),
      });
      await tx.planAnualConformidad.createMany({
        data: docentes.map((m) => ({ tenantId: tenant.id, planId: plan.id, ronda: 1, membershipId: m, decision: "conforme" as const })),
      });
      await tx.planAnualVersion.create({
        data: {
          tenantId: tenant.id, planId: plan.id, numero: 1,
          temas: temas.map((t, orden) => ({ temaClave: t.clave, orden, unidadId: null, nota: null })),
          unidades: [], conformidades: docentes.map((m) => ({ membershipId: m, decision: "conforme", comentario: null })),
          motivo: "Plan demo (datos ficticios)", publicadoPorId: coordinador,
        },
      });
      await tx.planAnualEvento.create({ data: { tenantId: tenant.id, planId: plan.id, actorId: coordinador, tipo: "publicar", detalle: { version: 1, demo: true } } });
      for (const t of temas) {
        if (leccionesHechas.has(t.clave)) continue;
        const contenido = armarLeccionCatalogo(t);
        const leccion = await tx.nuditoLeccion.create({
          data: {
            tenantId: tenant.id, temaClave: t.clave, area: g.area, version: 1, estado: "publicada", origen: "catalogo",
            contenido, contenidoHash: hashContenido(contenido), validacion: { ok: true, errores: [] },
            aprobadoPorId: coordinador, aprobadoAt: ahora, publicadoPorId: coordinador, publicadaAt: ahora,
          },
        });
        await tx.nuditoLeccionRevision.create({ data: { tenantId: tenant.id, leccionId: leccion.id, actorId: coordinador, accion: "publicar", comentario: "Lección de catálogo publicada para el demo." } });
        leccionesHechas.add(t.clave);
        lecciones++;
      }
    });
    creados++;
  }
  return { creados, lecciones };
}
