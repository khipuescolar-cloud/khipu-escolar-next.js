// Color de cada participante en el calendario del asistente (specs/40). Los mismos tonos de marca que los cursos de la
// agenda (`GrillaTiempo`), en un orden fijo: el color solo identifica, el texto siempre va en tinta y el nombre está en
// la leyenda. El índigo sólido queda reservado para la «Nueva reunión».

export type TonoPersona = {
  /** Barra de ocupado: fondo suave + franja izquierda del color (como las clases de la agenda). */
  barra: string;
  /** Avatar de la leyenda: fondo suave con anillo del color. */
  avatar: string;
  /** Muestra sólida (puntos, guías). */
  muestra: string;
};

export const PALETA_PERSONAS: readonly TonoPersona[] = [
  {
    barra: "bg-[color-mix(in_oklab,var(--turquesa)_20%,var(--superficie))] before:bg-turquesa",
    avatar: "bg-[color-mix(in_oklab,var(--turquesa)_18%,var(--superficie))] ring-turquesa",
    muestra: "bg-turquesa",
  },
  {
    barra: "bg-[color-mix(in_oklab,var(--cochinilla)_18%,var(--superficie))] before:bg-cochinilla",
    avatar: "bg-[color-mix(in_oklab,var(--cochinilla)_16%,var(--superficie))] ring-cochinilla",
    muestra: "bg-cochinilla",
  },
  {
    barra: "bg-[color-mix(in_oklab,var(--maiz)_32%,var(--superficie))] before:bg-maiz",
    avatar: "bg-[color-mix(in_oklab,var(--maiz)_30%,var(--superficie))] ring-maiz",
    muestra: "bg-maiz",
  },
  {
    barra: "bg-[color-mix(in_oklab,var(--indigo-cielo)_18%,var(--superficie))] before:bg-indigo-cielo",
    avatar: "bg-[color-mix(in_oklab,var(--indigo-cielo)_16%,var(--superficie))] ring-indigo-cielo",
    muestra: "bg-indigo-cielo",
  },
  {
    barra: "bg-[color-mix(in_oklab,var(--pizarra)_20%,var(--superficie))] before:bg-pizarra",
    avatar: "bg-[color-mix(in_oklab,var(--pizarra)_18%,var(--superficie))] ring-pizarra",
    muestra: "bg-pizarra",
  },
];

export const tonoDe = (indice: number) => PALETA_PERSONAS[indice % PALETA_PERSONAS.length];
