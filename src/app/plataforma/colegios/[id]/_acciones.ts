"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ZodError } from "zod";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { texto } from "@/lib/server/accion-formulario";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import {
  agregarResponsable, editarResponsable, marcarPrincipal, quitarResponsable, type EntradaAcceso, type EntradaResponsable,
} from "@/lib/server/plataforma-responsables";
import { anularPago, guardarSuscripcion, registrarPago } from "@/lib/server/plataforma-suscripciones";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import type { EstadoFormulario } from "../../actions";

// Acciones de «Responsables» y «Suscripción» de la ficha del colegio (specs/20). Cada una valida al
// super administrador; los ids del formulario se vuelven a consultar en la capa de servidor.

function refrescar(tenantId: string) {
  revalidatePath(`/plataforma/colegios/${tenantId}`);
  revalidatePath("/plataforma/suscripciones");
}

function procesarDespues(tenantId: string) {
  after(async () => {
    try {
      await procesarCola({ tenantId });
    } catch (error) {
      console.error("[plataforma] error al procesar la cola", error);
    }
  });
}

function mensajeDe(e: unknown): string | null {
  if (e instanceof ErrorDeNegocio) return e.message;
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Revisa los datos.";
  return null;
}

async function paraFormulario(fn: () => Promise<string>): Promise<EstadoFormulario> {
  try {
    return { ok: await fn() };
  } catch (e) {
    const m = mensajeDe(e);
    if (m) return { error: m };
    throw e;
  }
}

async function paraBoton(fn: () => Promise<string>): Promise<Resultado> {
  try {
    return ok(await fn());
  } catch (e) {
    const m = mensajeDe(e);
    if (m) return fallo(m);
    throw e;
  }
}

function datosResponsable(f: FormData): EntradaResponsable {
  return {
    tipo: texto(f, "tipo") as "otro",
    nombres: texto(f, "nombres"),
    apellidos: texto(f, "apellidos"),
    cargo: texto(f, "cargo"),
    email: texto(f, "email"),
    telefono: texto(f, "telefono"),
    notas: texto(f, "notas"),
  };
}

/** Agrega (sin `id`) o edita (con `id`) un responsable. */
export async function guardarResponsableAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  const id = texto(f, "id");
  return paraFormulario(async () => {
    if (id) {
      await editarResponsable(admin, tenantId, id, datosResponsable(f));
      refrescar(tenantId);
      return "Responsable actualizado.";
    }
    const acceso: EntradaAcceso | null =
      texto(f, "darAcceso") === "on"
        ? {
            tipoDocumento: (texto(f, "tipoDocumento") || "dni") as "dni",
            numeroDocumento: texto(f, "numeroDocumento"),
            genero: (texto(f, "genero") || undefined) as "femenino" | undefined,
          }
        : null;
    const r = await agregarResponsable(admin, tenantId, datosResponsable(f), acceso);
    if (r.conAcceso) procesarDespues(tenantId);
    refrescar(tenantId);
    return r.conAcceso
      ? r.cuentaNueva ? "Responsable agregado. Le enviamos la bienvenida con sus credenciales." : "Responsable agregado. Ya tenía cuenta: conserva su contraseña."
      : "Responsable agregado.";
  });
}

export async function marcarPrincipalAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  return paraBoton(async () => {
    await marcarPrincipal(admin, tenantId, texto(f, "id"));
    refrescar(tenantId);
    return "Responsable principal actualizado.";
  });
}

export async function quitarResponsableAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  return paraBoton(async () => {
    await quitarResponsable(admin, tenantId, texto(f, "id"), {
      reemplazoId: texto(f, "reemplazoId") || null,
      desactivarAcceso: texto(f, "desactivarAcceso") === "on",
    });
    refrescar(tenantId);
    return "Responsable quitado.";
  });
}

export async function guardarSuscripcionAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  return paraFormulario(async () => {
    await guardarSuscripcion(admin, tenantId, {
      plan: texto(f, "plan") as "basico",
      ciclo: texto(f, "ciclo") as "mensual",
      estado: texto(f, "estado") as "prueba",
      montoPorCiclo: texto(f, "montoPorCiclo") as unknown as number,
      alumnosContratados: texto(f, "alumnosContratados") as unknown as number,
      inicio: texto(f, "inicio"),
      proximaRenovacion: texto(f, "proximaRenovacion"),
      notas: texto(f, "notas"),
    });
    refrescar(tenantId);
    return "Suscripción guardada.";
  });
}

export async function registrarPagoAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  return paraFormulario(async () => {
    await registrarPago(admin, tenantId, {
      monto: texto(f, "monto") as unknown as number,
      fechaPago: texto(f, "fechaPago"),
      periodoDesde: texto(f, "periodoDesde"),
      periodoHasta: texto(f, "periodoHasta"),
      metodo: texto(f, "metodo") as "otro",
      comprobante: texto(f, "comprobante"),
      avanzarRenovacion: texto(f, "avanzarRenovacion") as "on",
    });
    refrescar(tenantId);
    return "Pago registrado.";
  });
}

export async function anularPagoAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  return paraBoton(async () => {
    await anularPago(admin, tenantId, texto(f, "pagoId"));
    refrescar(tenantId);
    return "Pago anulado. Queda constancia en la auditoría.";
  });
}
