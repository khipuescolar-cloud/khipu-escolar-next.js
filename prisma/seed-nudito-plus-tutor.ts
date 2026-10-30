// Datos demo de Nudito+ · tutor (specs/29). Ficticios. Se llama al final de prisma/seed.ts.
// - Grado del salón 5.° A de Nuevo Horizonte (→ 5). El 3.° B se deja sin grado: otros e2e crean ahí cuentas de alumno.
// - Lucas Huamán Soto en 5.° A con cuenta propia (lucas.huaman@nuevohorizonte.demo / demo123) y su madre
//   Julia Soto Rivas (familia.huaman@familia.demo / demo123). No se agrega un 2.° hijo a Rosa en Nuevo Horizonte:
//   varios e2e asumen que Rosa tiene un solo hijo allí (Mateo, 3.° B, sin cuenta → «modo hijo»).
// - Lista blanca de sitios (SitioPermitido) y dos conversaciones pasadas de Lucas con su uso del mes.
// NO crea licencias ni consentimientos de IA (los maneja specs/28): ver «Pruebas» en specs/29.
import { createClient } from "@supabase/supabase-js";
import type { PrismaClient } from "../src/generated/prisma/client";

const PASSWORD = "demo123";
const CORREO_LUCAS = "lucas.huaman@nuevohorizonte.demo";
const CORREO_JULIA = "familia.huaman@familia.demo";

const SITIOS = [
  { dominio: "perueduca.pe", nombre: "PerúEduca", descripcion: "Plataforma educativa del Minedu." },
  { dominio: "aprendoencasa.pe", nombre: "Aprendo en casa", descripcion: "Recursos por grado del Minedu." },
  { dominio: "minedu.gob.pe", nombre: "Minedu", descripcion: "Ministerio de Educación del Perú (CNEB)." },
  { dominio: "khanacademy.org", nombre: "Khan Academy", descripcion: "Ejercicios guiados de matemática y ciencias." },
];

async function usuarioAuth(email: string): Promise<string> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existente = lista.users.find((u) => u.email === email)?.id;
  if (existente) {
    await supabase.auth.admin.updateUserById(existente, { password: PASSWORD });
    return existente;
  }
  const { data, error } = await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw error ?? new Error(`No se creó ${email}`);
  return data.user.id;
}

const haceDias = (dias: number, hora = 17) => {
  const d = new Date(Date.now() - dias * 86_400_000);
  d.setUTCHours(hora + 5, 0, 0, 0); // hora de Lima
  return d;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma común de los seeds por área; los ids se buscan aquí
export async function sembrarNuditoPlusTutor(prisma: PrismaClient, _ids: Record<string, string> = {}): Promise<void> {
  const nh = await prisma.tenant.findUnique({ where: { slug: "nuevohorizonte" } });
  if (!nh) return;
  const salones = await prisma.salon.findMany({ where: { tenantId: nh.id } });
  const s5a = salones.find((s) => s.nombre.startsWith("5"));
  if (!s5a) return;
  if (s5a.grado === null) await prisma.salon.update({ where: { id: s5a.id }, data: { grado: 5 } });

  // Lista blanca global (la administra el equipo Khipu).
  const admin = await prisma.profile.findUnique({ where: { email: "admin@khipuescolar.demo" } });
  for (const s of SITIOS) {
    await prisma.sitioPermitido.upsert({ where: { dominio: s.dominio }, update: {}, create: { ...s, creadoPorId: admin?.id ?? "00000000-0000-0000-0000-000000000000" } });
  }

  // Familia Huamán: Julia (apoderada, con consentimiento de avisos) y Lucas (5.° A, con cuenta propia).
  const juliaId = await usuarioAuth(CORREO_JULIA);
  await prisma.profile.upsert({
    where: { id: juliaId },
    update: { email: CORREO_JULIA, nombres: "Julia", apellidos: "Soto Rivas", genero: "femenino" },
    create: { id: juliaId, email: CORREO_JULIA, nombres: "Julia", apellidos: "Soto Rivas", genero: "femenino" },
  });
  const julia =
    (await prisma.membership.findFirst({ where: { tenantId: nh.id, userId: juliaId, rol: "apoderado" } })) ??
    (await prisma.membership.create({ data: { tenantId: nh.id, userId: juliaId, rol: "apoderado" } }));
  let lucas = await prisma.alumno.findFirst({ where: { tenantId: nh.id, nombres: "Lucas", apellidos: "Huamán Soto" } });
  if (!lucas) {
    lucas = await prisma.alumno.create({ data: { tenantId: nh.id, salonId: s5a.id, nombres: "Lucas", apellidos: "Huamán Soto", codigo: "2026-105" } });
  }
  if (!(await prisma.apoderadoAlumno.findFirst({ where: { apoderadoId: julia.id, alumnoId: lucas.id } }))) {
    const consentimiento = await prisma.consentimiento.create({ data: { tenantId: nh.id, apoderadoId: julia.id, versionTexto: "v1-2026-10 (borrador pendiente de revisión legal)" } });
    await prisma.apoderadoAlumno.create({ data: { tenantId: nh.id, apoderadoId: julia.id, alumnoId: lucas.id, parentesco: "madre", consentimientoId: consentimiento.id } });
    await prisma.preferenciaAviso.upsert({ where: { apoderadoId: julia.id }, update: {}, create: { tenantId: nh.id, apoderadoId: julia.id } });
  }

  const userId = await usuarioAuth(CORREO_LUCAS);
  await prisma.profile.upsert({
    where: { id: userId },
    update: { email: CORREO_LUCAS, nombres: "Lucas", apellidos: "Huamán Soto", genero: "masculino" },
    create: { id: userId, email: CORREO_LUCAS, nombres: "Lucas", apellidos: "Huamán Soto", genero: "masculino" },
  });
  const cuenta =
    (await prisma.membership.findFirst({ where: { tenantId: nh.id, userId, rol: "alumno" } })) ??
    (await prisma.membership.create({ data: { tenantId: nh.id, userId, rol: "alumno" } }));
  await prisma.alumno.update({ where: { id: lucas.id }, data: { cuentaId: cuenta.id } });

  // Una tarea de 5.° A para que Nudito+ tenga contexto.
  const mate5 = await prisma.curso.findFirst({ where: { salonId: s5a.id, nombre: "Matemática" } });
  if (mate5?.profesorId && !(await prisma.tarea.findFirst({ where: { cursoId: mate5.id, titulo: "Problemas de fracciones equivalentes" } }))) {
    await prisma.tarea.create({
      data: { tenantId: nh.id, cursoId: mate5.id, titulo: "Problemas de fracciones equivalentes", fechaEntrega: new Date(Date.now() + 3 * 86_400_000), creadoPorId: mate5.profesorId },
    });
  }

  // Dos conversaciones pasadas de Lucas (modo alumno). Metadatos «área|tema|estado» para los resúmenes.
  if ((await prisma.nuditoConversacion.count({ where: { alumnoId: lucas.id } })) > 0) return;
  const conversaciones: { dias: number; mensajes: [string, string, string | null][] }[] = [
    {
      dias: 6,
      mensajes: [
        ["usuario", "¡Hola, Nudito!", null],
        ["nudito", "¡Hola, Lucas! Soy Nudito, un asistente con IA.\n¿Con qué curso quieres practicar hoy? Puedo ayudarte con Matemática.", null],
        ["usuario", "No entiendo las fracciones equivalentes", "Matemática|Fracciones|dificultad"],
        ["nudito", "Las fracciones son partes de un todo.\nImagina una pizza cortada en 4 partes iguales. Si comes 1, ¿qué fracción comiste?\nTe dejo un recurso para practicar: PerúEduca → https://perueduca.pe", null],
        ["usuario", "1/4", "Matemática|Fracciones|ok"],
        ["nudito", "¡Muy bien! Ahora imagina que cortas esa misma pizza en 8 partes. ¿Cuántas partes comerías para comer lo mismo?", null],
      ],
    },
    {
      dias: 3,
      mensajes: [
        ["usuario", "¿Cuánto es 6 x 7?", "Matemática|Multiplicación|ok"],
        ["nudito", "Piensa 6 × 7 como 6 grupos de 7. ¿Cuánto te da si sumas 7, 6 veces?", null],
        ["usuario", "42", null],
        ["nudito", "¡Muy bien, Lucas! 6 × 7 = 42. Lo lograste tú. ¿Probamos con otro?", null],
      ],
    },
  ];
  let tokensEntrada = 0;
  let tokensSalida = 0;
  let respuestas = 0;
  for (const c of conversaciones) {
    const inicio = haceDias(c.dias);
    const conv = await prisma.nuditoConversacion.create({ data: { tenantId: nh.id, membershipId: cuenta.id, alumnoId: lucas.id, modo: "alumno", createdAt: inicio } });
    for (const [i, [autor, cuerpo, intencion]] of c.mensajes.entries()) {
      const esNudito = autor === "nudito";
      const te = esNudito ? 420 + i * 30 : null;
      const ts = esNudito ? Math.ceil(cuerpo.length / 4) : null;
      if (esNudito) {
        tokensEntrada += te!;
        tokensSalida += ts!;
        respuestas += 1;
      }
      await prisma.nuditoMensaje.create({
        data: {
          tenantId: nh.id, conversacionId: conv.id, autor: esNudito ? "nudito" : "usuario", cuerpo, intencion,
          tokensEntrada: te, tokensSalida: ts, createdAt: new Date(inicio.getTime() + i * 60_000),
        },
      });
    }
  }
  const mes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit" }).format(new Date());
  await prisma.usoNudito.upsert({
    where: { alumnoId_mes: { alumnoId: lucas.id, mes } },
    update: {},
    create: { tenantId: nh.id, alumnoId: lucas.id, mes, mensajes: respuestas, tokensEntrada, tokensSalida, costoEstimadoUsd: 0 },
  });
}
