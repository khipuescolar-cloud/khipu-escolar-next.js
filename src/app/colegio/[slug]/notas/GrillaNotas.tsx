"use client";

import { AlertTriangle, CheckCircle2, ClipboardList, EyeOff, Loader2 } from "lucide-react";
import { Fragment, useState } from "react";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import {
  LITERALES, ETIQUETA_LITERAL, NOMBRE_INSTRUMENTO, formatearNumero, interpretarValor, sugerirCalificacion, textoValor,
  type SugerenciaPeriodo, type Escala, type Instrumento, type Literal,
} from "@/lib/calificaciones";
import { cn } from "@/lib/utils";
import { guardarNotaAction } from "./actions";
import { ComentarioNota } from "./ComentarioNota";

type Estado = { fase: "guardando" } | { fase: "guardado" } | { fase: "error"; mensaje: string };

type Evaluacion = {
  id: string; titulo: string; fecha: string; peso: number; competenciaId: string | null; instrumento: Instrumento | null;
  estado: "programada" | "publicada";
};

type Props = {
  slug: string;
  escala: Escala;
  calculo: SugerenciaPeriodo;
  editable: boolean;
  alumnos: { id: string; nombres: string; apellidos: string }[];
  competencias: { id: string; nombre: string }[];
  evaluaciones: Evaluacion[];
  notas: { evaluacionId: string; alumnoId: string; valorLiteral: Literal | null; valorNumerico: number | null; comentario?: string | null }[];
};

const valorInicial = (n: Props["notas"][number] | undefined): string => (n?.valorLiteral ?? (n?.valorNumerico != null ? formatearNumero(n.valorNumerico) : ""));

/** Columnas agrupadas por competencia (en su orden); las evaluaciones sin competencia van al final. */
function agrupar(competencias: Props["competencias"], evaluaciones: Evaluacion[]) {
  const grupos = competencias
    .map((c) => ({ id: c.id, nombre: c.nombre, evaluaciones: evaluaciones.filter((e) => e.competenciaId === c.id) }))
    .filter((g) => g.evaluaciones.length > 0);
  const sueltas = evaluaciones.filter((e) => !competencias.some((c) => c.id === e.competenciaId));
  if (sueltas.length > 0) grupos.push({ id: "", nombre: "Sin competencia", evaluaciones: sueltas });
  return grupos;
}

/**
 * Registro auxiliar: alumnos × evaluaciones, agrupadas por competencia. Solo si el colegio activó una regla provisional
 * de sugerencia, cada competencia termina en una columna «Promedio · provisional» que se recalcula al poner notas. Cada celda se guarda sola al
 * cambiar (literal) o al salir del campo (0–20). Se desplaza dentro de su tarjeta y la columna del alumno queda fija.
 * Celdas de 40 px (specs/18 §8).
 */
export function GrillaNotas({ slug, escala, calculo, editable, alumnos, competencias, evaluaciones, notas }: Props) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(notas.map((n) => [`${n.evaluacionId}:${n.alumnoId}`, valorInicial(n)])),
  );
  const [comentarios, setComentarios] = useState<Record<string, string>>(() =>
    Object.fromEntries(notas.map((n) => [`${n.evaluacionId}:${n.alumnoId}`, n.comentario ?? ""])),
  );
  const [estados, setEstados] = useState<Record<string, Estado>>({});

  async function guardar(evaluacionId: string, alumnoId: string, valor: string) {
    const clave = `${evaluacionId}:${alumnoId}`;
    setEstados((e) => ({ ...e, [clave]: { fase: "guardando" } }));
    const r = await guardarNotaAction(slug, evaluacionId, alumnoId, valor);
    setEstados((e) => ({ ...e, [clave]: r.ok ? { fase: "guardado" } : { fase: "error", mensaje: r.error } }));
    if (r.ok && valor.trim() === "") setComentarios((m) => ({ ...m, [clave]: "" })); // sin nota no hay observación
  }

  const grupos = agrupar(competencias, evaluaciones);
  const conPromedio = calculo !== "ninguna";
  /** Promedio en vivo de la competencia con lo que hay en la rejilla (misma regla que la calificación sugerida). */
  function promedio(lista: Evaluacion[], alumnoId: string) {
    const items = lista.flatMap((e) => {
      const v = interpretarValor(escala, valores[`${e.id}:${alumnoId}`] ?? "");
      return v.ok && v.valor ? [{ ...v.valor, peso: e.peso, fecha: e.fecha }] : [];
    });
    return sugerirCalificacion(escala, items, calculo);
  }

  if (evaluaciones.length === 0) {
    return (
      <EstadoVacio
        icono={ClipboardList}
        titulo="Aún no hay evaluaciones en este periodo"
        descripcion="Crea la primera para empezar a poner notas."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th scope="col" rowSpan={2} className="sticky left-0 z-10 min-w-44 border-r bg-muted px-3 py-2.5 align-bottom font-semibold">Alumno</th>
            {grupos.map((g) => (
              <th
                key={g.id || "sueltas"} scope="colgroup" colSpan={g.evaluaciones.length + (g.id && conPromedio ? 1 : 0)}
                className="max-w-80 border-b border-l px-3 pt-2.5 pb-1.5 text-cuerpo-sm font-semibold text-foreground"
              >
                <span className="line-clamp-2">{g.nombre}</span>
              </th>
            ))}
          </tr>
          <tr>
            {grupos.map((g) => (
              <Fragment key={g.id || "sueltas"}>
                {g.evaluaciones.map((e, i) => (
                  <th key={e.id} scope="col" className={cn("min-w-32 px-3 py-2 align-bottom font-semibold", i === 0 && "border-l")}>
                    <span className="block">{e.titulo}</span>
                    {e.estado === "programada" && (
                      <span className="inline-flex items-center gap-1 text-cuerpo-sm font-normal text-muted-foreground">
                        <EyeOff className="size-3" strokeWidth={2} aria-hidden />Borrador
                      </span>
                    )}
                    <span className="block text-cuerpo-sm font-normal text-muted-foreground">
                      {e.instrumento && <>{NOMBRE_INSTRUMENTO[e.instrumento]} · </>}{e.fecha.slice(8, 10)}/{e.fecha.slice(5, 7)}{conPromedio && ` · peso ${formatearNumero(e.peso)}`}
                    </span>
                  </th>
                ))}
                {g.id && conPromedio && (
                  <th scope="col" className="min-w-24 bg-secondary/60 px-3 py-2 align-bottom font-semibold">
                    <span className="block">Promedio</span>
                    <span className="block text-cuerpo-sm font-normal text-muted-foreground">provisional</span>
                  </th>
                )}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {alumnos.map((a) => (
            <tr key={a.id} className="border-t">
              <th scope="row" className="sticky left-0 z-10 border-r bg-card px-3 py-2 text-left font-medium">
                {a.apellidos}, {a.nombres}
              </th>
              {grupos.map((g) => (
                <Fragment key={g.id || "sueltas"}>
              {g.evaluaciones.map((e, i) => {
                const clave = `${e.id}:${a.id}`;
                const valor = valores[clave] ?? "";
                const estado = estados[clave];
                const etiqueta = `Nota de ${a.nombres} en ${e.titulo}`;
                return (
                  <td key={e.id} className={cn("px-3 py-2 align-top", i === 0 && "border-l")}>
                    <div className="flex items-center gap-1">
                    {editable ? (
                      escala === "literal" ? (
                        <select
                          aria-label={etiqueta}
                          value={valor}
                          onChange={(ev) => {
                            setValores((v) => ({ ...v, [clave]: ev.target.value }));
                            void guardar(e.id, a.id, ev.target.value);
                          }}
                          className={cn(CLASE_CAMPO, "h-10 w-28 cursor-pointer px-2 py-1.5")}
                        >
                          <option value="">—</option>
                          {LITERALES.map((l) => (
                            <option key={l} value={l}>{l} · {ETIQUETA_LITERAL[l]}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          aria-label={etiqueta}
                          type="number" min={0} max={20} step={0.5} inputMode="decimal"
                          value={valor}
                          onChange={(ev) => setValores((v) => ({ ...v, [clave]: ev.target.value }))}
                          onBlur={(ev) => void guardar(e.id, a.id, ev.target.value)}
                          className={cn(CLASE_CAMPO, "h-10 w-20 px-2 py-1.5 text-center tabular-nums")}
                        />
                      )
                    ) : (
                      <span className="inline-flex h-10 items-center font-medium tabular-nums">{valor === "" ? "—" : valor}</span>
                    )}
                    <ComentarioNota
                      slug={slug} evaluacionId={e.id} alumnoId={a.id} alumno={`${a.nombres} ${a.apellidos}`} evaluacion={e.titulo}
                      comentario={comentarios[clave] ?? ""} hayNota={valor !== ""} editable={editable}
                      alGuardar={(c) => setComentarios((m) => ({ ...m, [clave]: c }))}
                    />
                    </div>
                    {estado && (
                      <span role="status" className={`mt-1 flex items-center gap-1 text-cuerpo-sm ${estado.fase === "error" ? "text-falta" : estado.fase === "guardado" ? "text-llego" : "text-muted-foreground"}`}>
                        {estado.fase === "guardando" && <><Loader2 className="size-3 animate-spin" strokeWidth={2} aria-hidden />Guardando</>}
                        {estado.fase === "guardado" && <><CheckCircle2 className="size-3" strokeWidth={2} aria-hidden />Guardado</>}
                        {estado.fase === "error" && <><AlertTriangle className="size-3" strokeWidth={2} aria-hidden />{estado.mensaje}</>}
                      </span>
                    )}
                  </td>
                );
              })}
              {g.id && conPromedio && <CeldaPromedio valor={promedio(g.evaluaciones, a.id)} alumno={a.nombres} competencia={g.nombre} />}
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CeldaPromedio({ valor, alumno, competencia }: { valor: ReturnType<typeof sugerirCalificacion>; alumno: string; competencia: string }) {
  const texto = valor ? textoValor(valor) : "—";
  return (
    <td className="bg-secondary/40 px-3 py-2 align-top">
      <span
        className="inline-flex h-10 min-w-10 items-center justify-center font-semibold tabular-nums"
        aria-label={`Promedio de ${alumno} en ${competencia}: ${valor?.valorLiteral ? `${texto}, ${ETIQUETA_LITERAL[valor.valorLiteral]}` : texto}`}
      >
        {texto}
      </span>
    </td>
  );
}
