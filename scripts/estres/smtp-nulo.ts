// Servidor SMTP «nulo» para la prueba de estrés: acepta y descarta cada correo (no llena Mailpit ni es el cuello
// de botella que se mide). Expone conteos en http://127.0.0.1:<puerto http>/stats y los reinicia en /reset.
// Uso: pnpm exec tsx scripts/estres/smtp-nulo.ts [--smtp 2525] [--http 2526] [--demora-ms 0]
//   --demora-ms simula la latencia de un proveedor real (p. ej. 80 ms ≈ SES SMTP desde Vercel).
import { createServer as crearHttp } from "node:http";
import { createServer } from "node:net";

const arg = (k: string, d: number) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const PUERTO_SMTP = arg("--smtp", 2525);
const PUERTO_HTTP = arg("--http", 2526);
const DEMORA = arg("--demora-ms", 0);

let recibidos = 0;
let primero: number | null = null;
let ultimo: number | null = null;
let conexiones = 0;

createServer((socket) => {
  conexiones++;
  let enDatos = false;
  let buffer = "";
  const responder = (linea: string) => socket.write(`${linea}\r\n`);
  responder("220 smtp-nulo listo");
  socket.on("data", (trozo) => {
    buffer += trozo.toString("latin1");
    for (;;) {
      if (enDatos) {
        const fin = buffer.indexOf("\r\n.\r\n");
        if (fin < 0) {
          if (buffer.length > 64) buffer = buffer.slice(-8); // solo importa detectar el fin
          return;
        }
        buffer = buffer.slice(fin + 5);
        enDatos = false;
        const ahora = Date.now();
        setTimeout(() => {
          recibidos++;
          primero ??= ahora;
          ultimo = Date.now();
          responder(`250 2.0.0 Ok: encolado ${recibidos}`);
        }, DEMORA);
        continue;
      }
      const i = buffer.indexOf("\r\n");
      if (i < 0) return;
      const linea = buffer.slice(0, i);
      buffer = buffer.slice(i + 2);
      const cmd = linea.slice(0, 4).toUpperCase();
      if (cmd === "EHLO" || cmd === "HELO") responder("250 smtp-nulo");
      else if (cmd === "DATA") {
        enDatos = true;
        responder("354 Fin con <CR><LF>.<CR><LF>");
      } else if (cmd === "QUIT") {
        responder("221 Adiós");
        socket.end();
      } else responder("250 Ok");
    }
  });
  socket.on("error", () => {});
}).listen(PUERTO_SMTP, "127.0.0.1", () => console.log(`smtp-nulo en 127.0.0.1:${PUERTO_SMTP} (demora ${DEMORA} ms)`));

crearHttp((req, res) => {
  if (req.url === "/reset") {
    recibidos = 0;
    primero = ultimo = null;
    conexiones = 0;
  }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ recibidos, primero, ultimo, conexiones }));
}).listen(PUERTO_HTTP, "127.0.0.1");
