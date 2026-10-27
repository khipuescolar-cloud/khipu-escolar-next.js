// Requiere la BD local y Supabase Auth (pnpm db:start). Crea colegios `test-plat-*` y cuentas `@test-plat.demo`, y los borra al terminar.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import { retirarLogo } from "@/lib/server/logo";
import {
  agregarAdministrador, cambiarEstado, cambiarPlan, crearColegio, detalleColegio, exportarColegioDesdePlataforma,
  metricasPlataforma, reenviarBienvenida, reporteColegios, requireAdminPlataforma, verificarAdminPlataforma,
  type AdminContext, type EntradaNuevoColegio,
} from "@/lib/server/plataforma";
import { supabaseAdmin } from "@/lib/server/supabase";
import { esperarProhibido } from "./ayudantes/colegio-prueba";

const control = vi.hoisted(() => ({ fallarBienvenida: false, usuario: null as unknown }));

// Falla simulada a mitad de la creación (después de crear la cuenta) para probar la compensación.
vi.mock("@/lib/server/cuentas", async (original) => {
  const m = await original<typeof import("@/lib/server/cuentas")>();
  return {
    ...m,
    encolarBienvenida: (...args: Parameters<typeof m.encolarBienvenida>) =>
      control.fallarBienvenida ? Promise.reject(new Error("falla simulada del correo")) : m.encolarBienvenida(...args),
  };
});
// Sesión simulada para requireAdminPlataforma.
vi.mock("@/lib/server/tenant", async (original) => ({
  ...(await original<typeof import("@/lib/server/tenant")>()),
  usuarioActual: async () => control.usuario,
}));

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";

const sufijo = randomUUID().slice(0, 8);
const correo = (n: string) => `${n}-${sufijo}@test-plat.demo`;
const dni = () => String(10_000_000 + Math.floor(Math.random() * 89_999_999));
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

let superadmin: Profile;
let comun: Profile;
let admin: AdminContext;

async function authIdsPorCorreo(email: string): Promise<string[]> {
  const filas = await db.$queryRaw<{ id: string }[]>`SELECT id::text FROM auth.users WHERE email = ${email}`;
  return filas.map((f) => f.id);
}

function entrada(slug: string, email: string, documento: string): EntradaNuevoColegio {
  return {
    colegio: { nombre: `Colegio Plataforma ${sufijo}`, eslogan: "Aprender juntos", slug, ciudad: "Cusco", plan: "fase2", estado: "piloto", emailDomains: "", escalaCalificacion: "literal" },
    administrador: { email, nombres: "Elena", apellidos: "Directora", tipoDocumento: "dni", numeroDocumento: documento, genero: "femenino", cargo: "Directora general" },
  };
}

beforeAll(async () => {
  superadmin = await db.profile.create({ data: { id: randomUUID(), email: correo("super"), nombres: "Equipo", apellidos: "Prueba" } });
  await db.adminPlataforma.create({ data: { userId: superadmin.id } });
  comun = await db.profile.create({ data: { id: randomUUID(), email: correo("comun"), nombres: "Comun", apellidos: "Prueba" } });
  admin = { user: superadmin };
});

afterAll(async () => {
  const tenants = await db.tenant.findMany({ where: { slug: { startsWith: `test-plat-${sufijo}` } } });
  for (const t of tenants) await retirarLogo(t).catch(() => {});
  await db.tenant.deleteMany({ where: { id: { in: tenants.map((t) => t.id) } } });
  await db.auditoriaPlataforma.deleteMany({ where: { OR: [{ actorId: superadmin.id }, { tenantId: { in: tenants.map((t) => t.id) } }] } });
  const perfiles = await db.profile.findMany({ where: { email: { endsWith: `-${sufijo}@test-plat.demo` } } });
  for (const p of perfiles) {
    for (const id of await authIdsPorCorreo(p.email)) await supabaseAdmin().auth.admin.deleteUser(id).catch(() => {});
  }
  await db.profile.deleteMany({ where: { id: { in: perfiles.map((p) => p.id) } } });
  await db.$disconnect();
});

describe("acceso al panel de plataforma", () => {
  it("un usuario que no es super administrador recibe 403", async () => {
    await esperarProhibido(verificarAdminPlataforma(comun));
    control.usuario = comun;
    await esperarProhibido(requireAdminPlataforma());
  });

  it("un super administrador inactivo recibe 403", async () => {
    await db.adminPlataforma.update({ where: { userId: superadmin.id }, data: { activo: false } });
    try {
      await esperarProhibido(verificarAdminPlataforma(superadmin));
    } finally {
      await db.adminPlataforma.update({ where: { userId: superadmin.id }, data: { activo: true } });
    }
  });

  it("sin sesión va al login y con la contraseña inicial va a cambiarla", async () => {
    await expect(verificarAdminPlataforma(null)).rejects.toMatchObject({ digest: expect.stringContaining("/login") });
    await expect(verificarAdminPlataforma({ ...superadmin, debeCambiarPassword: true })).rejects.toMatchObject({
      digest: expect.stringContaining("/cambiar-password"),
    });
  });

  it("el super administrador activo pasa", async () => {
    control.usuario = superadmin;
    expect((await requireAdminPlataforma()).user.id).toBe(superadmin.id);
  });
});

describe("crearColegio", () => {
  const slug = `test-plat-${sufijo}-a`;
  const email = correo("directora");
  const documento = dni();
  let tenantId = "";
  let userId = "";

  it("crea colegio, insignia, cuenta con DNI, membresía de dirección y el aviso de bienvenida", async () => {
    const r = await crearColegio(admin, entrada(slug, email, documento), PNG);
    tenantId = r.tenant.id;
    userId = r.userId;
    expect(r.cuentaNueva).toBe(true);

    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    expect(tenant).toMatchObject({ slug, eslogan: "Aprender juntos", plan: "fase2", estado: "piloto", ciudad: "Cusco" });
    expect(tenant.logoArchivoId).not.toBeNull();
    expect(await db.archivo.findFirst({ where: { id: tenant.logoArchivoId!, tenantId, privado: false } })).not.toBeNull();

    const perfil = await db.profile.findUniqueOrThrow({ where: { id: userId } });
    expect(perfil).toMatchObject({ email, numeroDocumento: documento, tipoDocumento: "dni", debeCambiarPassword: true });
    expect(await db.membership.findFirst({ where: { tenantId, userId, rol: "direccion", estado: "activa", cargo: "Directora general" } })).not.toBeNull();

    const aviso = await db.aviso.findUniqueOrThrow({ where: { id: r.avisoId } });
    expect(aviso).toMatchObject({ tenantId, plantilla: "bienvenida", destinatario: email, estado: "pendiente", canal: "correo" });
    const payload = aviso.payload as Record<string, unknown>;
    expect(payload.url).toBe(`http://${slug}.${process.env.APP_BASE_DOMAIN}/inicio`);
    expect(payload.documento).toBe("DNI");
    expect(JSON.stringify(aviso)).not.toContain(documento);

    expect(await db.auditoriaPlataforma.count({ where: { tenantId, accion: "crear_colegio", actorId: superadmin.id } })).toBe(1);
  });

  it("la contraseña inicial es el número de DNI", async () => {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data, error } = await anon.auth.signInWithPassword({ email, password: documento });
    expect(error).toBeNull();
    expect(data.user?.id).toBe(userId);
  });

  it("rechaza un subdominio repetido, reservado o inválido sin crear nada", async () => {
    await expect(crearColegio(admin, entrada(slug, correo("otra"), dni()))).rejects.toThrow("ya está en uso");
    await expect(crearColegio(admin, entrada("admin", correo("otra"), dni()))).rejects.toThrow("reservada");
    await expect(crearColegio(admin, entrada("Con Espacios", correo("otra"), dni()))).rejects.toThrow("minúsculas");
    await expect(crearColegio(admin, { ...entrada(`test-plat-${sufijo}-x`, correo("otra"), "123") })).rejects.toThrow("8 dígitos");
    await expect(crearColegio(admin, entrada(`test-plat-${sufijo}-x`, correo("otra"), dni()), Buffer.from("<svg/>"))).rejects.toThrow("PNG, JPG o WEBP");
    expect(await db.tenant.count({ where: { slug: `test-plat-${sufijo}-x` } })).toBe(0);
    expect(await db.profile.count({ where: { email: correo("otra") } })).toBe(0);
  });

  it("acciones del detalle: plan, estado, reenviar bienvenida y otro administrador (todas auditadas)", async () => {
    await cambiarPlan(admin, tenantId, "promax");
    await cambiarEstado(admin, tenantId, "activo");
    expect(await db.tenant.findUniqueOrThrow({ where: { id: tenantId } })).toMatchObject({ plan: "promax", estado: "activo" });

    const m = await db.membership.findFirstOrThrow({ where: { tenantId, userId } });
    const avisoId = await reenviarBienvenida(admin, tenantId, m.id);
    expect(JSON.stringify(await db.aviso.findUniqueOrThrow({ where: { id: avisoId } }))).not.toContain(documento);

    const otro = await agregarAdministrador(admin, tenantId, {
      email: correo("subdirector"), nombres: "Raúl", apellidos: "Subdirector", tipoDocumento: "dni", numeroDocumento: dni(), cargo: "Subdirector",
    });
    expect(otro.membership).toMatchObject({ rol: "direccion", estado: "activa", cargo: "Subdirector" });
    await expect(
      agregarAdministrador(admin, tenantId, { email: correo("subdirector"), nombres: "Raúl", apellidos: "Subdirector", tipoDocumento: "dni", numeroDocumento: dni(), cargo: "Subdirector" }),
    ).rejects.toThrow("ya es administradora");

    const acciones = (await db.auditoriaPlataforma.findMany({ where: { tenantId }, select: { accion: true } })).map((a) => a.accion);
    expect(acciones).toEqual(expect.arrayContaining(["crear_colegio", "cambiar_plan", "cambiar_estado", "reenviar_bienvenida", "agregar_administrador"]));
  });

  it("un id de colegio de otro lado o inválido da 404", async () => {
    await expect(cambiarPlan(admin, randomUUID(), "basico")).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    await expect(cambiarPlan(admin, "no-es-uuid", "basico")).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    const m = await db.membership.findFirstOrThrow({ where: { tenantId, userId } });
    const otro = await db.tenant.findFirstOrThrow({ where: { id: { not: tenantId } } });
    await expect(reenviarBienvenida(admin, otro.id, m.id)).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("exporta el ZIP y queda auditado", async () => {
    const { zip } = await exportarColegioDesdePlataforma(admin, tenantId);
    expect(zip.length).toBeGreaterThan(100);
    expect(await db.auditoriaPlataforma.count({ where: { tenantId, accion: "exportar_colegio" } })).toBe(1);
  });

  it("reportes y métricas no contienen datos de alumnos", async () => {
    const salon = await db.salon.create({ data: { tenantId, nombre: "1.° A", nivel: "primaria", anio: 2026 } });
    await db.alumno.create({ data: { tenantId, salonId: salon.id, nombres: `Zacarías${sufijo}`, apellidos: `Secretísimo${sufijo}`, codigo: `COD-${sufijo}` } });

    const filas = await reporteColegios(admin, { q: slug });
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ id: tenantId, alumnos: 1 });
    const detalle = await detalleColegio(admin, tenantId);
    const metricas = await metricasPlataforma(admin);
    expect(metricas.alumnos).toBeGreaterThanOrEqual(1);
    for (const salida of [filas, detalle, metricas]) {
      const texto = JSON.stringify(salida);
      expect(texto).not.toContain(`Zacarías${sufijo}`);
      expect(texto).not.toContain(`Secretísimo${sufijo}`);
      expect(texto).not.toContain(`COD-${sufijo}`);
      expect(texto).not.toContain(documento);
    }
    expect(Object.keys(filas[0]).sort()).toEqual(
      ["abiertos7d", "alumnos", "asistencias7d", "avisos7d", "ciudad", "createdAt", "estado", "familias", "id", "nombre", "plan", "profesores", "rebotes7d", "slug", "ultimoIngreso", "usuariosActivos7d"].sort(),
    );
  });
});

describe("compensación si algo falla a la mitad", () => {
  it("borra el colegio, la cuenta nueva de Auth y su perfil", async () => {
    const slug = `test-plat-${sufijo}-rollback`;
    const email = correo("rollback");
    control.fallarBienvenida = true;
    try {
      await expect(crearColegio(admin, entrada(slug, email, dni()), PNG)).rejects.toThrow("falla simulada");
    } finally {
      control.fallarBienvenida = false;
    }
    expect(await db.tenant.count({ where: { slug } })).toBe(0);
    expect(await db.profile.count({ where: { email } })).toBe(0);
    expect(await authIdsPorCorreo(email)).toHaveLength(0);
    expect(await db.auditoriaPlataforma.count({ where: { accion: "crear_colegio", detalle: { path: ["slug"], equals: slug } } })).toBe(0);
  });

  it("si la cuenta ya existía, no la borra y revierte los datos vacíos que completó", async () => {
    const slug = `test-plat-${sufijo}-rollback2`;
    const antes = await db.profile.findUniqueOrThrow({ where: { id: comun.id } });
    expect(antes.numeroDocumento).toBeNull();
    control.fallarBienvenida = true;
    try {
      await expect(crearColegio(admin, entrada(slug, correo("comun"), dni()))).rejects.toThrow("falla simulada");
    } finally {
      control.fallarBienvenida = false;
    }
    expect(await db.tenant.count({ where: { slug } })).toBe(0);
    const despues = await db.profile.findUniqueOrThrow({ where: { id: comun.id } });
    expect(despues).toMatchObject({ nombres: antes.nombres, apellidos: antes.apellidos, tipoDocumento: null, numeroDocumento: null, genero: null });
  });

  it("no revierte datos que el perfil ya tenía", async () => {
    const slug = `test-plat-${sufijo}-rollback3`;
    await db.profile.update({ where: { id: comun.id }, data: { telefono: "999111222" } });
    control.fallarBienvenida = true;
    try {
      const e = entrada(slug, correo("comun"), dni());
      await expect(crearColegio(admin, { ...e, administrador: { ...e.administrador, telefono: "988000000" } })).rejects.toThrow("falla simulada");
    } finally {
      control.fallarBienvenida = false;
    }
    const despues = await db.profile.findUniqueOrThrow({ where: { id: comun.id } });
    expect(despues.telefono).toBe("999111222");
    expect(despues.numeroDocumento).toBeNull();
    await db.profile.update({ where: { id: comun.id }, data: { telefono: null } });
  });
});
