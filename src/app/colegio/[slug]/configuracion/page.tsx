import { Download, ImageOff, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { exigirGestion } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { guardarConfiguracionAction } from "./actions";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage({ params, searchParams }: PageProps<"/colegio/[slug]/configuracion">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  exigirGestion(ctx);
  const t = ctx.tenant;

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
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ImageOff className="h-5 w-5 text-pizarra" strokeWidth={2} aria-hidden /> Logo del colegio</h2>
        {/* PENDIENTE: la subida del logo depende de FileStorage (spec 14), que construye otro agente. Al integrarlo, aquí va el input de archivo y se guarda tenants.logo_archivo_id. */}
        <Alerta tipo="info">La carga del logo estará disponible cuando se active el almacenamiento de archivos (pendiente).</Alerta>
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
