import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";

/** Pestañas de Nudito para profesores y dirección: Temario (qué enseña Nudito) y Seguimiento (cómo practican). */
export function PestanasNudito({ activa }: { activa: "temario" | "seguimiento" }) {
  return (
    <NavegacionPildoras
      etiqueta="Secciones de Nudito"
      items={[
        { href: "/nudito/temario", texto: "Temario", activo: activa === "temario" },
        { href: "/nudito/seguimiento", texto: "Seguimiento", activo: activa === "seguimiento" },
      ]}
    />
  );
}
