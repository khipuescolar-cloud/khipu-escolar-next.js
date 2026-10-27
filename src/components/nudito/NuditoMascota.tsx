/** Nudito: un nudito de cuerda (khipu) con dos ojos. La animación suave se apaga con prefers-reduced-motion. */
export function NuditoMascota({ tamano = 40, animada = true }: { tamano?: number; animada?: boolean }) {
  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .nudito-idle { animation: nudito-respira 3.2s ease-in-out infinite; transform-origin: 50% 90%; }
          .nudito-ojos { animation: nudito-parpadeo 5s infinite; transform-origin: 50% 50%; }
        }
        @keyframes nudito-respira { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-1.5px) scale(1.03); } }
        @keyframes nudito-parpadeo { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(0.1); } }
      `}</style>
      <svg
        width={tamano}
        height={tamano}
        viewBox="0 0 48 48"
        role="img"
        aria-label="Nudito"
        className={animada ? "nudito-idle" : undefined}
      >
        <path d="M24 2 C22 8 26 10 24 15" stroke="#1e2a78" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M24 15 C10 14 5 26 11 36 C16 44 32 44 37 36 C43 26 38 14 24 15 Z" fill="#f2b84b" stroke="#1e2a78" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M13 28 C20 32 28 32 35 28" stroke="#1e2a78" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />
        <g className="nudito-ojos">
          <circle cx="19" cy="26" r="3" fill="#1e2a78" />
          <circle cx="29" cy="26" r="3" fill="#1e2a78" />
          <circle cx="20" cy="25" r="1" fill="#fff" />
          <circle cx="30" cy="25" r="1" fill="#fff" />
        </g>
        <path d="M21 33 Q24 36 27 33" stroke="#1e2a78" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    </>
  );
}
