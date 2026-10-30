"use server";

import { revalidatePath } from "next/cache";
import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { fechaCorta } from "@/lib/fechas";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import {
  agregarSitio, cambiarActivoSitio, cancelarLicencia, crearLicenciaManual, editarSitio, extenderLicencia, guardarConsentimientoTexto,
  guardarLimites, guardarPrecioYape, quitarSitio, rechazarPago, verificarPago,
} from "@/lib/server/plataforma-nudito-plus";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import type { EstadoFormulario } from "../actions";

// Nudito+ en el panel (specs/28). Cada acción exige super administrador; la lógica y la auditoría viven en lib/server.

const RUTA = "/plataforma/nudito-plus";

async function conResultado(fn: () => Promise<string>): Promise<Resultado> {
  try {
    const mensaje = await fn();
    revalidatePath(RUTA, "layout");
    return ok(mensaje);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

async function conEstado(fn: () => Promise<string>): Promise<EstadoFormulario> {
  try {
    const mensaje = await fn();
    revalidatePath(RUTA, "layout");
    return { ok: mensaje };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

export async function verificarPagoAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return conResultado(async () => {
    const r = await verificarPago(admin, texto(f, "pagoId"));
    return `Pago verificado. Licencia ${r.extendida ? "extendida" : "activa"} hasta el ${fechaCorta(r.hasta)}.`;
  });
}

export async function rechazarPagoAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  return conEstado(async () => {
    await rechazarPago(admin, texto(f, "pagoId"), texto(f, "motivo"));
    return "Pago rechazado. Avisamos a la familia.";
  });
}

export async function cancelarLicenciaAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  return conEstado(async () => {
    await cancelarLicencia(admin, texto(f, "licenciaId"), texto(f, "motivo"));
    return "Licencia cancelada.";
  });
}

export async function extenderLicenciaAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  return conEstado(async () => {
    const hasta = await extenderLicencia(admin, texto(f, "licenciaId"), { meses: texto(f, "meses"), motivo: texto(f, "motivo") });
    return `Licencia activa hasta el ${fechaCorta(hasta)}.`;
  });
}

export async function crearLicenciaManualAction(f: FormData): Promise<never> {
  const admin = await requireAdminPlataforma();
  const tenantId = texto(f, "tenantId");
  return ejecutarYVolver(`/nudito-plus/licencias/nueva?colegio=${encodeURIComponent(tenantId)}`, async () => {
    await crearLicenciaManual(admin, {
      tenantId, alumnoId: texto(f, "alumnoId"), origen: texto(f, "origen") as "cortesia", hasta: texto(f, "hasta"), motivo: texto(f, "motivo"),
    });
    revalidatePath(RUTA, "layout");
    return "Licencia creada.";
  });
}

export async function guardarPrecioYapeAction(f: FormData): Promise<never> {
  const admin = await requireAdminPlataforma();
  return ejecutarYVolver("/nudito-plus/configuracion", async () => {
    await guardarPrecioYape(admin, { montoMensual: texto(f, "montoMensual"), numero: texto(f, "numero"), titular: texto(f, "titular") });
    return "Precio y datos de Yape guardados.";
  });
}

export async function guardarConsentimientoAction(f: FormData): Promise<never> {
  const admin = await requireAdminPlataforma();
  return ejecutarYVolver("/nudito-plus/configuracion", async () => {
    const r = await guardarConsentimientoTexto(admin, { version: texto(f, "version"), texto: texto(f, "texto") });
    return r.nuevaVersion ? "Texto publicado. Como cambió la versión, las familias deberán aceptarlo de nuevo." : "Texto guardado.";
  });
}

export async function guardarLimitesAction(f: FormData): Promise<never> {
  const admin = await requireAdminPlataforma();
  return ejecutarYVolver("/nudito-plus/configuracion", async () => {
    await guardarLimites(admin, { mensajesPorMes: texto(f, "mensajesPorMes"), tokensPorMes: texto(f, "tokensPorMes"), costoMaxUsdPorMes: texto(f, "costoMaxUsdPorMes") });
    return "Límites guardados.";
  });
}

export async function agregarSitioAction(f: FormData): Promise<never> {
  const admin = await requireAdminPlataforma();
  return ejecutarYVolver("/nudito-plus/configuracion", async () => {
    const dominio = await agregarSitio(admin, { dominio: texto(f, "dominio"), nombre: texto(f, "nombre"), descripcion: texto(f, "descripcion") });
    return `Agregamos «${dominio}» a los sitios permitidos.`;
  });
}

export async function editarSitioAction(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const admin = await requireAdminPlataforma();
  return conEstado(async () => {
    await editarSitio(admin, texto(f, "id"), { dominio: texto(f, "dominio"), nombre: texto(f, "nombre"), descripcion: texto(f, "descripcion") });
    return "Sitio guardado.";
  });
}

export async function cambiarActivoSitioAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return conResultado(async () => {
    const activo = texto(f, "activo") === "true";
    await cambiarActivoSitio(admin, texto(f, "id"), activo);
    return activo ? "Sitio activado." : "Sitio pausado: Nudito+ ya no lo recomienda.";
  });
}

export async function quitarSitioAction(f: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return conResultado(async () => {
    await quitarSitio(admin, texto(f, "id"));
    return "Sitio quitado de la lista.";
  });
}
