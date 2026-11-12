// Prueba de humo: 1 usuario virtual, páginas públicas. Uso: pnpm k6:humo
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE, exigirDestinoLocal, umbrales } from "./comun.js";

export const options = { vus: 1, iterations: 3, thresholds: umbrales };

export function setup() { exigirDestinoLocal(); }

export default function () {
  for (const ruta of ["/", "/login"]) {
    const r = http.get(BASE + ruta, { redirects: 3 });
    check(r, { [`${ruta} responde`]: (x) => x.status === 200 });
  }
  sleep(1);
}
