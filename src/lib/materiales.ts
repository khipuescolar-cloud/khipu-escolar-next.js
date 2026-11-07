export type GrupoMaterial<T> = { anio: number; cursos: { nombre: string; secciones: { cursoId: string; salonId: string; salon: string; materiales: T[] }[] }[] };

/** Agrupa una sola fila de material en cada sección autorizada, sin copiar el archivo. */
export function agruparMateriales<T extends { secciones: { anio: number; cursoId: string; curso: string; salonId: string; salon: string }[] }>(materiales: T[]): GrupoMaterial<T>[] {
  const anios = new Map<number, Map<string, Map<string, { cursoId: string; salonId: string; salon: string; materiales: T[] }>>>();
  for (const material of materiales) for (const s of material.secciones) {
    const cursos = anios.get(s.anio) ?? new Map(); anios.set(s.anio, cursos);
    const secciones = cursos.get(s.curso) ?? new Map(); cursos.set(s.curso, secciones);
    const grupo = secciones.get(s.cursoId) ?? { cursoId: s.cursoId, salonId: s.salonId, salon: s.salon, materiales: [] };
    secciones.set(s.cursoId, grupo); grupo.materiales.push(material);
  }
  return [...anios.entries()].sort(([a], [b]) => b - a).map(([anio, cursos]) => ({ anio, cursos: [...cursos.entries()].sort(([a], [b]) => a.localeCompare(b, "es")).map(([nombre, secciones]) => ({ nombre, secciones: [...secciones.values()].sort((a, b) => a.salon.localeCompare(b.salon, "es")) })) }));
}

export function nombreMaterial(titulo: string): string {
  const limpio = titulo.trim().replace(/\s+/g, " ");
  if (limpio.length < 3 || limpio.length > 150) throw new Error("El título debe tener entre 3 y 150 caracteres.");
  return limpio;
}
