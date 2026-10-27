# 05 — Portería con carnet QR

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/p2-dia-a-dia`: PDF de carnets y quiosco sin conexión)

## Objetivo
Verificar la llegada del alumno en la puerta escaneando su carnet, sin depender solo de la lista del profesor.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Generar, imprimir, regenerar y anular carnets; usar `/porteria` | — |
| Portería | Escanear carnets y registrar llegadas manuales | Generar carnets; pasar lista |
| Otros | — | Entrar a `/porteria` o `/gestion/carnets` (403) |
| Sin sesión | Abrir `/q/<token>`: ve un aviso genérico | Ver datos del alumno |

## Flujos
1. **Carnets** (`/gestion/carnets`): por salón, «Generar carnets» crea uno activo a cada alumno que no tenga. «Ver e imprimir» (`/gestion/carnets/<salonId>`) muestra la página imprimible (nombre, apellidos, salón, código, colegio y QR) con botón «Imprimir». Por alumno: «Regenerar (carnet perdido)» y «Anular».
2. El QR contiene `<raíz>/q/<token>`. **Token = HMAC-SHA256(APP_SECRET, "carnet:<carnetId>")** (32 bytes base64url). En `carnets_qr` solo se guarda `SHA-256(token)`. Así se puede reimprimir sin guardar el token; regenerar crea otra fila (otro token) y desactiva la anterior.
3. **Portería** (`/porteria`): «Encender cámara» (`@zxing/browser`, cámara trasera), «Pantalla completa», sonido/vibración opcional. Al leer → `registrarPorQrAction` → `registrarLlegadaPorQr(ctx, texto)`.
4. Respaldo manual: buscar por nombre, apellido o código → «Registrar llegada».
5. Tras registrar se encola el aviso (spec 06) y `after()` procesa la cola.

## Reglas de negocio
- El hash se busca con `ctx.db` (filtrado por colegio): un carnet de otro colegio no existe para este contexto → «Carnet no válido para este colegio». Carnet anulado o regenerado → mismo mensaje.
- Registra `ambito = "dia"`, `origen = porteria`, `cursoId = null`; estado `tarde` si la hora local ≥ `tenant.horaLimiteTardanza` (por defecto 08:00), si no `llego`.
- Si ya hay registro del día que no sea «Falta» → no duplica ni re-avisa: «Ya registrado 7:52 a. m.». Si figuraba «Falta», se corrige a llegó/tarde y se avisa.
- La misma lectura repetida en < 2,5 s se ignora en el cliente.
- Auditoría: creación/anulación de carnets, impresión, lecturas rechazadas y cada registro.

## Modelo de datos
- `carnets_qr`: `alumnoId`, `tokenHash` (único), `activo`, `revocadoAt`.
- `asistencias` (spec 04), `alumnos.fotoArchivoId` (foto opcional, URL temporal de spec 14).

## Contratos de `src/lib/server`
```ts
// src/lib/server/porteria.ts
estadoDeLlegada(hora, horaLimiteTardanza): "llego" | "tarde"
tokenDesdeQr(texto): string | null            // URL …/q/<token> o token solo
urlDeCarnet(carnetId): string
salonesParaCarnets(ctx) / generarCarnetsSalon(ctx, salonId) / regenerarCarnet(ctx, alumnoId) / revocarCarnet(ctx, alumnoId)
carnetsParaImprimir(ctx, salonId)              // QR como data URL (qrcode)
registrarLlegadaPorQr(ctx, texto, ahora?) : ResultadoPorteria
registrarLlegadaManual(ctx, alumnoId, ahora?) : ResultadoPorteria
buscarAlumnosPorteria(ctx, texto)              // 2..60 caracteres, máx. 10
// ResultadoPorteria = { ok: true, tipo: "registrado" | "ya-registrado", alumno, estado, hora, mensaje } | { ok: false, mensaje }
```

## Rutas y UI
- `/gestion/carnets`, `/gestion/carnets/[salonId]` (dirección).
- `/porteria` (portería, dirección): `Escaner.tsx` (cliente). Resultado grande con foto o ícono, nombre, salón y estado (ícono + palabra).
- `/q/[token]` (público, dominio raíz): «Este código solo sirve en la portería del colegio…».

## Textos y UX
- «Carnet no válido para este colegio» · «Ya registrado 7:52 a. m.» · «Tarde · 8:10 a. m.» · «Llegó · 7:45 a. m.»
- «¿No trae su carnet?» → búsqueda manual.

## Errores y casos borde
- Sin permiso de cámara → «No se pudo abrir la cámara. Revisa los permisos o usa la búsqueda manual.»
- Si `APP_SECRET` cambia, todos los carnets impresos dejan de servir (hay que regenerarlos).

## PDF de carnets
- `GET /api/carnets/<salonId>?formato=a4|cr80` (`src/app/colegio/[slug]/api/carnets/[salonId]/route.ts`): PDF con `@react-pdf/renderer` (`src/lib/server/carnets-pdf.tsx`). **A4** (por defecto): 8 carnets por hoja (2 × 4); **CR80** (85,6 × 54 mm): un carnet por página. Cada carnet lleva QR (paquete `qrcode`), logo del colegio, nombres, apellidos, salón y código.
- El logo se convierte a PNG con `sharp` si es WEBP o SVG (`logoParaPdf` en `src/lib/server/logo.ts`, que también usa la libreta). Solo dirección (otros roles, 403); audita `ver` (datos de los carnets) y `exportar` (la descarga). Sin carnets generados → 404.
- Botones «Descargar PDF» en `/gestion/carnets` y en la página de impresión (A4 y tarjeta). La página imprimible se conserva.

## Quiosco sin conexión
- Con sesión de portería (o dirección), si no hay conexión el escaneo se guarda en la cola local (IndexedDB, almacén `escaneos`) y se envía solo al reconectar (evento `online` y al abrir la página), con el indicador «Sin conexión · N llegadas guardadas de enviar» y un toast al sincronizar.
- **Sin datos personales en el dispositivo:** la cola guarda solo el token opaco del QR y la hora de lectura. El token se valida en el servidor al sincronizar (hash activo y mismo colegio); offline la pantalla muestra «Guardado sin conexión» en lugar del nombre. Un carnet inválido o de otro colegio se descarta al sincronizar con un toast. Repetir el mismo carnet offline no duplica la cola. **Reintentos acotados:** un error del servidor que no es de red suma un intento al escaneo; tras 5 queda como «No se pudo enviar» con el botón «Descartar» (misma lógica que las listas, spec 04); los errores de red no cuentan.
- Un solo aviso de llegada por alumno y día (spec 04): si una lista de curso ya registró hoy su llegada, el escaneo «Llegó» se guarda pero no vuelve a avisar a la familia (la tardanza sí se avisa).
- Servidor idempotente: `registrarLlegadaPorQr(ctx, texto, ahora, leidoAt)` respeta la hora real de la lectura (`leidoAt`) solo si es razonable (misma regla que pasar lista: máx. 5 min en el futuro, 48 h en el pasado) y calcula «Llegó»/«Tarde» con esa hora. Si ya había llegada hoy responde «Ya registrado» sin duplicar.
- La búsqueda manual necesita conexión (queda deshabilitada y lo dice). `/porteria` guarda su cascarón en caché en el service worker (no trae datos de alumnos) para reabrir el quiosco sin red; solo en HTTPS.
- El lector de QR (`@zxing/browser`) y la lógica de token (`src/lib/token-qr.ts`) corren en el navegador.

## Pruebas
- unit (`tests/unit/porteria-qr.test.ts`, `tokens-y-fechas.test.ts`): extracción del token, hora límite, hash y token derivado.
- integración (`tests/integracion/porteria-qr.test.ts`): solo hash guardado y reimpresión, QR de otro colegio rechazado, tarde desde la hora límite, sin duplicados, regenerar invalida el QR anterior, permisos por rol.
- unit: `tests/unit/registro-offline.test.ts`, `tests/unit/carnets-pdf.test.ts` (A4 con 8 por hoja, CR80). integración: `tests/integracion/dia-a-dia-offline-plazo.test.ts` (escaneo offline con hora real).
- e2e: búsqueda manual en `/porteria` y `/q/<token>` sin datos; `tests/e2e/dia-a-dia-offline-calendario.test.ts` (indicador sin conexión en portería, descarga del PDF).

## Pendientes
- No hay e2e del escaneo offline (la cámara no se puede simular en Playwright); está cubierto por unit e integración.
