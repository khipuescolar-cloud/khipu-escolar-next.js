# Infraestructura y costos por colegio

> **Borrador — supuestos explícitos; pendiente de aprobación.**
> Fecha: 2026-11-03. **No hay precios finales aprobados.** Las cifras de este documento son **costos estimados** para validar tarifas con los fundadores; no son precios de venta.
> Base técnica: `docs/despliegue.md`, `docs/pruebas-de-estres.md`, specs 06, 14, 15, 21, 24 y 38, `vercel.json` y `prisma/schema.prisma`. No se migra a AWS (salvo Amazon SES para el correo).

## 0. Resumen

- La infraestructura **no** es el costo principal: entre USD 0,02 y 0,25 por alumno al mes según el tamaño del colegio y el número de colegios. Lo que pesa son las **personas**: implementación, mantenimiento, soporte y guardia.
- Costo total estimado por alumno al mes, en una cartera de **5 colegios del mismo tamaño**: **USD 2,17** (100 alumnos), **0,83** (300), **0,48** (600), **0,34** (1 000). Con 1 colegio es entre 3 y 4 veces más; con 20 colegios, entre 2 y 3 veces menos (tabla final, §7).
- La configuración inicial **Vercel Pro + Supabase Pro con cómputo Small** alcanza para **1–5 colegios** (hasta unos 3 000 alumnos). Antes de cobrar hay que corregir tres cosas que no dependen del plan: la **región de las funciones** (§5.1), el **límite de 4,5 MB del cuerpo de las peticiones** en Vercel, que choca con los adjuntos de 10 MB (§5.4), y la **exportación con archivos** en Cloudinary Free (§5.6 y `docs/respaldos-y-exportacion.md`).

## 1. Precios vigentes de los servicios

Consultados el **2026-11-03** en las páginas oficiales. Montos en USD sin impuestos. «A verificar» = no confirmado en una fuente oficial o ambiguo.

### 1.1 Vercel (hosting y funciones)

| Concepto | Pro | Hobby (referencia) | Fuente |
|---|---|---|---|
| Precio base | USD 20/mes por asiento de desarrollador, con USD 20 de crédito de uso al mes | Gratis, **solo uso personal no comercial** | [vercel.com/pricing](https://vercel.com/pricing) |
| Asientos adicionales | USD 20/mes por asiento pagado extra (los de solo lectura son gratis) | — | [vercel.com/docs/pricing](https://vercel.com/docs/pricing) |
| Transferencia (Fast Data Transfer) | 1 TB/mes incluido; luego USD 0,15/GB (la doc remite a «Flat Rate CDN» y a precios por región: **a verificar** el detalle) | 100 GB | [vercel.com/pricing](https://vercel.com/pricing), [vercel.com/docs/pricing](https://vercel.com/docs/pricing) |
| Invocaciones | USD 0,60 por millón | 1 M incluido | [vercel.com/pricing](https://vercel.com/pricing) |
| CPU activa (Fluid) | USD 0,128 por hora (varía por región: **a verificar** para `gru1`) | 4 h incluidas | [vercel.com/pricing](https://vercel.com/pricing) |
| Memoria aprovisionada | USD 0,0106 por GB-hora | 360 GB-h incluidas | [vercel.com/pricing](https://vercel.com/pricing) |
| Duración máxima de una función | 300 s por defecto, 800 s máximo (1 800 s en beta) | 300 s | [docs/functions/limitations](https://vercel.com/docs/functions/limitations) |
| Memoria por función | 2 GB por defecto, hasta 4 GB / 2 vCPU | 2 GB | ídem |
| Cuerpo de petición o respuesta | **4,5 MB** máximo (error 413) | 4,5 MB | ídem |
| Disco temporal `/tmp` | 500 MB (**a verificar** con Fluid compute) | 500 MB | [búsqueda en docs de runtimes](https://vercel.com/docs/runtimes) |
| Cron | 100 por proyecto, **cada minuto**, precisión al minuto | 100 por proyecto, **una vez al día**, precisión ±59 min | [docs/cron-jobs/usage-and-pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) |

La página de precios dice además «Billing seats are limited to 1 on Pro»: **a verificar**. Choca con el precio publicado por asiento adicional.

### 1.2 Supabase (Postgres + Auth)

| Concepto | Pro | Fuente |
|---|---|---|
| Precio base | USD 25/mes, incluye USD 10 de crédito de cómputo (cubre Micro) | [supabase.com/pricing](https://supabase.com/pricing) |
| Cómputo | Micro USD 10 (1 GB RAM, 60 conexiones, pooler 200 clientes) · **Small USD 15** (2 GB, 90 / 400) · Medium USD 60 (4 GB, 120 / 600) · Large USD 110 (8 GB, 2 vCPU dedicadas, 160 / 800) · XL USD 210 | [docs/guides/platform/compute-and-disk](https://supabase.com/docs/guides/platform/compute-and-disk) |
| Disco | 8 GB incluidos por proyecto; USD 0,125/GB extra | [supabase.com/pricing](https://supabase.com/pricing) |
| Egress | 250 GB sin caché + 250 GB con caché; USD 0,09/GB y 0,03/GB extra | ídem y [docs de egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress) |
| Usuarios activos de Auth | 100 000 MAU incluidos; USD 0,00325 por MAU extra | [supabase.com/pricing](https://supabase.com/pricing) |
| Almacenamiento de archivos (Storage) | 100 GB incluidos; USD 0,0213/GB | ídem |
| Respaldos diarios | Incluidos, **7 días** de retención (respaldo físico) | [docs/guides/platform/backups](https://supabase.com/docs/guides/platform/backups) |
| PITR (opcional) | USD 100/mes (7 días), 200 (14 días), 400 (28 días); exige cómputo **Small o mayor** | ídem |
| Tope de gasto (*spend cap*) | Existe en planes pagados; si está activo, el exceso avisa en vez de cobrar (**a verificar** el valor por defecto) | [docs de egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress) |

Costo real del plan con Small: 25 + 15 − 10 = **USD 30/mes**. Con Medium: **USD 75**. Con Large: **USD 125**.

### 1.3 Amazon SES (correo)

| Concepto | Precio | Fuente |
|---|---|---|
| Correo saliente | **USD 0,10 por 1 000** (tarifa *à la carte*). Los planes Essentials, Pro y Enterprise cobran 0,16, 0,22 y 0,23 por 1 000 | [aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing/) |
| Adjuntos | USD 0,12 por GB (Khipu no adjunta archivos a los correos) | ídem |
| IP dedicada (opcional) | Estándar USD 24,95/mes por IP; administrada USD 15/mes + USD 0,08 por 1 000 | ídem |
| Cuota | *Sandbox* 200/día y 1/s; producción típica inicial 50 000/día y 14/s (**a verificar** en la cuenta) | `docs/despliegue.md` §4 |

No hace falta IP dedicada: con menos de ~100 000 correos al día, la IP compartida de SES y un dominio con SPF/DKIM/DMARC bastan.

### 1.4 Cloudinary (archivos)

| Plan | Precio | Créditos/mes | Fuente |
|---|---|---|---|
| Free | USD 0 | 25 (1 crédito = 1 GB guardado, o 1 GB de transferencia, o 1 000 transformaciones) | [cloudinary.com/pricing](https://cloudinary.com/pricing) |
| Plus | USD 99/mes (USD 89/mes pagando el año) | 225 | ídem |
| Advanced | USD 249/mes (USD 224 pagando el año) | 600 | ídem |

Tamaño máximo por archivo: 10 MB en Free y 20 MB en planes pagados, según el personal de Cloudinary en su foro ([community.cloudinary.com](https://community.cloudinary.com/discussion/comment/1707)). **A verificar** en la documentación oficial. Esto afecta a la exportación (§5.6).

### 1.5 Monitoreo, dominio y tipo de cambio

| Concepto | Precio | Fuente |
|---|---|---|
| Sentry Developer | Gratis: 1 usuario, 5 000 errores/mes, 1 monitor de uptime y 1 de cron | [sentry.io/pricing](https://sentry.io/pricing/) |
| Sentry Team | USD 29/mes: usuarios ilimitados, 50 000 errores; monitor de cron extra USD 0,78 y alerta de uptime extra USD 1 | ídem |
| UptimeRobot Free | 50 monitores cada 5 min, permite uso comercial | [uptimerobot.com/pricing](https://uptimerobot.com/pricing/) |
| UptimeRobot Solo / Team | USD 9 / USD 35 al mes | ídem |
| Dominio `.pe` | ~USD 39–44/año en registradores internacionales; en punto.pe unos S/ 110 el primer año y S/ 120–140 al renovar (**a verificar**: no hay tarifa oficial publicada) | [domainoffer.net/tld/pe](https://domainoffer.net/tld/pe), [kom.pe](https://kom.pe/cuanto-cuesta-un-dominio-pe-en-2026-y-donde-comprarlo/) |
| DNS | Gratis en Vercel. El comodín `*.khipuescolar.pe` exige delegar los nameservers a Vercel | `docs/despliegue.md` §2 |
| Tipo de cambio supuesto | **S/ 3,45 por USD**. Sunat, 26-oct-2026: compra 3,443 y venta 3,451. SBS, 1–2 oct: 3,442–3,454 | [lacamara.pe](https://lacamara.pe/?p=102674), [BCRP](https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/resultados/PD04640PD/html/2026-10-01/2026-10-22/) |

Web Push (VAPID) no tiene costo: lo entregan los servicios de push de Google, Apple y Mozilla.

## 2. Supuestos del modelo de carga

| Supuesto | Valor | Base |
|---|---|---|
| Días de clase | 190 al año, 20 al mes, 10 meses de clase | Calendario escolar peruano (aprox.) |
| Apoderados | 1,6 por alumno | Pedido del equipo (la prueba de estrés usó 1,3) |
| Docentes | 1 por cada 20 alumnos | Pedido del equipo |
| Dirección, administrativos y portería | 3 / 5 / 8 / 12 (100 / 300 / 600 / 1 000 alumnos) | Supuesto |
| Alumnos con cuenta | 50 % (5.° y 6.° de primaria y secundaria) | Prueba de estrés: 58 % |
| Asistencias | 1,9 filas por alumno y día (la del día + cursos en secundaria) | Prueba: 81 399 filas / 43 días / 1 011 alumnos |
| Avisos por asistencia | 1,53 filas por alumno y día; +30 % por otros avisos | Prueba: 66 607 / 43 / 1 011 |
| Notas | 200 por alumno al año (Khipu Pro) | Prueba: ~48 notas por alumno y bimestre |
| Notificaciones de la bandeja | 160 por alumno al año (≈100 actividades publicadas × 1,6 apoderados); 100 filas de push | specs/38 |
| Auditoría | 7 filas por alumno y día de clase | Prueba: 5 000–10 000 filas por día en un colegio de 1 000 |
| Tamaño medio de fila, con índices | asistencia 0,4 KB · aviso 1 KB (push 1,2 KB) · nota 0,3 KB · notificación 0,55 KB · auditoría 0,35 KB; +10 % para otras tablas y +30 % para *bloat*/TOAST | Estimado a partir de `schema.prisma` (UUID 16 B, timestamptz 8 B, cabecera de tupla 24 B, JSON del `payload`) |
| Archivos | 3 MB por alumno al año (justificaciones, adjuntos de comunicados y tareas, documentos, fotos) | Supuesto; los PDF de libretas y reportes se generan al vuelo y no se guardan |
| Correos (escenario A, recomendado) | **14 por alumno al mes**, solo eventos importantes: falta, tardanza o problema (~2 × 1,6), comunicados (~4 × 1,6), tareas con aviso, libreta, justificaciones, mensajes, invitaciones. **La llegada va solo por push.** Sin resumen diario (retirado, specs/38) | Supuesto |
| Correos (escenario B, como funciona hoy) | 46 por alumno al mes: el anterior más un correo de llegada por día y apoderado (specs/06 envía la llegada por correo si no hay preferencias) | specs/06 |
| Push | 30 por alumno al mes (60 % de apoderados con push) | Supuesto |
| Invocaciones de funciones | 600 por alumno al mes (páginas, RSC, *server actions*, *prefetch*) | Supuesto |
| CPU por vista | ~14 ms; ~20 ms con margen | Prueba de estrés, escenario C |

## 3. Carga estimada por tamaño de colegio

### 3.1 Usuarios y concurrencia

| | 100 alumnos | 300 | 600 | 1 000 |
|---|---|---|---|---|
| Apoderados | 160 | 480 | 960 | 1 600 |
| Docentes | 5 | 15 | 30 | 50 |
| Personal (dirección, administración, portería) | 3 | 5 | 8 | 12 |
| Alumnos con cuenta | 50 | 150 | 300 | 500 |
| **MAU de Auth** | **~220** | **~650** | **~1 300** | **~2 160** |
| Pico 7:00–8:00, docentes guardando la lista en ~10 min | 5 | 15 | 30 | 50 |
| Pico 7:00–8:00, familias que abren el push en 15 min (60 % × 3 páginas) | 0,3 req/s | 1,0 req/s | 1,9 req/s | 3,2 req/s |
| Publicación de notas (un curso, ~30 familias) | ráfaga de ~30 push y ~1 req/s | igual | igual | igual |
| Correos de la mañana: A (faltas y tardanzas) / B (con llegadas) | ~16 / ~160 | ~50 / ~480 | ~100 / ~960 | ~160 / ~1 600 |

La prueba de estrés midió, en **un solo proceso Node**, ~70 páginas de familia por segundo y 40 listas guardadas a la vez en ~1 s. El pico real de un colegio de 1 000 alumnos (~3 req/s) está 20 veces por debajo de eso. 20 colegios de 1 000 alumnos a las 7:30 serían ~65 req/s repartidos en varias instancias de Vercel.

### 3.2 Filas por año

| Tabla | 100 | 300 | 600 | 1 000 |
|---|---|---|---|---|
| `asistencias` | 36 100 | 108 300 | 216 600 | 361 000 |
| `avisos` (correo + push) | 37 800 | 113 400 | 226 700 | 377 900 |
| `notas` (Pro) | 20 000 | 60 000 | 120 000 | 200 000 |
| `notificaciones` (Pro) | 16 000 | 48 000 | 96 000 | 160 000 |
| `avisos` push académicos (Pro) | 10 000 | 30 000 | 60 000 | 100 000 |
| `auditoria` | **133 000** | **399 000** | **798 000** | **1 330 000** |
| **Crecimiento de la BD por año** | **~0,18 GB** | **~0,53 GB** | **~1,05 GB** | **~1,75 GB** |
| **Archivos nuevos por año** | ~0,3 GB | ~0,9 GB | ~1,8 GB | ~2,9 GB |

La **auditoría** es la tabla más grande (≈ 35 % del crecimiento): necesitará una política de retención (por ejemplo, mover a un archivo frío lo que tenga más de 2 años) antes de los 10 colegios. Es una decisión legal (Ley 29733) y no se resuelve aquí.

### 3.3 Comunicaciones, PDF y funciones (por mes de clases)

| | 100 | 300 | 600 | 1 000 |
|---|---|---|---|---|
| Correos, escenario A | 1 400 | 4 200 | 8 400 | 14 000 |
| Correos, escenario B | 4 600 | 13 800 | 27 600 | 46 000 |
| Push | 3 000 | 9 000 | 18 000 | 30 000 |
| PDF por periodo: libretas (2,6 por alumno: familias + dirección) + consolidados | ~260 | ~790 | ~1 580 | ~2 640 |
| PDF por año: carnets | 100 | 300 | 600 | 1 000 |
| Invocaciones de funciones | 60 000 | 180 000 | 360 000 | 600 000 |
| Transferencia aprox. (50 KB por vista) | 3 GB | 9 GB | 18 GB | 30 GB |

A eso se suma el cron de avisos cada 2 min: ~21 600 invocaciones al mes para toda la plataforma. Un PDF de consolidado tarda ~170–200 ms (prueba D8–D9): 2 640 libretas son ~10 min de CPU, menos de USD 0,05.

## 4. Costos

### 4.1 Costos variables de infraestructura por colegio (USD al mes de clases)

| Concepto | 100 | 300 | 600 | 1 000 | Cálculo |
|---|---|---|---|---|---|
| Correo SES, escenario A | 0,14 | 0,42 | 0,84 | 1,40 | correos × 0,10 / 1 000 |
| Correo SES, escenario B | 0,46 | 1,38 | 2,76 | 4,60 | ídem |
| Push | 0 | 0 | 0 | 0 | — |
| Cómputo Vercel (CPU + memoria + invocaciones) | 0,20 | 0,60 | 1,20 | 2,00 | ~USD 2 por 1 000 alumnos; entra en el crédito de USD 20 hasta unos 10 000 alumnos |
| Almacenamiento (disco de la BD y archivos) | 0,10 | 0,30 | 0,60 | 1,00 | primer año; crece cada año |
| **Total de infraestructura variable** | **0,44** | **1,32** | **2,64** | **4,40** | escenario A |

### 4.2 Costos fijos de plataforma (USD al mes) según el número de colegios

Supuesto: un colegio medio tiene 500 alumnos. Dos asientos de Vercel (dos personas despliegan).

| Concepto | 1 colegio | 3 | 5 | 10 | 20 |
|---|---|---|---|---|---|
| Vercel Pro (2 asientos; desde ~10 000 alumnos se pasa del crédito) | 40 | 40 | 40 | 40 | 50 |
| Supabase Pro + cómputo | 30 (Small) | 30 (Small) | 30 (Small) | 75 (Medium) | 126 (Large + disco) |
| Cloudinary | 0 (Free) | 0 | 0 | 99 (Plus) | 99 |
| Sentry | 0 | 0 | 29 | 29 | 29 |
| UptimeRobot | 0 | 0 | 0 | 0 | 9 |
| Dominio `.pe` (prorrateado) | 3,5 | 3,5 | 3,5 | 3,5 | 3,5 |
| Respaldo externo propio (`pg_dump`, ver el otro documento) | 1 | 1 | 2 | 3 | 5 |
| **Infraestructura fija** | **74,5** | **74,5** | **104,5** | **249,5** | **321,8** |
| En soles | S/ 257 | S/ 257 | S/ 361 | S/ 861 | S/ 1 110 |
| Mantenimiento de la plataforma (20 h × USD 15) | 300 | 300 | 300 | 300 | 300 |
| Guardia 24/7 (§4.4) | 400 | 400 | 400 | 400 | 400 |
| **Total fijo** | **774,5** | **774,5** | **804,5** | **949,5** | **1 021,8** |
| En soles | S/ 2 672 | S/ 2 672 | S/ 2 776 | S/ 3 276 | S/ 3 525 |
| **Fijo por colegio** | **774,5** | **258,2** | **160,9** | **95,0** | **51,1** |
| De eso, infraestructura por colegio | 74,5 | 24,8 | 20,9 | 24,9 | 16,1 |

Opciones **no incluidas** (no aprobadas): PITR (+USD 100/mes) e IP dedicada de SES (+USD 24,95/mes).

### 4.3 Personas por colegio (supuestos de horas y tarifas)

Tarifas supuestas: implementación y mantenimiento **USD 15/h (S/ 52)**; soporte funcional **USD 10/h (S/ 35)**. Son costos internos estimados, no sueldos aprobados.

| Concepto | 100 | 300 | 600 | 1 000 |
|---|---|---|---|---|
| Configuración (colegio, salones, cursos, horarios, planes) | 3 h | 4 h | 6 h | 8 h |
| Importación (carga masiva de alumnos y familias, specs/36, revisión de errores) | 3 h | 6 h | 8 h | 12 h |
| Capacitación (dirección, docentes, portería; charla a familias) | 4 h | 6 h | 8 h | 10 h |
| Acompañamiento del arranque (primeras 2 semanas) | 4 h | 6 h | 10 h | 14 h |
| **Implementación (pago único)** | **14 h = USD 210 (S/ 725)** | **22 h = USD 330 (S/ 1 139)** | **32 h = USD 480 (S/ 1 656)** | **44 h = USD 660 (S/ 2 277)** |
| Implementación prorrateada en 10 meses | 21,0 | 33,0 | 48,0 | 66,0 |
| Soporte funcional (mesa de ayuda, specs/23), horas al mes | 2 h = 20 | 4 h = 40 | 6 h = 60 | 9 h = 90 |
| Mantenimiento propio del colegio (cambio de año, ajustes) | 1 h = 15 | 15 | 15 | 15 |

El primer mes de uso suele necesitar el triple de soporte. Como referencia, el plan maestro propone cobrar la implementación aparte (S/ 1 500 hasta 500 alumnos y S/ 2 500 de 501 a 1 000): eso cubre las horas estimadas.

### 4.4 Soporte de emergencia 24/7 (guardia)

- **Supuesto:** dos personas rotan semana a semana. Cada una recibe USD 150/mes por estar disponible (alertas de Sentry y UptimeRobot en el celular, respuesta en 30 min). Se suman ~4 h de incidentes al mes a USD 25/h. Total: **USD 400/mes (S/ 1 380)** para toda la plataforma.
- **Alternativa más barata:** guardia solo en horario escolar extendido (L–S, 6:00–20:00), que es cuando un fallo afecta a la asistencia y a la portería. Costaría unos USD 200/mes. De noche se atiende al día siguiente, salvo una caída total.
- Con 1–3 colegios lo más probable es que la hagan los fundadores. Aun así se incluye como costo de oportunidad.

### 4.5 Costo mensual por colegio, desglosado (cartera de 5 colegios)

| USD al mes | 100 | 300 | 600 | 1 000 |
|---|---|---|---|---|
| Infraestructura fija prorrateada (104,5 / 5) | 20,90 | 20,90 | 20,90 | 20,90 |
| Infraestructura variable (cómputo) | 0,20 | 0,60 | 1,20 | 2,00 |
| Almacenamiento | 0,10 | 0,30 | 0,60 | 1,00 |
| Comunicaciones (SES A; push gratis) | 0,14 | 0,42 | 0,84 | 1,40 |
| Implementación prorrateada | 21,00 | 33,00 | 48,00 | 66,00 |
| Mantenimiento (15 + 300 / 5) | 75,00 | 75,00 | 75,00 | 75,00 |
| Soporte funcional | 20,00 | 40,00 | 60,00 | 90,00 |
| Guardia 24/7 (400 / 5) | 80,00 | 80,00 | 80,00 | 80,00 |
| **Total por colegio** | **217,3** | **250,2** | **286,5** | **336,3** |
| **En soles (× 3,45)** | **S/ 750** | **S/ 863** | **S/ 989** | **S/ 1 160** |
| **Por alumno** | **USD 2,17 (S/ 7,49)** | **USD 0,83 (S/ 2,86)** | **USD 0,48 (S/ 1,66)** | **USD 0,34 (S/ 1,17)** |
| De eso, solo infraestructura | USD 0,21 | USD 0,07 | USD 0,04 | USD 0,025 |

## 5. ¿Soporta la configuración inicial la carga?

**Configuración inicial:** Vercel Pro + Supabase Pro con cómputo **Small** (2 GB, 90 conexiones directas, pooler de 400 clientes), SES fuera del *sandbox* y Cloudinary Free.

**Respuesta:** sí para **1–5 colegios** (hasta unos 3 000 alumnos), con los arreglos de abajo. La prueba de estrés mostró que la BD no es el límite: las 2 600 vistas sumaron < 0,5 s de SQL y 40 listas a la vez se guardaron en ~1 s, en un equipo local. Los riesgos están en la configuración, no en el tamaño.

### 5.1 Cuellos de botella y riesgos

| # | Punto | Estado | Qué hacer | Prioridad |
|---|---|---|---|---|
| 1 | **Región de las funciones.** Vercel usa `iad1` (Washington) por defecto y la BD está en São Paulo (`sa-east-1`). Guardar una lista hace ~83 consultas: con ~120 ms de ida y vuelta por consulta son ~10 s | `vercel.json` no fija región | Fijar la región de las funciones en `gru1` (São Paulo), junto a la BD | **Antes del piloto** |
| 2 | **Conexiones a Postgres.** Pool de `pg` de 10 por instancia; con Fluid compute y tráfico de pico, 20–40 instancias = 200–400 clientes. Micro admite 200 en el pooler y Small, 400 | Pendiente (`docs/pruebas-de-estres.md`, rec. 4) | `DATABASE_URL` al pooler 6543 (modo transacción) y `max: 3–5` en `src/lib/server/db.ts`. Vigilar «clientes del pooler» en Supabase | **Antes del piloto** |
| 3 | **Cron diario en Hobby.** Con un cron diario, los avisos que no salen y el control de ingreso automático (8:00 / 9:00) esperan hasta el día siguiente | Documentado (`docs/despliegue.md` §3) | Con Pro: `/api/cron/avisos` cada 1–2 min (`*/2 * * * *`) y exportaciones cada 5–15 min. Además, **Hobby no permite uso comercial**: hay que pasar a Pro antes de cobrar | **Antes de cobrar** |
| 4 | **Cuerpo de las peticiones: 4,5 MB en Vercel.** Los adjuntos de comunicados y tareas aceptan 5 × 10 MB por *server action* (`bodySizeLimit` 55 MB, specs/14). En Vercel, cualquier petición de más de 4,5 MB responde 413 | **Riesgo nuevo, a verificar** en el primer despliegue | Subida directa del navegador a Cloudinary con firma del servidor (o a S3 con URL prefirmada) y luego registrar el `Archivo` en el servidor. Mientras tanto, bajar el límite a ~4 MB por archivo | **Antes del piloto** |
| 5 | **Duración de las funciones.** `PRESUPUESTO_MS` = 240 s cabe en los 300 s por defecto. Pro permite hasta 800 s | OK | Sin cambios. Si se sube `maxDuration`, se puede ampliar el presupuesto | — |
| 6 | **Ritmo de correo.** `EMAIL_RATE_PER_SECOND` es por colegio, y la cuota de SES (14/s) es por cuenta. Con 20 colegios y el escenario B (≈30 000 correos a las 7:30), la mañana tardaría ~36 min. Con el escenario A son ~3 000 correos, unos 4 min | Diseño actual | Adoptar el escenario A (llegada solo por push) y repartir la tasa: `EMAIL_RATE_PER_SECOND` ≈ cuota / colegios que envían a la vez. Pedir a SES más cuota cuando haya más de 10 colegios | Antes de 5 colegios |
| 7 | **Generación de PDF.** Cada PDF tarda ~0,2–0,4 s y es barato. El riesgo es generar **todas** las libretas o carnets en una sola petición (1 000 páginas → memoria y 300 s) | Hoy se generan de a uno o por salón | Mantenerlo por salón. Si se agrega «todas las libretas», hacerlo en segundo plano (como la exportación) | Al crecer |
| 8 | **Auth en cada petición.** Dos `getUser()` por página; ante un error de red con Auth, la app manda al login | Pendiente (prueba de estrés, rec. 5) | Evaluar `getClaims()`. Es una decisión de seguridad | Antes de 10 colegios |
| 9 | **Reporte del colegio en Node.** Lee ~80 000 filas cada 2 meses; con un año, ~480 000 | Funciona; es lento con rangos largos | Calcularlo en SQL | Al crecer |
| 10 | **Auditoría.** 1,3 M filas al año por cada 1 000 alumnos | Sin retención | Definir retención o particionado (decisión legal) | Antes de 10 colegios |
| 11 | **Exportación con archivos.** El ZIP se arma en `/tmp` (500 MB) y se sube a Cloudinary, que en Free admite 10 MB por archivo y en planes pagados 20 MB. Un colegio de 100 alumnos ya genera ~300 MB de archivos al año | **Riesgo nuevo, a verificar** | Ver `docs/respaldos-y-exportacion.md` §B | Antes del primer fin de contrato |

### 5.2 Umbrales para escalar

| Señal (medir en Supabase, Vercel y `/monitoreo`) | Umbral | Acción |
|---|---|---|
| CPU de la BD sostenida en el pico de 7:00–8:00 | > 70 % durante 10 min, varios días | Small → Medium (+USD 45). Referencia: unos 5 000 alumnos o 8–10 colegios |
| Clientes del pooler en el pico | > 70 % del tope (280 de 400 en Small) | Bajar el `max` del pool o subir de cómputo |
| Memoria de la BD / tasa de aciertos de caché | < 99 % de aciertos o *swap* | Subir de cómputo |
| Tamaño de la BD | > 6 GB | Revisar la retención de auditoría y avisos; el disco extra cuesta USD 0,125/GB |
| p95 al guardar la lista (40 listas) | > 3 s | Revisar la región, el pool y los índices antes de pagar más cómputo |
| Uso de Vercel | > USD 20 del crédito | Revisar *prefetch* y caché; recién entonces aceptar el sobrecosto |
| Créditos de Cloudinary | > 20 de 25 | Plus (USD 89–99) o mover los archivos a otro proveedor (`S3Storage` ya existe) |
| Correos diarios | > 70 % de la cuota de SES | Pedir más cuota |
| Unos 20 colegios / 10 000 alumnos | — | Large (2 vCPU dedicadas), réplica de lectura para reportes (**a verificar** su precio) y revisión de la arquitectura |

## 6. Recomendación

1. **Plataforma inicial:** Vercel Pro (1–2 asientos) + Supabase Pro con **cómputo Small** + SES + Cloudinary Free + Sentry Developer + UptimeRobot Free. Cuesta **~USD 75/mes (S/ 257)**, independiente del número de colegios hasta ~5.
2. **Antes del piloto con familias reales:** región `gru1`, pool de 3–5 conexiones por instancia en el pooler 6543, cron de avisos cada 2 min (Pro), SES fuera del *sandbox*, subida directa de adjuntos (límite de 4,5 MB) y solución de la exportación con archivos.
3. **Correo:** escenario A (llegada solo por push; correo para faltas, tardanzas y eventos importantes). El ahorro en SES es pequeño (USD 3 al mes por cada 1 000 alumnos), pero reduce 3,3 veces el tráfico de la mañana y el riesgo de spam y reputación. Cambiar la preferencia por defecto es una **decisión de producto pendiente** (specs/06).
4. **Precio:** con los supuestos de este documento, el costo total por alumno baja de ~USD 2,2 (colegio de 100 alumnos) a ~USD 0,3 (1 000 alumnos) en una cartera de 5 colegios. Un precio por alumno con **mínimo mensual por colegio** cubre bien a los colegios pequeños: su costo lo dominan las personas, no los alumnos.

## 7. Tabla final: costo mensual por alumno estimado

> **No es precio de venta. No hay precios finales aprobados.** Sirve para validar tarifas con los fundadores.

Supuesto: una cartera de *n* colegios **del mismo tamaño**, con el costo fijo (infraestructura de §4.2 + mantenimiento + guardia) repartido por igual entre los colegios. Incluye la implementación prorrateada en 10 meses y el soporte funcional. Correo en el escenario A. Tipo de cambio: S/ 3,45.

**Costo total (infraestructura + personas), USD / S/ por alumno al mes:**

| Alumnos por colegio | 1 colegio | 3 colegios | 5 colegios | 10 colegios | 20 colegios |
|---|---|---|---|---|---|
| 100 | 8,31 / S/ 28,67 | 3,15 / S/ 10,87 | 2,17 / S/ 7,49 | 1,51 / S/ 5,21 | 1,08 / S/ 3,73 |
| 300 | 2,88 / S/ 9,94 | 1,16 / S/ 4,00 | 0,83 / S/ 2,86 | 0,61 / S/ 2,10 | 0,47 / S/ 1,62 |
| 600 | 1,50 / S/ 5,18 | 0,64 / S/ 2,21 | 0,48 / S/ 1,66 | 0,37 / S/ 1,28 | 0,29 / S/ 1,00 |
| 1 000 | 0,95 / S/ 3,28 | 0,43 / S/ 1,48 | 0,34 / S/ 1,17 | 0,27 / S/ 0,93 | 0,23 / S/ 0,79 |

**Solo infraestructura, USD por alumno al mes:**

| Alumnos por colegio | 1 | 3 | 5 | 10 | 20 |
|---|---|---|---|---|---|
| 100 | 0,75 | 0,25 | 0,21 | 0,25 | 0,17 |
| 300 | 0,25 | 0,09 | 0,07 | 0,09 | 0,06 |
| 600 | 0,13 | 0,05 | 0,04 | 0,05 | 0,03 |
| 1 000 | 0,08 | 0,03 | 0,025 | 0,03 | 0,02 |

Notas:
- La infraestructura sube un poco entre 5 y 10 colegios porque se pasa a Supabase Medium y Cloudinary Plus.
- Una cartera de 20 colegios de 1 000 alumnos (20 000 alumnos) necesitaría más cómputo que el de §4.2, que supone colegios de 500. Agregar unos USD 100–200/mes; el resultado cambia en menos de USD 0,01 por alumno.
- Si la guardia es solo en horario escolar (USD 200), el costo total baja USD 0,40 por alumno (1 colegio de 500) y USD 0,02 (20 colegios de 500).
- Como referencia, no como decisión: el plan maestro menciona S/ 3 (Base) y S/ 5 (Pro) por alumno, con mínimos de S/ 300 y S/ 450. Con 1 colegio de 100 alumnos el costo (S/ 28,67 por alumno ≈ S/ 2 867 al mes) supera cualquiera de esos mínimos. Desde 3–5 colegios medianos el margen pasa a ser positivo.

## Pendientes

- Verificar en las páginas oficiales todo lo marcado «a verificar» y repetir las consultas antes de firmar.
- Validar los supuestos de uso (correos, invocaciones, archivos) con los datos reales del piloto: Vercel *Usage*, Supabase *Reports* y `/monitoreo`.
- Decisión de producto: llegada solo por push (escenario A).
- Decisión legal: retención de la auditoría y de los avisos.
- Tarifas internas reales (horas y valor hora) de implementación, soporte y guardia.
