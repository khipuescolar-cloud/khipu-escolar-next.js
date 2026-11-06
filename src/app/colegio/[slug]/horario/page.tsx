import { ArrowLeft, CalendarClock, CheckCircle2, Copy, Eye, LayoutTemplate, Plus, Repeat, School, TriangleAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";
import { AhoraDespues } from "@/components/horario/AhoraDespues";
import { BotonSugeridas } from "@/components/horario/BotonSugeridas";
import { EditorHoras } from "@/components/horario/EditorHoras";
import { CalendarioSemana, type AccionBloque, type BloqueConAcciones } from "@/components/horario/CalendarioSemana";
import { TablaHorario } from "@/components/horario/TablaHorario";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Selector } from "@/components/ui/Selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOMBRE_NIVEL } from "@/lib/asistencia-por-curso";
import { ahoraYDespues, esDiaHorario, minutos, rango } from "@/lib/horario";
import {
  agendaDeLaSemana, ahoraDelColegio, alumnosParaHorario, cargaDocente, horarioDelProfesor, horarioDelSalon, opcionesDeCasillero, puedePasarListaDeCurso,
  salonesParaHorario, type BloqueVista,
} from "@/lib/server/horario";
import { requireFeature, tieneFeature } from "@/lib/server/plan";
import { listarPlantillas } from "@/lib/server/plantillas-horario";
import { requireTenantContext, type TenantContext } from "@/lib/server/tenant";
import { casilleroAction, copiarAction, periodosAction, sugeridasAction } from "./actions";
import { asignarPlantillaAction } from "./plantillas/actions";

export const metadata: Metadata = { title: "Horario" };

const uno = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function HorarioPage({ params, searchParams }: PageProps<"/colegio/[slug]/horario">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "profesor", "apoderado", "alumno"]);
  requireFeature(ctx, "horario");

  if (ctx.rol === "direccion") {
    const profesor = uno(sp.profesor);
    if (profesor) return <SemanaProfesor ctx={ctx} profesorId={profesor} />;
    if (uno(sp.vista) === "profesores") return <CargaProfesores ctx={ctx} />;
    return <VistaDireccion ctx={ctx} slug={slug} salonId={uno(sp.salon)} />;
  }
  if (ctx.rol === "profesor") return <SemanaProfesor ctx={ctx} />;
  return <VistaFamilia ctx={ctx} alumnoId={uno(sp.alumno)} />;
}

function bloqueAhora(bloques: BloqueVista[], dia: number, hora: string) {
  return ahoraYDespues(bloques.filter((b) => b.dia === dia), hora);
}

// ───────────── Dirección: armar el horario de un salón ─────────────

async function VistaDireccion({ ctx, slug, salonId }: { ctx: TenantContext; slug: string; salonId?: string }) {
  const salones = await salonesParaHorario(ctx);
  const elegido = salones.find((s) => s.id === salonId) ?? salones[0];
  const encabezado = (
    <EncabezadoPagina
      seccion="dia"
      titulo="Horarios"
      descripcion="Elige un salón y toca cada casillero para asignar un curso. Khipu no deja que un profesor esté en dos salones a la vez."
      acciones={
        <>
          <Link href="/horario/plantillas" className={buttonVariants({ variant: "outline" })}><LayoutTemplate strokeWidth={2} aria-hidden />Plantillas de horario</Link>
          <Link href="/horario?vista=profesores" className={buttonVariants({ variant: "outline" })}><Users strokeWidth={2} aria-hidden />Carga de profesores</Link>
        </>
      }
    />
  );
  if (!elegido) {
    return <div data-seccion="dia">{encabezado}<EstadoVacio icono={School} titulo="Aún no hay salones" descripcion="Crea los salones en Gestión y vuelve para armar su horario." /></div>;
  }
  const [{ salon, periodos, bloques }, opciones, plantillas] = await Promise.all([horarioDelSalon(ctx, elegido.id), opcionesDeCasillero(ctx, elegido.id), listarPlantillas(ctx)]);
  const { dia, hora } = ahoraDelColegio(ctx);
  const { ahora } = bloqueAhora(bloques, dia, hora);
  const nivel = NOMBRE_NIVEL[salon.nivel];
  const clases = periodos.filter((p) => p.tipo === "clase").length;

  return (
    <div data-seccion="dia" className="flex flex-col gap-4">
      {encabezado}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-borde-sutil bg-superficie px-4 py-3" aria-label="Elegir salón">
        <div className="w-full max-w-xs">
          <Selector etiqueta="Salón" name="salon" defaultValue={elegido.id}>
            {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {NOMBRE_NIVEL[s.nivel]}</option>)}
          </Selector>
        </div>
        <button type="submit" className={buttonVariants({ variant: "outline" })}><Eye strokeWidth={2} aria-hidden />Ver horario</button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold"><span aria-hidden className="size-2.5 rounded-full bg-sec-nudo" />{salon.nombre}</h2>
          <p className="text-cuerpo-sm text-muted-foreground">
            {nivel}{salon.tutorNombre ? ` · Tutoría: ${salon.tutorNombre}` : ""}
            {salon.plantilla && <> · Plantilla «{salon.plantilla.nombre}» ({salon.plantilla.horaEntrada}–{salon.plantilla.horaSalida}) · {bloques.length} de {clases * 5} casilleros asignados</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {salon.plantilla && plantillas.length > 1 && (
            <DialogoAccion
              variante="outline"
              disparador={<><Repeat strokeWidth={2} aria-hidden />Cambiar plantilla</>}
              titulo={`Plantilla de ${salon.nombre}`}
              descripcion="Las clases ya puestas pasan a la misma hora de la nueva plantilla (la 1.ª hora a la 1.ª hora); las que no tengan hora equivalente se vacían."
              etiqueta="Cambiar plantilla"
              accion={asignarPlantillaAction.bind(null, slug, salon.id)}
            >
              <Selector etiqueta="Plantilla" name="plantillaId" required defaultValue="">
                <option value="" disabled>Elige la plantilla</option>
                {plantillas.filter((p) => p.id !== salon.plantilla?.id).map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.horaEntrada}–{p.horaSalida}</option>)}
              </Selector>
            </DialogoAccion>
          )}
          {salon.plantilla && periodos.length > 0 && <EditorHoras plantillaNombre={salon.plantilla.nombre} periodos={periodos} accion={periodosAction.bind(null, slug, salon.plantilla.id)} />}
          {opciones.mismoGrado.length > 0 && periodos.length > 0 && (
            <DialogoAccion
              variante="outline"
              disparador={<><Copy strokeWidth={2} aria-hidden />Copiar de otro salón</>}
              titulo={`Copiar horario a ${salon.nombre}`}
              descripcion="Reemplaza el horario de este salón por el de otro salón del mismo grado. Los cursos se emparejan por nombre y cada uno queda con su propio profesor."
              etiqueta="Copiar horario"
              accion={copiarAction.bind(null, slug, salon.id)}
            >
              <Selector etiqueta="Copiar desde" name="origenId" required defaultValue="">
                <option value="" disabled>Elige el salón</option>
                {opciones.mismoGrado.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Selector>
            </DialogoAccion>
          )}
        </div>
      </div>

      {!salon.plantilla ? (
        <EstadoVacio
          icono={CalendarClock}
          titulo={`${salon.nombre} aún no tiene plantilla de horario`}
          descripcion="La plantilla dice a qué hora entran, los recreos y a qué hora salen; con eso Khipu arma las horas de clase y sabe desde cuándo la llegada es tardanza."
          accion={
            <div className="flex flex-col items-center gap-3">
              {plantillas.length > 0 ? (
                <DialogoAccion
                  disparador={<><LayoutTemplate strokeWidth={2} aria-hidden />Elegir plantilla</>}
                  titulo={`Plantilla de ${salon.nombre}`}
                  descripcion="Elige la jornada que sigue este salón."
                  etiqueta="Usar plantilla"
                  accion={asignarPlantillaAction.bind(null, slug, salon.id)}
                >
                  <Selector etiqueta="Plantilla" name="plantillaId" required defaultValue="">
                    <option value="" disabled>Elige la plantilla</option>
                    {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.horaEntrada}–{p.horaSalida}</option>)}
                  </Selector>
                </DialogoAccion>
              ) : (
                <BotonSugeridas texto={`Usar la plantilla sugerida de ${nivel.toLowerCase()}`} accion={sugeridasAction.bind(null, slug, salon.id)} />
              )}
              <Link href="/horario/plantillas/nueva" className="inline-flex min-h-10 items-center gap-1 text-cuerpo-sm enlace"><Plus className="size-4" strokeWidth={2} aria-hidden />Crear una plantilla nueva</Link>
            </div>
          }
        />
      ) : (
        <>
          {opciones.cursos.length === 0 && <Alerta tipo="aviso">Este salón aún no tiene cursos. Agrégalos en Gestión; mientras tanto puedes poner bloques como «Tutoría».</Alerta>}
          <TablaHorario
            etiqueta={`Horario de ${salon.nombre}`}
            periodos={periodos}
            bloques={bloques}
            diaHoy={dia}
            ahoraId={ahora?.id ?? null}
            editor={{ accion: casilleroAction.bind(null, slug), salonId: salon.id, salonNombre: salon.nombre, cursos: opciones.cursos, profesores: opciones.profesores, tutorId: salon.tutorId }}
          />
        </>
      )}
    </div>
  );
}

// ───────────── Dirección: carga de profesores ─────────────

function horasYMinutos(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

async function CargaProfesores({ ctx }: { ctx: TenantContext }) {
  const carga = await cargaDocente(ctx);
  const conCruces = carga.filter((p) => p.cruces > 0).length;
  return (
    <div data-seccion="dia" className="flex flex-col gap-4">
      <Link href="/horario" className="inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace"><ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Horarios</Link>
      <EncabezadoPagina seccion="dia" titulo="Carga de profesores" descripcion="Horas de clase por semana de cada profesor según los horarios, y si alguna clase se le cruza." />
      {conCruces > 0 && <Alerta tipo="aviso">{conCruces === 1 ? "1 profesor tiene clases que se cruzan" : `${conCruces} profesores tienen clases que se cruzan`}. Suele pasar al cambiar las horas del día o el profesor de un curso: abre su semana para corregirlo.</Alerta>}
      {carga.length === 0 ? (
        <EstadoVacio icono={Users} titulo="Aún no hay profesores" descripcion="Agrégalos en Gestión." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-borde-sutil bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profesor</TableHead>
                <TableHead className="text-right">Horas por semana</TableHead>
                <TableHead className="text-right">Salones</TableHead>
                <TableHead>Cruces</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carga.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.bloques ? `${horasYMinutos(p.minutosSemana)} · ${p.bloques} ${p.bloques === 1 ? "bloque" : "bloques"}` : "Sin clases"}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.salones}</TableCell>
                  <TableCell>
                    {p.cruces > 0 ? (
                      <span className="inline-flex items-center gap-1 font-medium text-falta"><TriangleAlert className="size-4" strokeWidth={2} aria-hidden />{p.cruces === 1 ? "1 cruce" : `${p.cruces} cruces`}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-llego"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />Sin cruces</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right"><Link href={`/horario?profesor=${p.id}`} className="enlace text-cuerpo-sm">Ver semana<span className="sr-only"> de {p.nombre}</span></Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ───────────── Profesor: «Mi horario» (y dirección viendo la semana de un profesor) ─────────────

async function SemanaProfesor({ ctx, profesorId }: { ctx: TenantContext; profesorId?: string }) {
  const { profesor, bloques, cruces, jornada } = await horarioDelProfesor(ctx, profesorId);
  const { dia, hora, isoFecha } = ahoraDelColegio(ctx);
  const esPropio = ctx.rol === "profesor";
  const { ahora, despues } = bloqueAhora(bloques, dia, hora);
  const enCruce = new Set(cruces.flatMap(([a, b]) => [a.id, b.id]));
  const tareas = tieneFeature(ctx, "tareas");
  const notas = tieneFeature(ctx, "notas");

  const conAcciones: BloqueConAcciones[] = bloques.map((b) => {
    const acciones: AccionBloque[] = [];
    if (esPropio && b.cursoId) {
      if (b.dia === dia && puedePasarListaDeCurso(ctx, b.nivel)) acciones.push({ href: `/asistencia?salon=${b.salonId}&ambito=${b.cursoId}`, texto: "Pasar lista", icono: "lista" });
      if (tareas) acciones.push({ href: "/tareas", texto: "Tareas", icono: "tareas" });
      if (notas) acciones.push({ href: `/notas?curso=${b.cursoId}`, texto: "Notas", icono: "notas" });
    }
    return { ...b, acciones, enCruce: enCruce.has(b.id) };
  });
  const eventos = esPropio ? await agendaDeLaSemana(ctx, isoFecha) : [];
  const horasSemana = bloques.reduce((t, b) => t + minutos(b.horaFin) - minutos(b.horaInicio), 0);

  return (
    <div className="flex flex-col gap-4">
      {!esPropio && <Link href="/horario?vista=profesores" className="inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace"><ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Carga de profesores</Link>}
      <EncabezadoPagina
        seccion="dia"
        titulo={esPropio ? "Mi horario" : `Horario de ${profesor.nombre}`}
        descripcion={bloques.length ? `${bloques.length} ${bloques.length === 1 ? "bloque" : "bloques"} por semana · ${horasYMinutos(horasSemana)} de clase.` : undefined}
      />
      {cruces.length > 0 && (
        <Alerta tipo="aviso">
          {esPropio ? "Tienes" : `${profesor.nombre} tiene`} {cruces.length === 1 ? "una clase que se cruza" : `${cruces.length} cruces de clases`}:{" "}
          {cruces.map(([a, b]) => `${a.titulo} · ${a.salonNombre} (${rango(a)}) con ${b.titulo} · ${b.salonNombre} (${rango(b)})`).join("; ")}.
          {esPropio ? " Avisa a dirección para corregirlo." : ""}
        </Alerta>
      )}
      {bloques.length === 0 ? (
        <EstadoVacio icono={CalendarClock} titulo={esPropio ? "Aún no tienes clases en el horario" : "Este profesor aún no tiene clases en el horario"} descripcion="Cuando dirección arme los horarios de los salones, verás aquí la semana." />
      ) : (
        <>
          <CalendarioSemana
            bloques={conAcciones}
            eventos={eventos}
            jornada={jornada}
            hoyIso={isoFecha}
            diaHoy={dia}
            horaAhora={hora}
            ahoraId={ahora?.id ?? null}
            resumen={esPropio && esDiaHorario(dia) ? <AhoraDespues ahora={ahora} despues={despues} hayClasesHoy={bloques.some((b) => b.dia === dia)} conSalon /> : undefined}
          />
        </>
      )}
    </div>
  );
}

// ───────────── Alumno y familia ─────────────

async function VistaFamilia({ ctx, alumnoId }: { ctx: TenantContext; alumnoId?: string }) {
  const alumnos = await alumnosParaHorario(ctx);
  const esAlumno = ctx.rol === "alumno";
  const titulo = esAlumno ? "Mi horario" : "Horario";
  if (ctx.rol !== "alumno" && ctx.rol !== "apoderado") forbidden();
  if (alumnos.length === 0) {
    return (
      <div>
        <EncabezadoPagina seccion="dia" titulo={titulo} />
        <EstadoVacio
          icono={Users}
          titulo={esAlumno ? "Tu cuenta aún no está vinculada a tu ficha" : "Aún no hay alumnos vinculados a tu cuenta"}
          descripcion={esAlumno ? "Avisa a la dirección del colegio para que la revise." : "Cuando el colegio vincule a tus hijos, verás aquí su horario."}
        />
      </div>
    );
  }
  const alumno = alumnos.find((a) => a.id === alumnoId) ?? alumnos[0];
  const { salon, periodos, bloques } = await horarioDelSalon(ctx, alumno.salonId);
  const { dia, hora } = ahoraDelColegio(ctx);
  const { ahora, despues } = bloqueAhora(bloques, dia, hora);

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoPagina seccion="dia" titulo={titulo} descripcion={esAlumno ? `Tus clases de la semana en ${salon.nombre}.` : `Las clases de la semana de ${alumno.nombres} en ${salon.nombre}.`} />
      {alumnos.length > 1 && (
        <NavegacionPildoras etiqueta="Elige a tu hijo" items={alumnos.map((a) => ({ href: `/horario?alumno=${a.id}`, texto: `${a.nombres} · ${a.salonNombre}`, activo: a.id === alumno.id }))} />
      )}
      {periodos.length === 0 || bloques.length === 0 ? (
        <EstadoVacio icono={CalendarClock} titulo="El horario aún no está listo" descripcion="Cuando el colegio lo publique, lo verás aquí." />
      ) : (
        <>
          {esDiaHorario(dia) && (
            <div className="rounded-xl bg-sec-suave px-4 py-3 text-sec-tinta">
              <AhoraDespues ahora={ahora} despues={despues} hayClasesHoy={bloques.some((b) => b.dia === dia)} />
            </div>
          )}
          <TablaHorario etiqueta={`Horario de ${salon.nombre}`} periodos={periodos} bloques={bloques} diaHoy={dia} ahoraId={ahora?.id ?? null} />
        </>
      )}
    </div>
  );
}
