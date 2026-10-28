import type { EstadoNudito } from "@/lib/nudito/estado";

// Nudito oficial (public/marca/nudito.svg): nudo de cuerda cochinilla, sonrisa maíz, ojos índigo y colita turquesa.
// Va en SVG en línea para animar sus partes: cuerpo, ojo_izq, ojo_der, sonrisa, colita.
// Animaciones de 0,5 a 2 s; solo reposo, pensando y durmiendo se repiten. Con «reducir movimiento» queda quieto en la pose final.
// Fondo oscuro: círculo crema detrás (regla del manual: que no se pierda).

const COCHINILLA = "#A8325E";
const MAIZ = "#F2B84B";
const TURQUESA = "#0F7C7A";
const INDIGO = "#1E2A78";
const TINTA = "#1B1F2A";

const ESTILOS = `
.nudito-svg .nd-cuerpo, .nudito-svg .nd-colita, .nudito-svg .nd-ojo, .nudito-svg .nd-aviso, .nudito-svg .nd-z, .nudito-svg .nd-punto, .nudito-svg .nd-conf {
  transform-box: fill-box; transform-origin: 50% 50%;
}
.nudito-svg .nd-colita { transform-origin: 50% 0; }
.nudito-svg .nd-cuerpo { transform-origin: 50% 100%; }
/* Poses finales (también valen con «reducir movimiento»). */
.nudito-svg[data-estado="preocupado"] .nd-cuerpo { transform: scale(0.93, 0.9); }
.nudito-svg[data-estado="preocupado"] .nd-colita { transform: rotate(28deg) scaleY(0.85); }
.nudito-svg[data-estado="pensando"] .nd-colita { transform: rotate(-35deg) scaleY(0.8); }
.nudito-svg[data-estado="avisando"] .nd-colita { transform: rotate(-25deg); }
.nudito-svg[data-estado="durmiendo"] .nd-colita { transform: rotate(60deg) scaleY(0.75); }
@media (prefers-reduced-motion: no-preference) {
  .nudito-svg[data-estado="reposo"] .nd-cuerpo { animation: nd-respira 3s ease-in-out infinite; }
  .nudito-svg[data-estado="reposo"] .nd-ojo { animation: nd-parpadeo 5s ease-in-out infinite; }
  .nudito-svg[data-estado="reposo"] .nd-colita { animation: nd-balanceo 3s ease-in-out infinite; }
  .nudito-svg[data-estado="saludo"] .nd-cuerpo { animation: nd-salto 1.2s ease-out 1; }
  .nudito-svg[data-estado="saludo"] .nd-colita { animation: nd-saluda 1.2s ease-in-out 1; }
  .nudito-svg[data-estado="pensando"] .nd-colita { animation: nd-enrosca 1.6s ease-in-out infinite; }
  .nudito-svg[data-estado="pensando"] .nd-punto { animation: nd-puntos 1.2s ease-in-out infinite; }
  .nudito-svg[data-estado="pensando"] .nd-punto:nth-of-type(2) { animation-delay: .2s; }
  .nudito-svg[data-estado="pensando"] .nd-punto:nth-of-type(3) { animation-delay: .4s; }
  .nudito-svg[data-estado="avisando"] .nd-cuerpo { animation: nd-rebotes 0.8s ease-out 1; }
  .nudito-svg[data-estado="celebrando"] .nd-cuerpo { animation: nd-celebra 1.5s ease-in-out 1; }
  .nudito-svg[data-estado="celebrando"] .nd-conf { animation: nd-cae 1.5s ease-in 1 forwards; }
  .nudito-svg[data-estado="preocupado"] .nd-cuerpo { animation: nd-encoge 1s ease-out 1; }
  .nudito-svg[data-estado="preocupado"] .nd-colita { animation: nd-cae-colita 1s ease-out 1; }
  .nudito-svg[data-estado="durmiendo"] .nd-cuerpo { animation: nd-respira-lento 6s ease-in-out infinite; }
  .nudito-svg[data-estado="durmiendo"] .nd-z { animation: nd-z 3s ease-out infinite; }
}
.nudito-svg .nd-z { opacity: 0.9; }
@keyframes nd-respira { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes nd-respira-lento { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-1px) scale(1.02); } }
@keyframes nd-parpadeo { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
@keyframes nd-balanceo { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@keyframes nd-salto { 0% { transform: translateY(0); } 30% { transform: translateY(-5px); } 55% { transform: translateY(0) scale(1.04,.96); } 100% { transform: none; } }
@keyframes nd-saluda { 0%,100% { transform: rotate(0); } 20% { transform: rotate(-30deg); } 40% { transform: rotate(30deg); } 60% { transform: rotate(-30deg); } 80% { transform: rotate(30deg); } }
@keyframes nd-enrosca { 0%,100% { transform: rotate(-35deg) scaleY(0.8); } 50% { transform: rotate(35deg) scaleY(0.7); } }
@keyframes nd-puntos { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes nd-rebotes { 0%,100% { transform: none; } 20% { transform: translateY(-5px); } 40% { transform: translateY(0); } 60% { transform: translateY(-3px); } 80% { transform: translateY(0); } }
@keyframes nd-celebra { 0% { transform: none; } 30% { transform: translateY(-6px) rotate(0); } 70% { transform: translateY(-6px) rotate(360deg); } 100% { transform: none; } }
@keyframes nd-cae { 0% { transform: translateY(-4px); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(10px); opacity: 0; } }
@keyframes nd-encoge { 0% { transform: none; } 100% { transform: scale(0.93, 0.9); } }
@keyframes nd-cae-colita { 0% { transform: none; } 100% { transform: rotate(28deg) scaleY(0.85); } }
@keyframes nd-z { 0% { transform: translate(0,0); opacity: 0; } 20% { opacity: .9; } 100% { transform: translate(3px,-6px); opacity: 0; } }
`;

export type VarianteNudito = "completo" | "avatar";

type Props = {
  tamano?: number;
  estado?: EstadoNudito;
  /** Número de avisos nuevos (solo se dibuja en el estado «avisando»). */
  avisos?: number;
  /** «avatar» = solo cara y colita (32–40 px en el chat). */
  variante?: VarianteNudito;
  /** Texto accesible; por defecto la animación es decorativa (aria-hidden). */
  titulo?: string;
  className?: string;
};

export function NuditoMascota({ tamano = 40, estado = "reposo", avisos = 0, variante = "completo", titulo, className }: Props) {
  const contento = estado === "saludo" || estado === "celebrando";
  const dormido = estado === "durmiendo";
  const avatar = variante === "avatar";
  return (
    <>
      <style>{ESTILOS}</style>
      <svg
        width={tamano}
        height={tamano}
        viewBox={avatar ? "6 8 36 38" : "0 0 48 48"}
        fill="none"
        strokeLinecap="round"
        className={`nudito-svg ${className ?? ""}`}
        data-estado={estado}
        {...(titulo ? { role: "img", "aria-label": titulo } : { "aria-hidden": true })}
      >
        {/* Fondo crema solo en tema oscuro: el nudo cochinilla no se pierde. */}
        <circle cx="24" cy="24" r="23.5" className="fill-transparent dark:fill-[#FAF7F2]" />
        <g className="nd-colita">
          <path d="M24 37v7" stroke={TURQUESA} strokeWidth="4" />
        </g>
        <g className="nd-cuerpo">
          {!avatar && <path d="M24 4v8" stroke={COCHINILLA} strokeWidth="4" />}
          <circle cx="24" cy="24" r="13" stroke={COCHINILLA} strokeWidth="6" />
          <path d={estado === "preocupado" ? "M18 29c3 2 9 2 12 0" : "M17 27c3 4 11 4 14 0"} stroke={MAIZ} strokeWidth="3" className="nd-sonrisa" />
          {dormido ? (
            <>
              <path d="M17.5 21h4M26.5 21h4" stroke={INDIGO} strokeWidth="2" />
            </>
          ) : contento ? (
            <>
              <path d="M17.3 22.2q2.2-3 4.4 0M26.3 22.2q2.2-3 4.4 0" stroke={INDIGO} strokeWidth="2" />
            </>
          ) : (
            <>
              <circle cx="19.5" cy="21" r="2.2" fill={INDIGO} className="nd-ojo nd-ojo-izq" />
              <circle cx="28.5" cy="21" r="2.2" fill={INDIGO} className="nd-ojo nd-ojo-der" />
            </>
          )}
        </g>
        {estado === "pensando" && (
          <g fill={MAIZ}>
            <circle cx="38" cy="30" r="1.6" className="nd-punto" />
            <circle cx="42" cy="30" r="1.6" className="nd-punto" />
            <circle cx="46" cy="30" r="1.6" className="nd-punto" />
          </g>
        )}
        {estado === "avisando" && avisos > 0 && (
          <g className="nd-aviso">
            <circle cx="39" cy="9" r="7" fill={MAIZ} />
            <text x="39" y="12.2" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="Inter, Arial, sans-serif" fill={TINTA}>
              {avisos > 9 ? "9+" : avisos}
            </text>
          </g>
        )}
        {estado === "celebrando" && (
          <g>
            <circle cx="8" cy="12" r="2" fill={MAIZ} className="nd-conf" />
            <circle cx="40" cy="10" r="2" fill={TURQUESA} className="nd-conf" />
            <circle cx="12" cy="6" r="1.6" fill={COCHINILLA} className="nd-conf" />
            <circle cx="36" cy="4" r="1.6" fill={INDIGO} className="nd-conf" />
            <circle cx="44" cy="18" r="1.6" fill={MAIZ} className="nd-conf" />
          </g>
        )}
        {dormido && (
          <text x="36" y="12" fontSize="9" fontWeight="700" fontFamily="Nunito, sans-serif" className="nd-z" fill={INDIGO}>
            z
          </text>
        )}
      </svg>
    </>
  );
}
