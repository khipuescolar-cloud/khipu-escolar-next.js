import { Bell, Download, Globe, GraduationCap, ImageIcon, MessageCircle, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { exigirGestion } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { urlLogoColegio } from "@/lib/server/logo";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { estadoCredenciales } from "@/lib/server/notificaciones/canales-pago";
import { CanalesPago } from "./CanalesPago";
import { guardarConfiguracionAction, quitarLogoAction, subirLogoAction } from "./actions";

export const metadata: Metadata = { title: "Configuración" };

function Seccion({ icono: Icono, titulo, descripcion, children }: { icono: typeof Bell; titulo: string; descripcion: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icono className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
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

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <EncabezadoPagina titulo="Configuración" descripcion="Avisos a las familias, identidad del colegio y privacidad de los datos." />
        <Flash ok={ok} error={error} />
      </div>

      <Tarjeta>
        <form action={guardarConfiguracionAction} className="flex flex-col gap-8">
          <Seccion icono={Bell} titulo="Avisos a las familias" descripcion="Cuándo y cómo se avisa la asistencia de cada alumno.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Hora del resumen de llegadas" name="horaEnvioAvisos" type="time" defaultValue={t.horaEnvioAvisos} required ayuda="Las familias reciben el resumen a esta hora." />
              <Campo etiqueta="Hora límite de tardanza" name="horaLimiteTardanza" type="time" defaultValue={t.horaLimiteTardanza} required ayuda="Desde esta hora, la llegada cuenta como tarde." />
              <Campo etiqueta="Plazo para justificar faltas (horas)" name="plazoJustificacionHoras" type="number" min={24} max={168} step={1} defaultValue={t.plazoJustificacionHoras} required ayuda="Entre 24 y 168 horas. El enlace del correo de falta vence pasado este plazo." />
              <Selector etiqueta="Modo de avisos" name="modoAvisos" defaultValue={t.modoAvisos}>
                <option value="todos">Avisar siempre (llegadas y faltas)</option>
                <option value="solo_excepciones">Solo excepciones (tardanzas y faltas)</option>
              </Selector>
            </div>
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

          <Boton type="submit" className="self-start">Guardar</Boton>
        </form>
      </Tarjeta>

      <Tarjeta>
        <Seccion icono={MessageCircle} titulo="Canales de pago" descripcion="WhatsApp y SMS: llegan más rápido, pero cada mensaje cuesta. Están apagados hasta que los actives.">
          <CanalesPago whatsappActivo={t.whatsappActivo} smsActivo={t.smsActivo} credenciales={estadoCredenciales()} />
        </Seccion>
      </Tarjeta>

      <Tarjeta>
        <Seccion icono={ImageIcon} titulo="Logo del colegio" descripcion="Aparece en el encabezado, los carnets y la libreta en PDF.">
          <div className="flex flex-wrap items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`Logo de ${t.nombre}`} className="size-20 rounded-lg border bg-white object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">Aún no subiste un logo.</p>
            )}
            {logoUrl && <BotonConfirmar etiqueta="Quitar logo" titulo="¿Quitar el logo?" descripcion="Los carnets y la libreta saldrán sin logo hasta que subas otro." confirmar="Quitar logo" accion={quitarLogoAction} peligro variante="ghost" />}
          </div>
          <form action={subirLogoAction} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Imagen del logo
              <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required className="min-h-10 text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-semibold" />
              <span className="text-xs font-normal text-muted-foreground">PNG, JPG o WEBP, hasta 1 MB. Para la libreta en PDF se usa PNG o JPG.</span>
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
    </div>
  );
}
