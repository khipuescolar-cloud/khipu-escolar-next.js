# 05 — Portería con carnet QR

> Estado: implementado · Plan: Khipu Base · Última actualización: 2026-11-03 (Claude Code, rama `pre-asistencia`: registro de salida por QR y manual; permisos de día completo en el control de ingreso; antes, 2026-10-30, rama `feat/asistencia-colegio-cursos`: portería es la fuente principal de la asistencia al colegio; la llegada ya no depende de las listas de curso)

## Objetivo
Verificar la llegada del alumno en la puerta escaneando su carnet, sin depender solo de la lista del profesor.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Generar, imprimir, regenerar y anular carnets; usar `/porteria` | — |
| Portería | Escanear carnets y registrar llegadas y salidas (también manuales) | Generar carnets; pasar lista |
| Otros | — | Entrar a `/porteria` o `/gestion/carnets` (403) |
| Sin sesión | Abrir `/q/<token>`: ve un aviso genérico | Ver datos del alumno |

## Flujos
1. **Carnets** (`/gestion/carnets`): por salón, «Generar carnets» crea uno activo a cada alumno que no tenga. «Ver e imprimir» (`/gestion/carnets/<salonId>`) muestra la página imprimible (nombre, apellidos, salón, código, colegio y QR) con botón «Imprimir». Por alumno: «Regenerar (carnet perdido)» y «Anular».
2. El QR contiene `<raíz>/q/<token>`. **Token = HMAC-SHA256(APP_SECRET, "carnet:<carnetId>")** (32 bytes base64url). En `carnets_qr` solo se guarda `SHA-256(token)`. Así se puede reimprimir sin guardar el token; regenerar crea otra fila (otro token) y desactiva la anterior.
3. **Portería** (`/porteria`): «Encender cámara» (`@zxing/browser`, cámara trasera), «Pantalla completa», sonido/vibración opcional. Al leer → `registrarPorQrAction` → `registrarLlegadaPorQr(ctx, texto)`.
   - **Diseño (fase 2):** el modo Llegada/Salida es un control grande (56 px); el resultado de la lectura es el bloque dominante, justo bajo el modo y sobre la cámara (estado en 40 px con ícono + palabra, nombre en 28 px, foto de 96 px; «Esperando carnet de llegada/salida» en reposo). La búsqueda manual es una lista con divisores, sin tarjeta.
4. Respaldo manual: buscar por nombre, apellido o código → «Registrar llegada».
5. Tras registrar se encola el aviso (spec 06) y `after()` procesa la cola.

## Reglas de negocio
- El hash se busca con `ctx.db` (filtrado por colegio): un carnet de otro colegio no existe para este contexto → «Carnet no válido para este colegio». Carnet anulado o regenerado → mismo mensaje.
- Registra `ambito = "dia"`, `origen = porteria`, `cursoId = null`; estado `tarde` si la hora local ≥ la **entrada de la plantilla de horario del salón** del alumno (specs/34); si el salón no tiene plantilla, `tenant.horaLimiteTardanza` (por defecto 08:00). Si no, `llego`.
- Si ya hay registro del día que no sea «Falta» → no duplica ni re-avisa: «Ya registrado 7:52 a. m.». Si figuraba «Falta», se corrige a llegó/tarde y se avisa.
- La misma lectura repetida en < 2,5 s se ignora en el cliente.
- Auditoría: creación/anulación de carnets, impresión, lecturas rechazadas y cada registro.

## Salida (2026-11-03)
- En `/porteria` un control **Llegada | Salida** (`aria-pressed`, íconos `LogIn`/`LogOut`) elige qué registra el escáner y el botón manual («Registrar salida»).
- `registrarSalidaPorQr(ctx, texto, ahora?, leidoAt?)` y `registrarSalidaManual(ctx, alumnoId, ahora?)`: misma validación del carnet que la llegada (hash activo, mismo colegio; rechazo auditado). Guardan `hora_salida` (HH:mm) y `salida_registrada_por` en la **fila de la asistencia del día** (`ambito = "dia"`), sin crear filas nuevas.
- **Idempotente:** `updateMany` condicionado a `hora_salida IS NULL`; una segunda lectura responde «Salida ya registrada 1:10 p. m.» (`tipo: "ya-registrado"`) y no cambia la hora.
- Sin ingreso de hoy (o con «No llegó») → «No tiene ingreso registrado hoy. Registra primero su llegada.» Un escaneo de llegada posterior responde «Ya registrado» y no toca la salida.
- **Sin aviso a la familia** (ni correo ni push). Auditoría `editar` de la asistencia con `salida`.
- Se ve en el historial de la familia («Salió 1:10 p. m.», spec 04) y en el detalle del alumno de los reportes (columna «Salida», también en PDF, Excel y CSV, spec 27).
- Sin conexión: la lectura se guarda en la cola con `movimiento: "salida"` (clave `<token>:salida`, para no confundirla con la llegada del mismo carnet) y se envía igual que las llegadas.
- `ResultadoPorteria` (ok) trae `movimiento: "llegada" | "salida"`.

## Control de ingreso automático (2026-11-06)
Opcional por colegio: Configuración → «Control de ingreso automático por portería» (`tenants.control_ingreso_automatico`, por defecto apagado; requiere el módulo Portería). Horas: las de la plantilla de horario de cada salón (entrada = tardanza, y su hora límite de falta; specs/34); los salones sin plantilla usan `horaLimiteTardanza` (08:00) y `horaLimiteFalta` (09:00, debe ser posterior) de Configuración. Cada grupo de horas («colegio» o una plantilla) avanza por su cuenta y cada paso se reserva una vez por colegio, día y grupo (`control_ingreso_dia.clave`). Lo corre `procesarControlIngreso()` (`src/lib/server/control-ingreso.ts`) desde `/api/cron/avisos`, antes de procesar la cola; el cron debe correr cada 1–5 min (docs/despliegue.md §3; en local `pnpm cron:local`).
1. **Desde la hora de tardanza**: a las familias (con consentimiento y canal) de cada alumno activo, de salón activo, **sin ningún registro del día**, aviso `asistencia_no_llega`: «Buenos días, Rosa. Mateo aún no se presenta en el colegio. La hora de ingreso fue a las 8:00 a. m. Si llega antes de las 9:00 a. m., te avisaremos a qué hora ingresó y tendrá tardanza. Si no llega, tendrá falta hoy y podrás justificarla.»
2. **Si llega tarde**: el escaneo registra «tarde» y avisa `asistencia_tarde`: «Mateo acaba de ingresar al colegio a las 8:30 a. m., así que hoy tiene tardanza.»
3. **Desde la hora límite de falta**: a quien siga sin registro del día se le crea la falta (`ambito = "dia"`, `origen = automatico`, `registradoPorId = null`, `hora = horaLimiteFalta`, auditada con actor nulo) y se avisa `asistencia_falta` con `horaLimite`: «Mateo no se presentó en el colegio hasta las 9:00 a. m., así que hoy tiene falta. Por favor, justifícala con el botón de abajo…» con enlace «Justificar falta». Si llega después, el escaneo corrige la falta a «tarde», avisa la tardanza y el enlace de justificar deja de servir (la asistencia ya no es falta).
4. **Listas de curso** (spec 04): con el control activo, un alumno sin ingreso al colegio (portería o lista del día con «Llegó»/«Tarde») solo puede quedar con «No llegó»: la tarjeta lo dice y los demás botones se desactivan; `guardarLista` rechaza otro estado («Mateo no registra ingreso al colegio hoy: solo puede quedar con falta. Si ya llegó, pide a portería que registre su ingreso.»). No aplica a listas guardadas sin conexión ni a correcciones de dirección. Esa falta a clase no se avisa (la familia ya recibe el aviso del día).

**Permisos** (spec 04): quien tiene un permiso de asistencia de **día completo** vigente ese día no recibe «aún no llega» ni falta automática.

Reglas: cada paso corre **una vez** por colegio y día (`control_ingreso_dia`: `avisoNoLlegaAt`, `faltasAt`, con reserva atómica); si el cron no corrió entre ambas horas, se salta directo a la falta. Solo días hábiles (lunes a viernes sin feriados aplicables) y colegios `activo` o `piloto`. **Salvaguarda**: si a esa hora nadie registró ingreso en todo el colegio (portería no abrió, día sin clases), no se hace nada. Los alumnos con un registro del día de la lista del tutor (incluida «Falta» o «Aviso») no reciben estos avisos. Los avisos de asistencia a la familia ahora empiezan con un saludo según la hora («Buenos días, Rosa.», `saludoFamilia` de `src/lib/control-ingreso.ts`); el push no lo lleva.

## Modelo de datos
- `tenants.control_ingreso_automatico`, `tenants.hora_limite_falta`; `control_ingreso_dia` (`tenantId`, `fecha` únicos; migración `20261106090000_control_ingreso_automatico`, que también agrega `OrigenAsistencia.automatico` y hace opcional `asistencias.registrado_por`).
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
- Un solo aviso de llegada por alumno y día (spec 04): portería es la fuente principal de la **asistencia al colegio** y avisa la llegada; las listas de curso nunca avisan la llegada, así que un «Llegó» previo en un curso ya no la silencia (cambio del 2026-10-30). Un segundo escaneo responde «Ya registrado» sin avisar.
- Servidor idempotente: `registrarLlegadaPorQr(ctx, texto, ahora, leidoAt)` respeta la hora real de la lectura (`leidoAt`) solo si es razonable (misma regla que pasar lista: máx. 5 min en el futuro, 48 h en el pasado) y calcula «Llegó»/«Tarde» con esa hora. Si ya había llegada hoy responde «Ya registrado» sin duplicar.
- La búsqueda manual necesita conexión (queda deshabilitada y lo dice). `/porteria` guarda su cascarón en caché en el service worker (no trae datos de alumnos) para reabrir el quiosco sin red; solo en HTTPS.
- El lector de QR (`@zxing/browser`) y la lógica de token (`src/lib/token-qr.ts`) corren en el navegador.

## Pruebas
- unit (`tests/unit/porteria-qr.test.ts`, `tokens-y-fechas.test.ts`): extracción del token, hora límite, hash y token derivado.
- integración (`tests/integracion/porteria-qr.test.ts`): solo hash guardado y reimpresión, QR de otro colegio rechazado, tarde desde la hora límite, sin duplicados, regenerar invalida el QR anterior, permisos por rol.
- unit: `tests/unit/registro-offline.test.ts`, `tests/unit/carnets-pdf.test.ts` (A4 con 8 por hoja, CR80). integración: `tests/integracion/dia-a-dia-offline-plazo.test.ts` (escaneo offline con hora real).
- e2e: búsqueda manual en `/porteria` y `/q/<token>` sin datos; `tests/e2e/dia-a-dia-offline-calendario.test.ts` (indicador sin conexión en portería, descarga del PDF).

## Pruebas del control de ingreso
- unit `tests/unit/control-ingreso.test.ts` (fases, horas válidas, saludo) y `tests/unit/plantillas-avisos.test.ts` (aún no llega, tardanza de portería, falta automática).
- integración `tests/integracion/plantillas-horario.test.ts`: tardanza de portería según la plantilla del salón y control de ingreso por grupo de horas.
- integración `tests/integracion/control-ingreso.test.ts`: nada antes de la hora, nada si nadie ingresó, «aún no llega» una sola vez con saludo, bloqueo en la lista de curso, falta automática una sola vez (origen, sin autor, aviso con `horaLimite` y token), llegada posterior → tardanza, fines de semana no corre.

- integración `tests/integracion/permisos-salida-reportes.test.ts`: salida sin ingreso rechazada, salida por QR una sola vez (segunda lectura y manual no duplican), sin avisos, otro colegio y otros roles no; salida visible en el historial de la familia y en el reporte del alumno; permiso de día completo sin aviso ni falta automática.

## Pendientes
- No hay e2e del escaneo offline (la cámara no se puede simular en Playwright); está cubierto por unit e integración.

## Marca en los carnets
- Carnet impreso (HTML) y PDF (`carnets-pdf.tsx`): borde y nombre del colegio en índigo, texto en tinta y pizarra, firma «Khipu Escolar» con el isotipo oficial (24 pt, mínimo del manual) en la esquina inferior derecha. Fuente Helvetica en el PDF.
