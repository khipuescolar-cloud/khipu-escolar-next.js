// Cron de avisos en desarrollo (specs/05 y 06): llama a /api/cron/avisos cada minuto, como lo hará producción.
// Uso: con `pnpm dev` corriendo, en otra terminal `pnpm cron:local` (o `pnpm cron:local --una-vez`).
// Lee CRON_SECRET de .env; nunca lo imprime.
import "dotenv/config";

const base = process.env.CRON_URL ?? "http://lvh.me:3000";
const secreto = process.env.CRON_SECRET;
if (!secreto) {
  console.error("Falta CRON_SECRET en .env.");
  process.exit(1);
}

async function llamar() {
  const hora = new Date().toLocaleTimeString("es-PE", { timeZone: "America/Lima" });
  try {
    const r = await fetch(`${base}/api/cron/avisos`, { headers: { authorization: `Bearer ${secreto}` } });
    console.log(`[${hora}] ${r.status} ${await r.text()}`);
  } catch (error) {
    console.error(`[${hora}] no se pudo llamar al cron: ${(error as Error).message}`);
  }
}

await llamar();
if (!process.argv.includes("--una-vez")) setInterval(llamar, 60_000);
