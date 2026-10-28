// Ilustración del patrón de khipu (docs/marca · patron-khipu.svg) redibujada para ir sobre `indigo`:
// una cuerda principal de la que cuelgan cuerdas con nudos, en los tonos claros de la paleta (los mismos del tema oscuro)
// para que se lean sobre el fondo índigo. Es decorativa: nunca va detrás de texto.

const COLORES = ["#F2B84B", "#E8789F", "#4FC3BF", "rgba(255,255,255,0.55)"] as const;

// Largo de cada cuerda y altura de sus nudos (0–1 del alto disponible). Fijos para que el dibujo no cambie entre renders.
const CUERDAS: { largo: number; nudos: number[] }[] = [
  { largo: 0.78, nudos: [0.3, 0.38, 0.46] },
  { largo: 0.92, nudos: [0.42] },
  { largo: 0.66, nudos: [0.55, 0.63] },
  { largo: 1, nudos: [0.33, 0.52] },
  { largo: 0.72, nudos: [0.24, 0.6] },
  { largo: 0.5, nudos: [0.18, 0.26, 0.34] },
  { largo: 0.84, nudos: [0.47, 0.55] },
  { largo: 0.62, nudos: [0.15, 0.4] },
  { largo: 0.96, nudos: [0.72] },
  { largo: 0.7, nudos: [0.3, 0.6] },
  { largo: 0.88, nudos: [0.5, 0.58, 0.66] },
  { largo: 0.58, nudos: [0.36] },
  { largo: 0.8, nudos: [0.22, 0.44] },
  { largo: 0.68, nudos: [0.52, 0.6] },
];

export function CuerdasKhipu({ className }: { className?: string }) {
  const ancho = 600;
  const alto = 260;
  const arriba = 14;
  const paso = ancho / (CUERDAS.length + 1);
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="xMidYMin slice" className={className} aria-hidden focusable="false">
      <g strokeLinecap="round" fill="none">
        <path d={`M0 ${arriba}H${ancho}`} stroke="rgba(255,255,255,0.7)" strokeWidth={6} />
        {CUERDAS.map((c, i) => {
          const x = paso * (i + 1);
          const color = COLORES[i % COLORES.length];
          const fin = arriba + c.largo * (alto - arriba);
          return (
            <g key={i}>
              <path d={`M${x} ${arriba}V${fin}`} stroke={color} strokeWidth={5} />
              {c.nudos.map((n) => (
                <circle key={n} cx={x} cy={arriba + n * (alto - arriba)} r={7.5} fill={color} />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
