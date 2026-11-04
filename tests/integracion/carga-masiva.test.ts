// Requiere la BD local y Supabase Auth (pnpm db:start). Crea sus colegios `test-carga-*` y los borra al terminar
// (también los usuarios de Auth y los perfiles que crea).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Membership, Profile, Tenant } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { tablaDesdeCsv, type Tabla } from "@/lib/carga-masiva/tabla";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { importarFamilias, importarSalones, previsualizarFamilias, previsualizarSalones, type CrearUsuarioAuth } from "@/lib/server/carga-masiva";
import { db, dbTenant } from "@/lib/server/db";
import { reenviarInvitacion } from "@/lib/server/gestion";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { TenantContext } from "@/lib/server/tenant";
import { esperarProhibido } from "./ayudantes/colegio-prueba";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";

const sufijo = randomUUID().slice(0, 8);
const correo = (n: string) => `${n}-${sufijo}@test-carga.demo`;
/** DNI de 8 dígitos único por corrida. */
const dni = (n: number) => String(10_000_000 + ((parseInt(sufijo.slice(0, 5), 16) * 37 + n) % 89_999_999)).padStart(8, "0");
const tabla = (csv: string): Tabla => tablaDesdeCsv(csv)!;
const valor = (r: { conteos: { clave: string; valor: number }[] }, clave: string) => r.conteos.find((c) => c.clave === clave)?.valor;

let tenant: Tenant;
let otro: Tenant;
const perfiles: string[] = [];
const authCreados: string[] = [];
const ctxs: Record<string, TenantContext> = {};
const ms: Record<string, Membership> = {};

async function miembro(clave: string, rol: Rol, t: Tenant, extra: Partial<Profile> = {}, estado: "activa" | "inactiva" = "activa") {
  const user = await db.profile.create({ data: { id: randomUUID(), email: correo(clave), nombres: clave, apellidos: "Prueba", ...extra } });
  perfiles.push(user.id);
  const membership = await db.membership.create({ data: { tenantId: t.id, userId: user.id, rol, estado } });
  ms[clave] = membership;
  ctxs[clave] = { tenant: t, user, membership, rol, roles: [rol], db: dbTenant(t.id), ...accesoModulosDeCodigo(t.plan) };
}

beforeAll(async () => {
  tenant = await db.tenant.create({ data: { slug: `test-carga-${sufijo}`, nombre: "Colegio Carga", plan: "base" } });
  otro = await db.tenant.create({ data: { slug: `test-carga-otro-${sufijo}`, nombre: "Otro Colegio", plan: "base" } });
  await miembro("dir", "direccion", tenant);
  await miembro("adm", "administrativo", tenant);
  await miembro("prof1", "profesor", tenant, { numeroDocumento: dni(1), tipoDocumento: "dni" });
  await miembro("prof2", "profesor", tenant, { numeroDocumento: dni(2), tipoDocumento: "dni" });
  await miembro("profinactivo", "profesor", tenant, { numeroDocumento: dni(3), tipoDocumento: "dni" }, "inactiva");
  await miembro("dirotro", "direccion", otro);
  await miembro("profotro", "profesor", otro, { numeroDocumento: dni(4), tipoDocumento: "dni" });
});

afterAll(async () => {
  const creados = await db.profile.findMany({ where: { email: { endsWith: `-${sufijo}@test-carga.demo` } }, select: { id: true } });
  await db.tenant.deleteMany({ where: { id: { in: [tenant.id, otro.id] } } });
  await db.profile.deleteMany({ where: { id: { in: [...perfiles, ...creados.map((p) => p.id)] } } });
  for (const id of authCreados) await supabaseAdmin().auth.admin.deleteUser(id).catch(() => {});
  await db.$disconnect();
}, 60_000);

describe("carga masiva de salones y cursos", () => {
  const archivo = () =>
    tabla(
      [
        "nivel,grado,seccion,tutor,curso,profesor",
        `primaria,3,B,${dni(1)},Matemática,${correo("prof1")}`,
        `primaria,3,B,,Comunicación,${dni(2)}`,
        "primaria,3,B,,Arte,x",
        `secundaria,1,A,${correo("prof2")},Ciencia y Tecnología,${dni(4)}`,
        `secundaria,1,A,,Inglés,${dni(3)}`,
        "colegio,1,A,,,",
      ].join("\n"),
    );

  it("la vista previa no escribe y cuenta lo que hará, con errores y avisos por línea", async () => {
    const v = await previsualizarSalones(ctxs.dir, archivo());
    expect(await db.salon.count({ where: { tenantId: tenant.id } })).toBe(0);
    expect(valor(v, "salonesNuevos")).toBe(2);
    expect(valor(v, "cursosNuevos")).toBe(5);
    expect(valor(v, "errores")).toBe(1);
    expect(v.errores[0]).toMatchObject({ linea: 7 });
    // El DNI del profesor de OTRO colegio no se encuentra aquí (aislamiento) y el inactivo no se asigna.
    expect(v.avisos.map((a) => a.linea)).toEqual([5, 6]);
    expect(v.avisos[0].mensaje).toContain("No encontramos al profesor");
    expect(v.avisos[1].mensaje).toContain("desactivado");
    expect(valor(v, "profesoresNoEncontrados")).toBe(1);
  });

  it("crea salones y cursos con tutor y profesor y lo audita", async () => {
    const r = await importarSalones(ctxs.dir, archivo());
    expect(r.ok).toBe(true);
    const salones = await db.salon.findMany({ where: { tenantId: tenant.id }, include: { cursos: true }, orderBy: { nombre: "asc" } });
    expect(salones.map((s) => [s.nombre, s.nivel, s.grado, s.seccion, s.tutorId])).toEqual([
      ["1.° A Sec.", "secundaria", 1, "A", ms.prof2.id],
      ["3.° B", "primaria", 3, "B", ms.prof1.id],
    ]);
    const cursos = Object.fromEntries(salones.flatMap((s) => s.cursos).map((c) => [c.nombre, c.profesorId]));
    expect(cursos).toEqual({ Matemática: ms.prof1.id, Comunicación: ms.prof2.id, Arte: null, "Ciencia y Tecnología": null, Inglés: null });
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, entidad: "carga_masiva" } })).toBe(1);
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, entidad: "curso", accion: "crear" } })).toBe(5);
  });

  it("volver a subir el archivo no duplica y actualiza tutor y profesor", async () => {
    const igual = await previsualizarSalones(ctxs.dir, archivo());
    expect(valor(igual, "salonesNuevos")).toBe(0);
    expect(valor(igual, "cursosNuevos")).toBe(0);
    expect(igual.aplicables).toBe(0);

    const cambios = tabla(`nivel,grado,seccion,tutor,curso,profesor\nprimaria,3,B,${dni(2)},Arte,${dni(1)}\nprimaria,3,B,,Música,\n`);
    const r = await importarSalones(ctxs.dir, cambios);
    expect([valor(r, "tutores"), valor(r, "cursosProfesor"), valor(r, "cursosNuevos"), valor(r, "salonesNuevos")]).toEqual([1, 1, 1, 0]);
    const salon = await db.salon.findFirstOrThrow({ where: { tenantId: tenant.id, nombre: "3.° B" }, include: { cursos: true } });
    expect(salon.tutorId).toBe(ms.prof2.id);
    expect(salon.cursos.find((c) => c.nombre === "Arte")?.profesorId).toBe(ms.prof1.id);
    expect(await db.salon.count({ where: { tenantId: tenant.id } })).toBe(2);
    expect(salon.cursos).toHaveLength(4);
  });

  it("reutiliza un salón existente creado a mano (por nombre) y rechaza nombres que chocan", async () => {
    const anio = new Date().getFullYear();
    await db.salon.create({ data: { tenantId: tenant.id, nombre: "Inicial 4 años", nivel: "inicial", grado: 4, seccion: null, anio } });
    await db.salon.create({ data: { tenantId: tenant.id, nombre: "Aula Roja", nivel: "primaria", anio } });
    const v = await previsualizarSalones(ctxs.dir, tabla("nivel,grado,seccion,nombre,curso\ninicial,4,,,Juego\nsecundaria,2,,Aula Roja,Arte\n"));
    expect(v.filas.map((f) => f.accion)).toEqual(["actualizar"]);
    expect(v.errores[0].mensaje).toContain("Aula Roja");
  });

  it("solo dirección: el administrativo y el profesor reciben 403", async () => {
    await esperarProhibido(previsualizarSalones(ctxs.adm, archivo()));
    await esperarProhibido(importarSalones(ctxs.prof1, archivo()));
  });

  it("el modo soporte no escribe", async () => {
    await expect(importarSalones({ ...ctxs.dir, soporte: { accesoId: randomUUID(), expiraAt: new Date(Date.now() + 60_000) } }, archivo())).rejects.toThrow("solo lectura");
  });
});

describe("carga masiva de familias", () => {
  let salonId = "";
  const alumnos: Record<string, string> = {};
  const encabezado = "alumno_codigo,alumno_dni,apoderado_dni,tipo_documento,nombres,apellidos,correo,celular,parentesco";

  beforeAll(async () => {
    salonId = (await db.salon.findFirstOrThrow({ where: { tenantId: tenant.id, nombre: "3.° B" } })).id;
    for (const [clave, extra] of [["mateo", { codigo: `M-${sufijo}` }], ["sofia", { codigo: `S-${sufijo}` }], ["luz", { numeroDocumento: dni(50) }], ["retirado", { codigo: `R-${sufijo}`, estado: "retirado" as const }]] as const) {
      alumnos[clave] = (await db.alumno.create({ data: { tenantId: tenant.id, salonId, nombres: clave, apellidos: "Carga", ...extra } })).id;
    }
    // Alumno de OTRO colegio con el mismo código que se busca: no debe encontrarse.
    const so = await db.salon.create({ data: { tenantId: otro.id, nombre: "1.° A", nivel: "primaria", anio: 2027 } });
    await db.alumno.create({ data: { tenantId: otro.id, salonId: so.id, nombres: "Ajeno", apellidos: "Otro", codigo: `X-${sufijo}` } });
    // Familia que ya estaba en el colegio con consentimiento vigente.
    await miembro("abuela", "apoderado", tenant, { numeroDocumento: dni(60), tipoDocumento: "dni" });
    await db.consentimiento.create({ data: { tenantId: tenant.id, apoderadoId: ms.abuela.id, versionTexto: "test" } });
  });

  const archivo = () =>
    tabla(
      [
        encabezado,
        `M-${sufijo},,${dni(10)},dni,Rosa,Madre Carga,${correo("rosa")},987654321,madre`,
        `S-${sufijo},,${dni(10)},dni,Rosa,Madre Carga,${correo("rosa")},,madre`,
        `,${dni(50)},${dni(11)},dni,Juan,Padre Carga,${correo("juan")},,padre`,
        `M-${sufijo},,${dni(60)},dni,abuela,Prueba,${correo("abuela")},,abuela`,
        `X-${sufijo},,${dni(12)},dni,Nadie,Otro,${correo("nadie")},,madre`,
        `R-${sufijo},,${dni(13)},dni,Nadie,Retiro,${correo("retiro")},,madre`,
        `M-${sufijo},,${dni(14)},dni,Copia,Prueba,${correo("adm")},,padre`,
      ].join("\n"),
    );

  it("la vista previa encuentra alumnos solo del colegio, cuenta hermanos y no escribe", async () => {
    const v = await previsualizarFamilias(ctxs.adm, archivo());
    expect(await db.apoderadoAlumno.count({ where: { alumnoId: alumnos.mateo } })).toBe(0);
    expect(v.errores.map((e) => e.linea)).toEqual([6, 7]);
    expect(v.errores[0].mensaje).toContain(`No encontramos al alumno con código X-${sufijo}`);
    expect(v.errores[1].mensaje).toContain("retirado");
    expect([valor(v, "familiasNuevas"), valor(v, "familiasConCuenta"), valor(v, "familiasExistentes"), valor(v, "hermanos"), valor(v, "vinculosNuevos")]).toEqual([2, 1, 1, 1, 5]);
  });

  it("crea cuentas con el DNI, membresía invitada, vínculos sin consentimiento y UNA bienvenida por familia", async () => {
    const r = await importarFamilias(ctxs.adm, archivo());
    expect(r.ok).toBe(true);
    const rosa = await db.profile.findUniqueOrThrow({ where: { email: correo("rosa") } });
    const juan = await db.profile.findUniqueOrThrow({ where: { email: correo("juan") } });
    authCreados.push(rosa.id, juan.id);
    expect(rosa).toMatchObject({ debeCambiarPassword: true, numeroDocumento: dni(10), telefono: "987654321" });
    expect((await supabaseAdmin().auth.signInWithPassword({ email: correo("rosa"), password: dni(10) })).error).toBeNull();

    const mRosa = await db.membership.findFirstOrThrow({ where: { tenantId: tenant.id, userId: rosa.id, rol: "apoderado" }, include: { hijos: true } });
    expect(mRosa.estado).toBe("invitada");
    expect(mRosa.hijos.map((h) => h.alumnoId).sort()).toEqual([alumnos.mateo, alumnos.sofia].sort());
    expect(mRosa.hijos.every((h) => h.consentimientoId === null)).toBe(true);
    expect(await db.consentimiento.count({ where: { apoderadoId: mRosa.id } })).toBe(0);

    // La familia existente con consentimiento: el vínculo nuevo lo hereda y no recibe otra bienvenida.
    const vAbuela = await db.apoderadoAlumno.findFirstOrThrow({ where: { apoderadoId: ms.abuela.id, alumnoId: alumnos.mateo } });
    expect(vAbuela.consentimientoId).not.toBeNull();

    const bienvenidas = await db.aviso.findMany({ where: { tenantId: tenant.id, plantilla: "bienvenida" } });
    expect(bienvenidas.map((a) => a.destinatario).sort()).toEqual([correo("adm"), correo("juan"), correo("rosa")].sort());
    expect(bienvenidas.every((a) => a.estado === "pendiente")).toBe(true);
    const aRosa = bienvenidas.find((a) => a.destinatario === correo("rosa"))!;
    expect(JSON.stringify(aRosa.payload)).not.toContain(dni(10));
    expect(aRosa.payload).toMatchObject({ cuentaNueva: true, documento: "DNI", rol: "Familia" });
    // El administrativo ya tenía cuenta: se agrega como familia y conserva su contraseña.
    expect(bienvenidas.find((a) => a.destinatario === correo("adm"))!.payload).toMatchObject({ cuentaNueva: false });
    expect(await db.auditoria.count({ where: { tenantId: tenant.id, entidad: "apoderado_alumno", accion: "crear" } })).toBe(5);
  });

  it("volver a subir no duplica cuentas, vínculos ni bienvenidas y actualiza el parentesco", async () => {
    const avisosAntes = await db.aviso.count({ where: { tenantId: tenant.id } });
    const cambio = tabla(`${encabezado}\nM-${sufijo},,${dni(10)},dni,Rosa,Madre Carga,${correo("rosa")},,tutora legal\nS-${sufijo},,${dni(10)},dni,Rosa,Madre Carga,${correo("rosa")},,madre\n`);
    const v = await previsualizarFamilias(ctxs.dir, cambio);
    expect(v.filas.map((f) => f.accion)).toEqual(["actualizar", "sin_cambios"]);
    const r = await importarFamilias(ctxs.dir, cambio, { crearUsuario: async () => { throw new Error("no debe crear cuentas"); } });
    expect(valor(r, "parentescos")).toBe(1);
    expect(await db.aviso.count({ where: { tenantId: tenant.id } })).toBe(avisosAntes);
    expect(await db.profile.count({ where: { email: correo("rosa") } })).toBe(1);
    const m = await db.membership.findFirstOrThrow({ where: { tenantId: tenant.id, user: { email: correo("rosa") } }, include: { hijos: true } });
    expect(m.hijos).toHaveLength(2);
    expect(m.hijos.find((h) => h.alumnoId === alumnos.mateo)?.parentesco).toBe("tutora legal");
  });

  it("rechaza el mismo documento con otro correo y el correo de la cuenta de un alumno", async () => {
    const alumnoCuenta = await db.profile.create({ data: { id: randomUUID(), email: correo("alumnocuenta"), nombres: "Al", apellidos: "Umno" } });
    perfiles.push(alumnoCuenta.id);
    await db.membership.create({ data: { tenantId: tenant.id, userId: alumnoCuenta.id, rol: "alumno" } });
    const v = await previsualizarFamilias(ctxs.dir, tabla(`${encabezado}\nS-${sufijo},,${dni(10)},dni,Rosa,Otra,${correo("rosa2")},,madre\nS-${sufijo},,${dni(15)},dni,Al,Umno,${correo("alumnocuenta")},,madre\n`));
    expect(v.errores.map((e) => e.mensaje)).toEqual([
      expect.stringContaining("ya es de otra familia del colegio"),
      expect.stringContaining("es la cuenta de un alumno"),
    ]);
  });

  it("reenviar invitación a una familia de la carga masiva encola de nuevo la bienvenida (no un enlace de Supabase)", async () => {
    const m = await db.membership.findFirstOrThrow({ where: { tenantId: tenant.id, user: { email: correo("juan") } } });
    const antes = await db.aviso.count({ where: { tenantId: tenant.id, plantilla: "bienvenida", destinatario: correo("juan") } });
    await reenviarInvitacion(ctxs.adm, m.id);
    expect(await db.aviso.count({ where: { tenantId: tenant.id, plantilla: "bienvenida", destinatario: correo("juan") } })).toBe(antes + 1);
  });

  it("si falla la creación de una cuenta, esas filas quedan como error y el resto se carga", async () => {
    const r = await importarFamilias(ctxs.dir, tabla(`${encabezado}\nS-${sufijo},,${dni(16)},dni,Falla,Uno,${correo("falla")},,madre\n,${dni(50)},${dni(60)},dni,abuela,Prueba,${correo("abuela")},,abuela\n`), {
      crearUsuario: async () => { throw new Error("Auth caído"); },
    });
    expect(r.ok).toBe(false);
    expect(r.errores).toEqual([{ linea: 2, mensaje: "No se pudo crear la cuenta." }]);
    expect(await db.apoderadoAlumno.count({ where: { apoderadoId: ms.abuela.id, alumnoId: alumnos.luz } })).toBe(1);
  });

  it("dirección y administrativo sí; profesor no; otro colegio no ve a estos alumnos", async () => {
    await esperarProhibido(previsualizarFamilias(ctxs.prof1, archivo()));
    await esperarProhibido(importarFamilias(ctxs.prof1, archivo()));
    const v = await previsualizarFamilias(ctxs.dirotro, tabla(`${encabezado}\nM-${sufijo},,${dni(10)},dni,Rosa,Madre,${correo("rosa")},,madre\n`));
    expect(v.errores[0].mensaje).toContain("No encontramos al alumno");
  });
});

describe("rendimiento: un colegio de 1 000 alumnos y 2 000 filas de familias", () => {
  let t: Tenant;
  let ctx: TenantContext;
  beforeAll(async () => {
    t = await db.tenant.create({ data: { slug: `test-carga-1000-${sufijo}`, nombre: "Colegio Mil", plan: "base" } });
    await miembro("dirmil", "direccion", t);
    ctx = ctxs.dirmil;
  });
  afterAll(async () => {
    const creados = await db.profile.findMany({ where: { email: { endsWith: `@mil-${sufijo}.demo` } }, select: { id: true } });
    await db.tenant.deleteMany({ where: { id: t.id } });
    await db.profile.deleteMany({ where: { id: { in: creados.map((p) => p.id) } } });
  }, 60_000);

  it("carga 40 salones, 1 000 alumnos y 2 000 vínculos en segundos, sin duplicar al repetir", { timeout: 120_000 }, async () => {
    const anio = 2027;
    const filasSalones = ["nivel,grado,seccion,anio,curso"];
    for (let g = 1; g <= 5; g++) for (const s of ["A", "B", "C", "D"]) for (const c of ["Matemática", "Comunicación", "Inglés"]) filasSalones.push(`secundaria,${g},${s},${anio},${c}`);
    for (let g = 1; g <= 5; g++) for (const s of ["A", "B", "C", "D"]) filasSalones.push(`primaria,${g},${s},${anio},Arte`);
    const rs = await importarSalones(ctx, tabla(filasSalones.join("\n")));
    expect(valor(rs, "salonesNuevos")).toBe(40);
    const salones = await db.salon.findMany({ where: { tenantId: t.id }, select: { id: true } });
    await db.alumno.createMany({ data: Array.from({ length: 1000 }, (_, i) => ({ tenantId: t.id, salonId: salones[i % 40].id, nombres: `A${i}`, apellidos: "Mil", codigo: `C${i}` })) });

    // ~1 300 apoderados (familias de 1–2 hijos y 1–2 apoderados) en 2 000 filas. Auth simulado: aquí se mide la BD.
    const filas = [encabezadoFamilias];
    let n = 0;
    for (let i = 0; filas.length <= 2000; i++) {
      const hijos = i % 3 === 0 ? [i % 1000, (i + 1) % 1000] : [i % 1000];
      for (const h of hijos) if (filas.length <= 2000) filas.push(`C${h},,${String(20_000_000 + i)},dni,P${i},Mil,p${i}@mil-${sufijo}.demo,,madre`);
      n = i;
    }
    let llamadas = 0;
    const falso: CrearUsuarioAuth = async () => { llamadas++; return randomUUID(); };
    const inicio = Date.now();
    const r = await importarFamilias(ctx, tabla(filas.join("\n")), { crearUsuario: falso });
    const ms1 = Date.now() - inicio;
    expect(r.ok).toBe(true);
    expect(valor(r, "vinculosNuevos")).toBe(2000);
    expect(llamadas).toBe(n + 1);
    expect(await db.aviso.count({ where: { tenantId: t.id, plantilla: "bienvenida" } })).toBe(n + 1);
    expect(ms1).toBeLessThan(60_000);

    const inicio2 = Date.now();
    const v = await previsualizarFamilias(ctx, tabla(filas.join("\n")));
    expect(v.aplicables).toBe(0);
    expect(Date.now() - inicio2).toBeLessThan(15_000);
    console.info(`[carga-masiva] 2 000 filas de familias: importación ${ms1} ms, vista previa repetida ${Date.now() - inicio2} ms`);
  });
});

const encabezadoFamilias = "alumno_codigo,alumno_dni,apoderado_dni,tipo_documento,nombres,apellidos,correo,celular,parentesco";
