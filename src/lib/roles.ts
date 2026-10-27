import type { Rol } from "@/generated/prisma/enums";

export type Genero = "femenino" | "masculino" | "no_especifica";

export const NOMBRE_ROL: Record<Rol, string> = {
  direccion: "Dirección",
  profesor: "Profesor(a)",
  apoderado: "Familia",
  alumno: "Alumno(a)",
  porteria: "Portería",
  administrativo: "Personal administrativo",
};

/** Título con género: femenino → «Profesora», masculino → «Profesor», sin dato → «Profesor(a)». */
export function tituloProfesor(genero: Genero | null | undefined, tipo: "profesor" | "tutor" = "profesor"): string {
  const base = tipo === "tutor" ? "Tutor" : "Profesor";
  if (genero === "femenino") return `${base}a`;
  if (genero === "masculino") return base;
  return `${base}(a)`;
}

/** Nombre del rol para mostrar; solo «profesor» cambia según el género. */
export function nombreRol(rol: Rol, genero: Genero | null | undefined): string {
  return rol === "profesor" ? tituloProfesor(genero) : NOMBRE_ROL[rol];
}

/**
 * Roles que usan las vistas «de familia» (solo lectura de sus propios alumnos): el apoderado (sus hijos)
 * y el alumno con cuenta propia (solo él mismo). El alcance real lo decide `alumnoIdsVisibles` en el servidor.
 */
export const ROLES_FAMILIA = ["apoderado", "alumno"] as const satisfies readonly Rol[];

export function esVistaFamilia(rol: Rol): rol is (typeof ROLES_FAMILIA)[number] {
  return (ROLES_FAMILIA as readonly Rol[]).includes(rol);
}
