import type { Rol } from "@/generated/prisma/enums";

export const NOMBRE_ROL: Record<Rol, string> = {
  direccion: "Dirección",
  profesor: "Profesor(a)",
  apoderado: "Familia",
  alumno: "Alumno(a)",
  porteria: "Portería",
};
