import { expect, type Page, type Response } from "@playwright/test";

/** Página denegada con `forbidden()`. Las rutas con `loading.tsx` empiezan a transmitir antes del chequeo,
 *  así que el código puede llegar como 200: lo que importa es que se muestre la página 403 y nada del módulo. */
export async function esperarSinAcceso(page: Page, respuesta: Response | null, detalle?: string) {
  expect([200, 403], detalle).toContain(respuesta?.status());
  await expect(page.getByRole("heading", { name: "No tienes acceso a esta sección" }), detalle).toBeVisible();
}
