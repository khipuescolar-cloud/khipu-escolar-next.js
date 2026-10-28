import { urlPlataforma } from "@/lib/dominio";
import { NOMBRE_PLAN } from "@/lib/planes";
import type { Plan } from "@/generated/prisma/enums";
import { armarMensaje, type Mensaje } from "./base";

// Plantilla `solicitud_demo`: aviso interno al equipo Khipu cuando llega un pedido de demo desde la landing (specs/25).
// No se encola en `avisos` (esa cola exige colegio): se envía directo. Sin correo, teléfono ni mensaje de la persona:
// los datos completos se ven en el panel.

export type DatosSolicitudDemo = {
  id: string;
  nombre: string;
  cargo: string | null;
  colegio: string;
  ciudad: string | null;
  alumnos: number | null;
  planInteres: Plan | null;
};

export function plantillaSolicitudDemo(s: DatosSolicitudDemo): Mensaje {
  const url = urlPlataforma(`/solicitudes/${s.id}`);
  const linea = (etiqueta: string, valor: string | number | null) => `${etiqueta}: ${valor ?? "sin indicar"}`;
  return armarMensaje({
    colegio: "Equipo Khipu",
    asunto: `Nueva solicitud de demo: ${s.colegio}`,
    insignia: "info",
    palabraInsignia: "Solicitud nueva",
    parrafos: [
      "Llegó un pedido de demo desde la página de Khipu Escolar.",
      linea("Nombre", s.nombre),
      linea("Cargo", s.cargo),
      linea("Colegio", s.colegio),
      linea("Ciudad", s.ciudad),
      linea("Alumnos", s.alumnos),
      linea("Plan de interés", s.planInteres ? NOMBRE_PLAN[s.planInteres] : null),
    ],
    boton: { texto: "Ver la solicitud", url },
  });
}
