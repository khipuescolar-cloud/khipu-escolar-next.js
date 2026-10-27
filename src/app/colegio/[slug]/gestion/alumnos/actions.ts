"use server";

import { after } from "next/server";
import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { cambiarEstadoCuentaAlumno, crearCuentaAlumno } from "@/lib/server/gestion-cuentas-alumno";
import { procesarCola } from "@/lib/server/notificaciones/cola";

// Cuenta propia del alumno (specs/17): dirección y personal administrativo.
const gestionarAlumnos = () => contextoDeAccion(["direccion", "administrativo"]);

export async function crearCuentaAlumnoAction(formData: FormData) {
  const ctx = await gestionarAlumnos();
  await ejecutarYVolver("/gestion/alumnos", async () => {
    const r = await crearCuentaAlumno(ctx, {
      alumnoId: texto(formData, "alumnoId"),
      email: texto(formData, "email"),
      tipoDocumento: (texto(formData, "tipoDocumento") || "dni") as "dni",
      numeroDocumento: texto(formData, "numeroDocumento"),
    });
    after(async () => {
      try {
        await procesarCola({ tenantId: ctx.tenant.id });
      } catch (error) {
        console.error("[avisos] error al procesar la cola", error);
      }
    });
    return r.cuentaNueva
      ? "Cuenta del alumno creada. Le enviamos un correo de bienvenida; su contraseña inicial es su documento."
      : "Cuenta del alumno creada. Ese correo ya tenía cuenta en Khipu: entra con su contraseña de siempre.";
  });
}

export async function cambiarEstadoCuentaAlumnoAction(formData: FormData) {
  const ctx = await gestionarAlumnos();
  const estado = texto(formData, "estado") === "inactiva" ? "inactiva" : "activa";
  await ejecutarYVolver("/gestion/alumnos", async () => {
    await cambiarEstadoCuentaAlumno(ctx, texto(formData, "alumnoId"), estado);
    return estado === "inactiva" ? "Cuenta del alumno desactivada." : "Cuenta del alumno reactivada.";
  });
}
