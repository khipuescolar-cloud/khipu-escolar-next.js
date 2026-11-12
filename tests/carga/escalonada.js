// Carga escalonada: sube hasta USUARIOS usuarios virtuales a la vez.
// Uso: pnpm k6:100  |  pnpm k6:1000  |  k6 run -e USUARIOS=300 -e DURACION=5m tests/carga/escalonada.js
// Con K6_COOKIE también prueba páginas autenticadas (/nudito, /inicio).
import http from "k6/http";
import { check, group, sleep } from "k6";
import { BASE, cabeceras, exigirDestinoLocal, umbrales } from "./comun.js";

const USUARIOS = Number(__ENV.USUARIOS || 100);
const DURACION = __ENV.DURACION || "3m";

export const options = {
  stages: [
    { duration: "30s", target: Math.ceil(USUARIOS * 0.25) },
    { duration: DURACION, target: USUARIOS },
    { duration: "30s", target: 0 },
  ],
  thresholds: umbrales,
};

export function setup() { exigirDestinoLocal(); }

export default function () {
  group("públicas", () => {
    for (const ruta of ["/", "/login"]) {
      const r = http.get(BASE + ruta, { tags: { ruta } });
      check(r, { [`${ruta} 200`]: (x) => x.status === 200 });
    }
  });
  if (__ENV.K6_COOKIE) {
    group("autenticadas", () => {
      for (const ruta of ["/inicio", "/nudito"]) {
        const r = http.get(BASE + ruta, { ...cabeceras(), tags: { ruta } });
        check(r, { [`${ruta} 200`]: (x) => x.status === 200 });
      }
    });
  }
  sleep(1 + Math.random() * 2); // pausa «humana» entre acciones
}
