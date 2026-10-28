// Requiere la BD local y Supabase Auth (pnpm db:start). Crea su propio colegio `test-gestion-*` y lo borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Membership, Profile, Tenant } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import { borrarComunicado, editarComunicado, listarComunicados, publicarComunicado } from "@/lib/server/comunicados";
import { aceptarConsentimiento, estadoConsentimiento, revocarConsentimiento } from "@/lib/server/consentimiento";
import { exportarColegio, listarAuditoria } from "@/lib/server/exportar";
import {
  cambiarEstadoAlumno, cambiarEstadoMembresia, crearAlumno, importarAlumnosCsv, invitarUsuario, vincularApoderado,
} from "@/lib/server/gestion";
import { abrirConversacion, conteoNoLeidos, enviarMensaje, listarConversaciones, obtenerHilo } from "@/lib/server/mensajes";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { TenantContext } from "@/lib/server/tenant";

const sufijo = randomUUID().slice(0, 8);
let tenant: Tenant;
const perfiles: Profile[] = [];
const authCreados: string[] = [];
const m: Record<string, Membership> = {};
const ctxs: Record<string, TenantContext> = {};
let salonId = "", salonOtroId = "", alumnoId = "", alumnoOtroId = "";

async function persona(clave: string, rol: Rol, nombres: string, apellidos: string) {
  const user = await db.profile.create({ data: { id: randomUUID(), email: `${clave}-${sufijo}@prueba.demo`, nombres, apellidos, telefono: "999111222" } });
  perfiles.push(user);
  m[clave] = await db.membership.create({ data: { tenantId: tenant.id, userId: user.id, rol } });
  ctxs[clave] = { tenant, user, membership: m[clave], rol, roles: [rol], db: dbTenant(tenant.id), ...accesoModulosDeCodigo(tenant.plan) };
}

beforeAll(async () => {
  tenant = await db.tenant.create({ data: { slug: `test-gestion-${sufijo}`, nombre: "Colegio de Prueba", plan: "basico" } });
  await persona("dir", "direccion", "Dora", "Directora");
  await persona("tutora", "profesor", "Lucía", "Tutora");
  await persona("prof", "profesor", "Pedro", "Curso");
  await persona("ajeno", "profesor", "Ana", "Ajena");
  await persona("madre", "apoderado", "Rosa", "Madre");
  await persona("otra", "apoderado", "Marta", "Otra");
  const salon = await db.salon.create({ data: { tenantId: tenant.id, nombre: "3.° B", nivel: "primaria", anio: 2026, tutorId: m.tutora.id } });
  const salonOtro = await db.salon.create({ data: { tenantId: tenant.id, nombre: "5.° A", nivel: "primaria", anio: 2026, tutorId: m.ajeno.id } });
  salonId = salon.id;
  salonOtroId = salonOtro.id;
  await db.curso.create({ data: { tenantId: tenant.id, salonId, nombre: "Ciencia", profesorId: m.prof.id } });
  alumnoId = (await db.alumno.create({ data: { tenantId: tenant.id, salonId, nombres: "Mateo", apellidos: "Hijo Madre" } })).id;
  alumnoOtroId = (await db.alumno.create({ data: { tenantId: tenant.id, salonId: salonOtroId, nombres: "Luis", apellidos: "Hijo Otra" } })).id;
  await db.apoderadoAlumno.create({ data: { tenantId: tenant.id, apoderadoId: m.madre.id, alumnoId, parentesco: "madre" } });
  await db.apoderadoAlumno.create({ data: { tenantId: tenant.id, apoderadoId: m.otra.id, alumnoId: alumnoOtroId, parentesco: "madre" } });
  await aceptarConsentimiento(ctxs.madre, "127.0.0.1");
  await aceptarConsentimiento(ctxs.otra, null);
});

afterAll(async () => {
  await db.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
  await db.profile.deleteMany({ where: { id: { in: perfiles.map((p) => p.id) } } });
  for (const id of authCreados) await supabaseAdmin().auth.admin.deleteUser(id).catch(() => {});
  await db.$disconnect();
});

describe("chat familia ↔ profesor", () => {
  let convId = "";

  it("la familia escribe a la tutora y a los profesores de su hijo, no a otros", async () => {
    convId = await abrirConversacion(ctxs.madre, { alumnoId, contraparteId: m.tutora.id });
    expect(await abrirConversacion(ctxs.madre, { alumnoId, contraparteId: m.tutora.id })).toBe(convId);
    await expect(abrirConversacion(ctxs.madre, { alumnoId, contraparteId: m.prof.id })).resolves.toBeTruthy();
    await expect(abrirConversacion(ctxs.madre, { alumnoId, contraparteId: m.ajeno.id })).rejects.toThrow();
    await expect(abrirConversacion(ctxs.madre, { alumnoId: alumnoOtroId, contraparteId: m.ajeno.id })).rejects.toThrow();
  });

  it("el profesor solo escribe a familias de sus alumnos", async () => {
    await expect(abrirConversacion(ctxs.tutora, { alumnoId, contraparteId: m.madre.id })).resolves.toBe(convId);
    await expect(abrirConversacion(ctxs.tutora, { alumnoId: alumnoOtroId, contraparteId: m.otra.id })).rejects.toThrow();
  });

  it("cuenta no leídos, marca leídos al abrir y no muestra correo ni teléfono", async () => {
    await enviarMensaje(ctxs.madre, { conversacionId: convId, cuerpo: "Hola, Mateo llegará tarde mañana." });
    expect(await conteoNoLeidos(ctxs.tutora)).toBe(1);
    expect(await conteoNoLeidos(ctxs.madre)).toBe(0);

    const bandeja = await listarConversaciones(ctxs.tutora);
    expect(bandeja[0].noLeidos).toBe(1);
    const hilo = await obtenerHilo(ctxs.tutora, convId);
    expect(hilo.etiqueta).toBe("Rosa Madre · madre de Mateo Hijo Madre");
    expect(await conteoNoLeidos(ctxs.tutora)).toBe(0);

    const textoVisto = JSON.stringify([hilo, bandeja, await listarConversaciones(ctxs.madre)]);
    expect(textoVisto).not.toContain("@prueba.demo");
    expect(textoVisto).not.toContain("999111222");
    expect((await listarConversaciones(ctxs.madre)).find((c) => c.id === convId)?.etiqueta).toBe("Lucía Tutora · Tutor(a) de 3.° B — sobre Mateo");
  });

  it("una familia no puede abrir ni escribir en la conversación de otra", async () => {
    await expect(obtenerHilo(ctxs.otra, convId)).rejects.toThrow();
    await expect(enviarMensaje(ctxs.otra, { conversacionId: convId, cuerpo: "intruso" })).rejects.toThrow();
    await expect(obtenerHilo(ctxs.ajeno, convId)).rejects.toThrow();
  });

  it("dirección puede leer (auditado) pero no escribir", async () => {
    const hilo = await obtenerHilo(ctxs.dir, convId);
    expect(hilo.puedeEscribir).toBe(false);
    expect(hilo.mensajes).toHaveLength(1);
    await expect(enviarMensaje(ctxs.dir, { conversacionId: convId, cuerpo: "no" })).rejects.toThrow();
    const auditoria = await db.auditoria.count({ where: { tenantId: tenant.id, accion: "ver", entidad: "conversacion", entidadId: convId, actorId: ctxs.dir.user.id } });
    expect(auditoria).toBe(1);
  });

  it("valida el mensaje y encola un solo aviso cada 15 min por conversación, solo con consentimiento", async () => {
    await expect(enviarMensaje(ctxs.madre, { conversacionId: convId, cuerpo: "   " })).rejects.toThrow("Escribe un mensaje");
    await expect(enviarMensaje(ctxs.madre, { conversacionId: convId, cuerpo: "x".repeat(2001) })).rejects.toThrow("2000");

    await enviarMensaje(ctxs.tutora, { conversacionId: convId, cuerpo: "Gracias por avisar." });
    await enviarMensaje(ctxs.tutora, { conversacionId: convId, cuerpo: "Lo esperamos." });
    const avisos = await db.aviso.findMany({ where: { tenantId: tenant.id, plantilla: "mensaje_nuevo", apoderadoId: m.madre.id } });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      tipo: "mensaje", canal: "correo", estado: "pendiente", destinatario: ctxs.madre.user.email, apoderadoId: m.madre.id, referenciaId: convId,
    });
    expect(avisos[0].payload).toMatchObject({ colegio: "Colegio de Prueba", remitente: "Lucía Tutora", alumno: "Mateo Hijo Madre" });

    await revocarConsentimiento(ctxs.madre);
    expect(await estadoConsentimiento(ctxs.madre)).toBe("revocado");
    await db.aviso.deleteMany({ where: { tenantId: tenant.id } });
    await enviarMensaje(ctxs.tutora, { conversacionId: convId, cuerpo: "¿Sigues ahí?" });
    expect(await db.aviso.count({ where: { tenantId: tenant.id } })).toBe(0);
    await aceptarConsentimiento(ctxs.madre, null);
    expect(await estadoConsentimiento(ctxs.madre)).toBe("vigente");
  });
});

describe("comunicados", () => {
  it("dirección publica a todo el colegio y encola un aviso por familia con consentimiento", async () => {
    await db.aviso.deleteMany({ where: { tenantId: tenant.id } });
    const r = await publicarComunicado(ctxs.dir, { titulo: "Feriado", cuerpo: "No hay clases el lunes.", salonId: null });
    expect(r.avisados).toBe(2);
    const avisos = await db.aviso.findMany({ where: { tenantId: tenant.id, plantilla: "comunicado" } });
    expect(avisos.every((a) => a.tipo === "comunicado" && a.estado === "pendiente")).toBe(true);
    expect((await listarComunicados(ctxs.madre)).map((c) => c.titulo)).toContain("Feriado");
  });

  it("el profesor solo publica en sus salones y las familias ven los de su salón", async () => {
    await expect(publicarComunicado(ctxs.tutora, { titulo: "x", cuerpo: "y", salonId: salonOtroId })).rejects.toThrow();
    await expect(publicarComunicado(ctxs.tutora, { titulo: "x", cuerpo: "y", salonId: null })).rejects.toThrow();
    await expect(publicarComunicado(ctxs.madre, { titulo: "x", cuerpo: "y", salonId: null })).rejects.toThrow();
    const r = await publicarComunicado(ctxs.tutora, { titulo: "Paseo 3.° B", cuerpo: "Traer lonchera.", salonId });
    expect(r.avisados).toBe(1);
    expect((await listarComunicados(ctxs.madre)).map((c) => c.titulo)).toContain("Paseo 3.° B");
    expect((await listarComunicados(ctxs.otra)).map((c) => c.titulo)).not.toContain("Paseo 3.° B");
  });

  it("solo el autor edita o borra, y dentro de 24 h", async () => {
    const { id } = await publicarComunicado(ctxs.tutora, { titulo: "Editable", cuerpo: "texto", salonId });
    await expect(editarComunicado(ctxs.dir, id, { titulo: "x", cuerpo: "y" })).rejects.toThrow();
    await editarComunicado(ctxs.tutora, id, { titulo: "Editado", cuerpo: "texto 2" });
    await db.comunicado.update({ where: { id }, data: { publicadoAt: new Date(Date.now() - 25 * 3600_000) } });
    await expect(editarComunicado(ctxs.tutora, id, { titulo: "tarde", cuerpo: "z" })).rejects.toThrow("24 horas");
    await expect(borrarComunicado(ctxs.tutora, id)).rejects.toThrow("24 horas");
  });
});

describe("gestión de dirección", () => {
  it("solo dirección gestiona", async () => {
    await expect(crearAlumno(ctxs.tutora, { nombres: "A", apellidos: "B", codigo: "", salonId })).rejects.toThrow();
    await expect(importarAlumnosCsv(ctxs.madre, "nombres,apellidos,codigo,salon\nA,B,1,3.° B")).rejects.toThrow();
  });

  it("importa CSV válido y rechaza todo si alguna fila falla", async () => {
    const malo = await importarAlumnosCsv(ctxs.dir, "nombres,apellidos,codigo,salon\nUno,Uno,C1,3.° B\nDos,Dos,C2,9.° Z\n");
    expect(malo.ok).toBe(false);
    expect(malo.errores).toEqual([{ linea: 3, mensaje: "No existe el salón «9.° Z»." }]);
    expect(await db.alumno.count({ where: { tenantId: tenant.id, codigo: "C1" } })).toBe(0);

    const bueno = await importarAlumnosCsv(ctxs.dir, "nombres,apellidos,codigo,salon\nUno,Uno,C1,3.° B\nDos,Dos,C2,5.° a\n");
    expect(bueno).toMatchObject({ ok: true, creados: 2 });
    const repetido = await importarAlumnosCsv(ctxs.dir, "nombres,apellidos,codigo,salon\nTres,Tres,C1,3.° B\n");
    expect(repetido.ok).toBe(false);
    expect(repetido.errores[0].mensaje).toContain("ya lo tiene");
  });

  it("retirar un alumno no lo borra", async () => {
    const id = await crearAlumno(ctxs.dir, { nombres: "Retirable", apellidos: "Prueba", codigo: "", salonId });
    await cambiarEstadoAlumno(ctxs.dir, id, "retirado");
    expect((await db.alumno.findUniqueOrThrow({ where: { id } })).estado).toBe("retirado");
  });

  it("desactivar a un profesor libera tutoría y cursos y no lo borra", async () => {
    await cambiarEstadoMembresia(ctxs.dir, m.prof.id, "inactiva");
    expect((await db.membership.findUniqueOrThrow({ where: { id: m.prof.id } })).estado).toBe("inactiva");
    expect(await db.curso.count({ where: { tenantId: tenant.id, profesorId: m.prof.id } })).toBe(0);
    await cambiarEstadoMembresia(ctxs.dir, m.tutora.id, "inactiva");
    expect((await db.salon.findUniqueOrThrow({ where: { id: salonId } })).tutorId).toBeNull();
  });

  it("invita a un apoderado (Auth + perfil + membresía + aviso) y lo vincula con el alumno", async () => {
    const email = `invitada-${sufijo}@prueba.demo`;
    const { membershipId, userId } = await invitarUsuario(ctxs.dir, { email, nombres: "Inés", apellidos: "Invitada", rol: "apoderado" });
    authCreados.push(userId);
    perfiles.push({ id: userId } as Profile);
    expect(await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).toMatchObject({ rol: "apoderado", estado: "invitada" });
    const aviso = await db.aviso.findFirstOrThrow({ where: { tenantId: tenant.id, plantilla: "invitacion", destinatario: email } });
    expect(aviso).toMatchObject({ tipo: "invitacion", canal: "correo", estado: "pendiente" });
    await expect(invitarUsuario(ctxs.dir, { email, nombres: "Inés", apellidos: "Invitada", rol: "apoderado" })).rejects.toThrow("ya tiene ese rol");

    await vincularApoderado(ctxs.dir, { apoderadoId: membershipId, alumnoId, parentesco: "tía" });
    await expect(vincularApoderado(ctxs.dir, { apoderadoId: membershipId, alumnoId, parentesco: "tía" })).rejects.toThrow("ya está vinculado");
    expect(await estadoConsentimiento(ctxs.dir, membershipId)).toBe("pendiente");
  });
});

describe("privacidad y exportación", () => {
  it("la exportación es solo para dirección, incluye los datos del colegio y queda auditada", async () => {
    await expect(exportarColegio(ctxs.madre)).rejects.toThrow();
    await expect(exportarColegio(ctxs.tutora)).rejects.toThrow();
    const datos = await exportarColegio(ctxs.dir);
    expect(datos.colegio.slug).toBe(tenant.slug);
    expect(datos.alumno.length).toBeGreaterThanOrEqual(2);
    expect((datos.alumno as { tenantId: string }[]).every((a) => a.tenantId === tenant.id)).toBe(true);
    expect(datos.mensaje.length).toBeGreaterThan(0);
    expect(JSON.stringify(datos, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).not.toContain("tokenHash");
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, accion: "exportar" } })).toBe(1);
  });

  it("el visor de auditoría es solo para dirección y no mezcla colegios", async () => {
    await expect(listarAuditoria(ctxs.madre)).rejects.toThrow();
    const filas = await listarAuditoria(ctxs.dir, { accion: "exportar" });
    expect(filas).toHaveLength(1);
    expect(filas[0].actor).toBe("Dora Directora");
  });

  it("la revocación del consentimiento queda auditada", async () => {
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, entidad: "consentimiento", accion: "editar" } })).toBeGreaterThan(0);
  });
});
