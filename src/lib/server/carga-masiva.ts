import "server-only";
import { randomUUID } from "node:crypto";
import type { Nivel, TipoIdentificacion } from "@/generated/prisma/enums";
import { esNivelCneb, gradoValido } from "@/lib/cneb/catalogo";
import { claveCurso, leerArchivoSalones, type Referencia, type SalonArchivo } from "@/lib/carga-masiva/salones";
import { leerArchivoFamilias, type FilaFamilia } from "@/lib/carga-masiva/familias";
import { enLotes, ordenarPorLinea, type ErrorFila, type Tabla } from "@/lib/carga-masiva/tabla";
import type { TipoCarga } from "@/lib/carga-masiva/plantillas";
import { normalizar } from "@/lib/importar-alumnos";
import { auditar, auditarVarios } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { payloadBienvenida } from "./cuentas";
import { db } from "./db";
import { restaurarPlantillaOficial } from "./curriculo";
import { renderizarPlantilla } from "./email/plantillas";
import { exigirAlumnosFamilias, exigirGestion } from "./gestion";
import { areaDeCurso } from "./nudito/areas-cursos";
import { sincronizarCursosDeSalones } from "./plan-estudios";
import { whereSalonActivo } from "./salones-activos";
import { supabaseAdmin } from "./supabase";
import type { TenantContext } from "./tenant";

// Carga masiva de un colegio (specs/36-carga-masiva.md): salones y cursos (dirección) y familias (dirección y administrativo).
// Cada carga tiene dos pasos con el mismo plan: `previsualizar…` (no escribe nada) e `importar…` (aplica las filas válidas).
// Volver a subir el mismo archivo no duplica: actualiza tutor, profesor o parentesco y no reenvía bienvenidas.
// Sin N+1: las búsquedas van en consultas `in` por lotes de 1 000 y las altas en `createMany`.

export type ConteoCarga = { clave: string; etiqueta: string; valor: number };
export type FilaVistaCarga = { linea: number; accion: "crear" | "actualizar" | "sin_cambios"; texto: string; detalle: string };
export type VistaCarga = {
  tipo: TipoCarga;
  filasArchivo: number;
  conteos: ConteoCarga[];
  /** Primeras `MAX_FILAS_VISTA` filas del plan. */
  filas: FilaVistaCarga[];
  totalFilasPlan: number;
  errores: ErrorFila[];
  avisos: ErrorFila[];
  notas: string[];
  /** Cuántas filas se aplicarían al confirmar (las válidas). */
  aplicables: number;
};
export type ResultadoCarga = { ok: boolean; mensaje: string; conteos: ConteoCarga[]; errores: ErrorFila[]; avisos: ErrorFila[] };

export const MAX_FILAS_VISTA = 500;
const MAX_MENSAJES = 1000;

const anioActual = (ctx: TenantContext) => Number(new Intl.DateTimeFormat("en-CA", { timeZone: ctx.tenant.zonaHoraria ?? "America/Lima", year: "numeric" }).format(new Date()));
const norm = (s: string | null | undefined) => normalizar(s ?? "");
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function exigirEscritura(ctx: TenantContext): void {
  if (ctx.soporte) throw new ErrorDeNegocio("Modo soporte: solo lectura.");
}

function vista(tipo: TipoCarga, tabla: Tabla, datos: Omit<VistaCarga, "tipo" | "filasArchivo" | "filas" | "totalFilasPlan" | "errores" | "avisos"> & { filas: FilaVistaCarga[]; errores: ErrorFila[]; avisos: ErrorFila[] }): VistaCarga {
  return {
    tipo,
    filasArchivo: tabla.filas.length,
    ...datos,
    filas: datos.filas.slice(0, MAX_FILAS_VISTA),
    totalFilasPlan: datos.filas.length,
    errores: ordenarPorLinea(datos.errores).slice(0, MAX_MENSAJES),
    avisos: ordenarPorLinea(datos.avisos).slice(0, MAX_MENSAJES),
  };
}

// ───────────── Salones y cursos ─────────────

type ProfesorCarga = { id: string; estado: string; email: string; documento: string | null; nombre: string };

type PlanSalon = {
  archivo: SalonArchivo;
  existenteId: string | null;
  tutorNuevo: string | null; // membresía a asignar como tutor (null = no se toca)
  cursosNuevos: { nombre: string; profesorId: string | null }[];
  cursosProfesor: { id: string; nombre: string; profesorId: string }[];
};

async function planSalones(ctx: TenantContext, tabla: Tabla) {
  const archivo = leerArchivoSalones(tabla, anioActual(ctx));
  const errores = [...archivo.errores];
  const avisos = [...archivo.avisos];
  const anios = [...new Set(archivo.salones.map((s) => s.anio))];

  const [existentes, profesores] = await Promise.all([
    ctx.db.salon.findMany({
      where: { ...whereSalonActivo, anio: { in: anios } },
      select: { id: true, nombre: true, nivel: true, grado: true, seccion: true, anio: true, tutorId: true, cursos: { select: { id: true, nombre: true, profesorId: true } } },
    }),
    ctx.db.membership.findMany({
      where: { rol: "profesor" },
      select: { id: true, estado: true, user: { select: { email: true, numeroDocumento: true, nombres: true, apellidos: true } } },
    }),
  ]);
  const listaProfesores: ProfesorCarga[] = profesores.map((p) => ({
    id: p.id, estado: p.estado, email: p.user.email.toLowerCase(), documento: p.user.numeroDocumento?.toUpperCase() ?? null, nombre: `${p.user.nombres} ${p.user.apellidos}`.trim(),
  }));
  const noEncontrados = new Set<string>();

  /** Membresía del profesor o null (con aviso) si no está, está inactivo o el DNI es ambiguo. */
  const resolver = (ref: Referencia, linea: number, para: string): ProfesorCarga | null => {
    const candidatos = listaProfesores.filter((p) => (ref.tipo === "correo" ? p.email === ref.valor : p.documento === ref.valor));
    const quien = ref.tipo === "correo" ? ref.valor : `con documento ${ref.valor}`;
    if (candidatos.length === 0) {
      noEncontrados.add(ref.valor);
      avisos.push({ linea, mensaje: `No encontramos al profesor ${quien} entre los profesores del colegio: ${para} queda sin asignar.` });
      return null;
    }
    if (candidatos.length > 1) {
      avisos.push({ linea, mensaje: `Hay ${candidatos.length} profesores con documento ${ref.valor}: usa el correo. ${para} queda sin asignar.` });
      return null;
    }
    if (candidatos[0].estado === "inactiva") {
      avisos.push({ linea, mensaje: `${candidatos[0].nombre} está desactivado(a): ${para} queda sin asignar.` });
      return null;
    }
    return candidatos[0];
  };

  const planes: PlanSalon[] = [];
  const filas: FilaVistaCarga[] = [];
  const nombresUsados = new Map(existentes.map((e) => [`${e.anio}|${norm(e.nombre)}`, e.id]));
  for (const s of archivo.salones) {
    const linea = s.lineas[0];
    let coincidencias = existentes.filter((e) => e.anio === s.anio && e.nivel === s.nivel && e.grado !== null && e.grado === s.grado && norm(e.seccion) === norm(s.seccion));
    if (coincidencias.length === 0) coincidencias = existentes.filter((e) => e.anio === s.anio && norm(e.nombre) === norm(s.nombre));
    if (coincidencias.length > 1) {
      errores.push({ linea, mensaje: `Hay ${coincidencias.length} salones activos que coinciden con ${s.nombre} (${s.anio}). Archiva el que sobra o usa la columna «nombre».` });
      continue;
    }
    const existente = coincidencias[0] ?? null;
    if (existente && existente.nivel !== s.nivel) {
      errores.push({ linea, mensaje: `Ya existe el salón «${existente.nombre}» en ${existente.nivel}. Usa otro nombre en la columna «nombre».` });
      continue;
    }
    if (!existente && nombresUsados.has(`${s.anio}|${norm(s.nombre)}`)) {
      errores.push({ linea, mensaje: `Ya existe otro salón llamado «${s.nombre}» en ${s.anio}. Usa la columna «nombre».` });
      continue;
    }
    if (existente && s.nombreExplicito && norm(existente.nombre) !== norm(s.nombre)) {
      avisos.push({ linea, mensaje: `Ya existe como «${existente.nombre}»: se usa ese salón (su nombre no cambia).` });
    }

    const plan: PlanSalon = { archivo: s, existenteId: existente?.id ?? null, tutorNuevo: null, cursosNuevos: [], cursosProfesor: [] };
    const detalle: string[] = [];
    if (s.tutorIlegible) avisos.push({ linea: s.tutorLinea ?? linea, mensaje: `«${s.tutorIlegible}» no es un DNI ni un correo: el tutor de ${s.nombre} queda sin asignar.` });
    if (s.tutor) {
      const t = resolver(s.tutor, s.tutorLinea ?? linea, `la tutoría de ${s.nombre}`);
      if (t && t.id !== existente?.tutorId) {
        plan.tutorNuevo = t.id;
        detalle.push(`tutor(a): ${t.nombre}`);
      }
    }
    const cursosExistentes = new Map((existente?.cursos ?? []).map((c) => [claveCurso(c.nombre), c]));
    for (const c of s.cursos) {
      if (c.profesorIlegible) avisos.push({ linea: c.linea, mensaje: `«${c.profesorIlegible}» no es un DNI ni un correo: ${c.nombre} de ${s.nombre} queda sin profesor.` });
      const p = c.profesor ? resolver(c.profesor, c.linea, `${c.nombre} de ${s.nombre}`) : null;
      const previo = cursosExistentes.get(claveCurso(c.nombre));
      if (!previo) plan.cursosNuevos.push({ nombre: c.nombre, profesorId: p?.id ?? null });
      else if (p && p.id !== previo.profesorId) plan.cursosProfesor.push({ id: previo.id, nombre: previo.nombre, profesorId: p.id });
    }
    if (plan.cursosNuevos.length) detalle.push(plural(plan.cursosNuevos.length, "curso nuevo", "cursos nuevos"));
    if (plan.cursosProfesor.length) detalle.push(plural(plan.cursosProfesor.length, "profesor de curso cambia", "profesores de curso cambian"));
    const accion = !existente ? "crear" : detalle.length ? "actualizar" : "sin_cambios";
    if (!existente) nombresUsados.set(`${s.anio}|${norm(s.nombre)}`, "nuevo");
    planes.push(plan);
    filas.push({
      linea, accion,
      texto: `${s.nombre} · ${s.nivel} · ${s.anio}`,
      detalle: accion === "sin_cambios" ? "Ya está igual en Khipu." : detalle.join(" · ") || "Salón nuevo sin cursos.",
    });
  }

  const conteos: ConteoCarga[] = [
    { clave: "salonesNuevos", etiqueta: "Salones nuevos", valor: planes.filter((p) => !p.existenteId).length },
    { clave: "tutores", etiqueta: "Tutores asignados o cambiados", valor: planes.filter((p) => p.tutorNuevo).length },
    { clave: "cursosNuevos", etiqueta: "Cursos nuevos", valor: planes.reduce((n, p) => n + p.cursosNuevos.length, 0) },
    { clave: "cursosProfesor", etiqueta: "Cursos con profesor asignado o cambiado", valor: planes.reduce((n, p) => n + p.cursosProfesor.length, 0) },
    { clave: "sinCambios", etiqueta: "Salones sin cambios", valor: filas.filter((f) => f.accion === "sin_cambios").length },
    { clave: "profesoresNoEncontrados", etiqueta: "Profesores no encontrados", valor: noEncontrados.size },
    { clave: "errores", etiqueta: "Filas con errores", valor: new Set(errores.map((e) => e.linea)).size },
  ];
  const notas = archivo.cursosEnColumnas.length ? [`Cursos leídos como columnas: ${archivo.cursosEnColumnas.join(", ")}.`] : [];
  return { planes, vista: vista("salones", tabla, { conteos, filas, errores, avisos, notas, aplicables: filas.filter((f) => f.accion !== "sin_cambios").length }) };
}

/** Vista previa de salones y cursos (no escribe). Solo dirección. */
export async function previsualizarSalones(ctx: TenantContext, tabla: Tabla): Promise<VistaCarga> {
  exigirGestion(ctx);
  return (await planSalones(ctx, tabla)).vista;
}

/** Crea los salones y cursos que faltan y asigna tutores y profesores encontrados. Nunca borra. Solo dirección. */
export async function importarSalones(ctx: TenantContext, tabla: Tabla): Promise<ResultadoCarga> {
  exigirGestion(ctx);
  exigirEscritura(ctx);
  const { planes, vista: v } = await planSalones(ctx, tabla);
  const tenantId = ctx.tenant.id;
  const actorId = ctx.user.id;
  const auditoria: Parameters<typeof auditar>[0][] = [];

  const nuevos = planes.filter((p) => !p.existenteId).map((p) => ({ ...p, existenteId: randomUUID() }));
  for (const lote of enLotes(nuevos, 500)) {
    await ctx.db.salon.createMany({
      data: lote.map((p) => ({
        id: p.existenteId, tenantId, nombre: p.archivo.nombre, nivel: p.archivo.nivel as Nivel, grado: p.archivo.grado, seccion: p.archivo.seccion, anio: p.archivo.anio, tutorId: p.tutorNuevo,
      })),
    });
  }
  for (const p of nuevos) auditoria.push({ tenantId, actorId, accion: "crear", entidad: "salon", entidadId: p.existenteId, detalle: { origen: "carga_masiva" } });
  const idDe = new Map(nuevos.map((p) => [p.archivo.clave, p.existenteId]));

  // Tutores de salones existentes: un `updateMany` por tutor.
  const porTutor = new Map<string, string[]>();
  for (const p of planes) if (p.existenteId && p.tutorNuevo) porTutor.set(p.tutorNuevo, [...(porTutor.get(p.tutorNuevo) ?? []), p.existenteId]);
  for (const [tutorId, ids] of porTutor) {
    await ctx.db.salon.updateMany({ where: { id: { in: ids } }, data: { tutorId } });
    for (const id of ids) auditoria.push({ tenantId, actorId, accion: "editar", entidad: "salon", entidadId: id, detalle: { origen: "carga_masiva", campos: ["tutorId"] } });
  }

  const cursos = planes.flatMap((p) => p.cursosNuevos.map((c) => ({ id: randomUUID(), tenantId, salonId: p.existenteId ?? idDe.get(p.archivo.clave)!, nombre: c.nombre, profesorId: c.profesorId, areaCneb: areaDeCurso(c.nombre, p.archivo.nivel as Nivel) })));
  for (const lote of enLotes(cursos, 1000)) await ctx.db.curso.createMany({ data: lote });
  if (ctx.modulos.has("notas")) for (const c of cursos) {
    const plan = planes.find((p) => (p.existenteId ?? idDe.get(p.archivo.clave)) === c.salonId);
    const nivel = plan?.archivo.nivel as Nivel | undefined;
    if (c.areaCneb && nivel && esNivelCneb(nivel) && gradoValido(nivel, plan?.archivo.grado)) await restaurarPlantillaOficial(ctx, c.id);
  }
  for (const c of cursos) auditoria.push({ tenantId, actorId, accion: "crear", entidad: "curso", entidadId: c.id, detalle: { origen: "carga_masiva" } });
  // Los salones nuevos heredan la malla anual del grado; los cursos cargados por archivo se enlazan por nombre.
  for (const p of nuevos) if (p.archivo.grado !== null && p.archivo.grado > 0) {
    const resultado = await sincronizarCursosDeSalones(ctx, {
      anio: p.archivo.anio, nivel: p.archivo.nivel as Nivel, grado: p.archivo.grado, salonIds: [p.existenteId!],
    });
    if (resultado.creados) v.notas.push(`La malla agregó ${resultado.creados} curso(s) al salón «${p.archivo.nombre}».`);
  }

  const porProfesor = new Map<string, string[]>();
  for (const c of planes.flatMap((p) => p.cursosProfesor)) porProfesor.set(c.profesorId, [...(porProfesor.get(c.profesorId) ?? []), c.id]);
  for (const [profesorId, ids] of porProfesor) {
    await ctx.db.curso.updateMany({ where: { id: { in: ids } }, data: { profesorId } });
    for (const id of ids) auditoria.push({ tenantId, actorId, accion: "editar", entidad: "curso", entidadId: id, detalle: { origen: "carga_masiva", campos: ["profesorId"] } });
  }

  const conteos = v.conteos;
  auditoria.push({ tenantId, actorId, accion: "crear", entidad: "carga_masiva", detalle: { tipo: "salones", ...Object.fromEntries(conteos.map((c) => [c.clave, c.valor])) } });
  for (const lote of enLotes(auditoria, 2000)) await auditarVarios(lote);
  const valor = (k: string) => conteos.find((c) => c.clave === k)?.valor ?? 0;
  const mensaje = `Listo: ${plural(valor("salonesNuevos"), "salón nuevo", "salones nuevos")}, ${plural(valor("cursosNuevos"), "curso nuevo", "cursos nuevos")}, ${valor("tutores")} tutores y ${valor("cursosProfesor")} profesores de curso asignados.`;
  return { ok: true, mensaje, conteos, errores: v.errores, avisos: v.avisos };
}

// ───────────── Familias ─────────────

/** Crea el usuario de Auth con el documento como contraseña inicial y devuelve su id. Inyectable en pruebas. */
export type CrearUsuarioAuth = (d: { email: string; password: string; nombres: string; apellidos: string }) => Promise<string>;

export const crearUsuarioAuthSupabase: CrearUsuarioAuth = async (d) => {
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email: d.email, password: d.password, email_confirm: true, user_metadata: { nombres: d.nombres, apellidos: d.apellidos },
  });
  if (error || !data.user) {
    throw new ErrorDeNegocio(error?.message?.toLowerCase().includes("already") ? "Ese correo ya tiene un usuario de acceso sin perfil en Khipu: escríbenos a Soporte Khipu." : "No se pudo crear la cuenta.");
  }
  return data.user.id;
};

/** Cuentas de Auth a la vez (GoTrue hashea cada contraseña: más concurrencia no acelera y satura). */
const CONCURRENCIA_AUTH = 6;

async function enParalelo<T>(lista: T[], limite: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  const trabajador = async () => {
    while (i < lista.length) await fn(lista[i++]);
  };
  await Promise.all(Array.from({ length: Math.min(limite, lista.length) }, trabajador));
}

type PerfilCarga = { id: string; email: string; telefono: string | null; tipoDocumento: TipoIdentificacion | null; numeroDocumento: string | null; genero: "femenino" | "masculino" | "no_especifica" | null; nombres: string };
type FilaPlanFamilia = FilaFamilia & { alumnoId: string; alumnoNombre: string; vinculoId: string | null; parentescoActual: string | null };
type GrupoFamilia = {
  correo: string;
  primera: FilaFamilia;
  filas: FilaPlanFamilia[];
  perfil: PerfilCarga | null;
  membresia: { id: string; estado: string } | null;
};

async function porLotes<T, R>(valores: T[], consulta: (lote: T[]) => Promise<R[]>): Promise<R[]> {
  const salida: R[] = [];
  for (const lote of enLotes(valores, 1000)) if (lote.length) salida.push(...(await consulta(lote)));
  return salida;
}

async function planFamilias(ctx: TenantContext, tabla: Tabla) {
  const archivo = leerArchivoFamilias(tabla);
  const errores = [...archivo.errores];
  const avisos = [...archivo.avisos];
  const filasArchivo = archivo.filas;

  const codigos = [...new Set(filasArchivo.map((f) => f.alumnoCodigo).filter((x): x is string => !!x))];
  const docsAlumno = [...new Set(filasArchivo.map((f) => f.alumnoDocumento).filter((x): x is string => !!x))];
  const correos = [...new Set(filasArchivo.map((f) => f.correo))];
  const docsApoderado = [...new Set(filasArchivo.map((f) => f.documento))];
  const selAlumno = { id: true, nombres: true, apellidos: true, codigo: true, numeroDocumento: true, estado: true } as const;

  const [porCodigo, porDocumento, perfiles, conDocumento] = await Promise.all([
    porLotes(codigos, (lote) => ctx.db.alumno.findMany({ where: { codigo: { in: lote } }, select: selAlumno })),
    porLotes(docsAlumno, (lote) => ctx.db.alumno.findMany({ where: { numeroDocumento: { in: lote } }, select: selAlumno })),
    porLotes(correos, (lote) =>
      db.profile.findMany({ where: { email: { in: lote } }, select: { id: true, email: true, telefono: true, tipoDocumento: true, numeroDocumento: true, genero: true, nombres: true } }),
    ),
    // Familias del colegio con ese documento (para no crear una segunda cuenta a la misma persona con otro correo).
    porLotes(docsApoderado, (lote) =>
      ctx.db.membership.findMany({ where: { rol: "apoderado", user: { numeroDocumento: { in: lote } } }, select: { user: { select: { email: true, numeroDocumento: true } } } }),
    ),
  ]);
  const membresias = await porLotes(perfiles.map((p) => p.id), (lote) =>
    ctx.db.membership.findMany({ where: { userId: { in: lote } }, select: { id: true, userId: true, rol: true, estado: true } }),
  );
  const apoderadoIds = membresias.filter((m) => m.rol === "apoderado").map((m) => m.id);
  const vinculos = await porLotes(apoderadoIds, (lote) =>
    ctx.db.apoderadoAlumno.findMany({ where: { apoderadoId: { in: lote } }, select: { id: true, apoderadoId: true, alumnoId: true, parentesco: true } }),
  );

  const agrupar = <T, K>(lista: T[], clave: (x: T) => K) => {
    const m = new Map<K, T[]>();
    for (const x of lista) m.set(clave(x), [...(m.get(clave(x)) ?? []), x]);
    return m;
  };
  const alumnosPorCodigo = agrupar(porCodigo, (a) => a.codigo);
  const alumnosPorDoc = agrupar(porDocumento, (a) => a.numeroDocumento);
  const perfilPorCorreo = new Map(perfiles.map((p) => [p.email.toLowerCase(), p]));
  const membresiasPorUsuario = agrupar(membresias, (m) => m.userId);
  const correosPorDoc = agrupar(conDocumento, (m) => m.user.numeroDocumento);
  const vinculoPorPar = new Map(vinculos.map((v) => [`${v.apoderadoId}|${v.alumnoId}`, v]));

  const grupos = new Map<string, GrupoFamilia>();
  const pares = new Map<string, number>();
  const filasVista: FilaVistaCarga[] = [];
  for (const f of filasArchivo) {
    const err = (mensaje: string) => errores.push({ linea: f.linea, mensaje });
    const delCodigo = f.alumnoCodigo ? (alumnosPorCodigo.get(f.alumnoCodigo) ?? []) : null;
    const delDoc = f.alumnoDocumento ? (alumnosPorDoc.get(f.alumnoDocumento) ?? []) : null;
    if (delCodigo && delCodigo.length === 0) { err(`No encontramos al alumno con código ${f.alumnoCodigo}.`); continue; }
    if (delDoc && delDoc.length === 0) { err(`No encontramos al alumno con DNI ${f.alumnoDocumento}.`); continue; }
    if ((delCodigo?.length ?? 0) > 1 || (delDoc?.length ?? 0) > 1) { err("Hay más de un alumno con ese código o DNI: corrígelo en Gestión → Alumnos."); continue; }
    const alumno = (delCodigo ?? delDoc)![0];
    if (delCodigo && delDoc && delCodigo[0].id !== delDoc[0].id) { err("El código y el DNI del alumno son de alumnos distintos."); continue; }
    if (alumno.estado !== "activo") { err(`${alumno.nombres} ${alumno.apellidos} está retirado(a): reactívalo(a) antes de vincular a su familia.`); continue; }

    const perfil = perfilPorCorreo.get(f.correo) ?? null;
    const enColegio = perfil ? (membresiasPorUsuario.get(perfil.id) ?? []) : [];
    if (enColegio.some((m) => m.rol === "alumno")) { err(`${f.correo} es la cuenta de un alumno del colegio: usa el correo personal de la familia.`); continue; }
    const otroCorreo = (correosPorDoc.get(f.documento) ?? []).find((m) => m.user.email.toLowerCase() !== f.correo);
    if (otroCorreo) { err("Ese documento ya es de otra familia del colegio con otro correo. Usa el mismo correo o corrige el documento."); continue; }
    const par = `${f.correo}|${alumno.id}`;
    if (pares.has(par)) { err(`Esta familia y este alumno se repiten (también en la línea ${pares.get(par)}).`); continue; }
    pares.set(par, f.linea);

    let grupo = grupos.get(f.correo);
    if (!grupo) {
      const m = enColegio.find((x) => x.rol === "apoderado") ?? null;
      grupo = { correo: f.correo, primera: f, filas: [], perfil, membresia: m ? { id: m.id, estado: m.estado } : null };
      grupos.set(f.correo, grupo);
      if (m?.estado === "inactiva") avisos.push({ linea: f.linea, mensaje: `${f.correo} está desactivado(a) en el colegio: se agregan sus vínculos, pero no podrá entrar hasta que lo reactives.` });
      if (perfil && perfil.numeroDocumento && perfil.numeroDocumento.toUpperCase() !== f.documento) {
        avisos.push({ linea: f.linea, mensaje: `${f.correo} ya tenía cuenta en Khipu con otro documento: se conserva el registrado y su contraseña.` });
      }
    }
    const vinculo = grupo.membresia ? (vinculoPorPar.get(`${grupo.membresia.id}|${alumno.id}`) ?? null) : null;
    grupo.filas.push({ ...f, alumnoId: alumno.id, alumnoNombre: `${alumno.nombres} ${alumno.apellidos}`, vinculoId: vinculo?.id ?? null, parentescoActual: vinculo?.parentesco ?? null });
    const accion = !vinculo ? "crear" : norm(vinculo.parentesco) !== norm(f.parentesco) ? "actualizar" : "sin_cambios";
    const quien = !grupo.membresia ? (perfil ? "ya tiene cuenta en Khipu; se agrega al colegio" : "cuenta nueva") : "ya está en el colegio";
    filasVista.push({
      linea: f.linea, accion,
      texto: `${f.nombres} ${f.apellidos} (${f.parentesco}) → ${alumno.nombres} ${alumno.apellidos}`,
      detalle: accion === "crear" ? `Vínculo nuevo · ${quien}` : accion === "actualizar" ? `Parentesco: ${vinculo!.parentesco} → ${f.parentesco}` : "Ya está igual en Khipu.",
    });
  }

  const lista = [...grupos.values()];
  const filasPlan = lista.flatMap((g) => g.filas);
  const conteos: ConteoCarga[] = [
    { clave: "familiasNuevas", etiqueta: "Familias nuevas (cuenta nueva)", valor: lista.filter((g) => !g.perfil).length },
    { clave: "familiasConCuenta", etiqueta: "Familias con cuenta en Khipu que se agregan al colegio", valor: lista.filter((g) => g.perfil && !g.membresia).length },
    { clave: "familiasExistentes", etiqueta: "Familias que ya estaban en el colegio", valor: lista.filter((g) => g.membresia).length },
    { clave: "hermanos", etiqueta: "Familias con más de un hijo en el archivo", valor: lista.filter((g) => g.filas.length > 1).length },
    { clave: "vinculosNuevos", etiqueta: "Vínculos nuevos", valor: filasPlan.filter((f) => !f.vinculoId).length },
    { clave: "parentescos", etiqueta: "Parentescos actualizados", valor: filasPlan.filter((f) => f.vinculoId && norm(f.parentescoActual) !== norm(f.parentesco)).length },
    { clave: "sinCambios", etiqueta: "Filas sin cambios", valor: filasVista.filter((f) => f.accion === "sin_cambios").length },
    { clave: "errores", etiqueta: "Filas con errores", valor: new Set(errores.map((e) => e.linea)).size },
  ];
  const notas = ["Las familias nuevas reciben un correo de bienvenida (usuario = correo, contraseña inicial = su documento). Deberán aceptar el consentimiento al entrar: hasta entonces no reciben avisos."];
  return { grupos: lista, vista: vista("familias", tabla, { conteos, filas: filasVista, errores, avisos, notas, aplicables: filasVista.filter((f) => f.accion !== "sin_cambios").length }) };
}

/** Vista previa de familias (no escribe). Dirección y administrativo. */
export async function previsualizarFamilias(ctx: TenantContext, tabla: Tabla): Promise<VistaCarga> {
  exigirAlumnosFamilias(ctx);
  return (await planFamilias(ctx, tabla)).vista;
}

/**
 * Crea o reutiliza la cuenta de cada apoderado (contraseña inicial = documento, debe cambiarla), su membresía «invitada»
 * en el colegio (pasa a «activa» al primer ingreso), los vínculos con sus hijos (heredan un consentimiento vigente si ya
 * lo dio; si no, queda pendiente) y encola la bienvenida solo a quien entra nuevo al colegio. Quien llama dispara `procesarCola()`.
 */
export async function importarFamilias(ctx: TenantContext, tabla: Tabla, opciones: { crearUsuario?: CrearUsuarioAuth } = {}): Promise<ResultadoCarga> {
  exigirAlumnosFamilias(ctx);
  exigirEscritura(ctx);
  const crearUsuario = opciones.crearUsuario ?? crearUsuarioAuthSupabase;
  const { grupos, vista: v } = await planFamilias(ctx, tabla);
  const tenantId = ctx.tenant.id;
  const actorId = ctx.user.id;
  const errores = [...v.errores];
  const auditoria: Parameters<typeof auditar>[0][] = [];

  // 1. Cuentas nuevas (Auth + perfil). Si una falla, sus filas pasan a errores y el resto sigue.
  const fallidos = new Set<GrupoFamilia>();
  const cuentasNuevas = new Set<GrupoFamilia>();
  await enParalelo(grupos.filter((g) => !g.perfil), CONCURRENCIA_AUTH, async (g) => {
    const f = g.primera;
    try {
      const id = await crearUsuario({ email: g.correo, password: f.documento, nombres: f.nombres, apellidos: f.apellidos });
      await db.profile.create({
        data: { id, email: g.correo, nombres: f.nombres, apellidos: f.apellidos, telefono: f.celular, tipoDocumento: f.tipoDocumento, numeroDocumento: f.documento, debeCambiarPassword: true },
      });
      g.perfil = { id, email: g.correo, telefono: f.celular, tipoDocumento: f.tipoDocumento, numeroDocumento: f.documento, genero: null, nombres: f.nombres };
      cuentasNuevas.add(g);
    } catch (e) {
      fallidos.add(g);
      const mensaje = e instanceof ErrorDeNegocio ? e.message : "No se pudo crear la cuenta.";
      for (const fila of g.filas) errores.push({ linea: fila.linea, mensaje });
    }
  });
  const listos = grupos.filter((g) => !fallidos.has(g) && g.perfil);

  // 2. Perfiles que ya existían: solo se completan datos vacíos (el perfil es global; nombres y contraseña no se tocan).
  for (const g of listos) {
    if (cuentasNuevas.has(g) || !g.perfil) continue;
    const f = g.primera;
    const completar = {
      ...(g.perfil.telefono == null && f.celular ? { telefono: f.celular } : {}),
      ...(g.perfil.numeroDocumento == null ? { numeroDocumento: f.documento, tipoDocumento: f.tipoDocumento } : {}),
    };
    if (Object.keys(completar).length) await db.profile.update({ where: { id: g.perfil.id }, data: completar });
  }

  // 3. Membresías «invitada» para quien no está en el colegio.
  const sinMembresia = listos.filter((g) => !g.membresia);
  for (const lote of enLotes(sinMembresia, 1000)) {
    await ctx.db.membership.createMany({ data: lote.map((g) => ({ tenantId, userId: g.perfil!.id, rol: "apoderado" as const, estado: "invitada" as const })), skipDuplicates: true });
  }
  const creadas = await porLotes(sinMembresia.map((g) => g.perfil!.id), (lote) =>
    ctx.db.membership.findMany({ where: { rol: "apoderado", userId: { in: lote } }, select: { id: true, userId: true, estado: true } }),
  );
  const membresiaDe = new Map(creadas.map((m) => [m.userId, m]));
  const nuevasEnColegio: GrupoFamilia[] = [];
  for (const g of sinMembresia) {
    const m = membresiaDe.get(g.perfil!.id);
    if (!m) continue;
    g.membresia = { id: m.id, estado: m.estado };
    nuevasEnColegio.push(g);
    auditoria.push({ tenantId, actorId, accion: "crear", entidad: "membresia", entidadId: m.id, detalle: { rol: "apoderado", cuentaNueva: cuentasNuevas.has(g), origen: "carga_masiva" } });
  }

  // 4. Vínculos: los nuevos heredan el consentimiento vigente (si la familia ya lo dio), como `vincularApoderado`.
  const conMembresia = listos.filter((g) => g.membresia);
  const consentimientos = await porLotes(conMembresia.map((g) => g.membresia!.id), (lote) =>
    ctx.db.consentimiento.findMany({ where: { apoderadoId: { in: lote }, revocadoAt: null }, orderBy: { aceptadoAt: "asc" }, select: { id: true, apoderadoId: true } }),
  );
  const consentimientoDe = new Map(consentimientos.map((c) => [c.apoderadoId, c.id])); // el último (más reciente) gana
  const vinculosNuevos = conMembresia.flatMap((g) =>
    g.filas.filter((f) => !f.vinculoId).map((f) => ({
      id: randomUUID(), tenantId, apoderadoId: g.membresia!.id, alumnoId: f.alumnoId, parentesco: f.parentesco, consentimientoId: consentimientoDe.get(g.membresia!.id) ?? null,
    })),
  );
  for (const lote of enLotes(vinculosNuevos, 1000)) await ctx.db.apoderadoAlumno.createMany({ data: lote, skipDuplicates: true });
  for (const vn of vinculosNuevos) auditoria.push({ tenantId, actorId, accion: "crear", entidad: "apoderado_alumno", entidadId: vn.id, detalle: { origen: "carga_masiva" } });

  const porParentesco = new Map<string, string[]>();
  for (const f of conMembresia.flatMap((g) => g.filas)) {
    if (f.vinculoId && norm(f.parentescoActual) !== norm(f.parentesco)) porParentesco.set(f.parentesco, [...(porParentesco.get(f.parentesco) ?? []), f.vinculoId]);
  }
  for (const [parentesco, ids] of porParentesco) {
    for (const lote of enLotes(ids, 1000)) await ctx.db.apoderadoAlumno.updateMany({ where: { id: { in: lote } }, data: { parentesco } });
    for (const id of ids) auditoria.push({ tenantId, actorId, accion: "editar", entidad: "apoderado_alumno", entidadId: id, detalle: { origen: "carga_masiva", campos: ["parentesco"] } });
  }

  // 5. Bienvenida (por la cola de avisos, con su ritmo y tope diario) solo a quien entra nuevo al colegio. Sin el número de documento.
  const tenant = { id: tenantId, slug: ctx.tenant.slug, nombre: ctx.tenant.nombre };
  const avisos = nuevasEnColegio.map((g) => {
    const payload = payloadBienvenida({
      tenant, email: g.correo, nombre: g.perfil!.nombres, rol: "apoderado", genero: g.perfil!.genero,
      tipoDocumento: (cuentasNuevas.has(g) ? g.primera.tipoDocumento : (g.perfil!.tipoDocumento ?? g.primera.tipoDocumento)) as TipoIdentificacion,
      cuentaNueva: cuentasNuevas.has(g),
    });
    return {
      tenantId, tipo: "invitacion" as const, canal: "correo" as const, destinatario: g.correo, plantilla: "bienvenida",
      asunto: renderizarPlantilla("bienvenida", payload).asunto, payload, apoderadoId: g.membresia!.id,
    };
  });
  for (const lote of enLotes(avisos, 500)) await ctx.db.aviso.createMany({ data: lote });

  const valor = (k: string) => v.conteos.find((c) => c.clave === k)?.valor ?? 0;
  const conteos: ConteoCarga[] = v.conteos.map((c) =>
    c.clave === "familiasNuevas" ? { ...c, valor: cuentasNuevas.size }
      : c.clave === "vinculosNuevos" ? { ...c, valor: vinculosNuevos.length }
      : c.clave === "errores" ? { ...c, valor: new Set(errores.map((e) => e.linea)).size }
      : c,
  );
  conteos.push({ clave: "bienvenidas", etiqueta: "Bienvenidas encoladas", valor: avisos.length });
  auditoria.push({ tenantId, actorId, accion: "crear", entidad: "carga_masiva", detalle: { tipo: "familias", ...Object.fromEntries(conteos.map((c) => [c.clave, c.valor])) } });
  for (const lote of enLotes(auditoria, 2000)) await auditarVarios(lote);

  const mensaje = `Listo: ${plural(nuevasEnColegio.length, "familia agregada", "familias agregadas")} al colegio (${cuentasNuevas.size} con cuenta nueva), ${plural(vinculosNuevos.length, "vínculo nuevo", "vínculos nuevos")} y ${valor("parentescos")} parentescos actualizados. ${plural(avisos.length, "bienvenida sale", "bienvenidas salen")} por la cola de correos.`;
  return { ok: fallidos.size === 0, mensaje, conteos, errores: ordenarPorLinea(errores).slice(0, MAX_MENSAJES), avisos: v.avisos };
}

/** Atajo por tipo para las acciones. */
export async function previsualizarCarga(ctx: TenantContext, tipo: TipoCarga, tabla: Tabla): Promise<VistaCarga> {
  return tipo === "salones" ? previsualizarSalones(ctx, tabla) : previsualizarFamilias(ctx, tabla);
}

export async function importarCarga(ctx: TenantContext, tipo: TipoCarga, tabla: Tabla): Promise<ResultadoCarga> {
  return tipo === "salones" ? importarSalones(ctx, tabla) : importarFamilias(ctx, tabla);
}
