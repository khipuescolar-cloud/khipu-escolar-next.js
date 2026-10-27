/** Primer nombre para los avisos («Mateo», no «Mateo Alonso»). */
export function primerNombre(nombres: string): string {
  return nombres.trim().split(/\s+/)[0] || nombres;
}
