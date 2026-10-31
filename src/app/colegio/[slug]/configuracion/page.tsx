import { Bell, BookOpenCheck, Contact, Download, Globe, GraduationCap, ImageIcon, ScrollText, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { PLAZO_JUSTIFICACION_DEFECTO_DIAS, PLAZO_JUSTIFICACION_MAX_DIAS, PLAZO_JUSTIFICACION_MIN_DIAS } from "@/lib/plazo-justificacion";
import { NOMBRE_TIPO_CONTACTO } from "@/lib/comercial";
import { responsablesAnteKhipu } from "@/lib/server/plataforma-responsables";
import { exigirGestion } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { urlLogoColegio } from "@/lib/server/logo";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { NOMBRE_NIVEL, nivelesConfigurables } from "@/lib/asistencia-por-curso";
import { guardarAsistenciaPorCursoAction, guardarConfiguracionAction, quitarLogoAction, subirLogoAction } from "./actions";

export const metadata: Metadata = { title: "Configuración" };

function Seccion({ icono: Icono, titulo, descripcion, children }: { icono: typeof Bell; titulo: string; descripcion: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icono className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <div>
          <h2 className="text-titulo-2">{titulo}</h2>
          <p className="text-cuerpo-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default async function ConfiguracionPage({ params, searchParams }: PageProps<"/colegio/[slug]/configuracion">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  exigirGestion(ctx);
  const t = ctx.tenant;
  const logoUrl = await urlLogoColegio(t);
  const [responsables, nivelesConSalones] = await Promise.all([
    responsablesAnteKhipu(t.id),
    ctx.db.salon.groupBy({ by: ["nivel"], where: { archivadoAt: null }, _count: { _all: true } }),
  ]);
  const salonesPorNivel = new Map(nivelesConSalones.map((n) => [n.nivel, n._count._all]));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <EncabezadoPagina titulo="Configuración" descripcion="Avisos a las familias, identidad del colegio y privacidad de los datos." />
        <p className="-mt-3 mb-3 flex items-center gap-2 text-cuerpo-sm text-muted-foreground">
          {t.nombre}
          <span className="rounded-pildora bg-accent px-2.5 py-1 text-etiqueta text-accent-foreground">Plan {ctx.accesoModulos.nombrePlan}</span>
        </p>
        <Flash ok={ok} error={error} />
      </div>

      <Tarjeta>
        <form action={guardarConfiguracionAction} className="flex flex-col gap-8">
          <Seccion icono={Bell} titulo="Avisos a las familias" descripcion="Al cerrar la lista, cada familia recibe el aviso de llegada, tardanza, falta o problema de su hijo.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Hora límite de tardanza" name="horaLimiteTardanza" type="time" defaultValue={t.horaLimiteTardanza} required ayuda="Desde esta hora, la llegada cuenta como tarde." />
              <Campo etiqueta="Hora límite de falta" name="horaLimiteFalta" type="time" defaultValue={t.horaLimiteFalta} required ayuda="Con el control de ingreso, quien no llegó hasta esta hora queda con falta del día." />
              <Campo etiqueta="Plazo para justificar faltas (días hábiles)" name="plazoJustificacionDiasHabiles" type="number" min={PLAZO_JUSTIFICACION_MIN_DIAS} max={PLAZO_JUSTIFICACION_MAX_DIAS} step={1} defaultValue={t.plazoJustificacionDiasHabiles} required ayuda={`De ${PLAZO_JUSTIFICACION_MIN_DIAS} a ${PLAZO_JUSTIFICACION_MAX_DIAS} días hábiles (lunes a viernes, sin feriados) desde el día de la falta. Por defecto, ${PLAZO_JUSTIFICACION_DEFECTO_DIAS}.`} />
            </div>
            {ctx.modulos.has("porteria") ? (
              <label className="flex items-start gap-3 rounded-lg border px-3 py-3 text-cuerpo">
                <input type="checkbox" name="controlIngresoAutomatico" defaultChecked={t.controlIngresoAutomatico} className="mt-1 size-4 shrink-0 accent-[var(--primary)]" />
                <span className="flex flex-col gap-1">
                  <span className="font-medium">Control de ingreso automático por portería</span>
                  <span className="text-cuerpo-sm text-muted-foreground">
                    A la hora de tardanza, Khipu avisa «aún no llega» a las familias de quienes no pasaron por portería. A la hora límite de falta, les pone falta del día y les pide justificarla. Si llegan después, al escanear el carnet la falta pasa a tardanza. Además, en las listas de curso, un alumno sin ingreso al colegio solo puede quedar con falta. Solo corre de lunes a viernes sin feriados, y no corre si ese día nadie pasó por portería.
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-cuerpo-sm text-muted-foreground">El control de ingreso automático necesita el módulo Portería.</p>
            )}
          </Seccion>

          <div className="border-t pt-8">
            <Seccion icono={Globe} titulo="Dominio de correo" descripcion="Sirve para detectar tu colegio cuando alguien inicia sesión.">
              <Campo etiqueta="Dominios de correo del colegio" name="emailDomains" defaultValue={t.emailDomains.join(", ")} ayuda="Separados por coma. Sirven para detectar tu colegio al iniciar sesión." />
            </Seccion>
          </div>

          <div className="border-t pt-8">
            <Seccion icono={GraduationCap} titulo="Escala de calificación" descripcion="Cómo se muestran las notas en el colegio.">
              <Selector etiqueta="Escala de calificación" name="escalaCalificacion" defaultValue={t.escalaCalificacion}>
                <option value="literal">Literal (AD, A, B, C)</option>
                <option value="vigesimal">Vigesimal (0 a 20)</option>
              </Selector>
            </Seccion>
          </div>

          <div className="border-t pt-8">
            <Seccion icono={UserRound} titulo="Cuenta propia del alumno" descripcion="Desde qué grado de primaria un alumno puede entrar con su propia cuenta. En secundaria siempre puede; en inicial, nunca.">
              <Selector etiqueta="Desde qué grado de primaria" name="gradoMinimoCuentaAlumno" defaultValue={String(t.gradoMinimoCuentaAlumno)}>
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>{g}.° de primaria</option>
                ))}
              </Selector>
            </Seccion>
          </div>

          <Boton type="submit" className="self-start">Guardar</Boton>
        </form>
      </Tarjeta>

      <Tarjeta>
        <Seccion
          icono={BookOpenCheck}
          titulo="Asistencia por curso"
          descripcion="La asistencia al colegio se toma siempre (portería con QR o la lista del día del tutor). Activa por nivel si los profesores también pasan lista en cada clase."
        >
          <form action={guardarAsistenciaPorCursoAction} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Niveles con asistencia por curso</legend>
              {nivelesConfigurables(salonesPorNivel.has("academia")).map((n) => (
                <label key={n} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-cuerpo">
                  <input type="checkbox" name="niveles" value={n} defaultChecked={t.asistenciaPorCursoNiveles.includes(n)} className="size-4 accent-[var(--primary)]" />
                  <span className="font-medium">{NOMBRE_NIVEL[n]}</span>
                  <span className="ml-auto text-cuerpo-sm text-muted-foreground">
                    {salonesPorNivel.get(n) ? `${salonesPorNivel.get(n)} ${salonesPorNivel.get(n) === 1 ? "salón" : "salones"}` : "Sin salones"}
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="text-cuerpo-sm text-muted-foreground">
              En los niveles activos, cada profesor pasa lista en sus cursos y la familia recibe aviso si su hijo ingresó al colegio pero faltó a la clase, o si llegó tarde. Al desactivar un nivel no se borra nada: los registros pasados siguen en el historial y los reportes.
            </p>
            <Boton type="submit" className="self-start">Guardar asistencia por curso</Boton>
          </form>
        </Seccion>
      </Tarjeta>

      <Tarjeta>
        <Seccion icono={ImageIcon} titulo="Logo del colegio" descripcion="Aparece en el encabezado, los carnets y la libreta en PDF.">
          <div className="flex flex-wrap items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`Logo de ${t.nombre}`} className="size-20 rounded-lg border bg-white object-contain" />
            ) : (
              <p className="text-cuerpo-sm text-muted-foreground">Aún no subiste un logo.</p>
            )}
            {logoUrl && <BotonConfirmar etiqueta="Quitar logo" titulo="¿Quitar el logo?" descripcion="Los carnets y la libreta saldrán sin logo hasta que subas otro." confirmar="Quitar logo" accion={quitarLogoAction} peligro variante="ghost" />}
          </div>
          <form action={subirLogoAction} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Imagen del logo
              <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required className="min-h-10 text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-semibold" />
              <span className="text-cuerpo-sm font-normal text-muted-foreground">PNG, JPG o WEBP, hasta 1 MB. Para la libreta en PDF se usa PNG o JPG.</span>
            </label>
            <Boton type="submit">Subir logo</Boton>
          </form>
        </Seccion>
      </Tarjeta>

      <Tarjeta>
        <Seccion icono={ScrollText} titulo="Privacidad y datos" descripcion="Transparencia sobre quién vio o cambió datos, y una copia de todo lo tuyo.">
          <div className="flex flex-wrap gap-2">
            <Link href="/configuracion/auditoria" className={buttonVariants({ variant: "outline" })}>
              <ScrollText strokeWidth={2} aria-hidden /> Ver quién vio o cambió datos (auditoría)
            </Link>
            <Link href="/configuracion/exportar" className={buttonVariants({ variant: "outline" })}>
              <Download strokeWidth={2} aria-hidden /> Exportar todos los datos del colegio (ZIP)
            </Link>
          </div>
        </Seccion>
      </Tarjeta>

      {responsables.length > 0 && (
        <Tarjeta>
          <Seccion icono={Contact} titulo="Responsables ante Khipu" descripcion="Las personas de tu colegio con las que habla el equipo de Khipu. Si algo cambia, avísanos.">
            <ul className="flex flex-col divide-y text-cuerpo-sm">
              {responsables.map((r) => (
                <li key={r.id} className="flex flex-col gap-0.5 py-2">
                  <p className="font-semibold">
                    {r.nombres} {r.apellidos}
                    <span className="ml-2 rounded-pildora border px-2 py-0.5 text-etiqueta font-normal">{r.principal ? "Principal" : NOMBRE_TIPO_CONTACTO[r.tipo]}</span>
                  </p>
                  <p className="text-muted-foreground">{[r.cargo, r.email, r.telefono].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </Seccion>
        </Tarjeta>
      )}
    </div>
  );
}
