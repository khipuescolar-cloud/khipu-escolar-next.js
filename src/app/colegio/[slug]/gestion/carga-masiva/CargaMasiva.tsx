"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, FileUp, Info, Loader2, PencilLine, Plus, XCircle } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { MAX_BYTES_CARGA, type ErrorFila } from "@/lib/carga-masiva/tabla";
import type { TipoCarga } from "@/lib/carga-masiva/plantillas";
import type { FilaVistaCarga, ResultadoCarga, VistaCarga } from "@/lib/server/carga-masiva";
import { cn } from "@/lib/utils";
import { importarCargaAction, previsualizarCargaAction } from "./actions";

const ACCION = {
  crear: { texto: "Nuevo", Icono: Plus, clase: "text-llego" },
  actualizar: { texto: "Se actualiza", Icono: PencilLine, clase: "text-primary" },
  sin_cambios: { texto: "Sin cambios", Icono: CircleDashed, clase: "text-muted-foreground" },
} satisfies Record<FilaVistaCarga["accion"], unknown>;

function ListaMensajes({ tipo, titulo, mensajes }: { tipo: "error" | "aviso"; titulo: string; mensajes: ErrorFila[] }) {
  if (mensajes.length === 0) return null;
  const Icono = tipo === "error" ? XCircle : AlertTriangle;
  return (
    <div className={cn("rounded-lg border p-3 text-sm", tipo === "error" ? "border-falta/40 bg-falta-fondo" : "border-tarde/40 bg-tarde-fondo")} data-testid={`carga-${tipo}es`}>
      <p className={cn("flex items-center gap-2 font-medium", tipo === "error" ? "text-falta" : "text-tarde")}>
        <Icono className="size-4" strokeWidth={2} aria-hidden />{titulo}
      </p>
      <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
        {mensajes.slice(0, 200).map((e, i) => <li key={i}>Línea {e.linea}: {e.mensaje}</li>)}
      </ul>
      {mensajes.length > 200 && <p className="mt-1 text-cuerpo-sm">… y {mensajes.length - 200} más.</p>}
    </div>
  );
}

/** Elige un CSV o Excel, muestra la vista previa con errores por línea y, al confirmar, aplica las filas válidas. */
export function CargaMasiva({ tipo }: { tipo: TipoCarga }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<VistaCarga | null>(null);
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const datos = (f: File) => {
    const fd = new FormData();
    fd.set("archivo", f);
    return fd;
  };

  function elegir(f: File | undefined) {
    setVista(null);
    setResultado(null);
    setError(null);
    setArchivo(null);
    if (!f) return;
    if (f.size > MAX_BYTES_CARGA) return setError("El archivo es demasiado grande (máximo 3 MB). Divídelo por nivel.");
    setArchivo(f);
    iniciar(async () => {
      const r = await previsualizarCargaAction(tipo, datos(f));
      if (!r.ok) return setError(r.error);
      setVista(r.vista);
    });
  }

  const confirmar = () =>
    iniciar(async () => {
      if (!archivo) return;
      const r = await importarCargaAction(tipo, datos(archivo));
      if (!r.ok) return setError(r.error);
      setResultado(r.resultado);
      setVista(null);
      setArchivo(null);
      if (entrada.current) entrada.current.value = "";
      toast.success(r.resultado.mensaje);
    });

  const conErrores = vista ? new Set(vista.errores.map((e) => e.linea)).size : 0;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Archivo CSV o Excel (.xlsx)</span>
        <input
          ref={entrada} type="file" name="archivo" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => elegir(e.target.files?.[0])} disabled={pendiente}
          className="min-h-12 w-full cursor-pointer rounded-[10px] border border-dashed border-input bg-superficie-2/50 p-2 text-sm file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-semibold sm:max-w-md"
        />
      </label>
      {pendiente && <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />{vista ? "Cargando… con muchas familias nuevas puede tardar uno o dos minutos." : "Revisando el archivo…"}</p>}
      {error && <Alerta tipo="error">{error}</Alerta>}

      {resultado && (
        <div className="flex flex-col gap-3" aria-live="polite" data-testid="carga-resultado">
          <Alerta tipo={resultado.ok ? "exito" : "aviso"}>{resultado.mensaje}</Alerta>
          <Conteos conteos={resultado.conteos} />
          <ListaMensajes tipo="error" titulo="Filas que no se cargaron" mensajes={resultado.errores} />
          <ListaMensajes tipo="aviso" titulo="Avisos" mensajes={resultado.avisos} />
          {resultado.errores.length > 0 && <p className="text-cuerpo-sm text-muted-foreground">Corrige esas filas y vuelve a subir el archivo completo: lo ya cargado no se duplica.</p>}
        </div>
      )}

      {vista && archivo && (
        <div className="flex flex-col gap-3" aria-live="polite" data-testid="carga-vista">
          <p className="flex items-center gap-2 text-sm font-medium"><FileUp className="size-4" strokeWidth={2} aria-hidden />Vista previa de {archivo.name} · {vista.filasArchivo} filas</p>
          <Conteos conteos={vista.conteos} />
          {vista.notas.map((n) => <p key={n} className="flex items-start gap-2 text-cuerpo-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />{n}</p>)}
          <ListaMensajes tipo="error" titulo={`${conErrores} ${conErrores === 1 ? "fila con errores" : "filas con errores"} (no se cargarán)`} mensajes={vista.errores} />
          <ListaMensajes tipo="aviso" titulo="Avisos (sí se cargan)" mensajes={vista.avisos} />
          {vista.filas.length > 0 && (
            <div className="max-h-96 overflow-auto rounded-[14px] border border-borde-sutil bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">Lo que se hará con cada fila</caption>
                <thead className="sticky top-0 bg-superficie-2 text-left">
                  <tr><th className="px-3 py-2">Línea</th><th className="px-3 py-2">Qué pasa</th><th className="px-3 py-2">{tipo === "salones" ? "Salón" : "Familia y alumno"}</th><th className="hidden px-3 py-2 sm:table-cell">Detalle</th></tr>
                </thead>
                <tbody>
                  {vista.filas.map((f) => {
                    const { texto, Icono, clase } = ACCION[f.accion];
                    return (
                      <tr key={`${f.linea}-${f.texto}`} className="border-t border-borde-sutil align-top">
                        <td className="px-3 py-1.5 tabular-nums">{f.linea}</td>
                        <td className={cn("px-3 py-1.5 whitespace-nowrap", clase)}><span className="inline-flex items-center gap-1.5"><Icono className="size-4" strokeWidth={2} aria-hidden />{texto}</span></td>
                        <td className="px-3 py-1.5">{f.texto}<span className="block text-cuerpo-sm text-muted-foreground sm:hidden">{f.detalle}</span></td>
                        <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{f.detalle}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {vista.totalFilasPlan > vista.filas.length && <p className="text-cuerpo-sm text-muted-foreground">Se muestran las primeras {vista.filas.length} de {vista.totalFilasPlan}.</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={confirmar} disabled={pendiente || vista.aplicables === 0} className={buttonVariants()}>
              {pendiente ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : <CheckCircle2 strokeWidth={2} aria-hidden />}
              {vista.aplicables === 0 ? "No hay nada nuevo que cargar" : `Confirmar y cargar ${vista.aplicables} ${vista.aplicables === 1 ? "fila" : "filas"}`}
            </button>
            {conErrores > 0 && vista.aplicables > 0 && <span className="text-cuerpo-sm text-muted-foreground">Se omiten las filas con errores.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Conteos({ conteos }: { conteos: VistaCarga["conteos"] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-borde-sutil bg-borde-sutil lg:grid-cols-4">
      {conteos.map((c) => (
        <div key={c.clave} className="bg-card px-4 py-3" data-testid={`conteo-${c.clave}`}>
          <dt className="text-cuerpo-sm text-muted-foreground">{c.etiqueta}</dt>
          <dd className="font-heading text-titulo-2 font-semibold tabular-nums">{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
