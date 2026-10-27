"use server";

import { after } from "next/server";
import { ejecutarYVolver, texto, textoONulo } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import {
  cambiarEstadoAlumno, cambiarEstadoMembresia, cambiarGeneroProfesor, reenviarInvitacion, crearAlumno, crearCurso, crearSalon, desvincularApoderado, editarAlumno, editarCurso,
  editarSalon, eliminarCurso, eliminarSalon, importarAlumnosCsv, invitarApoderado, vincularApoderado,
} from "@/lib/server/gestion";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { altaPersonal, editarFicha, importarPersonalCsv, reenviarBienvenida, type RolPersonal } from "@/lib/server/personal";

const ROLES = ["direccion"] as const;
const gestionar = () => contextoDeAccion([...ROLES]);

function generoDe(f: FormData): "femenino" | "masculino" | "no_especifica" | null {
  const g = textoONulo(f, "genero");
  return g === "femenino" || g === "masculino" || g === "no_especifica" ? g : null;
}

// ── Profesores y personal ──
/** Envía la cola del colegio después de responder (la bienvenida sale sin hacer esperar a dirección). */
function procesarDespues(tenantId: string) {
  after(async () => {
    try {
      await procesarCola({ tenantId });
    } catch (error) {
      console.error("[avisos] error al procesar la cola", error);
    }
  });
}

/** Solo se vuelve a rutas de gestión de personal (nunca a una URL enviada por el cliente). */
function volverA(f: FormData, porDefecto: string): string {
  const v = texto(f, "volver");
  if (v === "apoderados") return "/gestion/apoderados";
  return /^\/gestion\/(profesores|personal|apoderados)(\/[0-9a-f-]{36})?$/.test(v) ? v : porDefecto;
}

function datosPersona(f: FormData) {
  return {
    nombres: texto(f, "nombres"),
    apellidos: texto(f, "apellidos"),
    tipoDocumento: (texto(f, "tipoDocumento") || "dni") as "dni",
    numeroDocumento: texto(f, "numeroDocumento"),
    email: texto(f, "email"),
    telefono: texto(f, "telefono"),
    genero: generoDe(f) ?? undefined,
    fechaNacimiento: texto(f, "fechaNacimiento"),
    direccion: texto(f, "direccion"),
    cargo: textoONulo(f, "cargo"),
  };
}

export async function altaProfesorAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/profesores", async () => {
    const r = await altaPersonal(ctx, { ...datosPersona(formData), rol: "profesor" });
    procesarDespues(ctx.tenant.id);
    return r.cuentaNueva
      ? "Profesor(a) registrado(a). Le enviamos un correo de bienvenida; su contraseña inicial es su documento."
      : "Profesor(a) agregado(a). Ya tenía cuenta en Khipu: entra con su contraseña de siempre.";
  });
}

export async function altaPersonalAction(formData: FormData) {
  const ctx = await gestionar();
  const rol = texto(formData, "rol") === "porteria" ? "porteria" : "administrativo";
  await ejecutarYVolver("/gestion/personal", async () => {
    const r = await altaPersonal(ctx, { ...datosPersona(formData), rol });
    procesarDespues(ctx.tenant.id);
    return r.cuentaNueva ? "Persona registrada. Le enviamos un correo de bienvenida; su contraseña inicial es su documento." : "Persona agregada. Ya tenía cuenta en Khipu: entra con su contraseña de siempre.";
  });
}

export async function editarPersonaAction(formData: FormData) {
  const ctx = await gestionar();
  const id = texto(formData, "id");
  const roles: RolPersonal[] = texto(formData, "ambito") === "personal" ? ["administrativo", "porteria"] : ["profesor"];
  await ejecutarYVolver(volverA(formData, "/gestion/profesores"), async () => {
    const d = datosPersona(formData);
    await editarFicha(ctx, id, roles, {
      nombres: d.nombres, apellidos: d.apellidos, telefono: d.telefono, genero: d.genero ?? null,
      tipoDocumento: d.tipoDocumento, numeroDocumento: d.numeroDocumento, fechaNacimiento: d.fechaNacimiento, direccion: d.direccion, cargo: d.cargo ?? undefined,
    });
    return "Datos guardados.";
  });
}

export async function reenviarBienvenidaAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver(volverA(formData, "/gestion/profesores"), async () => {
    await reenviarBienvenida(ctx, texto(formData, "id"));
    procesarDespues(ctx.tenant.id);
    return "Bienvenida reenviada.";
  });
}

export async function importarPersonalAction(formData: FormData) {
  const ctx = await gestionar();
  const tipo = texto(formData, "tipo") === "personal" ? "personal" : "profesores";
  const archivo = formData.get("archivo");
  await ejecutarYVolver(`/gestion/${tipo === "personal" ? "personal" : "profesores"}`, async () => {
    if (!(archivo instanceof File) || archivo.size === 0) throw new ErrorDeNegocio("Elige un archivo CSV.");
    if (archivo.size > 1_000_000) throw new ErrorDeNegocio("El archivo es demasiado grande (máximo 1 MB).");
    const r = await importarPersonalCsv(ctx, await archivo.text(), tipo);
    if (r.creados > 0) procesarDespues(ctx.tenant.id);
    if (r.ok) return `Se registraron ${r.creados} personas y se les envió su bienvenida.`;
    const detalle = r.errores.slice(0, 10).map((e) => `línea ${e.linea}: ${e.mensaje}`).join(" · ");
    throw new ErrorDeNegocio(`No se registró nada. ${detalle}${r.errores.length > 10 ? ` (y ${r.errores.length - 10} más)` : ""}`);
  });
}

export async function cambiarEstadoMembresiaAction(formData: FormData) {
  const ctx = await gestionar();
  const estado = texto(formData, "estado") === "inactiva" ? "inactiva" : "activa";
  await ejecutarYVolver(volverA(formData, "/gestion/profesores"), async () => {
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

export async function reenviarInvitacionAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver(volverA(formData, "/gestion/profesores"), async () => {
    await reenviarInvitacion(ctx, texto(formData, "id"));
    return "Invitación reenviada.";
  });
}

export async function cambiarGeneroProfesorAction(formData: FormData) {
  const ctx = await gestionar();
  await ejecutarYVolver("/gestion/profesores", async () => {
    await cambiarGeneroProfesor(ctx, texto(formData, "id"), generoDe(formData));
    return "Datos guardados.";
  });
}
