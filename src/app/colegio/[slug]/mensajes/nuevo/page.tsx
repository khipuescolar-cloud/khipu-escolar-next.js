import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Notificar } from "@/components/shell/Notificar";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { destinatariosPosibles } from "@/lib/server/mensajes";
import { requireFeature } from "@/lib/server/plan";
import { requireAlumnoVisible, requireTenantContext } from "@/lib/server/tenant";
import { ListaContactos } from "./ListaContactos";

export const metadata: Metadata = { title: "Nuevo mensaje" };

export default async function NuevoMensajePage({ params, searchParams }: PageProps<"/colegio/[slug]/mensajes/nuevo">) {
  const { slug } = await params;
  const { alumno, ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["apoderado", "profesor"]);
  requireFeature(ctx, "mensajes");
  await requireConsentimiento(ctx);
  const alumnoId = Array.isArray(alumno) ? alumno[0] : alumno;
  // `?alumno=` (asistencia) acota a los profesores de ese hijo, solo si está en el alcance del usuario.
  if (alumnoId) await requireAlumnoVisible(ctx, alumnoId);
  const posibles = (await destinatariosPosibles(ctx)).filter((p) => !alumnoId || p.alumnoId === alumnoId);

  const sinTutor = ctx.rol === "apoderado" ? await ctx.db.apoderadoAlumno.findMany({ where: { apoderadoId: ctx.membership.id, alumno: { estado: "activo" } }, select: { alumnoId: true, alumno: { select: { nombres: true, salon: { select: { tutorId: true, tutor: { select: { estado: true } } } } } } } }) : [];
  const faltantes = sinTutor.filter((v) => (!alumnoId || v.alumnoId === alumnoId) && (!v.alumno.salon.tutorId || v.alumno.salon.tutor?.estado !== "activa"));

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[28rem] overflow-hidden rounded-lg border border-border bg-card md:h-[calc(100dvh-8rem)]">
      <Notificar ok={Array.isArray(ok) ? ok[0] : ok} error={Array.isArray(error) ? error[0] : error} />
      <div className="flex min-h-0 w-full flex-col border-r border-border md:w-[22.5rem] md:shrink-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-3"><Link href="/mensajes" aria-label="Volver a chats" className="flex size-11 items-center justify-center rounded-full hover:bg-accent"><ArrowLeft aria-hidden /></Link><h1 className="font-heading text-xl font-semibold">Nuevo chat</h1></header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="px-4 py-3 text-sm text-muted-foreground">Elige a quién escribir. No se comparten teléfonos ni correos.</p>
          {faltantes.map((v) => <p key={v.alumnoId} className="mx-4 mb-2 rounded-md border border-border bg-muted p-3 text-sm">El salón de {v.alumno.nombres} aún no tiene tutor asignado</p>)}
      {posibles.length === 0 ? (
        <EstadoVacio icono={UserRound} titulo="Todavía no hay a quién escribir" descripcion="Cuando el colegio asigne una tutoría, aparecerá aquí." />
      ) : <ListaContactos posibles={posibles} rol={ctx.rol === "apoderado" ? "apoderado" : "profesor"} />}
        </div>
      </div>
      <section className="hidden flex-1 items-center justify-center bg-muted/40 text-center text-sm text-muted-foreground md:flex"><span><UserRound className="mx-auto mb-3 size-10 text-primary" aria-hidden />Elige un contacto para empezar a conversar</span></section>
    </div>
  );
}
