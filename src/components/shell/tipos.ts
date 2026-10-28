import type { IconoMosaico } from "@/lib/navegacion";

/** Entrada de navegación ya resuelta en el servidor (serializable). */
export type ItemNav = {
  href: string;
  titulo: string;
  icono: IconoMosaico | "House";
  /** Nombre del plan que lo incluye, si el colegio no lo tiene. */
  bloqueadoPlan?: string;
  contador?: number;
};

export type GrupoNavResuelto = { titulo?: string; items: ItemNav[] };

export type UsuarioShell = {
  nombre: string;
  correo: string;
  rolNombre: string;
  iniciales: string;
};
