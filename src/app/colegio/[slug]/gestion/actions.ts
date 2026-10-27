"use server";

import { ejecutarYVolver, texto, textoONulo } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import {
  cambiarEstadoAlumno, cambiarEstadoMembresia, crearAlumno, crearCurso, crearSalon, desvincularApoderado, editarAlumno, editarCurso,
  editarSalon, eliminarCurso, eliminarSalon, importarAlumnosCsv, invitarApoderado, invitarUsuario, vincularApoderado,
} from "@/lib/server/gestion";

const ROLES = ["direccion"] as const;
const gestionar = () => contextoDeAccion([...ROLES]);

// ── Profesores ──
export async function invitarProfesorAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/profesores", async () => {
    await invitarUsuario(ctx, { email: texto(formData, "email"), nombres: texto(formData, "nombres"), apellidos: texto(formData, "apellidos"), rol: "profesor" });
    return "Invitación enviada. La persona recibirá un correo para crear su contraseña.";
  });
}

export async function cambiarEstadoMembresiaAction(formData: FormData) {
  const ctx = await gestionar();
  const volver = texto(formData, "volver") === "apoderados" ? "/gestion/apoderados" : "/gestion/profesores";
  const estado = texto(formData, "estado") === "inactiva" ? "inactiva" : "activa";
  await ejecutarYVolver(volver, async () => {
    await cambiarEstadoMembresia(ctx, texto(formData, "id"), estado);
    return estado === "inactiva" ? "Cuenta desactivada." : "Cuenta reactivada.";
  });
}

// ── Salones y cursos ──
function datosSalon(f: FormData) {
  return {
    nombre: texto(f, "nombre"),
    nivel: texto(f, "nivel") as "inicial",
    grado: textoONulo(f, "grado") as unknown as number | null,
    seccion: texto(f, "seccion"),
    anio: texto(f, "anio") as unknown as number,
    tutorId: textoONulo(f, "tutorId"),
  };
}

export async function crearSalonAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/salones", async () => {
    await crearSalon(ctx, datosSalon(formData));
    return "Salón creado.";
  });
}

export async function editarSalonAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/salones", async () => {
    await editarSalon(ctx, texto(formData, "id"), datosSalon(formData));
    return "Salón actualizado.";
  });
}

export async function eliminarSalonAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/salones", async () => {
    await eliminarSalon(ctx, texto(formData, "id"));
    return "Salón borrado.";
  });
}

export async function crearCursoAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/salones", async () => {
    await crearCurso(ctx, { salonId: texto(formData, "salonId"), nombre: texto(formData, "nombre"), profesorId: textoONulo(formData, "profesorId") });
    return "Curso creado.";
  });
}

export async function editarCursoAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/salones", async () => {
    await editarCurso(ctx, texto(formData, "id"), { nombre: texto(formData, "nombre"), profesorId: textoONulo(formData, "profesorId") });
    return "Curso actualizado.";
  });
}

export async function eliminarCursoAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/salones", async () => {
    await eliminarCurso(ctx, texto(formData, "id"));
    return "Curso borrado.";
  });
}

// ── Alumnos ──
export async function crearAlumnoAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/alumnos", async () => {
    await crearAlumno(ctx, { nombres: texto(formData, "nombres"), apellidos: texto(formData, "apellidos"), codigo: texto(formData, "codigo"), salonId: texto(formData, "salonId") });
    return "Alumno creado.";
  });
}

export async function editarAlumnoAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/alumnos", async () => {
    await editarAlumno(ctx, texto(formData, "id"), { nombres: texto(formData, "nombres"), apellidos: texto(formData, "apellidos"), codigo: texto(formData, "codigo"), salonId: texto(formData, "salonId") });
    return "Alumno actualizado.";
  });
}

export async function cambiarEstadoAlumnoAction(formData: FormData) {
  const ctx = await gestionar();
  const estado = texto(formData, "estado") === "retirado" ? "retirado" : "activo";
  await ejecutarYVolver("/gestion/alumnos", async () => {
    await cambiarEstadoAlumno(ctx, texto(formData, "id"), estado);
    return estado === "retirado" ? "Alumno retirado." : "Alumno reactivado.";
  });
}

export async function importarAlumnosAction(formData: FormData) {
  const ctx = await gestionar();
  const archivo = formData.get("archivo");
  await ejecutarYVolver("/gestion/alumnos", async () => {
    if (!(archivo instanceof File) || archivo.size === 0) throw new ErrorDeNegocio("Elige un archivo CSV.");
    if (archivo.size > 1_000_000) throw new ErrorDeNegocio("El archivo es demasiado grande (máximo 1 MB).");
    const r = await importarAlumnosCsv(ctx, await archivo.text());
    if (r.ok) return `Se importaron ${r.creados} alumnos.`;
    const detalle = r.errores.slice(0, 10).map((e) => `línea ${e.linea}: ${e.mensaje}`).join(" · ");
    throw new ErrorDeNegocio(`No se importó nada. ${detalle}${r.errores.length > 10 ? ` (y ${r.errores.length - 10} más)` : ""}`);
  });
}

// ── Apoderados ──
export async function invitarApoderadoAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/apoderados", async () => {
    await invitarApoderado(ctx, {
      email: texto(formData, "email"), nombres: texto(formData, "nombres"), apellidos: texto(formData, "apellidos"),
      alumnoId: texto(formData, "alumnoId"), parentesco: texto(formData, "parentesco"),
    });
    return "Invitación enviada al correo de la familia.";
  });
}

export async function vincularApoderadoAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/apoderados", async () => {
    await vincularApoderado(ctx, { apoderadoId: texto(formData, "apoderadoId"), alumnoId: texto(formData, "alumnoId"), parentesco: texto(formData, "parentesco") });
    return "Alumno vinculado.";
  });
}

export async function desvincularApoderadoAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/apoderados", async () => {
    await desvincularApoderado(ctx, texto(formData, "id"));
    return "Vínculo quitado.";
  });
}
