// Etiquetas del chat familia ↔ profesor. Puras: nunca incluyen teléfono ni correo.

export const MAX_MENSAJE = 2000;

type SalonParaEtiqueta = {
  nombre: string;
  tutorId: string | null;
  cursos: { nombre: string; profesorId: string | null }[];
};

/** «Lucía García · Tutor(a) de 3.° B» o «Pedro Salas · Profesor(a) de Ciencia y Tecnología (3.° B)». */
export function etiquetaProfesor(nombreCompleto: string, profesorId: string, salon: SalonParaEtiqueta): string {
  if (salon.tutorId === profesorId) return `${nombreCompleto} · Tutor(a) de ${salon.nombre}`;
  const cursos = salon.cursos.filter((c) => c.profesorId === profesorId).map((c) => c.nombre);
  const detalle = cursos.length > 0 ? `${cursos.join(", ")} (${salon.nombre})` : salon.nombre;
  return `${nombreCompleto} · Profesor(a) de ${detalle}`;
}

/** «Rosa Quispe · madre de Mateo Quispe Huamán». */
export function etiquetaApoderado(nombreCompleto: string, parentesco: string, alumno: string): string {
  const rol = parentesco.trim().toLowerCase() || "apoderado";
  return `${nombreCompleto} · ${rol} de ${alumno}`;
}

export function nombreCompleto(p: { nombres: string; apellidos: string }): string {
  return `${p.nombres} ${p.apellidos}`.trim();
}
