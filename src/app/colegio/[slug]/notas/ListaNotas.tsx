import { textoValor, type ValorCalificacion } from "@/lib/calificaciones";

export type NotaDelPeriodo = { titulo: string; fecha: string; valor: ValorCalificacion };

/** Notas de un alumno en una competencia durante el periodo, en orden de fecha. Sin cálculos: el profesor decide. */
export function ListaNotas({ notas }: { notas: NotaDelPeriodo[] }) {
  if (notas.length === 0) return <p className="text-cuerpo-sm text-muted-foreground">Aún no tiene notas en esta competencia.</p>;
  return (
    <div className="text-cuerpo-sm">
      <p className="mb-1 text-muted-foreground">Notas del periodo ({notas.length})</p>
      <ul className="flex flex-wrap gap-1.5">
        {notas.map((n, i) => (
          <li key={i} className="inline-flex items-center gap-1.5 rounded-pildora border px-2.5 py-0.5">
            <strong className="tabular-nums">{textoValor(n.valor)}</strong>
            <span className="text-muted-foreground">{n.titulo} · {n.fecha.slice(8, 10)}/{n.fecha.slice(5, 7)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
