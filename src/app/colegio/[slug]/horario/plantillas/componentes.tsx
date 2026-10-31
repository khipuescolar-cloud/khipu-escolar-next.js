import { NOMBRE_NIVEL } from "@/lib/asistencia-por-curso";
import type { PlantillaVista } from "@/lib/server/plantillas-horario";

/** Salones para el formulario, con la plantilla que usan ahora. */
export function opcionesDeSalones(salones: { id: string; nombre: string; nivel: string; plantillaId: string | null }[], plantillas: PlantillaVista[], actualId: string | null) {
  const nombres = new Map(plantillas.map((p) => [p.id, p.nombre]));
  return salones.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    nivel: NOMBRE_NIVEL[s.nivel as keyof typeof NOMBRE_NIVEL] ?? s.nivel,
    plantillaNombre: s.plantillaId ? nombres.get(s.plantillaId) ?? null : null,
    enEsta: actualId !== null && s.plantillaId === actualId,
  }));
}
