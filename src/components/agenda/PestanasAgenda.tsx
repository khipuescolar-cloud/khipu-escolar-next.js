import { PestanasLinea } from "@/components/shell/PestanasPagina";
import { tieneFeature } from "@/lib/server/plan";
import type { TenantContext } from "@/lib/server/tenant";

export type PestanaAgenda = "calendario" | "horario" | "profesores" | "plantillas";

type Pestana = { clave: PestanaAgenda; href: string; texto: string };

/**
 * Pestañas del módulo Agenda (specs/12 y specs/34): el calendario (Khipu Pro) y el horario de clases (Khipu Base) viven
 * juntos. Cada rol ve solo las suyas; el calendario aparece si el colegio tiene el módulo `agenda`.
 */
export function pestanasAgenda(ctx: TenantContext): Pestana[] {
  const lista: Pestana[] = [];
  const rol = ctx.rol;
  if (tieneFeature(ctx, "agenda") && ["direccion", "administrativo", "profesor", "apoderado", "alumno"].includes(rol)) {
    lista.push({ clave: "calendario", href: "/agenda", texto: "Calendario" });
  }
  if (tieneFeature(ctx, "horario")) {
    if (rol === "profesor" || rol === "alumno") lista.push({ clave: "horario", href: "/agenda/horario", texto: "Mi horario" });
    if (rol === "apoderado") lista.push({ clave: "horario", href: "/agenda/horario", texto: "Horario" });
    if (rol === "direccion") {
      lista.push({ clave: "horario", href: "/agenda/horario", texto: "Horarios de salones" });
      lista.push({ clave: "profesores", href: "/agenda/horario?vista=profesores", texto: "Carga de profesores" });
    }
    if (rol === "direccion" || rol === "administrativo") {
      lista.push({ clave: "plantillas", href: "/agenda/horario/plantillas", texto: "Plantillas de horario" });
    }
  }
  return lista;
}

/** Primera pestaña disponible del rol: a donde lleva `/agenda` si el colegio no tiene el calendario (Khipu Base). */
export function inicioAgenda(ctx: TenantContext): string | null {
  return pestanasAgenda(ctx)[0]?.href ?? null;
}

export function PestanasAgenda({ ctx, activa }: { ctx: TenantContext; activa: PestanaAgenda }) {
  const items = pestanasAgenda(ctx);
  if (items.length < 2) return null;
  return <PestanasLinea etiqueta="Secciones de la agenda" items={items.map((p) => ({ href: p.href, texto: p.texto, activo: p.clave === activa }))} />;
}
