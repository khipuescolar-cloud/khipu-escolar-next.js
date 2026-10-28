// Requiere la BD local y Supabase Auth (pnpm db:start). Crea colegios `test-com-*` y cuentas `@test-com.demo`, y los borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { fechaLima } from "@/lib/fechas";
import { db } from "@/lib/server/db";
import { crearColegio, type AdminContext, type EntradaNuevoColegio } from "@/lib/server/plataforma";
import {
  agregarResponsable, editarResponsable, listarResponsables, marcarPrincipal, quitarResponsable, responsablesAnteKhipu,
} from "@/lib/server/plataforma-responsables";
import { anularPago, guardarSuscripcion, registrarPago, reporteSuscripciones, resumir, suscripcionDelColegio } from "@/lib/server/plataforma-suscripciones";
import { supabaseAdmin } from "@/lib/server/supabase";

const sufijo = randomUUID().slice(0, 8);
const correo = (n: string) => `${n}-${sufijo}@test-com.demo`;
const dni = () => String(10_000_000 + Math.floor(Math.random() * 89_999_999));

let superadmin: Profile;
let admin: AdminContext;
let tenantA = "";
let tenantB = "";

const entrada = (slug: string, email: string): EntradaNuevoColegio => ({
  colegio: { nombre: `Colegio Comercial ${sufijo}`, eslogan: "", slug, ciudad: "Lima", plan: "basico", estado: "piloto", emailDomains: "", escalaCalificacion: "literal" },
  administrador: { email, nombres: "Rosa", apellidos: "Directora", tipoDocumento: "dni", numeroDocumento: dni(), cargo: "Directora general" },
  responsable: { tipo: "facturacion", nombres: "Carlos", apellidos: "Conta", email: correo("conta"), cargo: "Contador", telefono: "999111222" },
});

async function authIdsPorCorreo(email: string): Promise<string[]> {
  const filas = await db.$queryRaw<{ id: string }[]>`SELECT id::text FROM auth.users WHERE email = ${email}`;
  return filas.map((f) => f.id);
}

beforeAll(async () => {
  superadmin = await db.profile.create({ data: { id: randomUUID(), email: correo("super"), nombres: "Equipo", apellidos: "Prueba" } });
  await db.adminPlataforma.create({ data: { userId: superadmin.id } });
  admin = { user: superadmin };
  tenantA = (await crearColegio(admin, entrada(`test-com-${sufijo}-a`, correo("dir-a")))).tenant.id;
  tenantB = (await crearColegio(admin, { ...entrada(`test-com-${sufijo}-b`, correo("dir-b")), responsable: undefined })).tenant.id;
});

afterAll(async () => {
  const tenants = await db.tenant.findMany({ where: { slug: { startsWith: `test-com-${sufijo}` } } });
  await db.tenant.deleteMany({ where: { id: { in: tenants.map((t) => t.id) } } });
  await db.auditoriaPlataforma.deleteMany({ where: { OR: [{ actorId: superadmin.id }, { tenantId: { in: tenants.map((t) => t.id) } }] } });
  const perfiles = await db.profile.findMany({ where: { email: { endsWith: `-${sufijo}@test-com.demo` } } });
  for (const p of perfiles) for (const id of await authIdsPorCorreo(p.email)) await supabaseAdmin().auth.admin.deleteUser(id).catch(() => {});
  await db.profile.deleteMany({ where: { id: { in: perfiles.map((p) => p.id) } } });
  await db.$disconnect();
});

const principales = (tenantId: string) => db.contactoColegio.findMany({ where: { tenantId, principal: true } });

describe("responsables del colegio", () => {
  it("al crear el colegio, el administrador es el principal y el segundo responsable no tiene acceso", async () => {
    const lista = await listarResponsables(admin, tenantA);
    expect(lista).toHaveLength(2);
    const principal = lista.find((r) => r.principal)!;
    expect(principal).toMatchObject({ tipo: "principal", email: correo("dir-a"), cargo: "Directora general" });
    expect(principal.acceso).toMatchObject({ estado: "activa", debeCambiarPassword: true });
    const conta = lista.find((r) => !r.principal)!;
    expect(conta).toMatchObject({ tipo: "facturacion", acceso: null, telefono: "999111222" });
    expect(await principales(tenantA)).toHaveLength(1);
  });

  it("dar acceso crea la membresía de dirección y encola la bienvenida", async () => {
    const email = correo("acad");
    const r = await agregarResponsable(
      admin, tenantA,
      { tipo: "direccion_academica", nombres: "Lucía", apellidos: "Acad", email, cargo: "Subdirectora" },
      { tipoDocumento: "dni", numeroDocumento: dni() },
    );
    expect(r).toMatchObject({ conAcceso: true, cuentaNueva: true });
    const c = await db.contactoColegio.findUniqueOrThrow({ where: { id: r.id } });
    expect(c).toMatchObject({ tipo: "direccion_academica", principal: false, apellidos: "Acad" });
    const m = await db.membership.findFirstOrThrow({ where: { id: c.membershipId!, tenantId: tenantA } });
    expect(m).toMatchObject({ rol: "direccion", estado: "activa", cargo: "Subdirectora" });
    expect(await db.aviso.count({ where: { tenantId: tenantA, plantilla: "bienvenida", destinatario: email } })).toBe(1);
    expect(await db.auditoriaPlataforma.count({ where: { tenantId: tenantA, accion: "agregar_responsable" } })).toBeGreaterThan(0);
  });

  it("sin acceso no crea cuenta ni membresía; el correo no se repite en el colegio", async () => {
    const email = correo("soporte");
    const r = await agregarResponsable(admin, tenantA, { tipo: "tecnico", nombres: "Ana", apellidos: "TI", email });
    expect(r.conAcceso).toBe(false);
    expect((await db.contactoColegio.findUniqueOrThrow({ where: { id: r.id } })).membershipId).toBeNull();
    expect(await authIdsPorCorreo(email)).toHaveLength(0);
    await expect(agregarResponsable(admin, tenantA, { tipo: "otro", nombres: "Otra", apellidos: "", email })).rejects.toThrow(/Ya hay un responsable/);
  });

  it("hay exactamente un principal: marcar otro mueve la marca (el anterior queda como dirección académica)", async () => {
    const antes = (await principales(tenantA))[0];
    const conta = (await listarResponsables(admin, tenantA)).find((r) => r.email === correo("conta"))!;
    await marcarPrincipal(admin, tenantA, conta.id);
    const ahora = await principales(tenantA);
    expect(ahora).toHaveLength(1);
    expect(ahora[0]).toMatchObject({ id: conta.id, tipo: "principal" });
    expect(await db.contactoColegio.findUniqueOrThrow({ where: { id: antes.id } })).toMatchObject({ principal: false, tipo: "direccion_academica" });
  });

  it("quitar al principal exige elegir su reemplazo", async () => {
    const principal = (await principales(tenantA))[0];
    await expect(quitarResponsable(admin, tenantA, principal.id)).rejects.toThrow(/reemplaza/);
    await expect(quitarResponsable(admin, tenantA, principal.id, { reemplazoId: principal.id })).rejects.toThrow(/otra persona/);
    expect(await db.contactoColegio.count({ where: { id: principal.id } })).toBe(1);

    const nuevo = (await listarResponsables(admin, tenantA)).find((r) => r.email === correo("dir-a"))!;
    await quitarResponsable(admin, tenantA, principal.id, { reemplazoId: nuevo.id });
    expect(await db.contactoColegio.count({ where: { id: principal.id } })).toBe(0);
    const ahora = await principales(tenantA);
    expect(ahora).toHaveLength(1);
    expect(ahora[0].id).toBe(nuevo.id);
  });

  it("quitar con acceso puede desactivar la membresía; sin marcar, la deja activa", async () => {
    const lista = await listarResponsables(admin, tenantA);
    const acad = lista.find((r) => r.email === correo("acad"))!;
    await quitarResponsable(admin, tenantA, acad.id, { desactivarAcceso: true });
    expect(await db.membership.findFirstOrThrow({ where: { id: acad.membershipId! } })).toMatchObject({ estado: "inactiva" });
    // Quitar a la directora (principal, con reemplazo) sin desactivar: su membresía sigue activa.
    const dir = lista.find((r) => r.email === correo("dir-a"))!;
    const otro = await agregarResponsable(admin, tenantA, { tipo: "otro", nombres: "Pedro", apellidos: "Otro", email: correo("otro") });
    await quitarResponsable(admin, tenantA, dir.id, { reemplazoId: otro.id });
    expect(await db.membership.findFirstOrThrow({ where: { id: dir.membershipId! } })).toMatchObject({ estado: "activa" });
  });

  it("editar no cambia el correo de quien tiene acceso", async () => {
    const [a] = await responsablesAnteKhipu(tenantB);
    await editarResponsable(admin, tenantB, a.id, { tipo: "otro", nombres: "Rosa M.", apellidos: "Directora", email: "otro@x.demo", cargo: "Dirección", telefono: "955" });
    const c = await db.contactoColegio.findUniqueOrThrow({ where: { id: a.id } });
    expect(c).toMatchObject({ nombres: "Rosa M.", email: correo("dir-b"), telefono: "955", tipo: "principal", principal: true });
  });

  it("aislamiento: un colegio no toca los responsables de otro", async () => {
    const deB = (await responsablesAnteKhipu(tenantB))[0];
    await expect(editarResponsable(admin, tenantA, deB.id, { tipo: "otro", nombres: "X", apellidos: "", email: "x@x.demo" })).rejects.toBeDefined();
    await expect(marcarPrincipal(admin, tenantA, deB.id)).rejects.toBeDefined();
    await expect(quitarResponsable(admin, tenantA, deB.id)).rejects.toBeDefined();
    expect(await db.contactoColegio.count({ where: { id: deB.id } })).toBe(1);
    expect((await responsablesAnteKhipu(tenantB)).every((r) => r.email.endsWith("@test-com.demo"))).toBe(true);
    expect((await responsablesAnteKhipu(tenantA)).some((r) => r.id === deB.id)).toBe(false);
  });
});

describe("suscripción y pagos", () => {
  const hoy = fechaLima(new Date());
  const base = { plan: "fase2", ciclo: "anual", estado: "activa", montoPorCiclo: 3600 as number, alumnosContratados: 100 as number, inicio: "2026-01-01", proximaRenovacion: "2026-12-31", notas: "Convenio" } as const;

  it("crea y edita la suscripción (una por colegio) con auditoría", async () => {
    await guardarSuscripcion(admin, tenantA, base);
    await guardarSuscripcion(admin, tenantA, { ...base, montoPorCiclo: 3000 });
    const d = await suscripcionDelColegio(admin, tenantA);
    expect(d.suscripcion).toMatchObject({ plan: "fase2", ciclo: "anual", estado: "activa", montoPorCiclo: 3000, alumnosContratados: 100, proximaRenovacion: "2026-12-31" });
    expect(await db.suscripcion.count({ where: { tenantId: tenantA } })).toBe(1);
    expect(await db.auditoriaPlataforma.count({ where: { tenantId: tenantA, accion: "guardar_suscripcion" } })).toBe(2);
    await expect(guardarSuscripcion(admin, tenantA, { ...base, proximaRenovacion: "2025-12-31" })).rejects.toThrow(/antes del inicio/);
  });

  it("registra un pago, adelanta la renovación y lo anula con auditoría", async () => {
    const r = await registrarPago(admin, tenantA, {
      monto: 3000, fechaPago: hoy, periodoDesde: "2027-01-01", periodoHasta: "2027-12-31", metodo: "yape", comprobante: "B001-1", avanzarRenovacion: true,
    });
    expect(r.renovacion).toBe("2028-01-01");
    const d = await suscripcionDelColegio(admin, tenantA);
    expect(d.pagos).toHaveLength(1);
    expect(d.pagos[0]).toMatchObject({ monto: 3000, metodo: "yape", comprobante: "B001-1", registradoPor: "Equipo Prueba" });
    expect(d.suscripcion?.proximaRenovacion).toBe("2028-01-01");

    await expect(registrarPago(admin, tenantA, { monto: 0, fechaPago: hoy, periodoDesde: hoy, periodoHasta: hoy, metodo: "otro" })).rejects.toThrow();
    await expect(registrarPago(admin, tenantA, { monto: 10, fechaPago: hoy, periodoDesde: "2027-02-01", periodoHasta: "2027-01-01", metodo: "otro" })).rejects.toThrow(/termina antes/);

    // Otro colegio no puede anularlo.
    await expect(anularPago(admin, tenantB, r.id)).rejects.toBeDefined();
    await anularPago(admin, tenantA, r.id);
    expect((await suscripcionDelColegio(admin, tenantA)).pagos).toHaveLength(0);
    const log = await db.auditoriaPlataforma.findFirstOrThrow({ where: { tenantId: tenantA, accion: "anular_pago" } });
    expect(log.detalle).toMatchObject({ pagoId: r.id, monto: 3000, comprobante: "B001-1" });
    expect(await db.auditoriaPlataforma.count({ where: { tenantId: tenantA, accion: "registrar_pago" } })).toBe(1);
  });

  it("el reporte marca «vencida» por fecha de Lima y calcula el resumen", async () => {
    await guardarSuscripcion(admin, tenantB, { ...base, ciclo: "mensual", montoPorCiclo: 100, proximaRenovacion: "2026-10-20" });
    const { filas } = await reporteSuscripciones(admin, { estado: "activa" }, "2026-10-28");
    const b = filas.find((f) => f.tenantId === tenantB)!;
    expect(b.renovacion).toEqual({ tipo: "vencida", dias: -8 });
    const r = resumir(filas.filter((f) => f.tenantId === tenantB || f.tenantId === tenantA));
    expect(r.vencidas).toBeGreaterThanOrEqual(1);
    const sola = resumir([b, { ...b, tenantId: "x", suscripcion: { ...b.suscripcion!, ciclo: "anual", montoPorCiclo: 1200 }, renovacion: { tipo: "por_vencer", dias: 5 } }]);
    expect(sola).toMatchObject({ ingresoMensual: 200, vencidas: 1, porRenovar: 1, enPrueba: 0 });
    const sin = await reporteSuscripciones(admin, { estado: "sin" });
    expect(sin.filas.some((f) => f.tenantId === tenantB)).toBe(false);
  });
});
