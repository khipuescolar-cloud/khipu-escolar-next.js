// Requiere la BD local y Supabase Auth (pnpm db:start). Crea su propio colegio `test-ui2-*` y lo borra al terminar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Membership, Profile, Tenant } from "@/generated/prisma/client";
import { activarInvitaciones } from "@/lib/server/auth";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import { cambiarGeneroProfesor, invitarUsuario, listarProfesores, reenviarInvitacion } from "@/lib/server/gestion";
import { altaPersonal } from "@/lib/server/personal";
import { logoParaPdf, quitarLogoColegio, subirLogoColegio, urlLogoColegio } from "@/lib/server/logo";
import { supabaseAdmin } from "@/lib/server/supabase";
import type { TenantContext } from "@/lib/server/tenant";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";

const sufijo = randomUUID().slice(0, 8);
let tenant: Tenant;
let direccion: Profile;
let dirMembership: Membership;
let ctx: TenantContext;
const authCreados: string[] = [];
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

beforeAll(async () => {
  tenant = await db.tenant.create({ data: { slug: `test-ui2-${sufijo}`, nombre: "Colegio UI2", plan: "basico" } });
  direccion = await db.profile.create({ data: { id: randomUUID(), email: `dir-${sufijo}@prueba.demo`, nombres: "Dora", apellidos: "Directora" } });
  dirMembership = await db.membership.create({ data: { tenantId: tenant.id, userId: direccion.id, rol: "direccion" } });
  ctx = { tenant, user: direccion, membership: dirMembership, rol: "direccion", roles: ["direccion"], db: dbTenant(tenant.id), ...accesoModulosDeCodigo(tenant.plan) };
});

afterAll(async () => {
  await quitarLogoColegio({ ...ctx, tenant: (await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } })) }).catch(() => {});
  await db.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
  await db.profile.deleteMany({ where: { id: { in: [direccion.id, ...authCreados] } } });
  for (const id of authCreados) await supabaseAdmin().auth.admin.deleteUser(id).catch(() => {});
  await db.$disconnect();
});

describe("invitación de familias → activa en el primer ingreso", () => {
  let userId = "";
  let membershipId = "";

  it("invitar a un apoderado deja la membresía «invitada»", async () => {
    const r = await invitarUsuario(ctx, { email: `fam-${sufijo}@prueba.demo`, nombres: "Ana", apellidos: "Familia", rol: "apoderado" });
    userId = r.userId;
    membershipId = r.membershipId;
    authCreados.push(userId);
    expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).estado).toBe("invitada");
  });

  it("se puede reenviar la invitación mientras esté pendiente", async () => {
    await reenviarInvitacion(ctx, membershipId);
    const avisos = await db.aviso.count({ where: { tenantId: tenant.id, plantilla: "invitacion" } });
    expect(avisos).toBe(2);
  });

  it("el primer ingreso la pasa a «activa»; ya no se puede reenviar", async () => {
    expect(await activarInvitaciones(userId)).toBe(1);
    expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).estado).toBe("activa");
    expect(await activarInvitaciones(userId)).toBe(0);
    await expect(reenviarInvitacion(ctx, membershipId)).rejects.toThrow("invitación pendiente");
  });
});

describe("género del profesor (alta con datos personales)", () => {
  let userId = "";
  let membershipId = "";

  it("el alta lo deja activo, con su género, y aparece en la lista", async () => {
    const r = await altaPersonal(ctx, {
      rol: "profesor", email: `prof-${sufijo}@prueba.demo`, nombres: "Ana", apellidos: "Profesora", genero: "femenino",
      tipoDocumento: "dni", numeroDocumento: "45678901",
    });
    userId = r.userId;
    membershipId = r.membershipId;
    authCreados.push(userId);
    const lista = await listarProfesores(ctx);
    expect(lista.find((p) => p.id === membershipId)).toMatchObject({ estado: "activa", user: { genero: "femenino" } });
  });

  it("dirección cambia el género de un profesor", async () => {
    await cambiarGeneroProfesor(ctx, membershipId, "masculino");
    expect((await db.profile.findUniqueOrThrow({ where: { id: userId } })).genero).toBe("masculino");
    await cambiarGeneroProfesor(ctx, membershipId, null);
    expect((await db.profile.findUniqueOrThrow({ where: { id: userId } })).genero).toBeNull();
  });
});

describe("logo del colegio", () => {
  it("sin logo no hay URL", async () => {
    expect(await urlLogoColegio(tenant)).toBeNull();
  });

  it("rechaza tipos no admitidos y archivos de más de 1 MB", async () => {
    await expect(subirLogoColegio(ctx, Buffer.from("<svg></svg>"))).rejects.toThrow("PNG, JPG o WEBP");
    await expect(subirLogoColegio(ctx, Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]))).rejects.toThrow("1 MB");
  });

  it("sube un PNG, lo guarda en tenants.logo_archivo_id y lo reemplaza al subir otro", async () => {
    await subirLogoColegio(ctx, PNG);
    const t1 = await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
    expect(t1.logoArchivoId).toBeTruthy();
    expect(await urlLogoColegio(t1)).toContain("/archivos/");
    expect((await logoParaPdf(t1))?.format).toBe("png");

    await subirLogoColegio({ ...ctx, tenant: t1 }, PNG);
    const t2 = await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
    expect(t2.logoArchivoId).not.toBe(t1.logoArchivoId);
    expect(await db.archivo.count({ where: { tenantId: tenant.id } })).toBe(1);

    await quitarLogoColegio({ ...ctx, tenant: t2 });
    expect((await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } })).logoArchivoId).toBeNull();
    expect(await db.archivo.count({ where: { tenantId: tenant.id } })).toBe(0);
  });
});
