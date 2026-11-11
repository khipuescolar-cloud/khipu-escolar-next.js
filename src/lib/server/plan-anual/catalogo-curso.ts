import "server-only";
import type { EstadoEditorialTema, Nivel } from "@/generated/prisma/enums";
import { cursoKhipu, detectarCursoKhipu, disciplinasCedidas } from "@/lib/cursos-khipu/catalogo";
import { esAreaNudito, type AreaNudito, type Tema } from "@/lib/nudito/contratos";
import { fichasDe, temasDeConBanco, temasPropuestosDe } from "@/lib/nudito/conocimiento/servidor";
import type { DbTenant } from "@/lib/server/db";

export type CursoAsignado = { nombre: string; cursoColegio: { cursoKhipu: string | null } | null };
export function claveCursoAsignado(curso: CursoAsignado, nivel: Nivel): string | null {
  if (nivel !== "primaria" && nivel !== "secundaria") return null;
  const elegido = curso.cursoColegio?.cursoKhipu
    ? cursoKhipu(curso.cursoColegio.cursoKhipu)
    : detectarCursoKhipu(curso.nombre, nivel);
  return elegido?.nudito && elegido.niveles.includes(nivel) ? elegido.clave : null;
}

/** Editorial rows read with the course catalog query; reused for student publication checks. */
export type IndiceTemaCurso = { clave: string; disciplinas: string[]; estado: EstadoEditorialTema; huellaContenidoRevisado: string | null };
export type CatalogoCurso = { temas: Tema[]; indices: IndiceTemaCurso[] };

/** Un solo banco global; oferta del grado decide las disciplinas del curso. */
export async function catalogoDelCursoConIndice(db: DbTenant, grupo: { anio: number; nivel: Nivel; grado: number; area: string }): Promise<CatalogoCurso> {
  if (grupo.nivel !== "primaria" && grupo.nivel !== "secundaria") return { temas: [], indices: [] };
  const curso = cursoKhipu(grupo.area);
  if (!curso?.nudito || !esAreaNudito(curso.area) || !curso.niveles.includes(grupo.nivel)) return { temas: [], indices: [] };
  const area = curso.area as AreaNudito;
  const [temas, fichas, propuestos, indices] = await Promise.all([
    temasDeConBanco(area, grupo.nivel as "primaria" | "secundaria", grupo.grado),
    fichasDe(area, grupo.nivel as "primaria" | "secundaria", grupo.grado),
    temasPropuestosDe(area, grupo.nivel as "primaria" | "secundaria", grupo.grado),
    db.temaCurricular.findMany({ where: { areaCneb: area, nivel: grupo.nivel, grado: grupo.grado }, select: { clave: true, disciplinas: true, estado: true, huellaContenidoRevisado: true } }),
  ]);
  const fichaPorClave = new Map(fichas.map(f => [f.clave, f]));
  const propuestaPorClave = new Map(propuestos.map(p => [p.tema.clave, p.disciplina]));
  const indicePorClave = new Map(indices.map(i => [i.clave, i]));
  let cedidas = new Set<string>();
  if (curso.clave === area) {
    const asignados = await db.curso.findMany({
      where: { salon: { anio: grupo.anio, nivel: grupo.nivel, grado: grupo.grado, archivadoAt: null } },
      select: { nombre: true, cursoColegio: { select: { cursoKhipu: true } } },
    });
    cedidas = disciplinasCedidas(area, asignados.flatMap(c => { const clave = claveCursoAsignado(c, grupo.nivel); return clave ? [clave] : []; }));
  }
  const catalogo = temas.filter(t => {
    const disciplinas = indicePorClave.get(t.clave)?.disciplinas ?? (fichaPorClave.get(t.clave) ? [fichaPorClave.get(t.clave)!.disciplina] : propuestaPorClave.has(t.clave) ? [propuestaPorClave.get(t.clave)!] : []);
    if (curso.clave === area) return !disciplinas.some(d => cedidas.has(d));
    return disciplinas.some(d => curso.disciplinas.includes(d as never));
  });
  return { temas: catalogo, indices: indices.map(i => ({ ...i })) };
}

export async function catalogoDelCurso(db: DbTenant, grupo: { anio: number; nivel: Nivel; grado: number; area: string }): Promise<Tema[]> {
  return (await catalogoDelCursoConIndice(db, grupo)).temas;
}

export async function estadosEditoriales(db: DbTenant, claves: readonly string[]): Promise<Map<string, "borrador" | "revisado">> {
  if (!claves.length) return new Map();
  const filas = await db.temaCurricular.findMany({ where: { clave: { in: [...claves] } }, select: { clave: true, estado: true } });
  return new Map(filas.map(f => [f.clave, f.estado === "revisado" || f.estado === "publicado" ? "revisado" : "borrador"]));
}
