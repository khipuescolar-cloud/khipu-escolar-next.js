import "server-only";
import { textoValor, type Literal, type Marca } from "@/lib/calificaciones";
import { instanteEnZona } from "@/lib/dias-habiles";
import { urlColegio } from "@/lib/dominio";
import { fechaDb, momentoEnZona, sumarDias } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { auditar } from "./auditoria";
import { db, dbTenant, type DbTenant } from "./db";
import { destinatariosPorAlumno, encolarParaDestinatario, tieneCanalAviso } from "./notificaciones/encolar";
import { conEnvio } from "./notificaciones/envios";

// Resumen académico diario (specs/37). Publicar resultados ya no avisa al instante: cada día, a la hora que configuró el
// colegio (`Tenant.horaResumenAcademico`, 18:00 por defecto), cada familia recibe UN resumen por alumno con lo publicado
// desde el resumen anterior (ventana [hora de ayer, hora de hoy) en la zona del colegio). Una fila en
// `resumenes_academicos` por colegio y día lo reclama de forma atómica: aunque el cron corra varias veces o haya dos
// workers, sale una sola vez. Si el cron no corrió a la hora, el resumen del día anterior sale en la siguiente
// ejecución. Las correcciones, recuperaciones y justificaciones NO van aquí: tienen su aviso específico al momento.

type TenantResumen = { id: string; nombre: string; slug: string; zonaHoraria: string; horaResumenAcademico: string };

/** Ventana que cubre el resumen del día `fecha` del colegio. */
export function ventanaResumen(fecha: string, hora: string, zona: string): { desde: Date; hasta: Date } {
  return { desde: instanteEnZona(sumarDias(fecha, -1), hora, zona), hasta: instanteEnZona(fecha, hora, zona) };
}

/** Encola el resumen del día `fecha` de un colegio si aún no se hizo. Devuelve cuántos alumnos lo recibieron, o null. */
export async function resumenDelDia(tdb: DbTenant, tenant: TenantResumen, fecha: string): Promise<number | null> {
  const { desde, hasta } = ventanaResumen(fecha, tenant.horaResumenAcademico, tenant.zonaHoraria);
  // Reclamo atómico (única por colegio y día).
  const reclamo = await tdb.resumenAcademicoDia
    .create({ data: { tenantId: tenant.id, fecha: fechaDb(fecha), desde, hasta } })
    .catch((error: unknown) => {
      if ((error as { code?: string }).code === "P2002") return null;
      throw error;
    });
  if (!reclamo) return null;

  const evaluaciones = await tdb.evaluacion.findMany({
    where: { estado: "publicada", publicadaAt: { gte: desde, lt: hasta } },
    select: {
      id: true, titulo: true, grupoId: true, competencia: { select: { nombre: true } }, curso: { select: { nombre: true } },
      notas: { select: { alumnoId: true, valorLiteral: true, valorNumerico: true, marca: true, comentario: true } },
    },
    orderBy: [{ curso: { nombre: "asc" } }, { titulo: "asc" }],
  });
  const columnasPorGrupo = new Map<string, number>();
  for (const e of evaluaciones) columnasPorGrupo.set(e.grupoId, (columnasPorGrupo.get(e.grupoId) ?? 0) + 1);
  const porAlumno = new Map<string, { curso: string; titulo: string; valor: string; observacion?: boolean }[]>();
  for (const e of evaluaciones) {
    const titulo = (columnasPorGrupo.get(e.grupoId) ?? 1) > 1 && e.competencia ? `${e.titulo} · ${e.competencia.nombre}` : e.titulo;
    for (const n of e.notas) {
      const valor = textoValor({
        valorLiteral: n.valorLiteral as Literal | null, valorNumerico: n.valorNumerico === null ? null : Number(n.valorNumerico.toString()), marca: n.marca as Marca | null,
      });
      const lista = porAlumno.get(n.alumnoId) ?? [];
      lista.push({ curso: e.curso.nombre, titulo: titulo.slice(0, 120), valor, ...(n.comentario ? { observacion: true } : {}) });
      porAlumno.set(n.alumnoId, lista);
    }
  }
  if (porAlumno.size === 0) return 0;
  const alumnos = await tdb.alumno.findMany({ where: { id: { in: [...porAlumno.keys()] }, estado: "activo" }, select: { id: true, nombres: true } });
  const destinatarios = await destinatariosPorAlumno(tdb, alumnos.map((a) => a.id));
  let enviados = 0;
  await conEnvio(tdb, { tenantId: tenant.id, tipo: "libreta", titulo: `Resumen académico · ${fecha}` }, async () => {
    for (const a of alumnos) {
      const actividades = porAlumno.get(a.id)!.slice(0, 40);
      let alguno = false;
      for (const dest of destinatarios.get(a.id) ?? []) {
        if (!tieneCanalAviso(dest)) continue;
        await encolarParaDestinatario(tdb, dest, {
          tenantId: tenant.id, tipo: "libreta", plantilla: "resumen_academico", referenciaId: `resumen:${fecha}:${a.id}`,
          payload: { colegio: tenant.nombre, alumno: primerNombre(a.nombres), fecha, actividades, url: urlColegio(tenant.slug, `/notas?alumno=${a.id}`) },
        });
        alguno = true;
      }
      if (alguno) enviados += 1;
    }
  });
  await tdb.resumenAcademicoDia.updateMany({ where: { id: reclamo.id }, data: { alumnos: enviados } });
  await auditar({ tenantId: tenant.id, actorId: null, accion: "enviar", entidad: "resumen_academico", entidadId: reclamo.id, detalle: { fecha, alumnos: enviados } });
  return enviados;
}

/**
 * Cron: para cada colegio, el resumen de ayer (si quedó pendiente) y el de hoy si ya pasó su hora. Idempotente.
 * Solo colegios con resultados publicados recientemente.
 */
export async function procesarResumenAcademico(ahora = new Date()): Promise<{ colegios: number; alumnos: number }> {
  const tenants = await db.tenant.findMany({
    where: { estado: { not: "suspendido" }, evaluaciones: { some: { estado: "publicada", publicadaAt: { gte: new Date(ahora.getTime() - 3 * 86_400_000) } } } },
    select: { id: true, nombre: true, slug: true, zonaHoraria: true, horaResumenAcademico: true },
  });
  let colegios = 0;
  let alumnos = 0;
  for (const t of tenants) {
    const hoy = momentoEnZona(ahora, t.zonaHoraria).isoFecha;
    for (const fecha of [sumarDias(hoy, -1), hoy]) {
      if (ventanaResumen(fecha, t.horaResumenAcademico, t.zonaHoraria).hasta > ahora) continue;
      try {
        const n = await resumenDelDia(dbTenant(t.id), t, fecha);
        if (n !== null) {
          colegios += 1;
          alumnos += n;
        }
      } catch (error) {
        console.error("[resumen-academico]", t.slug, fecha, error);
      }
    }
  }
  return { colegios, alumnos };
}
