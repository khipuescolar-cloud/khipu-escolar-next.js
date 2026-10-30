import { History, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { formatoDia } from "@/lib/fechas";
import type { AlumnoNuditoPlus } from "@/lib/server/nudito-plus/acceso";
import { listarConversacionesNudito, mensajesDeConversacion } from "@/lib/server/nudito-plus/conversar";
import type { TenantContext } from "@/lib/server/tenant";
import type { ModoNudito } from "@/generated/prisma/enums";
import { ChatNuditoPlus } from "./ChatNuditoPlus";

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pantalla de Nudito+ (alumno o modo hijo): historial propio + chat. `rutaBase` = «/nudito-plus/chat» o «/nudito-plus/hijo/<id>». */
export async function PantallaNuditoPlus({
  ctx,
  acceso,
  rutaBase,
  conversacion,
}: {
  ctx: TenantContext;
  acceso: { alumno: AlumnoNuditoPlus; modo: ModoNudito };
  rutaBase: string;
  conversacion?: string;
}) {
  const activa = conversacion && RE_UUID.test(conversacion) ? conversacion : null;
  const [conversaciones, mensajes, cursos] = await Promise.all([
    listarConversacionesNudito(ctx, acceso),
    activa ? mensajesDeConversacion(ctx, acceso, activa) : Promise.resolve([]),
    ctx.db.curso.findMany({ where: { salonId: acceso.alumno.salonId }, orderBy: { nombre: "asc" }, select: { nombre: true } }),
  ]);
  if (activa && mensajes === null) notFound();
  const nombre = acceso.alumno.nombres.split(" ")[0] ?? acceso.alumno.nombres;
  const sugerencias = [
    "¡Hola, Nudito!",
    ...cursos.slice(0, 3).map((c) => `Quiero practicar ${c.nombre}`),
    "¿Qué tareas tengo?",
    "No entiendo un ejercicio",
  ];

  const lista = conversaciones.length === 0 ? (
            <p className="flex items-center gap-2 px-4 pb-4 text-cuerpo-sm text-muted-foreground">
              <NuditoMascota tamano={28} variante="avatar" />
              Aún no hay conversaciones. ¡Empieza una!
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto px-2 pb-2 lg:max-h-[calc(100dvh-20rem)]">
              {conversaciones.map((c) => {
                const actual = c.id === activa;
                return (
                  <li key={c.id}>
                    <Link
                      href={`${rutaBase}?c=${c.id}`}
                      aria-current={actual ? "page" : undefined}
                      className={`flex min-h-11 flex-col justify-center rounded-md px-3 py-2 text-cuerpo-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${actual ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-muted"}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        <span className="truncate">{c.titulo}</span>
                      </span>
                      <span className="text-etiqueta font-normal text-muted-foreground">{formatoDia(c.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          );

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="Tus conversaciones con Nudito" className="order-2 lg:order-1">
        {/* Móvil: plegable debajo del chat. Escritorio: siempre visible a la izquierda. */}
        <details className="rounded-xl border bg-card lg:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-3 font-heading text-cuerpo-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <History className="size-4" strokeWidth={2} aria-hidden />
            Tus conversaciones ({conversaciones.length})
          </summary>
          {lista}
        </details>
        <div className="hidden rounded-xl border bg-card lg:block">
          <h2 className="flex min-h-11 items-center gap-2 px-4 py-3 font-heading text-cuerpo-sm font-semibold">
            <History className="size-4" strokeWidth={2} aria-hidden />
            Tus conversaciones
          </h2>
          {lista}
        </div>
      </nav>
      <div className="order-1 min-w-0 lg:order-2">
        <ChatNuditoPlus
          key={activa ?? "nueva"}
          alumnoId={acceso.alumno.id}
          nombre={nombre}
          conversacionId={activa}
          mensajesIniciales={mensajes ?? []}
          sugerencias={sugerencias}
        />
      </div>
    </div>
  );
}
