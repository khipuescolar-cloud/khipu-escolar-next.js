// Demo de la biblioteca de documentos (specs/31) para Nuevo Horizonte. Idempotente: reemplaza las carpetas y documentos del colegio.
// Los PDF de ejemplo se guardan en el almacenamiento local (.uploads/<tenantId>/documentos/…), como lo haría `LocalStorage`.
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Rol } from "../src/generated/prisma/enums";

/** PDF mínimo válido de una página con un título y una línea de texto (solo ASCII). */
export function pdfDeEjemplo(titulo: string, linea: string): Buffer {
  const esc = (t: string) => t.replace(/[^\x20-\x7e]/g, "").replace(/([()\\])/g, "\\$1");
  const flujo = `BT /F1 20 Tf 60 740 Td (${esc(titulo)}) Tj 0 -32 Td /F1 12 Tf (${esc(linea)}) Tj ET`;
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let cuerpo = "%PDF-1.4\n";
  const posiciones: number[] = [];
  objetos.forEach((o, i) => {
    posiciones.push(cuerpo.length);
    cuerpo += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const inicioXref = cuerpo.length;
  cuerpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posiciones.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}`;
  cuerpo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(cuerpo, "latin1");
}

type DocSemilla = { titulo: string; descripcion: string; roles: Rol[]; salon?: boolean; dias: number };

export async function sembrarDocumentos(prisma: PrismaClient, _ids: Record<string, unknown> = {}) {
  void _ids;
  const tenant = await prisma.tenant.findUnique({ where: { slug: "nuevohorizonte" } });
  if (!tenant) return;
  const direccion = await prisma.membership.findFirst({ where: { tenantId: tenant.id, rol: "direccion" } });
  if (!direccion) return;
  const salon = await prisma.salon.findFirst({ where: { tenantId: tenant.id, nombre: { contains: "3.° B" } } });

  await prisma.carpetaDocumento.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.documento.deleteMany({ where: { tenantId: tenant.id } });

  const todos: Rol[] = ["apoderado", "alumno", "profesor", "administrativo"];
  const carpeta = (nombre: string, orden: number, parentId: string | null = null, visibleRoles: Rol[] = []) =>
    prisma.carpetaDocumento.create({ data: { tenantId: tenant.id, nombre, orden, parentId, visibleRoles, creadoPorId: direccion.id } });

  const reglamento = await carpeta("Reglamento y normas", 1);
  const protocolos = await carpeta("Protocolos internos", 1, reglamento.id, ["profesor", "administrativo"]);
  const calendario = await carpeta("Calendario académico", 2);
  const comunicados = await carpeta("Comunicados oficiales", 3);

  // Mi unidad de Lucía: compartir una carpeta hereda el acceso a su contenido.
  const lucia = await prisma.membership.findFirst({ where: { tenantId: tenant.id, rol: "profesor", user: { email: "lucia.garcia@nuevohorizonte.demo" } } });
  const pedro = await prisma.membership.findFirst({ where: { tenantId: tenant.id, rol: "profesor", user: { email: "pedro.salas@nuevohorizonte.demo" } } });
  if (lucia && pedro && salon) {
    const unidad = await prisma.carpetaDocumento.create({ data: { tenantId: tenant.id, nombre: "Material de 3.° B", creadoPorId: lucia.id, ambito: "unidad" } });
    await prisma.compartidoDocumento.createMany({ data: [
      { tenantId: tenant.id, carpetaId: unidad.id, rol: "apoderado", salonId: salon.id, nivel: "lector", creadoPorId: lucia.id },
      { tenantId: tenant.id, carpetaId: unidad.id, membershipId: pedro.id, nivel: "editor", creadoPorId: lucia.id },
    ] });
  }

  const subir = async (carpetaId: string, d: DocSemilla) => {
    const documento = await prisma.documento.create({
      data: {
        tenantId: tenant.id, carpetaId, titulo: d.titulo, descripcion: d.descripcion, visibleRoles: d.roles,
        salonId: d.salon && salon ? salon.id : null, publicadoPorId: direccion.id,
        createdAt: new Date(Date.now() - d.dias * 86_400_000),
      },
    });
    const buffer = pdfDeEjemplo(d.titulo, "Documento de ejemplo para la demo de Khipu Escolar.");
    const publicId = path.posix.join(tenant.id, "documentos", `${randomUUID()}.pdf`);
    const ruta = path.resolve(process.cwd(), ".uploads", publicId);
    await mkdir(path.dirname(ruta), { recursive: true });
    await writeFile(ruta, buffer);
    await prisma.archivo.create({
      data: {
        tenantId: tenant.id, proveedor: "local", publicId, url: null, mimeType: "application/pdf", bytes: buffer.length,
        privado: true, subidoPorId: direccion.userId, documentoId: documento.id, nombre: `${d.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
      },
    });
  };

  await subir(reglamento.id, { titulo: "Reglamento interno 2026", descripcion: "Normas de convivencia, asistencia y uniforme.", roles: todos, dias: 60 });
  await subir(reglamento.id, { titulo: "Normas de puntualidad", descripcion: "Horarios de ingreso y tolerancia.", roles: ["apoderado", "alumno"], dias: 30 });
  await subir(protocolos.id, { titulo: "Protocolo de convivencia escolar", descripcion: "Pasos para atender casos de convivencia. Solo personal.", roles: ["profesor", "administrativo"], dias: 20 });
  await subir(calendario.id, { titulo: "Calendario académico 2026", descripcion: "Bimestres, feriados y actividades.", roles: todos, dias: 45 });
  await subir(calendario.id, { titulo: "Horario de clases de 3.° B", descripcion: "Solo para el salón 3.° B.", roles: ["apoderado", "alumno", "profesor"], salon: true, dias: 15 });
  await subir(comunicados.id, { titulo: "Circular de inicio de clases", descripcion: "Indicaciones para el primer día.", roles: ["apoderado", "alumno", "profesor"], dias: 90 });
  await subir(comunicados.id, { titulo: "Borrador de resolución directoral", descripcion: "Interno: aún no se publica.", roles: [], dias: 2 });
}
