// Temas sintéticos para probar generadores, banco y lecturas de B (specs/43). NO son el catálogo (A).
import type { FuenteTema, NivelNudito, Tema, TipoEjercicio } from "@/lib/nudito/contratos";

export function temaPrueba(o: {
  clave: string;
  nivel: NivelNudito;
  grado: number;
  fuente: FuenteTema;
  tipos: TipoEjercicio[];
  nombre?: string;
  area?: Tema["area"];
}): Tema {
  const area = o.area ?? (o.clave.startsWith("mat.") ? "matematica" : o.clave.startsWith("cyt.") ? "ciencia-tecnologia" : "comunicacion");
  return {
    clave: o.clave,
    area,
    nivel: o.nivel,
    grado: o.grado,
    competenciaCneb: area === "matematica" ? 23 : area === "comunicacion" ? 8 : 21,
    nombre: o.nombre ?? "Tema de prueba",
    descripcionCorta: "Tema sintético para pruebas unitarias.",
    palabrasClave: ["prueba"],
    prerrequisitos: [],
    dificultad: { min: 1, max: 5 },
    tipos: o.tipos,
    fuente: o.fuente,
    repaso: { idea: "Idea de prueba.", ejemplo: "Ejemplo de prueba." },
    recursos: [],
    origen: "cneb",
    version: 1,
    revisado: null,
  };
}

/** Grados efectivos: primaria 1–6 y secundaria 1–5. */
export const GRADOS: { nivel: NivelNudito; grado: number }[] = [
  ...[1, 2, 3, 4, 5, 6].map((grado) => ({ nivel: "primaria" as const, grado })),
  ...[1, 2, 3, 4, 5].map((grado) => ({ nivel: "secundaria" as const, grado })),
];
