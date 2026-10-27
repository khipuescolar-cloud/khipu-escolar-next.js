"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import type { EstadoTenant, Plan } from "@/generated/prisma/enums";
import { urlRaiz } from "@/lib/dominio";
import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { cerrarSesion } from "@/lib/server/auth";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import {
  agregarAdministrador, cambiarEstado, cambiarInsignia, cambiarPlan, crearColegio, editarColegio, iniciarAccesoSoporte,
  reenviarBienvenida, requireAdminPlataforma, terminarAccesoSoporte, type EntradaAdministrador,
} from "@/lib/server/plataforma";

// Acciones del panel de plataforma (specs/16). Cada una valida al super administrador; los ids del
// formulario se vuelven a consultar en src/lib/server/plataforma.ts.

export type EstadoFormulario = { error?: string; ok?: string } | null;

function procesarDespues(tenantId: string) {
  after(async () => {
    try {
      await procesarCola({ tenantId });
    } catch (error) {
      console.error("[plataforma] error al procesar la cola", error);
    }
  });
}

/** Datos del administrador desde el formulario (prefijo `admin_`). */
function datosAdministrador(f: FormData): EntradaAdministrador {
  const v = (n: string) => texto(f, `admin_${n}`);
  return {
    email: v("email"),
    nombres: v("nombres"),
    apellidos: v("apellidos"),
    tipoDocumento: (v("tipoDocumento") || "dni") as "dni",
    numeroDocumento: v("numeroDocumento"),
    telefono: v("telefono"),
    genero: (v("genero") || undefined) as "femenino" | undefined,
    cargo: v("cargo"),
  };
}

async function archivo(f: FormData, nombre: string): Promise<Buffer | null> {
  const a = f.get(nombre);
  return a instanceof File && a.size > 0 ? Buffer.from(await a.arrayBuffer()) : null;
}

/** Errores de negocio y validación → mensaje; el resto sigue su camino (403, redirect…). */
async function conMensaje(fn: () => Promise<EstadoFormulario>): Promise<EstadoFormulario> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

export async function crearColegioAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  let id = "";
  const r = await conMensaje(async () => {
    const creado = await crearColegio(
      admin,
      {
        colegio: {
          nombre: texto(f, "nombre"),
          eslogan: texto(f, "eslogan"),
          slug: texto(f, "slug"),
          ciudad: texto(f, "ciudad"),
          plan: texto(f, "plan") as Plan,
          estado: texto(f, "estado") as "piloto",
          emailDomains: texto(f, "emailDomains"),
          escalaCalificacion: (texto(f, "escalaCalificacion") || "literal") as "literal",
        },
        administrador: datosAdministrador(f),
      },
      await archivo(f, "insignia"),
    );
    id = creado.tenant.id;
    procesarDespues(creado.tenant.id);
    return null;
  });
  if (r) return r;
  redirect(`/colegios/${id}?ok=${encodeURIComponent("Colegio creado. Enviamos el correo de bienvenida al administrador principal.")}`);
}

export async function agregarAdministradorAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  return conMensaje(async () => {
    const r = await agregarAdministrador(admin, tenantId, datosAdministrador(f));
    procesarDespues(tenantId);
    return { ok: r.cuentaNueva ? "Administrador agregado. Le enviamos la bienvenida con sus credenciales." : "Administrador agregado. Ya tenía cuenta: conserva su contraseña." };
  });
}

const volver = (f: FormData) => `/colegios/${encodeURIComponent(texto(f, "tenantId"))}`;

export async function cambiarPlanAction(f: FormData) {
  const admin = await requireAdminPlataforma();
  await ejecutarYVolver(volver(f), async () => {
    await cambiarPlan(admin, texto(f, "tenantId"), texto(f, "plan") as Plan);
    return "Plan actualizado.";
  });
}

export async function cambiarEstadoAction(f: FormData) {
  const admin = await requireAdminPlataforma();
  await ejecutarYVolver(volver(f), async () => {
    await cambiarEstado(admin, texto(f, "tenantId"), texto(f, "estado") as EstadoTenant);
    return "Estado actualizado.";
  });
}

export async function editarColegioAction(f: FormData) {
  const admin = await requireAdminPlataforma();
  await ejecutarYVolver(volver(f), async () => {
    await editarColegio(admin, texto(f, "tenantId"), {
      nombre: texto(f, "nombre"),
      eslogan: texto(f, "eslogan"),
      ciudad: texto(f, "ciudad"),
      emailDomains: texto(f, "emailDomains"),
      escalaCalificacion: texto(f, "escalaCalificacion") as "literal",
    });
    return "Datos guardados.";
  });
}

export async function cambiarInsigniaAction(f: FormData) {
  const admin = await requireAdminPlataforma();
  const insignia = await archivo(f, "insignia");
  await ejecutarYVolver(volver(f), async () => {
    if (!insignia) throw new ErrorDeNegocio("Elige una imagen para la insignia.");
    await cambiarInsignia(admin, texto(f, "tenantId"), insignia);
    return "Insignia actualizada.";
  });
}

export async function reenviarBienvenidaAction(f: FormData) {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  await ejecutarYVolver(volver(f), async () => {
    await reenviarBienvenida(admin, tenantId, texto(f, "membershipId"));
    procesarDespues(tenantId);
    return "Volvimos a enviar el correo de bienvenida.";
  });
}

/** «Entrar como soporte»: crea el acceso (motivo + duración) y lleva al subdominio del colegio. */
export async function entrarSoporteAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  let url = "";
  const r = await conMensaje(async () => {
    const acceso = await iniciarAccesoSoporte(admin, texto(f, "tenantId"), { motivo: texto(f, "motivo"), minutos: texto(f, "minutos") });
    url = acceso.url;
    return null;
  });
  if (r) return r;
  redirect(url);
}

export async function terminarSoporteAction(f: FormData) {
  const admin = await requireAdminPlataforma();
  await ejecutarYVolver(volver(f), async () => {
    await terminarAccesoSoporte(admin, texto(f, "accesoId"));
    return "Acceso de soporte terminado.";
  });
}

export async function salirPlataformaAction() {
  await cerrarSesion();
  redirect(urlRaiz("/login"));
}
