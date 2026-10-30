import { AlertTriangle, BarChart3, BookOpenCheck, CalendarClock, ClipboardList, FileSpreadsheet, FileText, GraduationCap, MailCheck, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { BarraDistribucion } from "@/components/tablero/BarraDistribucion";
import { GraficoSemanal } from "@/components/tablero/GraficoSemanal";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta } from "@/lib/fechas";
import { textoPorcentaje } from "@/lib/reportes-asistencia";
import { etiquetaNivel, NIVELES, UMBRAL_MAXIMO, UMBRAL_MINIMO } from "@/lib/tablero";
import { indicadoresTablero } from "@/lib/server/tablero";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Tablero de dirección" };

const NUM = "text-right tabular-nums";

export default async function TableroPage({ params, searchParams }: PageProps<"/colegio/[slug]/tablero">) {
  const { slug } = await params;
  const sp = await searchParams;
  const uno = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const t = await indicadoresTablero(ctx, { p: uno("p"), umbral: uno("umbral") });
  const { asistencia: a, rendimiento: r, avance, tareas, avisos, reuniones } = t;
  const consulta = (p: string, extra: Record<string, string> = {}) => `/tablero?${new URLSearchParams({ p, umbral: String(t.umbral), ...extra }).toString()}`;
  const reporteAlumno = (alumnoId: string, salonId: string) =>
    `/asistencia/reportes?${new URLSearchParams({ salon: salonId, alumno: alumnoId, desde: t.periodo.desde, hasta: t.hastaEfectivo }).toString()}`;
  const opcionesPeriodo = [
    { href: consulta("mes"), texto: "Mes actual", activo: t.periodo.clave === "mes" },
    ...t.periodos.map((p) => ({ href: consulta(p.id), texto: p.nombre, activo: t.periodo.clave === p.id })),
    { href: consulta("anio"), texto: "Año", activo: t.periodo.clave === "anio" },
  ];
  const vigesimal = t.escala === "vigesimal";

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Tablero de dirección"
        descripcion={`${t.colegio} · ${t.periodo.etiqueta}: del ${fechaCorta(t.periodo.desde)} al ${fechaCorta(t.hastaEfectivo)}`}
        acciones={
          <Link href="/tablero/consolidado" className={buttonVariants({ variant: "outline" })}>
            <FileSpreadsheet className="size-4" strokeWidth={2} aria-hidden /> Consolidado de notas
          </Link>
        }
      />
      <NavegacionPildoras etiqueta="Periodo del tablero" items={opcionesPeriodo} />

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icono={<ClipboardList className="size-5" strokeWidth={2} aria-hidden />} titulo="Asistencia" valor={textoPorcentaje(a.porcentaje)} detalle={`${a.registros.toLocaleString("es-PE")} registros en ${a.diasHabiles} días hábiles`} id="kpi-asistencia" />
        <Kpi icono={<AlertTriangle className="size-5" strokeWidth={2} aria-hidden />} titulo="Tardanzas y faltas" valor={`${a.tardanzas} · ${a.faltas}`} detalle="Tardanzas · faltas en el periodo" />
        <Kpi icono={<GraduationCap className="size-5" strokeWidth={2} aria-hidden />} titulo="Logro esperado" valor={textoPorcentaje(r.logroEsperado)} detalle={r.origen === "sin_datos" ? "Aún no hay notas en este periodo" : `${vigesimal ? "Notas de 14 o más" : "Calificaciones AD y A"} · ${t.periodo.referencia?.nombre}`} />
        <Kpi icono={<FileText className="size-5" strokeWidth={2} aria-hidden />} titulo="Justificaciones pendientes" valor={String(t.justificacionesPendientes)} detalle={<Link href="/justificaciones" className="enlace">Revisar justificaciones</Link>} id="kpi-justificaciones" />
      </section>

      <Seccion titulo="Asistencia" id="asistencia">
        {a.semanas.length === 0 ? (
          <EstadoVacio icono={BarChart3} titulo="Aún no hay asistencia en este periodo" descripcion="Cuando los profesores pasen lista, verás aquí la evolución por semana." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <GraficoSemanal titulo="Asistencia por semana" descripcion="% de presentes (llegó + tarde) sobre los registros de la semana." testId="grafico-asistencia" unidad="%" dominio={[Math.max(0, Math.floor(Math.min(...a.semanas.map((s) => s.porcentaje)) / 5) * 5 - 5), 100]}
              datos={a.semanas.map((s) => ({ semana: s.semana, asistencia: s.porcentaje }))} series={[{ clave: "asistencia", etiqueta: "Asistencia", color: "var(--chart-1)" }]} />
            <GraficoSemanal titulo="Tardanzas y faltas por semana" descripcion="Cantidad de alumnos con tardanza o falta cada semana." testId="grafico-tardanzas"
              datos={a.semanas.map((s) => ({ semana: s.semana, tardanzas: s.tardanzas, faltas: s.faltas }))}
              series={[{ clave: "tardanzas", etiqueta: "Tardanzas", color: "var(--chart-1)" }, { clave: "faltas", etiqueta: "Faltas", color: "var(--chart-2)", punteada: true }]} />
          </div>
        )}
        <Tabla titulo="Salones por asistencia" vacio={a.salones.length === 0}>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead><TableHead>Salón</TableHead><TableHead className={NUM}>Alumnos</TableHead><TableHead className={NUM}>Tardanzas</TableHead><TableHead className={NUM}>Faltas</TableHead><TableHead className={NUM}>% asistencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {a.salones.map((s, i) => (
              <TableRow key={s.salonId}>
                <TableCell className="tabular-nums">{i + 1}</TableCell>
                <TableCell><Link href={`/asistencia/reportes?${new URLSearchParams({ salon: s.salonId, desde: t.periodo.desde, hasta: t.hastaEfectivo })}`} className="enlace font-medium">{s.salon}</Link></TableCell>
                <TableCell className={NUM}>{s.alumnos}</TableCell><TableCell className={NUM}>{s.tardanzas}</TableCell><TableCell className={NUM}>{s.faltas}</TableCell>
                <TableCell className={`${NUM} font-semibold`}>{textoPorcentaje(s.porcentaje)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Tabla>
        <div className="flex flex-col gap-3" data-testid="ausentismo-cronico">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-heading text-titulo-2">Ausentismo crónico</h3>
            <form method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="p" value={t.periodo.clave} />
              <Campo etiqueta="Asistencia menor a (%)" name="umbral" type="number" min={UMBRAL_MINIMO} max={UMBRAL_MAXIMO} step={1} defaultValue={t.umbral} className="w-28" />
              <Boton type="submit" variante="secundario">Aplicar</Boton>
            </form>
          </div>
          {a.totalCronicos === 0 ? (
            <EstadoVacio icono={UserX} titulo={`Ningún alumno por debajo de ${t.umbral} %`} descripcion="Cambia el umbral para ver a quienes están cerca del límite." />
          ) : (
            <Tabla titulo={`${a.totalCronicos} ${a.totalCronicos === 1 ? "alumno" : "alumnos"} por debajo de ${t.umbral} %${a.totalCronicos > a.cronicos.length ? ` (se muestran ${a.cronicos.length})` : ""}`} vacio={false}>
              <TableHeader>
                <TableRow><TableHead>Alumno</TableHead><TableHead>Salón</TableHead><TableHead className={NUM}>Faltas</TableHead><TableHead className={NUM}>Días con registro</TableHead><TableHead className={NUM}>% asistencia</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {a.cronicos.map((c) => (
                  <TableRow key={c.alumnoId}>
                    <TableCell><Link href={reporteAlumno(c.alumnoId, c.salonId)} className="enlace font-medium">{c.nombre}</Link></TableCell>
                    <TableCell>{c.salon}</TableCell><TableCell className={NUM}>{c.faltas}</TableCell><TableCell className={NUM}>{c.registros}</TableCell>
                    <TableCell className={`${NUM} font-semibold`}>{textoPorcentaje(c.porcentaje)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Tabla>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Rendimiento académico" id="rendimiento" nota={t.periodo.referencia ? `Periodo de referencia: ${t.periodo.referencia.nombre}. ${r.origen === "notas" ? "Aún sin cierre de calificaciones: se usan las notas de las evaluaciones." : r.origen === "calificaciones" ? "Calificaciones del periodo por competencia." : ""}` : "Aún no hay un periodo académico creado."}>
        {r.origen === "sin_datos" ? (
          <EstadoVacio icono={GraduationCap} titulo="Aún no hay notas en este periodo" descripcion="Cuando los profesores registren notas, verás la distribución por salón y curso." />
        ) : (
          <>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-cuerpo-sm text-muted-foreground" aria-label="Leyenda de niveles">
              {NIVELES.map((n) => <li key={n}><strong className="text-foreground">{etiquetaNivel(n, t.escala)}</strong> {{ AD: "logro destacado", A: "logro esperado", B: "en proceso", C: "en inicio" }[n]}</li>)}
            </ul>
            <Tabla titulo="Por salón" vacio={false}>
              <TableHeader><TableRow><TableHead>Salón</TableHead><TableHead>Distribución</TableHead><TableHead className={NUM}>% logro esperado</TableHead></TableRow></TableHeader>
              <TableBody>
                {r.porSalon.map((s) => (
                  <TableRow key={s.id}><TableCell className="font-medium">{s.nombre}</TableCell><TableCell><BarraDistribucion distribucion={s.distribucion} escala={t.escala} /></TableCell><TableCell className={`${NUM} font-semibold`}>{textoPorcentaje(s.logroEsperado)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Tabla>
            <Tabla titulo="Por curso" vacio={false}>
              <TableHeader><TableRow><TableHead>Curso</TableHead><TableHead>Salón</TableHead><TableHead>Distribución</TableHead><TableHead className={NUM}>% logro esperado</TableHead></TableRow></TableHeader>
              <TableBody>
                {r.porCurso.map((c) => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.nombre}</TableCell><TableCell>{c.salon}</TableCell><TableCell><BarraDistribucion distribucion={c.distribucion} escala={t.escala} /></TableCell><TableCell className={`${NUM} font-semibold`}>{textoPorcentaje(c.logroEsperado)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Tabla>
            <div className="flex flex-col gap-3" data-testid="alumnos-en-riesgo">
              {r.totalEnRiesgo === 0 ? (
                <EstadoVacio icono={BookOpenCheck} titulo="Ningún alumno en riesgo" descripcion={`Nadie tiene ${vigesimal ? "menos de 11" : "C"} en dos o más competencias.`} />
              ) : (
                <Tabla titulo={`Alumnos en riesgo: ${vigesimal ? "menos de 11" : "C"} en 2 o más competencias (${r.totalEnRiesgo})`} vacio={false}>
                  <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Salón</TableHead><TableHead className={NUM}>Competencias en riesgo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {r.enRiesgo.map((e) => (
                      <TableRow key={e.alumnoId}><TableCell className="font-medium">{e.nombre}</TableCell><TableCell>{e.salon}</TableCell><TableCell className={`${NUM} font-semibold`}>{e.competenciasEnRiesgo}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Tabla>
              )}
            </div>
          </>
        )}
      </Seccion>

      <Seccion titulo="Avance de registro de notas" id="avance" nota={t.periodo.referencia ? `${t.periodo.referencia.nombre}: notas registradas ÷ (evaluaciones × alumnos del salón).` : undefined}>
        {avance.porCurso.length === 0 || !t.periodo.referencia ? (
          <EstadoVacio icono={BookOpenCheck} titulo="Sin cursos para mostrar" descripcion="Crea cursos y evaluaciones para ver el avance de los profesores." />
        ) : (
          <>
            <Tabla titulo="Por profesor" vacio={false}>
              <TableHeader><TableRow><TableHead>Profesor</TableHead><TableHead className={NUM}>Cursos</TableHead><TableHead className={NUM}>Evaluaciones</TableHead><TableHead className={NUM}>Notas registradas</TableHead><TableHead className={NUM}>Avance</TableHead></TableRow></TableHeader>
              <TableBody>
                {avance.porProfesor.map((p) => (
                  <TableRow key={p.profesor}><TableCell className="font-medium">{p.profesor}</TableCell><TableCell className={NUM}>{p.cursos}</TableCell><TableCell className={NUM}>{p.evaluaciones}</TableCell><TableCell className={NUM}>{p.registradas} de {p.esperadas}</TableCell><TableCell className={`${NUM} font-semibold`}>{p.porcentaje === null ? "Sin evaluaciones" : textoPorcentaje(p.porcentaje)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Tabla>
            <Tabla titulo="Por curso" vacio={false}>
              <TableHeader><TableRow><TableHead>Curso</TableHead><TableHead>Salón</TableHead><TableHead>Profesor</TableHead><TableHead className={NUM}>Evaluaciones</TableHead><TableHead className={NUM}>Notas registradas</TableHead><TableHead className={NUM}>Avance</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {avance.porCurso.map((c) => (
                  <TableRow key={c.cursoId}>
                    <TableCell className="font-medium">{c.curso}</TableCell><TableCell>{c.salon}</TableCell><TableCell>{c.profesor ?? "Sin asignar"}</TableCell>
                    <TableCell className={NUM}>{c.evaluaciones}</TableCell><TableCell className={NUM}>{c.registradas} de {c.esperadas}</TableCell>
                    <TableCell className={`${NUM} font-semibold`}>{c.porcentaje === null ? "—" : textoPorcentaje(c.porcentaje)}</TableCell>
                    <TableCell>{c.cerrado ? "Cerrado" : "Abierto"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Tabla>
          </>
        )}
      </Seccion>

      <Seccion titulo="Tareas, avisos y reuniones" id="otros">
        <div className="grid gap-4 lg:grid-cols-3">
          <Tarjeta className="flex flex-col gap-2">
            <h3 className="font-heading text-titulo-2">Tareas publicadas</h3>
            <p className="text-titulo-1 tabular-nums" data-testid="kpi-tareas">{tareas.total}</p>
            {tareas.porCurso.length === 0 ? <p className="text-cuerpo-sm text-muted-foreground">Ninguna tarea publicada en este periodo.</p> : (
              <ul className="flex flex-col gap-1 text-cuerpo-sm">
                {tareas.porCurso.slice(0, 8).map((c) => <li key={c.cursoId} className="flex justify-between gap-2"><span>{c.curso} · {c.salon}</span><strong className="tabular-nums">{c.tareas}</strong></li>)}
              </ul>
            )}
          </Tarjeta>
          <Tarjeta className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 font-heading text-titulo-2"><MailCheck className="size-5" strokeWidth={2} aria-hidden /> Avisos a las familias</h3>
            <ul className="flex flex-col gap-1 text-cuerpo-sm" data-testid="resumen-avisos">
              <li className="flex justify-between"><span>Enviados</span><strong className="tabular-nums">{avisos.enviados}</strong></li>
              <li className="flex justify-between"><span>Abiertos</span><strong className="tabular-nums">{avisos.abiertos}</strong></li>
              <li className="flex justify-between"><span>Con error</span><strong className="tabular-nums">{avisos.conError}</strong></li>
              <li className="flex justify-between"><span>Pendientes de envío</span><strong className="tabular-nums">{avisos.pendientes}</strong></li>
            </ul>
            <Link href="/avisos" className="enlace text-cuerpo-sm">Ver avisos enviados</Link>
          </Tarjeta>
          <Tarjeta className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 font-heading text-titulo-2"><CalendarClock className="size-5" strokeWidth={2} aria-hidden /> Próximas reuniones</h3>
            <p className="text-titulo-1 tabular-nums">{reuniones.proximas}</p>
            {reuniones.siguientes.length === 0 ? <p className="text-cuerpo-sm text-muted-foreground">No hay reuniones programadas.</p> : (
              <ul className="flex flex-col gap-1 text-cuerpo-sm">
                {reuniones.siguientes.map((x) => <li key={x.id}>{x.titulo} · {new Intl.DateTimeFormat("es-PE", { timeZone: ctx.tenant.zonaHoraria, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(x.inicio)}</li>)}
              </ul>
            )}
          </Tarjeta>
        </div>
      </Seccion>

      <p className="text-sm text-muted-foreground">
        % de asistencia = (llegó + tarde) ÷ días con registro, solo días hábiles (lunes a viernes sin feriados), igual que en los reportes de asistencia. Los días sin registro no cuentan.
      </p>
    </div>
  );
}

function Seccion({ titulo, id, nota, children }: { titulo: string; id: string; nota?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`sec-${id}`} className="flex flex-col gap-4">
      <div>
        <h2 id={`sec-${id}`} className="text-titulo-2 font-heading">{titulo}</h2>
        {nota && <p className="text-cuerpo-sm text-muted-foreground">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ icono, titulo, valor, detalle, id }: { icono: ReactNode; titulo: string; valor: string; detalle: ReactNode; id?: string }) {
  return (
    <Tarjeta className="flex flex-col gap-1" data-testid={id}>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">{icono}{titulo}</span>
      <span className="text-titulo-1 tabular-nums">{valor}</span>
      <span className="text-cuerpo-sm text-muted-foreground">{detalle}</span>
    </Tarjeta>
  );
}

function Tabla({ titulo, vacio, children }: { titulo: string; vacio: boolean; children: ReactNode }) {
  if (vacio) return null;
  return (
    <Tarjeta className="p-0 sm:p-0">
      <h3 className="px-4 pt-4 font-heading text-titulo-2">{titulo}</h3>
      <Table>{children}</Table>
    </Tarjeta>
  );
}
