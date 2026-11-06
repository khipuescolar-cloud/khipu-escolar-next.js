import { ArrowLeft, Ban, CheckCircle2, PauseCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TituloBloque } from "@/components/academico/TituloBloque";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { AREAS_NUDITO, NIVELES_NUDITO } from "@/lib/nudito/contratos";
import { POLITICA_DOMINIO_POR_DEFECTO } from "@/lib/nudito/politica-dominio";
import { AVISO_FORMATIVO, NOMBRE_AREA_NUDITO } from "@/lib/nudito-seguimiento";
import { configNudito } from "@/lib/server/nudito/config-colegio";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { guardarConfigNuditoAction } from "./actions";

export const metadata: Metadata = { title: "Configuración de Nudito" };

const NOMBRE_NIVEL = { primaria: "Primaria", secundaria: "Secundaria" } as const;

function Casilla({ name, value, defaultChecked, children }: { name: string; value?: string; defaultChecked: boolean; children: React.ReactNode }) {
  return (
    <label className="flex min-h-10 items-center gap-2.5 text-sm">
      <input type="checkbox" name={name} value={value ?? "on"} defaultChecked={defaultChecked} className="size-5 accent-primary" />
      <span>{children}</span>
    </label>
  );
}

/** Dirección enciende Nudito y fija sus límites (specs/44). */
export default async function ConfiguracionNudito({ params, searchParams }: PageProps<"/colegio/[slug]/configuracion/nudito">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  requireFeature(ctx, "nudito_plus");
  const { activo, motivo, config: c } = await configNudito(ctx);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/configuracion" className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Configuración
      </Link>
      <EncabezadoPagina titulo="Nudito, tutor de práctica" seccion="colegio" descripcion={`Decide si tus alumnos usan Nudito, en qué grados y cursos, y por cuánto tiempo se guarda su práctica. ${AVISO_FORMATIVO}`} />
      <Flash ok={sp.ok} error={sp.error} />

      <p className="inline-flex items-center gap-2 text-sm font-semibold" data-testid="estado-nudito">
        {activo ? (
          <><CheckCircle2 className="size-5 text-llego" strokeWidth={2} aria-hidden /> Activo</>
        ) : motivo === "plataforma" ? (
          <><Ban className="size-5 text-falta" strokeWidth={2} aria-hidden /> Bloqueado por el equipo de Khipu Escolar</>
        ) : (
          <><PauseCircle className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden /> Apagado</>
        )}
      </p>
      {motivo === "plataforma" && <Alerta tipo="aviso">El equipo de Khipu Escolar pausó Nudito en tu colegio. Escríbenos desde Soporte Khipu para saber más.</Alerta>}

      <form action={guardarConfigNuditoAction} className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-col divide-y divide-borde-sutil rounded-[14px] border border-borde-sutil bg-superficie">
        <section className="flex flex-col gap-3 p-5 sm:p-6">
          <TituloBloque>Encendido</TituloBloque>
          <Casilla name="activo" defaultChecked={c.activo}>Nudito está activo en el colegio</Casilla>
          <p className="text-cuerpo-sm text-muted-foreground">Las familias deben autorizar el uso de Nudito para cada hijo antes de que empiece a practicar.</p>
        </section>

        <section className="flex flex-col gap-3 p-5 sm:p-6">
          <TituloBloque>Quiénes lo usan</TituloBloque>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">Cursos (áreas)</legend>
            {AREAS_NUDITO.map((a) => <Casilla key={a} name="areas" value={a} defaultChecked={c.areas.includes(a)}>{NOMBRE_AREA_NUDITO[a]}</Casilla>)}
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">Niveles</legend>
            {NIVELES_NUDITO.map((n) => <Casilla key={n} name="niveles" value={n} defaultChecked={c.niveles.includes(n)}>{NOMBRE_NIVEL[n]}</Casilla>)}
          </fieldset>
          <Campo etiqueta="Desde qué grado de primaria" name="gradoMinimoPrimaria" type="number" min={1} max={6} step={1} required defaultValue={c.gradoMinimoPrimaria} />
          <Casilla name="permitirModoHijo" defaultChecked={c.permitirModoHijo}>Modo hijo: la familia presta su cuenta a un hijo sin cuenta propia</Casilla>
          <Casilla name="permitirFotos" defaultChecked={c.permitirFotos}>Permitir fotos de ejercicios (privadas; se descartan si muestran una cara)</Casilla>
        </section>

        <section className="flex flex-col gap-3 p-5 sm:p-6">
          <TituloBloque>Límites</TituloBloque>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Sesiones por día y alumno" name="sesionesPorDia" type="number" min={1} max={50} step={1} required defaultValue={c.sesionesPorDia} />
            <Campo etiqueta="Minutos por día (opcional)" name="minutosPorDia" type="number" min={5} max={600} step={1} defaultValue={c.minutosPorDia ?? ""} ayuda="Vacío: sin límite de minutos." />
            <Campo etiqueta="Desde (hora)" name="horaDesde" type="time" defaultValue={c.horaDesde ?? ""} ayuda="Vacío: a cualquier hora." />
            <Campo etiqueta="Hasta (hora)" name="horaHasta" type="time" defaultValue={c.horaHasta ?? ""} />
            <Campo etiqueta="Tope de costo de IA al mes (USD, opcional)" name="topeCostoUsdMes" type="number" min={0} step={0.01} defaultValue={c.topeCostoUsdMes ?? ""} />
            <Campo etiqueta="Guardar la práctica por (días)" name="retencionDias" type="number" min={30} max={730} step={1} required defaultValue={c.retencionDias} ayuda="Entre 30 y 730. Después se borran ejercicios, respuestas, mensajes y fotos; el progreso por tema se conserva." />
          </div>
        </section>

        <section className="flex flex-col gap-3 p-5 sm:p-6">
          <TituloBloque>Política de dominio (avanzado)</TituloBloque>
          <p className="text-cuerpo-sm text-muted-foreground">
            Cuándo Nudito considera que un tema está dominado. Los valores por defecto ({POLITICA_DOMINIO_POR_DEFECTO.version}) son <strong>provisionales</strong> y se
            ajustarán con el piloto. Cambia solo si lo acordaste con el equipo de Khipu Escolar: escribe en JSON solo los valores que cambian.
          </p>
          <details>
            <summary className="cursor-pointer text-cuerpo-sm font-medium">Ver valores por defecto</summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(POLITICA_DOMINIO_POR_DEFECTO, null, 2)}</pre>
          </details>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Cambios (JSON, opcional)</span>
            <textarea name="politicaDominio" rows={4} defaultValue={c.politicaDominio ? JSON.stringify(c.politicaDominio, null, 2) : ""} placeholder='{ "minIntentos": 8 }' className="rounded-[10px] border border-input bg-card p-2 font-mono text-xs" />
          </label>
        </section>

        </div>
        <Boton type="submit" className="w-fit">Guardar configuración</Boton>
      </form>
    </div>
  );
}
