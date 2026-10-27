"use client";

import { crearCola, type ItemCola } from "@/lib/cliente/cola-offline";

/**
 * Lectura de carnet hecha sin conexión. Solo guarda el token opaco del QR y la hora de lectura:
 * ningún dato personal del alumno llega al dispositivo (el servidor valida el token al sincronizar).
 */
export type EscaneoPendiente = ItemCola & { slug: string; token: string };

export const colaEscaneos = crearCola<EscaneoPendiente>("escaneos");
