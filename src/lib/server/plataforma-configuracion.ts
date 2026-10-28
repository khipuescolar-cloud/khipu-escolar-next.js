/* eslint-disable @typescript-eslint/no-unused-vars -- `_admin` solo exige haber pasado por requireAdminPlataforma() */
import "server-only";
import { CLAVE_HORARIO_SOPORTE, horarioSoporte } from "./soporte";
import { CLAVE_CORREO_SOPORTE, correoEquipoSoporte } from "./notificaciones/avisos-soporte";
import { z } from "zod";
import { feriadosNacionalesConNombre } from "@/lib/dias-habiles";
import { fechaDb, isoDeFechaDb } from "@/lib/fechas";
import { horarioDesdeConfig } from "@/lib/nudito/estado";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { leerLimites, limiteCanalDePago } from "./notificaciones/limites";
import type { AdminContext } from "./plataforma";
import { registrarPlataforma } from "./plataforma-registro";

// Configuración global de la plataforma (specs/22): feriados extra, horario de Nudito y datos de solo lectura.

// ───────────── Feriados ─────────────

/** «Cusco», «cusco » y «CUSCO» son la misma región; sin tildes. */
export function normalizarRegion(v: string | null | undefined): string {
  return (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export type FilaFeriado = {
  id: string | null;
  fecha: string;
  nombre: string;
  ambito: "nacional" | "regional" | "colegio";
  /** Fijos del calendario nacional: solo lectura. */
  fijo: boolean;
  region: string | null;
  tenantId: string | null;
  colegio: string | null;
};

export async function feriadosDelAnio(_admin: AdminContext, anio: number): Promise<FilaFeriado[]> {
  const extras = await db.feriadoExtra.findMany({
    where: { fecha: { gte: fechaDb(`${anio}-01-01`), lte: fechaDb(`${anio}-12-31`) } },
    include: { tenant: { select: { nombre: true } } },
  });
  const filas: FilaFeriado[] = [
    ...feriadosNacionalesConNombre(anio).map((f) => ({ id: null, ...f, ambito: "nacional" as const, fijo: true, region: null, tenantId: null, colegio: null })),
    ...extras.map((e) => ({
      id: e.id,
      fecha: isoDeFechaDb(e.fecha),
      nombre: e.nombre,
      ambito: (e.tenantId ? "colegio" : e.region ? "regional" : "nacional") as FilaFeriado["ambito"],
      fijo: false,
      region: e.region,
      tenantId: e.tenantId,
      colegio: e.tenant?.nombre ?? null,
    })),
  ];
  return filas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre));
}

export async function colegiosParaSelector(_admin: AdminContext) {
  return db.tenant.findMany({ select: { id: true, nombre: true, ciudad: true }, orderBy: { nombre: "asc" } });
}

const esquemaFeriado = z
  .object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
    nombre: z.string().trim().min(3, "Escribe el nombre (mínimo 3 letras).").max(120),
    alcance: z.enum(["nacional", "regional", "colegio"]),
    region: z.string().trim().max(60).optional(),
    tenantId: z.string().optional(),
  })
  .refine((d) => d.alcance !== "regional" || !!d.region, { message: "Indica la región.", path: ["region"] })
  .refine((d) => d.alcance !== "colegio" || z.uuid().safeParse(d.tenantId).success, { message: "Elige el colegio.", path: ["tenantId"] });

export type EntradaFeriado = z.input<typeof esquemaFeriado>;

export async function agregarFeriado(admin: AdminContext, entrada: EntradaFeriado): Promise<void> {
  const r = esquemaFeriado.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  const d = r.data;
  if (Number.isNaN(fechaDb(d.fecha).getTime())) throw new ErrorDeNegocio("Esa fecha no es válida.");
  if (d.alcance === "colegio" && !(await db.tenant.findUnique({ where: { id: d.tenantId! }, select: { id: true } }))) {
    throw new ErrorDeNegocio("Ese colegio no existe.");
  }
  const f = await db.feriadoExtra.create({
    data: {
      fecha: fechaDb(d.fecha),
      nombre: d.nombre,
      region: d.alcance === "regional" ? d.region! : null,
      tenantId: d.alcance === "colegio" ? d.tenantId! : null,
    },
  });
  limpiarCacheFeriados();
  await registrarPlataforma(admin.user.id, "feriado_agregar", f.tenantId, { feriadoId: f.id, fecha: d.fecha, nombre: d.nombre, alcance: d.alcance });
}

export async function quitarFeriado(admin: AdminContext, id: string): Promise<void> {
  const f = await db.feriadoExtra.findUnique({ where: { id } });
  if (!f) throw new ErrorDeNegocio("Ese día ya no está en la lista.");
  await db.feriadoExtra.delete({ where: { id } });
  limpiarCacheFeriados();
  await registrarPlataforma(admin.user.id, "feriado_quitar", f.tenantId, { feriadoId: id, fecha: isoDeFechaDb(f.fecha), nombre: f.nombre });
}

// Caché corta por colegio: se consulta en cada falta/aviso/justificación.
const TTL_MS = 30_000;
const cacheFeriados = new Map<string, { hasta: number; fechas: string[] }>();

export function limpiarCacheFeriados(): void {
  cacheFeriados.clear();
}

/**
 * Feriados extra que corren los plazos de un colegio, entre `desde` y `hasta` (AAAA-MM-DD, inclusive):
 * los de todo el país, los de su región (`Tenant.ciudad` igual a `region`, sin tildes ni mayúsculas) y los propios del colegio.
 */
export async function feriadosAplicables(tenantId: string, desde: string, hasta: string): Promise<string[]> {
  let c = cacheFeriados.get(tenantId);
  if (!c || c.hasta < Date.now()) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { ciudad: true } });
    const ciudad = normalizarRegion(tenant?.ciudad);
    const filas = await db.feriadoExtra.findMany({ where: { OR: [{ tenantId: null }, { tenantId }] } });
    const fechas = filas
      .filter((f) => f.tenantId === tenantId || !f.region || (ciudad !== "" && normalizarRegion(f.region) === ciudad))
      .map((f) => isoDeFechaDb(f.fecha));
    c = { hasta: Date.now() + TTL_MS, fechas: [...new Set(fechas)].sort() };
    cacheFeriados.set(tenantId, c);
  }
  return c.fechas.filter((f) => f >= desde && f <= hasta);
}

// ───────────── Horario de Nudito ─────────────

export const CLAVE_HORARIO_NUDITO = "nudito:horario";

/** Horario (horas enteras) para el widget de Nudito. */
export async function horarioNudito(): Promise<{ inicio: number; fin: number }> {
  const fila = await db.configPlataforma.findUnique({ where: { clave: CLAVE_HORARIO_NUDITO } });
  return horarioDesdeConfig(fila?.valor);
}

export async function horarioNuditoTexto(): Promise<{ inicio: string; fin: string }> {
  const h = await horarioNudito();
  const t = (n: number) => `${String(n).padStart(2, "0")}:00`;
  return { inicio: t(h.inicio), fin: t(h.fin) };
}

const esquemaHorario = z
  .object({
    inicio: z.string().regex(/^([01]\d|2[0-3]):00$/, "Elige la hora de inicio."),
    fin: z.string().regex(/^([01]\d|2[0-3]):00$/, "Elige la hora de fin."),
  })
  .refine((h) => h.inicio < h.fin, { message: "La hora de fin debe ser posterior a la de inicio.", path: ["fin"] });

export async function guardarHorarioNudito(admin: AdminContext, entrada: { inicio: string; fin: string }): Promise<void> {
  const r = esquemaHorario.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa el horario.");
  await db.configPlataforma.upsert({ where: { clave: CLAVE_HORARIO_NUDITO }, update: { valor: r.data }, create: { clave: CLAVE_HORARIO_NUDITO, valor: r.data } });
  await registrarPlataforma(admin.user.id, "config_horario_nudito", null, r.data);
}

// ───────────── Mesa de ayuda: buzón del equipo y horario de atención (specs/23) ─────────────

const esquemaSoporte = z.object({
  correo: z.union([z.literal(""), z.email("Escribe un correo válido para el buzón de soporte.")]),
  horario: z.string().trim().min(5, "Escribe el horario de atención.").max(120, "El horario es demasiado largo."),
});

/** Guarda el buzón del equipo (vacío = usar el remitente del sistema) y el horario que ven los colegios. */
export async function guardarConfigSoporte(admin: AdminContext, entrada: { correo: string; horario: string }): Promise<void> {
  const r = esquemaSoporte.safeParse({ correo: entrada.correo.trim().toLowerCase(), horario: entrada.horario });
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos de soporte.");
  await db.$transaction([
    r.data.correo
      ? db.configPlataforma.upsert({ where: { clave: CLAVE_CORREO_SOPORTE }, update: { valor: { correo: r.data.correo } }, create: { clave: CLAVE_CORREO_SOPORTE, valor: { correo: r.data.correo } } })
      : db.configPlataforma.deleteMany({ where: { clave: CLAVE_CORREO_SOPORTE } }),
    db.configPlataforma.upsert({ where: { clave: CLAVE_HORARIO_SOPORTE }, update: { valor: { texto: r.data.horario } }, create: { clave: CLAVE_HORARIO_SOPORTE, valor: { texto: r.data.horario } } }),
  ]);
  await registrarPlataforma(admin.user.id, "config_soporte", null, { correo: r.data.correo || "(remitente del sistema)", horario: r.data.horario });
}

/** Valores actuales para el formulario: el buzón guardado (vacío si se usa el remitente) y el horario. */
export async function configSoporte(): Promise<{ correoGuardado: string; correoEfectivo: string | null; horario: string }> {
  const fila = await db.configPlataforma.findUnique({ where: { clave: CLAVE_CORREO_SOPORTE } });
  const v = fila?.valor as { correo?: unknown } | string | null | undefined;
  const correoGuardado = typeof v === "string" ? v : typeof v?.correo === "string" ? v.correo : "";
  return { correoGuardado, correoEfectivo: await correoEquipoSoporte(), horario: await horarioSoporte() };
}

// ───────────── Datos de la plataforma (solo lectura, sin secretos) ─────────────

export function datosPlataforma(entorno: Record<string, string | undefined> = process.env) {
  const smsActivo = !!entorno.SMS_PROVEEDOR && !!entorno.TWILIO_ACCOUNT_SID;
  return {
    dominioBase: entorno.APP_BASE_DOMAIN ?? "lvh.me:3000",
    almacenamiento: entorno.STORAGE_PROVIDER || "local",
    topeCorreo: leerLimites(entorno).limiteDiario,
    topeWhatsapp: limiteCanalDePago("whatsapp", entorno),
    topeSms: limiteCanalDePago("sms", entorno),
    whatsappActivo: !!entorno.WHATSAPP_TOKEN && !!entorno.WHATSAPP_PHONE_NUMBER_ID,
    smsActivo,
  };
}
