# Prueba de estrés local: colegio de 1 000 alumnos

Fecha: 2026-10-30. Objetivo: simular el primer colegio real (inicial, primaria y secundaria, ≈1 000 alumnos) antes de comprar el dominio, medir los flujos de la mañana y corregir los cuellos de botella. Todo corrió **en local** (Supabase CLI + `next start`); no se tocó `.env.nube` ni ningún servicio en la nube.

## Entorno

| | |
|---|---|
| Equipo | Intel Core i5-13450HX (10 núcleos / 16 hilos), 23 GB de RAM, Linux |
| App | Next.js 16.4.3 en modo producción (`pnpm build && pnpm start --port 3100`), **un solo proceso Node** 24.19 |
| BD | Postgres 17.11 de Supabase CLI (Docker), `max_connections = 100`; pool de `pg` por defecto (10 conexiones) |
| Auth | GoTrue v2.197 detrás de Kong (Docker) |
| Correo | `scripts/estres/smtp-nulo.ts`: SMTP local que acepta y descarta (no se llenó Mailpit y el SMTP no es lo que se mide) |

## Datos sintéticos (colegio `estres-1000`, separado de los demo)

`scripts/estres/generar.ts` (34 s): 39 salones (inicial 3–5 años A/B × 20, primaria 1.°–6.° A–C × 25, secundaria 1.°–5.° A–C × 29 y un 5.° A Sec. de 35), 312 cursos, **1 011 alumnos**, **1 319 apoderados** (1 549 vínculos, familias con 1–2 hijos y 1–2 apoderados, todos con consentimiento y aviso por correo), 591 cuentas de alumno (5.° y 6.° de primaria y secundaria), 61 de personal (55 profesores), 1 011 carnets QR; historial de 43 días hábiles: **81 399 asistencias** (día + 2 cursos diarios en secundaria), **66 607 avisos** ya enviados, 567 justificaciones; Khipu Pro: 4 bimestres, 882 competencias, 1 764 evaluaciones, **48 060 notas** y 24 030 calificaciones del III bimestre. Nombres ficticios.

Solo se crearon **242 usuarios de Supabase Auth** (dirección, portería, 40 profesores y 200 apoderados: los que entran en la prueba); los otros 1 729 perfiles no tienen login (`Profile.id` no tiene FK a `auth.users`).

## Método

- `scripts/estres/carga.ts` (HTTP real contra el build de producción). El **login es el flujo real**: la server action `loginAction` de `/login` con el `FormData` que arma React (cookies de `@supabase/ssr`); las server actions (`guardarListaAction`, `registrarPorQrAction`) se llaman como el navegador (`POST` con la cabecera `Next-Action`, id leído de `.next/server/server-reference-manifest.json`). Una página que falla al renderizar en streaming responde HTTP 200: se cuenta como error si el HTML trae el `digest` del error.
- `scripts/estres/directo.ts` (sin HTTP): `guardarLista()` y `procesarCola()` con un `TenantContext` real, para separar el costo de la capa de negocio y medir la cola con canales controlados.
- `pg_stat_statements` (reiniciado antes de cada escenario) y `EXPLAIN ANALYZE` para las consultas.
- «Antes» = código de `dev` en 5134866 sin cambios. «Después» = con los arreglos de abajo. Repetir un escenario da ±10–25 % (un solo equipo, sin aislar).

Cómo repetirla:

```bash
pnpm exec tsx scripts/estres/contar.ts --guardar /tmp/antes.json        # foto de conteos
pnpm exec tsx --conditions=react-server scripts/estres/generar.ts       # crea estres-1000
pnpm exec tsx scripts/estres/smtp-nulo.ts &                             # SMTP en 2525 (stats en :2526)
APP_BASE_DOMAIN=lvh.me:3100 pnpm build
APP_BASE_DOMAIN=lvh.me:3100 SMTP_HOST=127.0.0.1 SMTP_PORT=2525 EMAIL_RATE_PER_SECOND=14 pnpm start --port 3100 &
pnpm exec tsx --conditions=react-server scripts/estres/carga.ts a      # también c, d, e, reset-hoy
pnpm exec tsx --require ./scripts/estres/sin-server-only.cjs scripts/estres/directo.ts lista   # y luego: cola
pnpm exec tsx scripts/estres/limpiar.ts                                 # borra colegio, usuarios Auth, perfiles y logins
pnpm exec tsx scripts/estres/contar.ts --comparar /tmp/antes.json       # debe decir «Sin diferencias»
rm -rf .next                                                            # para que `pnpm dev` arranque limpio
```

## Resultados (latencias en ms)

### A. Pico de la mañana: 40 profesores a la vez

| Paso | Antes p50 / p95 / p99 | Después p50 / p95 / p99 | Errores |
|---|---|---|---|
| A1 login (server action) | 758 / 765 / 765 | 1 036 / 1 043 / 1 043 (ruido: GoTrue + Node) | 0 |
| A2 abrir la lista (`/asistencia?salon&ambito`) | 1 274 / 1 359 / 1 360 | 888 / 962 / 963 | 0 |
| A3 guardar la lista (`guardarListaAction`, 1 036 alumnos) | 1 625 / 1 773 / 1 807 | **996 / 1 059 / 1 067** | 0 |
| A4 `guardarLista()` directo, 40 a la vez | 1 799 / 1 908 / 1 947 | **887 / 929 / 936** | 0 |
| Consultas SQL de las 40 listas | ≈10 700 (≈270 por lista) | **≈3 300 (≈83 por lista)** | — |

### B. Cola de avisos (~1 500 correos de la mañana)

| Medición | Antes | Después |
|---|---|---|
| B0 después de A, `after()` del servidor | `EMAIL_RATE_PER_SECOND=1`: 1 200 enviados en ~105 s (**≈11/s, 12× el ritmo pedido**: 40 workers en paralelo) y **318 avisos (21 %) atascados en `pendiente`** hasta el siguiente disparo (el cron es diario, 07:00 Lima) | `EMAIL_RATE_PER_SECOND=14`: **1 517/1 517 enviados en 111 s (13,7/s)**, 0 pendientes, 1 solo worker por colegio |
| B1 `procesarCola` con canal falso (BD + plantilla) | — | 692 avisos/s |
| B2 con SMTP nulo, sin pausa | — | 190 correos/s (1 conexión SMTP por correo) |
| B3 ritmo SES 14/s, 420 avisos | 11,8/s (la pausa no descontaba el tiempo de envío) | **13,9/s** |
| B4 tope diario con 25 de cupo | — | 25 enviados, 75 diferidos (siguen `pendiente`) ✔ |

El cuello de botella de la cola es solo el ritmo configurado: la BD y las plantillas dan ~700 avisos/s.

### C. 200 apoderados a la vez (`/inicio` y `/asistencia`)

| Paso | Antes p50 / p95 / p99 · req/s | Después p50 / p95 / p99 · req/s |
|---|---|---|
| C1 login (20 a la vez) | 256 / 380 / 411 · 74 | 260 / 389 / 422 · 72 |
| C2 `/inicio`, 200 a la vez (ronda 2) | 1 551 / 1 786 / 1 788 · 112 | 1 618 / 1 882 / 1 883 · 106 |
| C3 `/asistencia`, 200 a la vez (ronda 2) | 2 853 / 2 870 / 2 871 · 70 | 2 953 / 2 998 / 3 001 · 67 |
| C4 600 req con 50 usuarios | 685 / 938 / 1 018 · 72 | 690 / 925 / 992 · 71 |
| Errores (307 → `/login`) | 0–17 de 200 por ronda | 0–15 de 200 por ronda |

Sin cambio (no se tocó este camino). La BD no pesa: todas las consultas SQL de 2 600 vistas suman < 0,5 s. El límite es **CPU de un solo proceso Node** (~70 páginas de familia/s, ~14 ms de CPU por vista; con 200 a la vez se hace cola). Los 307 son **Auth**: cada request llama dos veces a `supabase.auth.getUser()` (proxy y página) y, con 400 conexiones simultáneas, Kong/GoTrue locales cortan ~25 % (`UND_ERR_SOCKET`, medido directo contra `/auth/v1/user`); la app interpreta el error como «sin sesión» y manda al login.

### D. Dirección

| Paso | Antes p50 / p95 | Después p50 / p95 |
|---|---|---|
| D1 reporte del colegio, 2 meses (página) | **error 100 %** (P2029) | 370 / 442 |
| D2 mismo reporte en Excel | **HTTP 500** | 328 / 515 |
| D3 mismo reporte en PDF | **HTTP 500** | 401 / 579 |
| D4 reporte del salón más grande (35), 2 meses | 84 / 93 | 64 / 68 |
| D5 tablero | 178 / 213 | 163 / 250 |
| D6–D7 consolidado del salón más grande (página / Excel) | 51 / 75 · 61 / 101 | 65 / 106 · 52 / 90 |
| D8–D9 consolidado PDF (IV con sugeridas / III oficial) | 174 / 273 · 166 / 183 | 193 / 211 · 164 / 174 |
| D12 reporte del colegio, 5 a la vez | **error 100 %** | 1 639 / 1 695 |
| D13 tablero, 5 a la vez | 537 / 548 | 594 / 614 |

### E. Portería: 300 lecturas QR (a 2,5/s, 5× lo pedido: 300 en 10 min = 0,5/s)

| | Antes | Después |
|---|---|---|
| E1 `registrarPorQrAction` p50 / p95 / p99 | 54 / 65 / 78 (0 errores) | 51 / 63 / 76 (0 errores) |
| E2 avisos de llegada | 454 enviados, 0 pendientes | 454 enviados, 0 pendientes |

(«Antes» de E se midió con el código original pero ya con los índices aplicados.)

### Borrar un colegio (cascade, `khipu:borrar-colegio` y la limpieza de esta prueba)

`EXPLAIN ANALYZE DELETE FROM tenants …` (en transacción con `ROLLBACK`): **127,7 s → 2,0 s**. El limpiado real tardó 1,9 s.

## Problemas encontrados y arreglos

1. **El reporte de asistencia del colegio no funcionaba en un colegio grande** (`src/lib/server/reportes-asistencia.ts`). `include` de la última justificación por asistencia hacía que Prisma enviara los 81 000 ids como parámetros y Postgres rechaza más de 32 767 (P2029). Fallaban la página, el Excel y el PDF del colegio con ≈1 000 alumnos desde ~1 mes de rango. Ahora las justificaciones van en una consulta aparte filtrada por relación. Test: `reportes-asistencia.test.ts` («aguanta un colegio grande», 33 600 registros).
2. **Avisos atascados y ritmo de correo multiplicado** (`src/lib/server/notificaciones/cola.ts`). Cada lista guardada lanza su `after(procesarCola)`; los 40 workers elegían las mismas 100 filas, la reserva atómica las repartía, los que no obtenían nada terminaban y nadie volvía por el resto: ~21 % de los avisos de la mañana quedaba `pendiente` hasta el cron diario. Además el ritmo real era N workers × `EMAIL_RATE_PER_SECOND` (con SES a 14/s se habrían lanzado ráfagas de cientos por segundo y SES las habría rechazado). Ahora: el worker vacía la cola por lotes (de ~60 s al ritmo configurado) hasta quedarse sin pendientes, sin cupo o sin presupuesto (`PRESUPUESTO_MS` = 240 s); hay **un solo worker por colegio** (los demás se retiran si ven filas `enviando` recientes, comprobado también dentro del `UPDATE` de reserva); cada lote busca con la hora actual para tomar lo que se encoló mientras enviaba; la pausa entre correos descuenta el tiempo del envío. Tests: `cola-avisos.test.ts` (6 workers a la vez vacían 130 avisos sin repetir; el worker activo toma lo encolado después) y `avisos-pendientes.test.ts`. Spec 06 actualizada.
3. **N+1 al guardar la lista** (`src/lib/server/asistencia.ts`, `notificaciones/encolar.ts`, `auditoria.ts`). Por alumno se hacían ~10 consultas en serie (registro previo, upsert, auditoría, llegada en otra lista, familias con 4 consultas anidadas, avisos). Ahora se cargan de una vez los registros previos y las familias (`destinatariosPorAlumno`), las llegadas en otras listas se consultan una vez **después** de guardar (así dos listas del mismo alumno guardadas a la vez no duplican el aviso de llegada) y la auditoría va en un solo `INSERT` (`auditarVarios`). 270 → 83 consultas por lista; p50 1,8 s → 0,9 s. En producción importa más: cada consulta paga la latencia Vercel → Supabase. Spec 04 actualizada.
4. **Índices** (migración `20261101090000_indices_rendimiento`, solo `CREATE INDEX`, aplicada con `pnpm db:deploy`):

   | Índice | Evidencia (EXPLAIN ANALYZE) |
   |---|---|
   | `avisos(asistencia_id)`, `justificaciones(asistencia_id)`, `justificacion_tokens(asistencia_id)`, `avisos(apoderado_id)`, `asistencias(curso_id)`, `asistencias(registrado_por)`, `notas(registrado_por)` | FK sin índice: al borrar asistencias/membresías Postgres recorría la tabla por cada fila (Seq Scan on avisos 5,6 ms → Bitmap Index Scan 0,12 ms). Borrar el colegio: 127,7 s → 2,0 s |
   | `avisos(canal, enviado_at)` | Tope diario global en cada lote de la cola: Seq Scan 5,8 ms (crece con todos los colegios) → Index Only Scan 0,05 ms |
   | `notas(alumno_id)` | Consolidado/libreta del salón: Seq Scan sobre 48 000 notas 4,3 ms → 0,42 ms |
   | `apoderados_alumnos(alumno_id)`, `consentimientos(apoderado_id)` | Familias a avisar y consentimiento vigente (`destinatariosPorAlumno`): Bitmap Index Scan 0,09 ms; hoy la tabla es chica, pero sin índice cada consulta lee los vínculos de todos los colegios |

## Límites que quedan (no se cambiaron)

- **Ritmo de correo = cuello de botella de la mañana.** Con un worker por colegio, ~1 500 avisos tardan `1 500 / EMAIL_RATE_PER_SECOND`: 107 s a 14/s, **25 min a 1/s** (el valor del `.env.example`). Un llamado envía como máximo `240 s × ritmo` (≈3 300 a 14/s); lo que sobre lo sigue el próximo `after()` o el cron.
- **Gmail no alcanza**: un colegio de 1 000 alumnos genera ~1 500 correos solo con la asistencia de una mañana; el límite de Gmail es ~500/día. Hace falta SES (o similar) antes del piloto.
- **Auth en cada request**: dos `getUser()` por página (proxy + página), cada uno es una llamada HTTP a Supabase Auth. Con mucha concurrencia, un error de red de Auth hace que la app mande al login (7 % de las vistas en la ronda más dura, por Kong local).
- **CPU de render**: un proceso Node sirve ~70 páginas de familia por segundo. Real: 1 300 familias abriendo el aviso en ~10 min son ~2–3 req/s.
- **Reporte del colegio** carga los ~80 000 registros de 2 meses en Node (370 ms; 1,6 s con 5 a la vez). Con el rango máximo (1 año ≈ 480 000 filas) serán varios segundos y bastante memoria.
- **Auditoría**: cada vista y cada alumno de cada lista escribe una fila (≈5 000–10 000 por día en un colegio así). Sin problema hoy; necesitará retención o particionado.
- Quedan ~55 FK sin índice en tablas pequeñas (`reuniones`, `documentos`, `tareas`…); no se agregaron sin evidencia.

## Carga masiva del colegio (2026-10-30, specs/36)

Medido en local con `tests/integracion/carga-masiva.test.ts` («rendimiento»): 40 salones con 80 cursos, 1 000 alumnos y un archivo de **2 000 filas de familias** (~1 330 apoderados, un tercio con dos hijos).

| Paso | Tiempo |
|---|---|
| Importar las 2 000 filas (cuentas con Auth simulado: mide la BD) | ~4,0 s |
| Vista previa del mismo archivo ya cargado (nada que hacer) | ~0,25 s |
| Crear cuentas en GoTrue local, 6 a la vez | ~48 cuentas/s → ~30 s para 1 330 familias nuevas |

Sin N+1: búsquedas `in` por lotes de 1 000 (debajo del límite de 32 767 parámetros), `createMany` para salones, cursos, membresías, vínculos y avisos, auditoría en un `INSERT` por lote. Las bienvenidas solo se encolan; salen por la cola al ritmo de `EMAIL_RATE_PER_SECOND` (~1 330 a 14/s ≈ 95 s). La página declara `maxDuration = 300`.

## Recomendaciones para producción

1. **Correo (SES)**: salir del sandbox (200/día, 1/s) y usar la cuota aprobada: `EMAIL_RATE_PER_SECOND=14` (o la cuota real), `EMAIL_DAILY_LIMIT` = cuota diaria. Nodemailer abre **una conexión SMTP por correo** (1 517 conexiones en la prueba); con SES por TLS conviene `pool: true` en `notificaciones/email.ts` (ahorra el handshake por correo).
2. **Cron de avisos frecuente**: hoy es diario (`0 12 * * *` = 07:00 Lima). Para que nada espere un día si un worker se corta o se acaba el presupuesto, correr `/api/cron/avisos` cada 1–5 min: Vercel Pro (crons por minuto) o `pg_cron` + `pg_net` de Supabase llamando a la ruta con `CRON_SECRET`.
3. **Vercel**: `after()` vive dentro de la duración de la función. El cron ya declara `maxDuration = 300`; `PRESUPUESTO_MS` (240 s) cabe en los 300 s de Fluid compute. Si el plan permite menos, bajar `PRESUPUESTO_MS`. El render escala horizontalmente; Fluid compute reutiliza instancias, así que el pool de BD es por instancia (ver 4).
4. **Postgres / Supabase**: la BD no fue el límite (todas las consultas de 2 600 vistas < 0,5 s; guardar 40 listas ≈ 3 300 consultas cortas). Para uno o pocos colegios alcanza el compute **Micro/Small**; el recurso escaso son las conexiones. Usar el **pooler en modo transacción (puerto 6543)** en `DATABASE_URL` para el runtime y la conexión directa/session (5432) solo para migrar. Con `@prisma/adapter-pg`, `pg` usa sentencias preparadas sin nombre, compatibles con el modo transacción (`?pgbouncer=true` era para el motor Rust de Prisma ≤6; con el adapter no aplica: comprobar en el primer despliegue que la cadena sin ese parámetro conecta). Limitar el pool por instancia (`new PrismaPg({ connectionString, max: 3–5 })` en `src/lib/server/db.ts`): hoy es 10 por instancia y con 20 instancias serían 200 clientes, el tope del pooler en Micro.
5. **Auth**: evaluar `supabase.auth.getClaims()` (verifica el JWT localmente con las claves asimétricas, sin llamada de red) en el proxy o en la página, y tratar un error de red de Auth como error temporal en vez de «sin sesión». Es una decisión de seguridad (una sesión cerrada en otro lado seguiría válida hasta que venza el JWT, 1 h): no se cambió en esta prueba.
6. **Siguiente optimización si crece**: agregar en SQL el reporte del colegio (como ya hace el tablero) en vez de traer cada registro a Node.

## Veredicto

**Sí, está listo para un colegio de 1 000 alumnos, con los arreglos de este documento y con SES configurado.** Pasar lista de 40 salones a la vez responde en ~1 s; portería aguanta 5× el ritmo pedido con ~60 ms; dirección obtiene reportes, tablero y consolidados en < 0,6 s; las familias, en uso realista, están muy por debajo del límite. Sin estos arreglos no lo estaba: el reporte del colegio fallaba siempre y ~1 de cada 5 avisos de la mañana se quedaba sin enviar hasta el día siguiente. Condiciones antes del piloto: SES fuera del sandbox con `EMAIL_RATE_PER_SECOND` ≈ 14, cron de avisos frecuente, pooler 6543 con pool chico por instancia.

## Limpieza verificada

`scripts/estres/limpiar.ts` borró el colegio (cascade, 1,9 s), 242 usuarios de Auth, 1 971 perfiles y 1 286 intentos de login sintéticos. `contar.ts --comparar` contra la foto tomada antes de empezar: **sin diferencias** en las 63 tablas (total y por colegio: `nuevohorizonte`, `academiaeuler`, `losolivos` intactos) ni en `auth.users`/`sessions`/`identities`. Se borraron también 30 perfiles `@test-basico.local` que dejaron corridas de tests interrumpidas durante la prueba. Se eliminó `.next`.
