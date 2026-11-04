// Permisos de asistencia (specs/04): reglas puras, sin base de datos. Compartidas por servidor, UI y pruebas.

/** Lo mínimo de un permiso para decidir qué cubre. Fechas AAAA-MM-DD; horas HH:mm (hora local del colegio). */
export type PermisoCobertura = {
  desde: string;
  hasta: string;
  todoElDia: boolean;
  horaDesde: string | null;
  horaHasta: string | null;
  anulado?: boolean;
};

/** ¿El permiso está vigente (no anulado) ese día? */
export function permisoVigenteEn(p: PermisoCobertura, fecha: string): boolean {
  return !p.anulado && p.desde <= fecha && fecha <= p.hasta;
}

/** ¿El permiso cubre el día completo `fecha`? (para la falta del día y el control de ingreso automático). */
export function cubreDiaCompleto(p: PermisoCobertura, fecha: string): boolean {
  return permisoVigenteEn(p, fecha) && p.todoElDia;
}

/**
 * ¿El permiso cubre la hora `hora` de `fecha`? Uno de día completo cubre cualquier hora; uno por horas, solo las horas
 * dentro de [horaDesde, horaHasta]. Se usa para una falta a clase (con la hora de su registro).
 */
export function cubreHora(p: PermisoCobertura, fecha: string, hora: string): boolean {
  if (!permisoVigenteEn(p, fecha)) return false;
  if (p.todoElDia) return true;
  return !!p.horaDesde && !!p.horaHasta && p.horaDesde <= hora && hora <= p.horaHasta;
}

/** «Todo el día» o «8:00 a 10:30». */
export function textoHorasPermiso(p: Pick<PermisoCobertura, "todoElDia" | "horaDesde" | "horaHasta">, hora12: (h: string) => string): string {
  if (p.todoElDia || !p.horaDesde || !p.horaHasta) return "Todo el día";
  return `${hora12(p.horaDesde)} a ${hora12(p.horaHasta)}`;
}
