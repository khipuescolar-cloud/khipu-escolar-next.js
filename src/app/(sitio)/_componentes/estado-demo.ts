// Estado del formulario «Solicita una demo» (compartido entre la server action y el componente cliente).

export type CampoDemo = "nombre" | "cargo" | "colegio" | "ciudad" | "correo" | "telefono" | "alumnos" | "planInteres" | "mensaje";

export type EstadoFormularioDemo =
  | { estado: "inicial" }
  | { estado: "ok"; nombre: string }
  | {
      estado: "error";
      errores: Partial<Record<CampoDemo | "consentimiento", string>>;
      /** Error general (p. ej. demasiados envíos desde la misma red). */
      mensaje?: string;
      /** Lo escrito, para no perderlo al mostrar los errores. */
      valores: Record<CampoDemo, string>;
    };
