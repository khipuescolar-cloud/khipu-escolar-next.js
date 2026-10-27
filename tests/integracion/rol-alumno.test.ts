// Rol alumno (cuenta propia del estudiante): alcance solo de sí mismo. Requiere la BD local y Supabase Auth.
// Crea su propio colegio `test-alumno-*` (Pro Max) y lo borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { historialDeHijos } from "@/lib/server/asistencia";
import { db } from "@/lib/server/db";
import { listarAlumnos } from "@/lib/server/gestion";
import { cambiarEstadoCuentaAlumno, crearCuentaAlumno, estadoCuentasAlumnos, MOTIVO_SIN_CONSENTIMIENTO } from "@/lib/server/gestion-cuentas-alumno";
import { datosLibreta } from "@/lib/server/libreta";
import { abrirConversacion, destinatariosPosibles, listarConversaciones } from "@/lib/server/mensajes";
import { alumnosVisibles, notasDeAlumno } from "@/lib/server/notas";
import { supabaseAdmin } from "@/lib/server/supabase";
import { tareasDeFamilia } from "@/lib/server/tareas";
import { alumnoIdsVisibles, requireAlumnoVisible, resolverContextoColegio, salonIdsVisibles, type TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let ctxAlumno: TenantContext;
const authCreados: string[] = [];
const sufijo = randomUUID().slice(0, 8);
const correoAlumno = `mateo-${sufijo}@test-alumno.local`;
const dni = `7${sufijo.replace(/\D/g, "").padEnd(7, "1").slice(0, 7)}`;
let periodoId = "";

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "promax", prefijo: "test-alumno" });
  const manana = new Date(Date.now() + 2 * 86_400_000);
  await db.tarea.createMany({
    data: [
      { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, titulo: "Tarea del salón de Mateo", fechaEntrega: manana, creadoPorId: c.miembros.tutora.membership.id },
      { tenantId: c.tenant.id, cursoId: c.cursoAjeno.id, titulo: "Tarea de otro salón", fechaEntrega: manana, creadoPorId: c.miembros.otroProfesor.membership.id },
    ],
  });
  const p = await db.periodo.create({ data: { tenantId: c.tenant.id, anio: 2026, tipo: "bimestre", numero: 1, nombre: "I Bimestre", inicio: new Date("2026-03-01"), fin: new Date("2026-05-15") } });
  periodoId = p.id;
});

afterAll(async () => {
  await c.limpiar();
  await db.profile.deleteMany({ where: { id: { in: authCreados } } });
  for (const id of authCreados) await supabaseAdmin().auth.admin.deleteUser(id).catch(() => {});
  await db.$disconnect();
});

describe("crear la cuenta del alumno", () => {
  it("sin consentimiento vigente de un apoderado vinculado no se puede (Valentina: su padre lo revocó)", async () => {
    await expect(crearCuentaAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.valentina.id, email: `vale-${sufijo}@test-alumno.local`, tipoDocumento: "dni", numeroDocumento: "71234567" })).rejects.toThrow(MOTIVO_SIN_CONSENTIMIENTO);
    const estados = await estadoCuentasAlumnos(c.ctxDe("direccion"), [c.alumnos.valentina.id, c.alumnos.mateo.id]);
    expect(estados.get(c.alumnos.valentina.id)).toEqual({ cuenta: null, consentimiento: false });
    expect(estados.get(c.alumnos.mateo.id)?.consentimiento).toBe(true);
  });

  it("no acepta el correo de un apoderado del colegio ni la pide un profesor", async () => {
    await expect(crearCuentaAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id, email: c.miembros.madre.user.email, tipoDocumento: "dni", numeroDocumento: dni })).rejects.toThrow("otra persona del colegio");
    await esperarProhibido(crearCuentaAlumno(c.ctxDe("tutora"), { alumnoId: c.alumnos.mateo.id, email: correoAlumno, tipoDocumento: "dni", numeroDocumento: dni }));
  });

  it("dirección la crea: DNI como contraseña inicial, cambio obligatorio y bienvenida sin el número", async () => {
    const r = await crearCuentaAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id, email: correoAlumno, tipoDocumento: "dni", numeroDocumento: dni });
    authCreados.push(r.userId);
    expect(r.cuentaNueva).toBe(true);
    expect((await db.alumno.findUniqueOrThrow({ where: { id: c.alumnos.mateo.id } })).cuentaId).toBe(r.membershipId);
    expect(await db.profile.findUniqueOrThrow({ where: { id: r.userId } })).toMatchObject({ debeCambiarPassword: true });
    expect((await supabaseAdmin().auth.signInWithPassword({ email: correoAlumno, password: dni })).error).toBeNull();
    const aviso = await db.aviso.findFirstOrThrow({ where: { tenantId: c.tenant.id, plantilla: "bienvenida", destinatario: correoAlumno } });
    expect(JSON.stringify(aviso.payload)).not.toContain(dni);
    await expect(crearCuentaAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id, email: `otro-${sufijo}@test-alumno.local`, tipoDocumento: "dni", numeroDocumento: dni })).rejects.toThrow("ya tiene una cuenta");

    const user = await db.profile.findUniqueOrThrow({ where: { id: r.userId } });
    ctxAlumno = await resolverContextoColegio(user, c.tenant.slug);
    expect(ctxAlumno.rol).toBe("alumno");
  });
});

describe("alcance del alumno: solo él mismo", () => {
  it("ve solo su ficha y su salón", async () => {
    expect(await alumnoIdsVisibles(ctxAlumno)).toEqual([c.alumnos.mateo.id]);
    expect(await salonIdsVisibles(ctxAlumno)).toEqual([c.salon.id]);
    expect((await alumnosVisibles(ctxAlumno)).map((a) => a.id)).toEqual([c.alumnos.mateo.id]);
  });

  it("no ve las notas ni la asistencia de sus compañeros", async () => {
    await esperarProhibido(notasDeAlumno(ctxAlumno, c.alumnos.valentina.id, periodoId));
    await esperarProhibido(requireAlumnoVisible(ctxAlumno, c.alumnos.thiago.id));
    const propias = await notasDeAlumno(ctxAlumno, c.alumnos.mateo.id, periodoId);
    expect(propias.alumno.id).toBe(c.alumnos.mateo.id);
    const historial = await historialDeHijos(ctxAlumno);
    expect(historial.hijos.map((h) => h.id)).toEqual([c.alumnos.mateo.id]);
  });

  it("la libreta solo de periodos publicados", async () => {
    await esperarProhibido(datosLibreta(ctxAlumno, c.alumnos.mateo.id, periodoId));
    await db.periodo.update({ where: { id: periodoId }, data: { cerrado: true, libretaPublicadaAt: new Date() } });
    expect((await datosLibreta(ctxAlumno, c.alumnos.mateo.id, periodoId)).alumno.id).toBe(c.alumnos.mateo.id);
    await esperarProhibido(datosLibreta(ctxAlumno, c.alumnos.valentina.id, periodoId));
  });

  it("ve las tareas de su salón y no las de otro", async () => {
    const grupos = await tareasDeFamilia(ctxAlumno);
    expect(grupos.map((g) => g.alumno.id)).toEqual([c.alumnos.mateo.id]);
    const titulos = Object.values(grupos[0].grupos).flat().map((t) => t.titulo);
    expect(titulos).toContain("Tarea del salón de Mateo");
    expect(titulos).not.toContain("Tarea de otro salón");
  });

  it("no entra a mensajes ni a gestión", async () => {
    expect(await destinatariosPosibles(ctxAlumno)).toEqual([]);
    await esperarProhibido(abrirConversacion(ctxAlumno, { alumnoId: c.alumnos.mateo.id, contraparteId: c.miembros.tutora.membership.id }));
    await esperarProhibido(listarConversaciones(ctxAlumno));
    await esperarProhibido(listarAlumnos(ctxAlumno));
  });
});

describe("desactivar la cuenta", () => {
  it("el alumno ya no entra; reactivar vuelve a exigir el consentimiento", async () => {
    await cambiarEstadoCuentaAlumno(c.ctxDe("direccion"), c.alumnos.mateo.id, "inactiva");
    await esperarProhibido(resolverContextoColegio(ctxAlumno.user, c.tenant.slug));
    await db.consentimiento.updateMany({ where: { apoderadoId: c.miembros.madre.membership.id }, data: { revocadoAt: new Date() } });
    await expect(cambiarEstadoCuentaAlumno(c.ctxDe("direccion"), c.alumnos.mateo.id, "activa")).rejects.toThrow(MOTIVO_SIN_CONSENTIMIENTO);
  });
});
