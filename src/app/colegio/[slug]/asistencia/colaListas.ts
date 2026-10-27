"use client";

import { crearCola, type ItemCola } from "@/lib/cliente/cola-offline";

/** Lista guardada sin conexión. `id` = salón + ámbito: guardar otra vez la misma lista reemplaza a la anterior. */
export type ListaPendiente = ItemCola & {
  slug: string;
  salonId: string;
  ambito: string;
  registros: { alumnoId: string; estado: "llego" | "tarde" | "falta" | "problema"; nota?: string }[];
  /** Hora real en que el profesor guardó la lista (ISO). */
  registradoAt: string;
};

export const colaListas = crearCola<ListaPendiente>("listas");
