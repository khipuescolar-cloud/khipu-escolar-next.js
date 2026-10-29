"use client";

import { CircleCheck, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { cn } from "@/lib/utils";
import { solicitarDemoAction } from "../actions";
import type { CampoDemo, EstadoFormularioDemo } from "./estado-demo";

type OpcionPlan = { plan: string; nombre: string };

const INICIAL: EstadoFormularioDemo = { estado: "inicial" };

function Campo({ id, etiqueta, opcional, error, children }: { id: string; etiqueta: string; opcional?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id} className="font-medium text-foreground">
        {etiqueta}
        {opcional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-cuerpo-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Grupo del formulario con un nudo numerado de color: ordena los campos en tres pasos cortos. */
function Bloque({ numero, tono, titulo, children }: { numero: number; tono: string; titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 flex items-center gap-3 font-heading text-cuerpo font-semibold">
        <span className={cn("flex size-7 items-center justify-center rounded-full text-etiqueta tabular-nums", tono)} aria-hidden>
          {numero}
        </span>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

/** Formulario «Solicita una demo» (specs/25). `planInicial` viene de «Quiero este plan» (?plan=). */
export function FormularioDemo({ planes, planInicial }: { planes: OpcionPlan[]; planInicial?: string }) {
  const [estado, accion, pendiente] = useActionState(solicitarDemoAction, INICIAL);
  const exito = useRef<HTMLDivElement>(null);
  const errores = estado.estado === "error" ? estado.errores : {};
  const valores = estado.estado === "error" ? estado.valores : null;

  useEffect(() => {
    if (estado.estado === "ok") exito.current?.focus();
  }, [estado]);

  if (estado.estado === "ok") {
    return (
      <div ref={exito} tabIndex={-1} role="status" className="flex flex-col items-start gap-3 rounded-lg border border-llego/25 bg-llego-fondo p-6 text-llego outline-none">
        <CircleCheck className="size-8" strokeWidth={2} aria-hidden />
        <p className="font-heading text-titulo-2 text-balance">
          Gracias{estado.nombre ? `, ${estado.nombre}` : ""}. Te escribiremos en menos de 1 día hábil.
        </p>
        <p className="text-cuerpo text-foreground">Revise su correo, también la carpeta de no deseados.</p>
      </div>
    );
  }

  const v = (c: CampoDemo) => valores?.[c] ?? undefined;
  const props = (c: CampoDemo) => ({
    id: `demo-${c}`,
    name: c,
    defaultValue: v(c),
    "aria-invalid": errores[c] ? true : undefined,
    "aria-describedby": errores[c] ? `demo-${c}-error` : undefined,
  });

  return (
    <form action={accion} noValidate className="flex flex-col gap-7" aria-describedby="demo-nota">
      {estado.estado === "error" && estado.mensaje && <Alerta tipo="error">{estado.mensaje}</Alerta>}
      {estado.estado === "error" && !estado.mensaje && <Alerta tipo="error">Revisa los campos marcados.</Alerta>}

      <Bloque numero={1} tono="bg-turquesa text-white" titulo="Sobre usted">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <Campo id="demo-nombre" etiqueta="Nombre y apellido" error={errores.nombre}>
            <Input {...props("nombre")} autoComplete="name" required maxLength={120} className="h-11" />
          </Campo>
          <Campo id="demo-cargo" etiqueta="Cargo" opcional error={errores.cargo}>
            <Input {...props("cargo")} autoComplete="organization-title" maxLength={80} placeholder="Ej.: directora, promotor" className="h-11" />
          </Campo>
        </div>
      </Bloque>

      <Bloque numero={2} tono="bg-cochinilla text-white" titulo="Su colegio">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div className="sm:col-span-2">
            <Campo id="demo-colegio" etiqueta="Colegio" error={errores.colegio}>
              <Input {...props("colegio")} autoComplete="organization" required maxLength={160} placeholder="Ej.: I.E.P. San Martín" className="h-11" />
            </Campo>
          </div>
          <Campo id="demo-ciudad" etiqueta="Ciudad" opcional error={errores.ciudad}>
            <Input {...props("ciudad")} autoComplete="address-level2" maxLength={80} placeholder="Ej.: Arequipa" className="h-11" />
          </Campo>
          <Campo id="demo-alumnos" etiqueta="Número aproximado de alumnos" opcional error={errores.alumnos}>
            <Input {...props("alumnos")} type="number" inputMode="numeric" min={1} max={20000} placeholder="Ej.: 300" className="h-11 tabular-nums" />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="demo-planInteres" etiqueta="Plan de interés" opcional error={errores.planInteres}>
              <select {...props("planInteres")} defaultValue={v("planInteres") ?? planInicial ?? ""} className={cn(CLASE_CAMPO, "h-11 cursor-pointer")}>
                <option value="">Aún no lo sé</option>
                {planes.map((p) => (
                  <option key={p.plan} value={p.plan}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        </div>
      </Bloque>

      <Bloque numero={3} tono="bg-maiz text-sobre-maiz" titulo="¿Cómo le contactamos?">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <Campo id="demo-correo" etiqueta="Correo" error={errores.correo}>
            <Input {...props("correo")} type="email" autoComplete="email" inputMode="email" required placeholder="nombre@colegio.edu.pe" className="h-11" />
          </Campo>
          <Campo id="demo-telefono" etiqueta="Teléfono o celular" opcional error={errores.telefono}>
            <Input {...props("telefono")} type="tel" autoComplete="tel" inputMode="tel" maxLength={20} placeholder="Ej.: 987 654 321" className="h-11 tabular-nums" />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="demo-mensaje" etiqueta="Mensaje" opcional error={errores.mensaje}>
              <textarea {...props("mensaje")} rows={3} maxLength={1500} placeholder="Cuéntenos qué necesita su colegio o cuándo le conviene la demo." className={cn(CLASE_CAMPO, "min-h-24")} />
            </Campo>
          </div>
        </div>
      </Bloque>

      {/* Campo trampa para bots: fuera de la vista y del lector de pantalla. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="demo-sitio">No llenes este campo</label>
        <input id="demo-sitio" name="sitio" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-arena pt-6">
        <label htmlFor="demo-consentimiento" className="flex cursor-pointer items-start gap-3 text-cuerpo-sm text-foreground">
          <input
            id="demo-consentimiento"
            name="consentimiento"
            type="checkbox"
            value="si"
            required
            defaultChecked={estado.estado === "error" && !errores.consentimiento}
            aria-invalid={errores.consentimiento ? true : undefined}
            aria-describedby={errores.consentimiento ? "demo-consentimiento-error" : undefined}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary"
          />
          <span>
            Acepto que Khipu Escolar me contacte sobre esta solicitud. Conozca cómo usamos estos datos en{" "}
            <Link href="/privacidad" className="enlace">
              Privacidad
            </Link>
            .
          </span>
        </label>
        {errores.consentimiento && (
          <p id="demo-consentimiento-error" className="text-cuerpo-sm text-destructive">
            {errores.consentimiento}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pendiente} className="h-12 px-6 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96] sm:w-auto">
          {pendiente ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : <Send strokeWidth={2} aria-hidden />}
          {pendiente ? "Enviando…" : "Solicitar demo"}
        </Button>
        <p id="demo-nota" className="text-cuerpo-sm text-muted-foreground">
          Le respondemos en menos de 1 día hábil. Sin costo ni compromiso.
        </p>
      </div>
    </form>
  );
}
