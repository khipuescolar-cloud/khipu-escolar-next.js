import { BookOpen, ChevronRight } from "lucide-react";
import { ListaDividida } from "@/components/ui/Superficies";
import type { Metadata } from "next";
import Link from "next/link";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { AVISO_FORMATIVO, NOMBRE_AREA_NUDITO } from "@/lib/nudito-seguimiento";
import { configNudito } from "@/lib/server/nudito/config-colegio";
import { cursosParaSeguimiento } from "@/lib/server/nudito/progreso";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Seguimiento de Nudito" };

/** Docente y dirección (specs/44): cursos con área de Nudito para ver el progreso de práctica. */
export default async function SeguimientoNudito({ params }: PageProps<"/colegio/[slug]/nudito/seguimiento">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  requireFeature(ctx, "nudito_plus");
  const [cursos, estado] = await Promise.all([cursosParaSeguimiento(ctx), configNudito(ctx)]);
  const conArea = cursos.filter((c) => c.area);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Seguimiento de Nudito" seccion="academico" descripcion={`Cómo practican tus alumnos con Nudito, por curso y tema. ${AVISO_FORMATIVO}`} />
      {!estado.activo && (
        <p className="text-cuerpo-sm text-muted-foreground">
          Nudito está apagado en el colegio{ctx.rol === "direccion" ? <>: puedes activarlo en <Link href="/configuracion/nudito" className="enlace">Configuración de Nudito</Link>.</> : "."}
        </p>
      )}
      {conArea.length === 0 ? (
        <EstadoVacio icono={BookOpen} titulo="No hay cursos de Matemática, Comunicación o Ciencia y Tecnología a tu cargo." descripcion="Nudito acompaña esas áreas por ahora." />
      ) : (
        <section aria-labelledby="cursos-nudito" className="flex flex-col gap-3">
          <TituloBloque id="cursos-nudito" descripcion="Elige un curso para ver cómo practica cada alumno.">Tus cursos con Nudito</TituloBloque>
          <ListaDividida>
            {conArea.map((c) => (
              <li key={c.cursoId}>
                <Link href={`/nudito/seguimiento/curso/${c.cursoId}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-sec-suave focus-visible:outline-2 sm:px-5">
                  <div>
                    <p className="font-semibold">{c.nombre}</p>
                    <p className="text-cuerpo-sm text-muted-foreground">{c.salon} · {NOMBRE_AREA_NUDITO[c.area!]}</p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
                </Link>
              </li>
            ))}
          </ListaDividida>
        </section>
      )}
    </div>
  );
}
