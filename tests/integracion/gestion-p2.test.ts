// Requiere la BD local y Supabase Auth (pnpm db:start). Colegios `test-p2g-*` propios, borrados al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Membership, Profile, Tenant } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { crearEvento, itemsDeAgenda, salonesParaEventos } from "@/lib/server/agenda";
import { opcionesDeLista } from "@/lib/server/asistencia";
import { panelAvisos } from "@/lib/server/avisos-panel";
import { publicarComunicado, salonesParaPublicar } from "@/lib/server/comunicados";
import { cursosDelDocente } from "@/lib/server/cursos";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import {
  archivarSalon, cambiarEstadoMembresia, crearAlumno, editarAlumno, editarDatosApoderado, eliminarSalon, importarAlumnosCsv, listarAlumnos,
  listarApoderados, listarProfesores, listarSalones, listarSalonesParaSelector, reactivarSalon, vincularApoderado,
} from "@/lib/server/gestion";
import { altaPersonal, editarFicha, listarPersonal, obtenerFicha, restablecerPasswordAlDocumento } from "@/lib/server/personal";
import { salonesParaCarnets } from "@/lib/server/porteria";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { TenantContext } from "@/lib/server/tenant";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { esperarProhibido } from "./ayudantes/colegio-prueba";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";

const sufijo = randomUUID().slice(0, 8);
const correo = (n: string) => `${n}-${sufijo}@test-p2g.demo`;
let tenant: Tenant;
let otro: Tenant;
const perfiles: string[] = [];
const authCreados: string[] = [];
const ctxs: Record<string, TenantContext> = {};
const ms: Record<string, Membership> = {};
let salonA: string, salonB: string, cursoB: string;

async function miembro(clave: string, rol: Rol, t: Tenant = tenant, user?: Profile) {
  const u = user ?? (await db.profile.create({ data: { id: randomUUID(), email: correo(clave), nombres: clave, apellidos: "Prueba" } }));
  if (!user) perfiles.push(u.id);
  const membership = await db.membership.create({ data: { tenantId: t.id, userId: u.id, rol } });
  ms[clave] = membership;
  ctxs[clave] = { tenant: t, user: u, membership, rol, roles: [rol], db: dbTenant(t.id), ...accesoModulosDeCodigo(t.plan) };
  return u;
}

beforeAll(async () => {
  tenant = await db.tenant.create({ data: { slug: `test-p2g-${sufijo}`, nombre: "Colegio P2 Gestión", plan: "promax" } });
  otro = await db.tenant.create({ data: { slug: `test-p2g-otro-${sufijo}`, nombre: "Otro P2", plan: "promax" } });
  await miembro("dir", "direccion");
  await miembro("adm", "administrativo");
  await miembro("prof", "profesor");
  await miembro("dirotro", "direccion", otro);
  salonA = (await db.salon.create({ data: { tenantId: tenant.id, nombre: "1.° A", nivel: "primaria", anio: 2026, tutorId: ms.prof.id } })).id;
  salonB = (await db.salon.create({ data: { tenantId: tenant.id, nombre: "2.° B", nivel: "primaria", anio: 2026, tutorId: ms.prof.id } })).id;
  cursoB = (await db.curso.create({ data: { tenantId: tenant.id, salonId: salonB, nombre: "Arte", profesorId: ms.prof.id } })).id;
});

afterAll(async () => {
  await db.tenant.deleteMany({ where: { id: { in: [tenant.id, otro.id] } } });
  await db.profile.deleteMany({ where: { id: { in: [...perfiles, ...authCreados] } } });
  for (const id of authCreados) await supabaseAdmin().auth.admin.deleteUser(id).catch(() => {});
  await db.$disconnect();
});

describe("archivar salones", () => {
  let alumnoB = "";
  it("un salón archivado sale de listas y selectores pero conserva sus datos", async () => {
    alumnoB = await crearAlumno(ctxs.dir, { nombres: "Ana", apellidos: "Archivo", codigo: "", salonId: salonB });
    expect((await opcionesDeLista(ctxs.dir)).some((o) => o.salonId === salonB)).toBe(true);

    await archivarSalon(ctxs.dir, salonB);
    expect((await opcionesDeLista(ctxs.dir)).some((o) => o.salonId === salonB)).toBe(false);
    expect((await opcionesDeLista(ctxs.prof)).some((o) => o.salonId === salonB)).toBe(false);
    expect((await salonesParaPublicar(ctxs.dir)).map((s) => s.id)).toEqual([salonA]);
    expect((await salonesParaEventos(ctxs.dir)).map((s) => s.id)).toEqual([salonA]);
    expect((await salonesParaCarnets(ctxs.dir)).map((s) => s.id)).toEqual([salonA]);
    expect((await cursosDelDocente(ctxs.prof)).some((c) => c.id === cursoB)).toBe(false);
    expect((await listarSalonesParaSelector(ctxs.dir)).map((s) => s.id)).toEqual([salonA]);
    expect((await listarSalones(ctxs.dir)).map((s) => s.id)).toEqual([salonA]);
    expect((await listarSalones(ctxs.dir, { archivados: true })).map((s) => s.id)).toEqual([salonB]);
    // Se conservan alumnos y asistencia.
    expect(await db.alumno.count({ where: { id: alumnoB } })).toBe(1);
    expect((await listarAlumnos(ctxs.dir, { salonId: salonB })).length).toBe(1);
  });

  it("no se asignan alumnos nuevos ni se publica o crea agenda en un salón archivado", async () => {
    await expect(crearAlumno(ctxs.dir, { nombres: "X", apellidos: "Y", codigo: "", salonId: salonB })).rejects.toThrow("archivado");
    const r = await importarAlumnosCsv(ctxs.dir, "nombres,apellidos,codigo,salon\nLuz,Ramos,,2.° B\n");
    expect(r.ok).toBe(false);
    await expect(publicarComunicado(ctxs.dir, { titulo: "Hola", cuerpo: "Texto", salonId: salonB })).rejects.toThrow("archivado");
    const manana = sumarDias(fechaLima(new Date()), 1);
    expect((await crearEvento(ctxs.dir, { titulo: "Examen", tipo: "examen", fecha: manana, salonId: salonB })).ok).toBe(false);
    // Un alumno que ya estaba en el salón se puede editar sin moverlo, pero no mudar a otro archivado.
    await editarAlumno(ctxs.dir, alumnoB, { nombres: "Ana", apellidos: "Archivo 2", codigo: "", salonId: salonB });
    const otroAlumno = await crearAlumno(ctxs.dir, { nombres: "Ob", apellidos: "Uno", codigo: "", salonId: salonA });
    await expect(editarAlumno(ctxs.dir, otroAlumno, { nombres: "Ob", apellidos: "Uno", codigo: "", salonId: salonB })).rejects.toThrow("archivado");
  });

  it("no se quita un salón con alumnos; reactivar lo devuelve a las listas; solo dirección", async () => {
    await expect(eliminarSalon(ctxs.dir, salonB)).rejects.toThrow("alumnos o cursos");
    await esperarProhibido(archivarSalon(ctxs.adm, salonA));
    await reactivarSalon(ctxs.dir, salonB);
    expect((await opcionesDeLista(ctxs.dir)).some((o) => o.salonId === salonB)).toBe(true);
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, entidad: "salon", entidadId: salonB } })).toBeGreaterThanOrEqual(2);
  });
});

describe("rol administrativo", () => {
  it("entra a alumnos y familias, y no a profesores, personal ni salones", async () => {
    const id = await crearAlumno(ctxs.adm, { nombres: "Beto", apellidos: "Admin", codigo: "", salonId: salonA });
    expect(id).toBeTruthy();
    expect((await listarAlumnos(ctxs.adm)).some((a) => a.id === id)).toBe(true);
    expect((await listarSalonesParaSelector(ctxs.adm)).length).toBeGreaterThan(0);
    await esperarProhibido(listarProfesores(ctxs.adm));
    await esperarProhibido(listarPersonal(ctxs.adm, ["profesor"]));
    await esperarProhibido(listarSalones(ctxs.adm));
    await esperarProhibido(altaPersonal(ctxs.adm, { rol: "profesor", email: correo("x"), nombres: "X", apellidos: "Y", tipoDocumento: "dni", numeroDocumento: "12345678" }));
    await esperarProhibido(restablecerPasswordAlDocumento(ctxs.adm, ms.prof.id));
    await esperarProhibido(listarProfesores(ctxs.prof));
  });

  it("vincula familias pero no desactiva a profesores", async () => {
    const madre = await miembro("madre", "apoderado");
    void madre;
    const alumno = await crearAlumno(ctxs.dir, { nombres: "Hijo", apellidos: "Madre", codigo: "", salonId: salonA });
    await vincularApoderado(ctxs.adm, { apoderadoId: ms.madre.id, alumnoId: alumno, parentesco: "madre" });
    await expect(cambiarEstadoMembresia(ctxs.adm, ms.prof.id, "inactiva")).rejects.toThrow("No se encontró");
    await cambiarEstadoMembresia(ctxs.adm, ms.madre.id, "inactiva");
    await cambiarEstadoMembresia(ctxs.adm, ms.madre.id, "activa");
    await editarDatosApoderado(ctxs.adm, ms.madre.id, { nombres: "Madre", apellidos: "Prueba", telefono: "999111222" });
  });

  it("comunicados, agenda (solo colegio) y avisos (lectura)", async () => {
    const c = await publicarComunicado(ctxs.adm, { titulo: "Aviso administrativo", cuerpo: "Cuerpo", salonId: null });
    expect(c.id).toBeTruthy();
    expect((await salonesParaPublicar(ctxs.adm)).length).toBeGreaterThan(0);
    const manana = sumarDias(fechaLima(new Date()), 1);
    expect((await crearEvento(ctxs.adm, { titulo: "Feria del colegio", tipo: "evento", fecha: manana })).ok).toBe(true);
    expect((await crearEvento(ctxs.adm, { titulo: "De un salón", tipo: "evento", fecha: manana, salonId: salonA })).ok).toBe(false);
    const items = await itemsDeAgenda(ctxs.adm, new Date(), new Date(Date.now() + 3 * 86_400_000));
    expect(items.some((i) => i.titulo === "Feria del colegio" && i.eliminable)).toBe(true);
    expect((await panelAvisos(ctxs.adm, {})).avisos).toBeDefined();
    await esperarProhibido(panelAvisos(ctxs.prof, {}));
  });
});

describe("familias: buscador y paginación", () => {
  it("20 por página y filtra por nombre, correo, documento o alumno", async () => {
    const tag = `Fam${sufijo}`;
    for (let i = 0; i < 25; i++) {
      const id = randomUUID();
      perfiles.push(id);
      await db.profile.create({ data: { id, email: `fam${i}-${sufijo}@test-p2g.demo`, nombres: `${tag}${String(i).padStart(2, "0")}`, apellidos: "Zeta", numeroDocumento: `5${String(i).padStart(7, "0")}` } });
      await db.membership.create({ data: { tenantId: tenant.id, userId: id, rol: "apoderado" } });
    }
    const p1 = await listarApoderados(ctxs.dir, { q: tag });
    expect(p1.total).toBe(25);
    expect(p1.paginas).toBe(2);
    expect(p1.familias).toHaveLength(20);
    const p2 = await listarApoderados(ctxs.dir, { q: tag, pagina: 2 });
    expect(p2.familias).toHaveLength(5);
    expect((await listarApoderados(ctxs.dir, { q: tag, pagina: 99 })).pagina).toBe(2);
    expect((await listarApoderados(ctxs.dir, { q: `fam3-${sufijo}` })).total).toBe(1);
    expect((await listarApoderados(ctxs.dir, { q: "50000007" })).total).toBe(1);
    // El administrativo no busca por documento.
    expect((await listarApoderados(ctxs.adm, { q: "50000007" })).total).toBe(0);
    const alumno = await crearAlumno(ctxs.dir, { nombres: `Hijo${sufijo}`, apellidos: "Buscable", codigo: "", salonId: salonA });
    const algunaFamilia = await db.membership.findFirstOrThrow({ where: { tenantId: tenant.id, user: { nombres: `${tag}03` } } });
    await vincularApoderado(ctxs.dir, { apoderadoId: algunaFamilia.id, alumnoId: alumno, parentesco: "tío" });
    const porAlumno = await listarApoderados(ctxs.dir, { q: `Hijo${sufijo}` });
    expect(porAlumno.total).toBe(1);
    expect(porAlumno.familias[0].id).toBe(algunaFamilia.id);
  });
});

describe("datos globales del perfil y reinicio de contraseña", () => {
  let membershipId = "";
  let userId = "";

  it("avisa y audita en ambos colegios al editar datos de alguien con membresías en otro colegio", async () => {
    const r = await altaPersonal(ctxs.dir, { rol: "administrativo", email: correo("multi"), nombres: "Multi", apellidos: "Colegio", tipoDocumento: "dni", numeroDocumento: "11111111" });
    authCreados.push(r.userId);
    membershipId = r.membershipId;
    userId = r.userId;
    expect((await obtenerFicha(ctxs.dir, membershipId, ["administrativo"]))?.otrosColegios).toBe(0);
    await db.membership.create({ data: { tenantId: otro.id, userId, rol: "profesor" } });
    expect((await obtenerFicha(ctxs.dir, membershipId, ["administrativo"]))?.otrosColegios).toBe(1);

    await editarFicha(ctxs.dir, membershipId, ["administrativo"], {
      nombres: "Multi", apellidos: "Colegio", telefono: "987654321", genero: null, fechaNacimiento: "", direccion: "", cargo: "", tipoDocumento: "dni", numeroDocumento: "22222222",
    });
    const aqui = await db.auditoria.findFirstOrThrow({ where: { tenantId: tenant.id, entidad: "perfil_global", entidadId: userId } });
    const alla = await db.auditoria.findFirstOrThrow({ where: { tenantId: otro.id, entidad: "perfil_global", entidadId: userId } });
    expect(aqui.detalle).toMatchObject({ campos: expect.arrayContaining(["telefono", "numeroDocumento"]), otrosColegios: 1 });
    expect(JSON.stringify([aqui.detalle, alla.detalle])).not.toContain("22222222");
    expect(alla.detalle).toMatchObject({ campos: expect.arrayContaining(["telefono"]) });
  });

  it("corregir el documento no cambia la contraseña; restablecer la deja en el documento nuevo", async () => {
    const sesionVieja = await supabaseAdmin().auth.signInWithPassword({ email: correo("multi"), password: "11111111" });
    expect(sesionVieja.error).toBeNull();
    expect((await supabaseAdmin().auth.signInWithPassword({ email: correo("multi"), password: "22222222" })).error).not.toBeNull();
    await db.profile.update({ where: { id: userId }, data: { debeCambiarPassword: false } });

    const r = await restablecerPasswordAlDocumento(ctxs.dir, membershipId, { avisar: true });
    expect(r.otrosColegios).toBe(1);
    expect((await supabaseAdmin().auth.signInWithPassword({ email: correo("multi"), password: "22222222" })).error).toBeNull();
    expect((await supabaseAdmin().auth.signInWithPassword({ email: correo("multi"), password: "11111111" })).error).not.toBeNull();
    expect((await db.profile.findUniqueOrThrow({ where: { id: userId } })).debeCambiarPassword).toBe(true);

    const eventos = await db.auditoria.findMany({ where: { tenantId: tenant.id, entidad: "membresia", entidadId: membershipId } });
    const reinicio = eventos.find((e) => (e.detalle as { reinicioPassword?: string } | null)?.reinicioPassword === "documento");
    expect(reinicio).toBeDefined();
    expect(JSON.stringify(eventos.map((e) => e.detalle))).not.toContain("22222222");
    const avisos = await db.aviso.findMany({ where: { tenantId: tenant.id, plantilla: "bienvenida", destinatario: correo("multi") } });
    expect(avisos.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(avisos.map((a) => a.payload))).not.toContain("22222222");
    // «Restablecer y avisar» encola la variante «restablecida», no la bienvenida.
    expect(avisos.some((a) => (a.payload as { restablecida?: boolean }).restablecida === true)).toBe(true);
  });

  it("sin documento válido no restablece", async () => {
    await db.profile.update({ where: { id: userId }, data: { numeroDocumento: null } });
    await expect(restablecerPasswordAlDocumento(ctxs.dir, membershipId)).rejects.toThrow("documento válido");
  });
});
