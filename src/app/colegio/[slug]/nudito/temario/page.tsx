import Link from "next/link";
import { BookOpen, CircleCheck, Clock3 } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { FormAccion } from "@/components/FormAccion";
import { PestanasNudito } from "@/components/nudito/PestanasNudito";
import { CURSOS_KHIPU } from "@/lib/cursos-khipu/catalogo";
import { agrupar, docentesDelGrupo, gruposDelDocente } from "@/lib/server/plan-anual/acceso";
import { estadoTemario } from "@/lib/server/plan-anual/temario";
import { requireTenantContext } from "@/lib/server/tenant";
import { crearTemarioAccion } from "./actions";

export const metadata = { title: "Temario de Nudito" };
export default async function TemariosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ anio?: string; nivel?: string; grado?: string; area?: string }>;
}) {
  const { slug } = await params,
    filtro = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const anio = Number(filtro.anio) || new Date().getFullYear();
  const grupos =
    ctx.rol === "profesor"
      ? await gruposDelDocente(ctx)
      : await ctx.db.curso
          .findMany({
            where: { salon: { anio, archivadoAt: null, grado: { not: null } } },
            select: { nombre: true, cursoColegio: { select: { cursoKhipu: true } }, salon: { select: { anio: true, nivel: true, grado: true } } },
          })
          .then(agrupar);
  const visibles = grupos.filter(
    (g) =>
      g.anio === anio &&
      (!filtro.nivel || g.nivel === filtro.nivel) &&
      (!filtro.grado || g.grado === Number(filtro.grado)) &&
      (!filtro.area || g.area === filtro.area),
  );
  const planes = await ctx.db.planAnual.findMany({
    where: { anio, area: { in: CURSOS_KHIPU.filter(c => c.nudito).map(c => c.clave) } },
    include: {
      temas: { select: { id: true } },
      conformidades: { where: { decision: "conforme" }, select: { membershipId: true, ronda: true } },
    },
  });
  const filas = await Promise.all(
    visibles.map(async (g) => {
      const plan = planes.find((p) => p.anio === g.anio && p.nivel === g.nivel && p.grado === g.grado && p.area === g.area);
      const docentes = plan
        ? (await docentesDelGrupo(ctx.db, g)).map((d) => ({
            nombre: d.nombre,
            acepto: plan.conformidades.some((c) => c.ronda === plan.rondaRevision && c.membershipId === d.membershipId),
          }))
        : [];
      return { g, plan, estado: plan ? estadoTemario(plan.temas.length, docentes, plan.estado === "publicado") : "Sin temario" };
    }),
  );
  return (
    <div className="min-w-0 space-y-5">
      <EncabezadoPagina
        titulo="Temario de Nudito"
        descripcion="Los profesores del grado eligen los temas. Nudito se habilita cuando todos aceptan."
        seccion="academico"
      />
      <PestanasNudito activa="temario" />
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          Año
          <input name="anio" type="number" min="2020" max="2100" defaultValue={anio} className="h-11 w-24 rounded-md border px-2" />
        </label>
        {ctx.rol === "direccion" && (
          <>
            <label className="grid gap-1">
              Nivel
              <select name="nivel" defaultValue={filtro.nivel ?? ""} className="h-11 rounded-md border px-2">
                <option value="">Todos</option>
                <option value="primaria">Primaria</option>
                <option value="secundaria">Secundaria</option>
              </select>
            </label>
            <label className="grid gap-1">
              Grado
              <select name="grado" defaultValue={filtro.grado ?? ""} className="h-11 rounded-md border px-2">
                <option value="">Todos</option>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}.°
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Área
              <select name="area" defaultValue={filtro.area ?? ""} className="h-11 max-w-40 rounded-md border px-2">
                <option value="">Todas</option>
                <option value="matematica">Matemática</option>
                <option value="comunicacion">Comunicación</option>
                <option value="ciencia-tecnologia">Ciencia y Tecnología</option>
                {CURSOS_KHIPU.filter(c => c.nudito && c.clave !== c.area).map(c => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
              </select>
            </label>
          </>
        )}
        <button className="h-11 rounded-md border px-4">Filtrar</button>
      </form>
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filas.map(({ g, plan, estado }) => (
          <article
            key={[g.anio, g.nivel, g.grado, g.area].join("|")}
            className="min-w-0 rounded-lg border border-borde-sutil bg-superficie-elevada p-4"
          >
            <h2 className="flex items-center gap-2 font-semibold">
              <BookOpen className="size-5 shrink-0" aria-hidden />
              {g.nombreCurso}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {g.nivel === "primaria" ? "Primaria" : "Secundaria"} · {g.grado}.° grado · {g.anio}
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm">
              {estado === "Habilitado para alumnos" ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              {estado}
            </p>
            {plan ? (
              <Link
                href={"/nudito/temario/" + plan.id}
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-sec-tinta underline"
              >
                Ver temario
              </Link>
            ) : ctx.rol === "profesor" ? (
              <FormAccion accion={crearTemarioAccion.bind(null, slug)} etiqueta="Crear temario" className="mt-3">
                <input type="hidden" name="anio" value={g.anio} />
                <input type="hidden" name="nivel" value={g.nivel} />
                <input type="hidden" name="grado" value={g.grado} />
                <input type="hidden" name="area" value={g.area} />
                <input type="hidden" name="nombreCurso" value={g.nombreCurso} />
              </FormAccion>
            ) : null}
          </article>
        ))}
      </div>
      {!filas.length && <p className="rounded-lg border p-5">No hay grupos de Nudito para estos filtros.</p>}
    </div>
  );
}
