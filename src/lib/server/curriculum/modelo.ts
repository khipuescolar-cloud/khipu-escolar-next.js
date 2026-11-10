/** Contratos compartidos del currículo. El contenido vive en el banco JSON versionado. */
import type { Nivel, EstadoEditorialTema } from "@/generated/prisma/enums";

export type TemaClave = string;
export type CursoKhipuClave = string;

export interface IndiceTemaCurricular {
  clave: TemaClave;
  areaCneb: string;
  disciplinas: string[];
  nivel: Nivel;
  grado: number;
  procedencia: string;
  fuenteId: string | null;
  fuenteLocator: string | null;
  estado: EstadoEditorialTema;
  version: number;
}

export interface VinculoDesempenoOficial {
  temaClave: TemaClave;
  codigoCompetencia: string;
  codigoDesempeno: string;
  fuenteId: string;
  fuenteLocator: string;
  verificadoAt: Date | null;
}

/** cursoKhipu null identifica un curso propio sin Nudito. */
export interface DefinicionCursoColegio {
  id: string;
  tenantId: string;
  cursoKhipu: CursoKhipuClave | null;
  nombre: string;
  orden: number;
  archivadoAt: Date | null;
}

export interface OfertaCursoGrado {
  cursoColegioId: string;
  tenantId: string;
  anio: number;
  nivel: Nivel;
  grado: number;
  orden: number;
}

/** El profesor puede seleccionar borradores; el alumno solo recibe contenido revisado. */
export function temaVisibleParaAlumno(estado: EstadoEditorialTema): boolean {
  return estado === "revisado" || estado === "publicado";
}
