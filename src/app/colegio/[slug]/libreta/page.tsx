import { BookOpen, Download, NotebookText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calificacion } from "@/components/Calificacion";
import { APROBADO_VIGESIMAL, ETIQUETA_LITERAL, LITERALES } from "@/lib/calificaciones";
import { libretaVisibleParaFamilia } from "@/lib/libreta-publicacion";
import { datosLibreta } from "@/lib/server/libreta";
import { alumnosVisibles, listarPeriodos, periodoParaLibreta } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { esVistaFamilia } from "@/lib/roles";
import { requireAlumnoVisible, requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Libreta" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LibretaPage({ params, searchParams }: PageProps<"/colegio/[slug]/libreta">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "libreta");
  if (!["apoderado", "alumno", "profesor", "direccion"].includes(ctx.rol)) forbidden();
  const familia = esVistaFamilia(ctx.rol);

  // `?alumno=` (enlaces de Nudito, notas y avisos) abre la libreta de ese alumno, solo si está en el alcance del usuario.
  const pedido = uno(sp.alumno);
  if (pedido) await requireAlumnoVisible(ctx, pedido);
  const [alumnos, todos] = await Promise.all([alumnosVisibles(ctx), listarPeriodos(ctx)]);
  // Las familias (y el propio alumno) solo ven los periodos que el colegio publicó.
  const periodos = familia ? todos.filter(libretaVisibleParaFamilia) : todos;
  const alumno = alumnos.find((a) => a.id === pedido) ?? alumnos[0];
  const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoParaLibreta(periodos);

  const titulo = "Libreta";
  const descripcion = "Calificaciones por competencia y conclusiones de cada periodo.";
  if (!alumno || !periodo) {
    return (
      <div>
        <EncabezadoPagina titulo={titulo} descripcion={descripcion} />
        <EstadoVacio icono={NotebookText} titulo="Todavía no hay una libreta para mostrar" descripcion={familia ? "Cuando el colegio publique la libreta de un periodo, la verás aquí y te avisaremos." : "Cuando el colegio cree un periodo con notas, la verás aquí."} />
      </div>
    );
  }

  const datos = await datosLibreta(ctx, alumno.id, periodo.id, "ver");
  const a = datos.asistencia;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo={titulo}
        descripcion={descripcion}
        acciones={
          // El PDF lo descarga la familia o el colegio (`/api/libreta` no admite al rol alumno).
          ctx.rol === "alumno" ? undefined : (
            <a href={`/api/libreta/${alumno.id}?periodo=${periodo.id}`} className={buttonVariants()}>
              <Download strokeWidth={2} aria-hidden /> Descargar PDF
            </a>
          )
        }
      />
      <Card>
        <CardContent>
          <form method="get" className={`grid gap-3 ${alumnos.length > 1 ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_auto]"} sm:items-end`}>
            {alumnos.length > 1 && (
              <Selector etiqueta="Alumno" name="alumno" defaultValue={alumno.id}>
                {alumnos.map((x) => <option key={x.id} value={x.id}>{x.apellidos}, {x.nombres} · {x.salon.nombre}</option>)}
              </Selector>
            )}
            {alumnos.length === 1 && <input type="hidden" name="alumno" value={alumno.id} />}
            <Selector etiqueta="Periodo" name="periodo" defaultValue={periodo.id}>
              {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.anio}{p.cerrado ? "" : " (en curso)"}</option>)}
            </Selector>
            <Boton type="submit">Ver</Boton>
          </form>
        </CardContent>
      </Card>

      <Card className="mx-auto w-full max-w-3xl">
        <CardContent className="flex flex-col gap-5">
          <div className="border-b pb-4">
            <p className="flex items-center gap-2 font-heading text-lg font-semibold"><BookOpen className="size-5 text-primary" strokeWidth={2} aria-hidden />{datos.colegio.nombre}</p>
            <p className="mt-1 font-medium">{datos.alumno.apellidos}, {datos.alumno.nombres}</p>
            <p className="text-sm text-muted-foreground">{datos.alumno.salon} · {datos.periodo.nombre} {datos.periodo.anio}{datos.alumno.tutor ? ` · ${datos.alumno.tutorTitulo}: ${datos.alumno.tutor}` : ""}</p>
          </div>

          {!datos.periodo.cerrado && <Alerta tipo="aviso">Este periodo sigue en curso: la libreta puede cambiar hasta que el colegio lo cierre.</Alerta>}

          {datos.cursos.map((curso) => (
            <section key={curso.nombre} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{curso.nombre}</h2>
              {curso.competencias.length === 0 && <p className="text-sm text-muted-foreground">Sin competencias registradas.</p>}
              <ul className="flex flex-col gap-3">
                {curso.competencias.map((c) => (
                  <li key={c.nombre} className="flex flex-col gap-1.5 border-b pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium">{c.nombre}</p>
                    <div>{c.calificacion ? <Calificacion valor={c.calificacion} /> : <span className="text-xs text-muted-foreground">Sin calificar todavía</span>}</div>
                    {c.conclusion && <p className="text-sm text-muted-foreground">{c.conclusion}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <Separator />
          <section className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Asistencia del periodo</h2>
            <p className="text-sm">
              {a.total === 0 ? "No hay asistencia registrada en este periodo." : `Días registrados: ${a.total} · Llegó: ${a.llego} · Tarde: ${a.tarde} · Falta: ${a.falta}${a.problema ? ` · Con problema: ${a.problema}` : ""}`}
            </p>
          </section>

          <section className="flex flex-col gap-1 text-sm text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground">Escala de calificación</h2>
            {datos.escala === "literal"
              ? <p>{LITERALES.map((l) => `${l}: ${ETIQUETA_LITERAL[l]}`).join(" · ")}</p>
              : <p>Escala vigesimal de 0 a 20. Aprobado desde {APROBADO_VIGESIMAL}.</p>}
          </section>
          <p className="text-xs text-muted-foreground">Firmada por la dirección de {datos.colegio.nombre}.</p>
        </CardContent>
      </Card>
      {familia && <p className="text-sm"><Link href={`/notas?alumno=${alumno.id}&periodo=${periodo.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">Ver el detalle de notas</Link></p>}
    </div>
  );
}
