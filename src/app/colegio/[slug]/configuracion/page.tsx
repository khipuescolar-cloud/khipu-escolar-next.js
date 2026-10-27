import { Download, ImageIcon, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { exigirGestion } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { urlLogoColegio } from "@/lib/server/logo";
import { guardarConfiguracionAction, quitarLogoAction, subirLogoAction } from "./actions";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage({ params, searchParams }: PageProps<"/colegio/[slug]/configuracion">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  exigirGestion(ctx);
  const t = ctx.tenant;
  const logoUrl = await urlLogoColegio(t);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <Flash ok={ok} error={error} />

      <Tarjeta>
        <form action={guardarConfiguracionAction} className="flex flex-col gap-4">
          <Campo etiqueta="Hora del resumen de llegadas" name="horaEnvioAvisos" type="time" defaultValue={t.horaEnvioAvisos} required ayuda="Las familias reciben el resumen a esta hora." />
          <Campo etiqueta="Hora límite de tardanza" name="horaLimiteTardanza" type="time" defaultValue={t.horaLimiteTardanza} required ayuda="Desde esta hora, la llegada cuenta como tarde." />
          <Selector etiqueta="Modo de avisos" name="modoAvisos" defaultValue={t.modoAvisos}>
            <option value="todos">Avisar siempre (llegadas y faltas)</option>
            <option value="solo_excepciones">Solo excepciones (tardanzas y faltas)</option>
          </Selector>
          <Campo etiqueta="Dominios de correo del colegio" name="emailDomains" defaultValue={t.emailDomains.join(", ")} ayuda="Separados por coma. Sirven para detectar tu colegio al iniciar sesión." />
          <Selector etiqueta="Escala de calificación" name="escalaCalificacion" defaultValue={t.escalaCalificacion}>
            <option value="literal">Literal (AD, A, B, C)</option>
            <option value="vigesimal">Vigesimal (0 a 20)</option>
          </Selector>
          <Boton type="submit" className="self-start">Guardar</Boton>
        </form>
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ImageIcon className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Logo del colegio</h2>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`Logo de ${t.nombre}`} className="h-20 w-20 rounded-md border border-arena bg-white object-contain" />
        ) : (
          <p className="text-sm text-pizarra">Aún no subiste un logo.</p>
        )}
        <form action={subirLogoAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Imagen del logo
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required className="text-sm" />
            <span className="text-xs font-normal text-pizarra">PNG, JPG o WEBP, hasta 1 MB. Para la libreta en PDF se usa PNG o JPG.</span>
          </label>
          <Boton type="submit">Subir logo</Boton>
        </form>
        {logoUrl && (
          <form action={quitarLogoAction}>
            <Boton type="submit" variante="fantasma">Quitar logo</Boton>
          </form>
        )}
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Privacidad y datos</h2>
        <Link href="/configuracion/auditoria" className="inline-flex items-center gap-2 text-sm font-semibold text-acento">
          <ScrollText className="h-4 w-4" strokeWidth={2} aria-hidden /> Ver quién vio o cambió datos (auditoría)
        </Link>
        <a href="/api/exportar" className="inline-flex items-center gap-2 text-sm font-semibold text-acento">
          <Download className="h-4 w-4" strokeWidth={2} aria-hidden /> Descargar todos los datos del colegio (ZIP)
        </a>
      </Tarjeta>
    </div>
  );
}
