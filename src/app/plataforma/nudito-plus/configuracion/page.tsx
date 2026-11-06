import { Globe, PauseCircle, Pencil, PlayCircle, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPlataforma } from "@/app/plataforma/_componentes/EncabezadoPlataforma";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Textarea } from "@/components/ui/textarea";
import { licenciasFamiliaresNudito } from "@/lib/planes";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { configNuditoPlus, listarSitios } from "@/lib/server/plataforma-nudito-plus";
import { BotonAccion } from "../../_componentes/BotonAccion";
import {
  agregarSitioAction, cambiarActivoSitioAction, editarSitioAction, guardarConsentimientoAction, guardarLimitesAction, guardarPrecioYapeAction, quitarSitioAction,
} from "../actions";
import { DialogoAccion } from "../DialogoAccion";
import { Pestanas } from "../Pestanas";

export const metadata: Metadata = { title: "Configuración de Nudito+" };

/** Precio, Yape, texto de consentimiento, topes de uso y sitios permitidos de Nudito+ (specs/28–29). */
export default async function ConfiguracionNudito({ searchParams }: PageProps<"/plataforma/nudito-plus/configuracion">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const [config, sitios] = await Promise.all([configNuditoPlus(admin), listarSitios(admin)]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPlataforma titulo="Nudito+" descripcion="El texto de autorización para las familias, los topes por alumno y los sitios que Nudito puede recomendar." />
      <Pestanas actual="/nudito-plus/configuracion" />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-2">
        {licenciasFamiliaresNudito() && <Tarjeta>
          <form action={guardarPrecioYapeAction} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Precio y Yape</h2>
            <Campo etiqueta="Precio mensual por alumno (S/)" name="montoMensual" type="number" min="0.01" max="1000" step="0.01" required defaultValue={config.precio.montoMensual} />
            <Campo etiqueta="Número de Yape" name="numero" required inputMode="numeric" defaultValue={config.yape?.numero ?? ""} placeholder="999 999 999" />
            <Campo etiqueta="Titular" name="titular" required defaultValue={config.yape?.titular ?? ""} ayuda="Nombre que la familia ve en Yape al pagar." />
            <Boton type="submit" className="w-fit">Guardar</Boton>
          </form>
        </Tarjeta>}

        <Tarjeta>
          <form action={guardarLimitesAction} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Topes por alumno y mes</h2>
            <Campo etiqueta="Mensajes por mes" name="mensajesPorMes" type="number" min="1" step="1" required defaultValue={config.limites.mensajesPorMes} />
            <Campo etiqueta="Tokens por mes" name="tokensPorMes" type="number" min="1000" step="1" required defaultValue={config.limites.tokensPorMes} />
            <Campo etiqueta="Costo máximo por mes (USD)" name="costoMaxUsdPorMes" type="number" min="0.01" step="0.01" required defaultValue={config.limites.costoMaxUsdPorMes} />
            <Boton type="submit" className="w-fit">Guardar</Boton>
          </form>
        </Tarjeta>
      </div>

      <Tarjeta>
        <form action={guardarConsentimientoAction} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Texto de autorización para la familia</h2>
          <p className="text-cuerpo-sm text-muted-foreground">Si cambias la versión, todas las familias deberán aceptar de nuevo antes de que sus hijos sigan usando Nudito+. Separa los párrafos con una línea en blanco.</p>
          <Campo etiqueta="Versión" name="version" required maxLength={40} defaultValue={config.consentimiento.version} />
          <label htmlFor="texto-consentimiento" className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Texto</span>
            <Textarea id="texto-consentimiento" name="texto" required minLength={50} maxLength={8000} rows={10} defaultValue={config.consentimiento.texto} />
          </label>
          <Boton type="submit" className="w-fit">Publicar texto</Boton>
        </form>
      </Tarjeta>

      <section id="sitios" aria-labelledby="titulo-sitios" className="flex flex-col gap-3">
        <h2 id="titulo-sitios" className="text-lg font-semibold">Sitios permitidos</h2>
        <p className="max-w-prose text-cuerpo-sm text-muted-foreground">Nudito+ solo recomienda materiales de estos dominios (incluye sus subdominios). Escribe solo el dominio: sin «https://» ni «www.».</p>
        <Tarjeta>
          <form action={agregarSitioAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
            <Campo etiqueta="Dominio" name="dominio" required placeholder="perueduca.pe" autoCapitalize="none" />
            <Campo etiqueta="Nombre" name="nombre" required placeholder="PerúEduca" />
            <Campo etiqueta="Descripción (opcional)" name="descripcion" maxLength={300} />
            <Boton type="submit">Agregar sitio</Boton>
          </form>
        </Tarjeta>
        {sitios.length === 0 ? (
          <EstadoVacio icono={Globe} titulo="Aún no hay sitios permitidos." descripcion="Sin sitios, Nudito+ no recomienda enlaces." />
        ) : (
          <ul className="flex flex-col gap-2" data-testid="sitios-permitidos">
            {sitios.map((s) => (
              <li key={s.id}>
                <Tarjeta className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <span className="font-mono">{s.dominio}</span> · {s.nombre}
                    </p>
                    {s.descripcion && <p className="text-cuerpo-sm text-muted-foreground">{s.descripcion}</p>}
                    <p className={`inline-flex items-center gap-1 text-cuerpo-sm font-semibold ${s.activo ? "text-llego" : "text-muted-foreground"}`}>
                      {s.activo ? <PlayCircle className="size-4" strokeWidth={2} aria-hidden /> : <PauseCircle className="size-4" strokeWidth={2} aria-hidden />}
                      {s.activo ? "Activo" : "Pausado"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <DialogoAccion etiqueta={<><Pencil strokeWidth={2} aria-hidden /> Editar</>} titulo={`Editar ${s.dominio}`} confirmar="Guardar" accion={editarSitioAction} campos={{ id: s.id }}>
                      <Campo etiqueta="Dominio" name="dominio" id={`dominio-${s.id}`} required defaultValue={s.dominio} />
                      <Campo etiqueta="Nombre" name="nombre" id={`nombre-${s.id}`} required defaultValue={s.nombre} />
                      <Campo etiqueta="Descripción (opcional)" name="descripcion" id={`descripcion-${s.id}`} maxLength={300} defaultValue={s.descripcion ?? ""} />
                    </DialogoAccion>
                    <BotonAccion accion={cambiarActivoSitioAction} campos={{ id: s.id, activo: String(!s.activo) }}>
                      {s.activo ? <><PauseCircle strokeWidth={2} aria-hidden /> Pausar</> : <><PlayCircle strokeWidth={2} aria-hidden /> Activar</>}
                    </BotonAccion>
                    <BotonConfirmar
                      etiqueta={<><Trash2 strokeWidth={2} aria-hidden /> Quitar</>}
                      titulo={`¿Quitar ${s.dominio}?`}
                      descripcion="Nudito+ dejará de recomendar este sitio. Si solo quieres pausarlo, usa «Pausar»."
                      confirmar="Quitar sitio"
                      accion={quitarSitioAction}
                      campos={{ id: s.id }}
                      peligro
                      variante="ghost"
                      tamano="sm"
                    />
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
