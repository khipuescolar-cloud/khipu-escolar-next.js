// Precarga para scripts/estres/directo.ts: importa src/lib/server fuera de Next sin la condición react-server
// (que rompe next/navigation). Igual que vitest (tests/stubs/server-only.ts), «server-only» se vuelve un módulo vacío.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- precarga CommonJS para `tsx --require`
const Module = require("node:module");
const original = Module._resolveFilename;
Module._resolveFilename = function (pedido, ...resto) {
  if (pedido === "server-only") return __filename;
  return original.call(this, pedido, ...resto);
};
