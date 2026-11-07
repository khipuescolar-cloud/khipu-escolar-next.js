import { reconciliarCuotas } from "../src/lib/server/almacenamiento";
reconciliarCuotas().then((r) => { for (const cambio of r) console.log(cambio.tenantId, cambio.diferenciaBytes.toString()); }).catch((e) => { console.error(e); process.exitCode = 1; });
