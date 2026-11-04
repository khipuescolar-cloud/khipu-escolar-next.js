// Datos demo de Nudito · tutor (specs/41–42). Ficticios. Se llama al final de prisma/seed.ts.
// - Activa `nudito_config_colegio` de Nuevo Horizonte (las 3 áreas, primaria y secundaria).
// - Rellena `cursos.area_cneb` por el nombre del curso (sin tocar los fijados a mano).
// - Dos temas propios del colegio de ejemplo (uno de Matemática activo y uno de Ciencia con banco, pendiente de revisión).
// Idempotente. No usa src/lib/server (el seed no corre con `react-server`): repite la lógica pura de areas-cursos.ts.
import { detectarArea } from "../src/lib/cneb/catalogo";
import type { PrismaClient } from "../src/generated/prisma/client";
import { SLUG_COLEGIO } from "./seed-utilidades";

export async function sembrarNuditoTutor(prisma: PrismaClient): Promise<void> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: SLUG_COLEGIO } });
  const direccion = await prisma.membership.findFirstOrThrow({ where: { tenantId: tenant.id, rol: "direccion" } });

  await prisma.nuditoConfigColegio.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, activo: true, actualizadoPorId: direccion.userId, activadoAt: new Date() },
    update: { activo: true },
  });

  const cursos = await prisma.curso.findMany({
    where: { tenantId: tenant.id, areaCneb: null, areaCnebManual: false },
    select: { id: true, nombre: true, salon: { select: { nivel: true } } },
  });
  for (const c of cursos) {
    const area = detectarArea(c.nombre, c.salon.nivel)?.area;
    if (area) await prisma.curso.update({ where: { id: c.id }, data: { areaCneb: area } });
  }

  const existentes = await prisma.nuditoTemaColegio.count({ where: { tenantId: tenant.id } });
  if (existentes > 0) return;
  await prisma.nuditoTemaColegio.createMany({
    data: [
      {
        tenantId: tenant.id, area: "matematica", nivel: "primaria", grado: 5, competenciaCneb: 23,
        nombre: "Problemas de la feria escolar", descripcion: "Resolver problemas de compra y venta con decimales usando precios de la feria del colegio.",
        palabrasClave: ["feria escolar", "precios", "vuelto", "compras"], prerrequisitos: ["mat.p5.numeros-decimales"],
        dificultadMin: 1, dificultadMax: 3, tipos: ["numerico", "opcion_multiple"], fuente: { tipo: "generador", generadorId: "mat.operaciones" },
        activo: true, creadoPorId: direccion.userId, revisadoPorId: direccion.userId, revisadoAt: new Date(),
      },
      {
        tenantId: tenant.id, area: "ciencia-tecnologia", nivel: "primaria", grado: 4, competenciaCneb: 21,
        nombre: "Biohuerto del colegio", descripcion: "Partes de la planta y cuidados del biohuerto escolar.",
        palabrasClave: ["biohuerto", "huerto", "sembrar", "riego"], prerrequisitos: [],
        dificultadMin: 1, dificultadMax: 2, tipos: ["opcion_multiple", "verdadero_falso"], fuente: { tipo: "banco", bancoId: "cyt.banco" },
        // Fuente banco: queda inactivo hasta que dirección revise sus ítems (specs/42).
        activo: false, creadoPorId: direccion.userId,
      },
    ],
  });
}
