import { cn } from "@/lib/utils";

// Motivo khipu de la interfaz (DESIGN.md · Mundo khipu): cuerdas y nudos en el color de la sección (`--sec-*`).
// Son decorativos (aria-hidden): nunca comunican un estado por sí solos ni van detrás de texto.

/** Nudo suelto: el punto que marca una sección o el ítem activo. */
export function Nudo({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full bg-sec-nudo", className)} />;
}

/**
 * Cuerda principal bajo un encabezado: línea fina de borde y, al inicio, un tramo en el color de la sección con un grupo
 * de nudos (como se anotan las cantidades en un khipu).
 */
export function CuerdaSeccion({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-3 w-full", className)}>
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-borde-sutil" />
      <svg viewBox="0 0 132 12" className="absolute top-0 left-0 h-3 w-[132px]" focusable="false">
        <path d="M1 6H131" stroke="var(--sec-nudo)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="34" cy="6" r="5" fill="var(--sec-nudo)" />
        <circle cx="46" cy="6" r="5" fill="var(--sec-nudo)" />
        <circle cx="76" cy="6" r="5" fill="var(--sec-nudo)" />
      </svg>
    </div>
  );
}

// Cuerdas colgantes del saludo de inicio (derivadas de public/marca/patron-khipu.svg): una cuerda principal arriba y
// cuerdas de las cuatro secciones con sus nudos. Largo y nudos fijos para que el dibujo no cambie entre renders.
const COLGANTES: { color: string; largo: number; nudos: number[] }[] = [
  { color: "var(--colegio-nudo)", largo: 0.62, nudos: [0.3, 0.36, 0.42] },
  { color: "var(--comunicacion-nudo)", largo: 0.8, nudos: [0.46] },
  { color: "var(--dia-nudo)", largo: 0.9, nudos: [0.58, 0.72] },
  { color: "var(--academico-nudo)", largo: 1, nudos: [0.4, 0.52] },
  { color: "var(--colegio-nudo)", largo: 0.7, nudos: [0.28, 0.6] },
  { color: "var(--comunicacion-nudo)", largo: 0.48, nudos: [0.2, 0.26, 0.32] },
  { color: "var(--dia-nudo)", largo: 0.84, nudos: [0.5, 0.56] },
  { color: "var(--academico-nudo)", largo: 0.66, nudos: [0.38] },
  { color: "var(--colegio-nudo)", largo: 0.94, nudos: [0.74] },
  { color: "var(--comunicacion-nudo)", largo: 0.58, nudos: [0.3, 0.48] },
];

export function CuerdasSaludo({ className }: { className?: string }) {
  const ancho = 330;
  const alto = 200;
  const arriba = 6;
  const paso = ancho / (COLGANTES.length + 1);
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="xMaxYMin meet" className={className} aria-hidden focusable="false">
      <g strokeLinecap="round" fill="none">
        <path d={`M8 ${arriba}H${ancho - 8}`} stroke="var(--colegio-trazo)" strokeWidth={4} />
        {COLGANTES.map((c, i) => {
          const x = paso * (i + 1);
          return (
            <g key={i}>
              <path d={`M${x} ${arriba}V${arriba + c.largo * (alto - arriba - 6)}`} stroke={c.color} strokeWidth={3.5} />
              {c.nudos.map((n) => (
                <circle key={n} cx={x} cy={arriba + n * (alto - arriba)} r={5.5} fill={c.color} />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
