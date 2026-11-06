"use client";

import { createContext, useContext } from "react";
import type { GrupoNav } from "@/lib/navegacion";

/**
 * Sección de color vigente (`dia`, `comunicacion`, `academico`, `colegio`). La provee `ZonaSeccion`; los paneles en portal
 * (Dialog, Sheet, Popover, menús) viven fuera del DOM de la página y la leen aquí para repetir `data-seccion`.
 */
const SeccionContexto = createContext<GrupoNav | undefined>(undefined);

export const ProveedorSeccion = SeccionContexto.Provider;

export function useSeccion(): GrupoNav | undefined {
  return useContext(SeccionContexto);
}
