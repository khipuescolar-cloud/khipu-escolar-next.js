// Demo de Nudito+ (specs/28): configuración, sitios permitidos (fuente única de la lista blanca demo), licencia activa
// con pago verificado y consentimiento para el hijo de Rosa en Nuevo Horizonte (Mateo, «modo hijo»), licencia de
// cortesía con consentimiento de Julia para Lucas Huamán (cuenta propia, la crea `seed-colegio.ts`), un pago Yape
// pendiente de verificar para Gael Chávez (5.° A), y una licencia de prueba
// que vence en 2 días (para ver el recordatorio y el filtro «vencen en 7 días»). Datos ficticios. Idempotente:
// reemplaza los datos de Nudito+ de esos alumnos y hace upsert de la configuración y los sitios.
//
// Desde specs/44 las licencias familiares están INERTES (`NUDITO_LICENCIAS_FAMILIARES = false`): mandan el plan Pro y la
// configuración del colegio. Con el interruptor apagado este seed NO crea licencias ni pagos (quedan como historia de
// specs/28); sí siembra el consentimiento de IA vigente (versión actual, v2) de Mateo (modo hijo de Rosa) y de Lucas
// (cuenta propia, consentimiento de Julia), los reportes de ejemplo y la configuración de plataforma.
import type { PrismaClient } from "../src/generated/prisma/client";
import { CLAVES_NUDITO_PLUS, CONSENTIMIENTO_POR_DEFECTO, LIMITES_POR_DEFECTO, periodoNuevo } from "../src/lib/nudito-plus";
import { NUDITO_LICENCIAS_FAMILIARES } from "../src/lib/planes";

const fechaDb = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const hoyLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const sumar = (iso: string, dias: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);

const SITIOS = [
  { dominio: "perueduca.pe", nombre: "PerúEduca", descripcion: "Plataforma educativa del Ministerio de Educación." },
  { dominio: "khanacademy.org", nombre: "Khan Academy", descripcion: "Videos y ejercicios de matemática y ciencias (es.khanacademy.org)." },
  { dominio: "aprendoencasa.pe", nombre: "Aprendo en casa", descripcion: "Experiencias de aprendizaje por grado del Minedu." },
  { dominio: "minedu.gob.pe", nombre: "Minedu", descripcion: "Currículo Nacional (CNEB) y materiales oficiales." },
];

export async function sembrarNuditoPlus(prisma: PrismaClient, ids: { superadminId?: string } = {}) {
  const hoy = hoyLima();
  const superadminId = ids.superadminId ?? (await prisma.profile.findUnique({ where: { email: "admin@khipuescolar.demo" } }))?.id;
  if (!superadminId) throw new Error("Nudito+: falta el super administrador demo.");

  // Nudito+ es un módulo fijo por plan (`nudito_plus`, MODULOS_FIJOS_POR_PLAN): no va en `plan_modulos`.
  const config: [string, object][] = [
    [CLAVES_NUDITO_PLUS.precio, { montoMensual: 20, moneda: "PEN" }],
    [CLAVES_NUDITO_PLUS.yape, { numero: "999 999 999", titular: "Khipu Escolar (piloto)" }],
    [CLAVES_NUDITO_PLUS.consentimiento, CONSENTIMIENTO_POR_DEFECTO],
    [CLAVES_NUDITO_PLUS.limites, LIMITES_POR_DEFECTO],
    [CLAVES_NUDITO_PLUS.proveedor, { nombre: "falso", modelo: null, costoEntradaUsdPorMillon: 0, costoSalidaUsdPorMillon: 0 }],
  ];
  for (const [clave, valor] of config) await prisma.configPlataforma.upsert({ where: { clave }, update: { valor }, create: { clave, valor } });
  for (const s of SITIOS) await prisma.sitioPermitido.upsert({ where: { dominio: s.dominio }, update: { nombre: s.nombre, descripcion: s.descripcion, activo: true }, create: { ...s, creadoPorId: superadminId } });

  const rosa = await prisma.profile.findUnique({ where: { email: "rosa.quispe@gmail.com" } });
  const nh = await prisma.tenant.findUnique({ where: { slug: "nuevohorizonte" } });
  if (!rosa || !nh) throw new Error("Nudito+: faltan Rosa o el colegio demo.");
  const hijoDe = async (tenantId: string) => {
    const m = await prisma.membership.findFirst({ where: { tenantId, userId: rosa.id, rol: "apoderado" }, include: { hijos: { include: { alumno: true }, orderBy: { alumno: { nombres: "asc" } } } } });
    if (!m || m.hijos.length === 0) throw new Error("Nudito+: Rosa no tiene hijos en el colegio demo.");
    return { membershipId: m.id, alumno: m.hijos[0].alumno };
  };
  const nhHijo = await hijoDe(nh.id);
  const gael = await prisma.alumno.findFirst({ where: { tenantId: nh.id, nombres: "Gael", apellidos: "Chávez Ortiz" }, include: { apoderados: { orderBy: { parentesco: "asc" } } } });
  const otro = await prisma.alumno.findFirst({ where: { tenantId: nh.id, nombres: "Valentina" } });
  const lucas = await prisma.alumno.findFirst({ where: { tenantId: nh.id, nombres: "Lucas", apellidos: "Huamán Soto" } });
  const alumnoIds = [nhHijo.alumno.id, ...(gael ? [gael.id] : []), ...(otro ? [otro.id] : [])];

  // Limpieza de datos de Nudito+ de estos alumnos (las licencias borran los enlaces de pago con SetNull).
  for (const modelo of [prisma.pagoNudito, prisma.licenciaNudito, prisma.consentimientoIa, prisma.alertaNudito, prisma.resumenNudito, prisma.usoNudito] as unknown as { deleteMany: (a: object) => Promise<unknown> }[]) {
    await modelo.deleteMany({ where: { alumnoId: { in: alumnoIds } } });
  }
  // Lucas: solo licencia y consentimiento (sus conversaciones y su uso del mes son del seed del tutor).
  if (lucas) {
    await prisma.pagoNudito.deleteMany({ where: { alumnoId: lucas.id } });
    await prisma.licenciaNudito.deleteMany({ where: { alumnoId: lucas.id } });
    await prisma.consentimientoIa.deleteMany({ where: { alumnoId: lucas.id } });
  }

  // 1) Mateo (Nuevo Horizonte): licencia de pago activa (1 mes desde hace 10 días), pago verificado, consentimiento y reportes.
  const desde = sumar(hoy, -10);
  if (NUDITO_LICENCIAS_FAMILIARES) {
    const licencia = await prisma.licenciaNudito.create({
      data: {
        tenantId: nh.id, alumnoId: nhHijo.alumno.id, estado: "activa", origen: "pago", desde: fechaDb(desde), hasta: fechaDb(periodoNuevo(desde, 1).hasta),
        registradaPorId: superadminId, notas: `[${desde}] Pago verificado: 1 mes (00012345)`,
      },
    });
    await prisma.pagoNudito.create({
      data: {
        tenantId: nh.id, alumnoId: nhHijo.alumno.id, licenciaId: licencia.id, apoderadoId: nhHijo.membershipId, monto: 20, meses: 1, metodo: "yape",
        referencia: "00012345", fechaPago: fechaDb(desde), estado: "verificado", registradoPorId: superadminId, verificadoAt: new Date(Date.parse(`${desde}T15:00:00Z`)),
      },
    });
  }
  await prisma.consentimientoIa.create({
    data: { tenantId: nh.id, apoderadoId: nhHijo.membershipId, alumnoId: nhHijo.alumno.id, versionTexto: CONSENTIMIENTO_POR_DEFECTO.version, aceptadoAt: new Date(Date.parse(`${desde}T16:00:00Z`)), ip: "127.0.0.1" },
  });
  await prisma.usoNudito.create({ data: { tenantId: nh.id, alumnoId: nhHijo.alumno.id, mes: hoy.slice(0, 7), mensajes: 42, tokensEntrada: 21_000, tokensSalida: 18_500, costoEstimadoUsd: 0 } });
  await prisma.alertaNudito.createMany({
    data: [
      { tenantId: nh.id, alumnoId: nhHijo.alumno.id, tipo: "dificultad", detalle: "Le está costando sumar fracciones con distinto denominador. Repasarlo juntos en casa puede ayudarle.", creadaAt: new Date(Date.now() - 2 * 86_400_000) },
      { tenantId: nh.id, alumnoId: nhHijo.alumno.id, tipo: "uso", detalle: "Usó Nudito+ después de las 10 p. m. dos noches seguidas.", creadaAt: new Date(Date.now() - 5 * 86_400_000), vistaAt: new Date(Date.now() - 4 * 86_400_000) },
    ],
  });
  await prisma.resumenNudito.create({
    data: {
      tenantId: nh.id, alumnoId: nhHijo.alumno.id, desde: fechaDb(sumar(hoy, -7)), hasta: fechaDb(sumar(hoy, -1)),
      texto: "Esta semana practicó fracciones y comprensión lectora. Resolvió 18 ejercicios y pidió pistas en 5. Avanza bien en lectura.",
      temas: [
        { area: "Matemática", tema: "Fracciones equivalentes", mensajes: 14 },
        { area: "Comunicación", tema: "Idea principal de un texto", mensajes: 9 },
      ],
    },
  });

  // 2) Gael Chávez (5.° A): su familia reportó un Yape de 3 meses, pendiente de verificar en el panel (admin → Nudito+).
  if (NUDITO_LICENCIAS_FAMILIARES && gael && gael.apoderados[0]) {
    await prisma.pagoNudito.create({
      data: { tenantId: nh.id, alumnoId: gael.id, apoderadoId: gael.apoderados[0].apoderadoId, monto: 60, meses: 3, metodo: "yape", referencia: "00067890", fechaPago: fechaDb(sumar(hoy, -1)), estado: "pendiente" },
    });
  }

  // 3) Valentina (Nuevo Horizonte): prueba de 14 días que vence en 2 días.
  if (NUDITO_LICENCIAS_FAMILIARES && otro) {
    await prisma.licenciaNudito.create({
      data: { tenantId: nh.id, alumnoId: otro.id, estado: "activa", origen: "prueba", desde: fechaDb(sumar(hoy, -11)), hasta: fechaDb(sumar(hoy, 2)), registradaPorId: superadminId, notas: `[${sumar(hoy, -11)}] Prueba: familia piloto` },
    });
  }

  // 4) Lucas Huamán (Nuevo Horizonte, 5.° A, cuenta propia): cortesía de 3 meses y consentimiento de su madre Julia,
  //    para probar el chat del alumno (`/nudito-plus/chat`) sin tocar la BD.
  if (lucas) {
    const julia = await prisma.membership.findFirst({ where: { tenantId: nh.id, rol: "apoderado", hijos: { some: { alumnoId: lucas.id } } } });
    const inicio = sumar(hoy, -3);
    if (NUDITO_LICENCIAS_FAMILIARES) {
      await prisma.licenciaNudito.create({
        data: { tenantId: nh.id, alumnoId: lucas.id, estado: "activa", origen: "cortesia", desde: fechaDb(inicio), hasta: fechaDb(periodoNuevo(inicio, 3).hasta), registradaPorId: superadminId, notas: `[${inicio}] Cortesía: familia piloto (demo)` },
      });
    }
    if (julia) {
      await prisma.consentimientoIa.create({
        data: { tenantId: nh.id, apoderadoId: julia.id, alumnoId: lucas.id, versionTexto: CONSENTIMIENTO_POR_DEFECTO.version, aceptadoAt: new Date(Date.parse(`${inicio}T16:00:00Z`)), ip: "127.0.0.1" },
      });
    }
  }
}
