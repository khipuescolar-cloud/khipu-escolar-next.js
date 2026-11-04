# Respaldos y exportación institucional

> **Borrador — supuestos explícitos; pendiente de aprobación.**
> Fecha: 2026-11-03. Los precios se consultaron ese día (las fuentes están en cada tabla). Lo marcado «a verificar» no está confirmado. **PITR no está aprobado:** aparece solo como opción. Los plazos legales están sujetos a revisión por un abogado (Ley 29733). Complementa a `docs/infraestructura-y-costos.md`, `specs/14` y `specs/15`.

## Resumen

- **Respaldo recomendado para empezar:** los respaldos diarios de Supabase Pro (incluidos, 7 días) **más** un `pg_dump` propio, diario y cifrado, en un almacenamiento externo (Cloudflare R2 o equivalente), con 14 copias diarias y 12 mensuales, **más** una copia semanal de los archivos de Cloudinary. Cuesta **~USD 1–5 al mes**. RPO de 24 h y RTO de 2–6 h.
- **PITR** (USD 100/mes por 7 días) baja el RPO a ~2 min. Conviene evaluarlo cuando haya varios colegios con contrato y la pérdida de una mañana de asistencia sea inaceptable. **No aprobado.**
- **La exportación institucional ya existe**: ZIP con un JSON por tabla, los archivos y un README, en segundo plano, solo para dirección, con auditoría y vence a los 7 días. **En producción con Cloudinary fallará apenas el ZIP pase de 10–20 MB** (tamaño máximo por archivo) o de 500 MB (`/tmp` de Vercel). Hay que corregirlo antes del primer fin de contrato.

---

## A. Respaldos operativos

### A.1 Qué hay que proteger

| Dato | Dónde vive | Tamaño estimado (§3 de costos) |
|---|---|---|
| Base de datos (todas las tablas de todos los colegios, más `auth.users` de Supabase Auth) | Supabase Postgres, `sa-east-1` | ~1,75 GB por cada 1 000 alumnos y año |
| Archivos (justificaciones, adjuntos, documentos, fotos, logos, ZIP de exportación) | Cloudinary, `khipu/<tenantId>/<carpeta>` (`specs/14`) | ~3 GB por cada 1 000 alumnos y año |
| Configuración (variables de entorno, claves VAPID, `CRON_SECRET`, DNS) | Paneles de Vercel, Supabase y DNS | Pocos KB. **No va en el repositorio** |
| Código y migraciones | Git (GitHub) | — |

Las **claves VAPID** son críticas: si se pierden, se invalidan todas las suscripciones push (`docs/despliegue.md` §6). Deben guardarse en un gestor de secretos del equipo, fuera de Vercel.

### A.2 Qué ofrece Supabase Pro

Fuente: [supabase.com/docs/guides/platform/backups](https://supabase.com/docs/guides/platform/backups) y [supabase.com/pricing](https://supabase.com/pricing), consultadas el 2026-11-03.

- **Respaldos diarios automáticos, físicos**, con **7 días** de retención. Están incluidos en el plan.
- **Restauración desde el panel** (*Database → Backups*): restaura **todo el proyecto**, es decir, todos los colegios, al momento del respaldo. **El proyecto queda inaccesible mientras se restaura**, y más tiempo cuanto mayor es la BD.
- **No incluyen los archivos** de Supabase Storage. Khipu no usa Supabase Storage (usa Cloudinary), así que esto no aplica, pero tampoco hay respaldo de Cloudinary.
- Los respaldos físicos **no se pueden descargar** (solo restaurar). Para tener una copia propia hace falta `supabase db dump` / `pg_dump`.
- Restaurar en **otro proyecto** («Duplicate project» / *restore to new project*): sirve para recuperar **un solo colegio** sin tocar producción. Disponibilidad y costo **a verificar**.
- **Limitación multitenant:** restaurar el proyecto entero para arreglar un colegio hace retroceder a todos los demás. Para recuperar un colegio hay que restaurar en un proyecto aparte (o en un Postgres local desde un `pg_dump`) y copiar sus filas por `tenant_id`.

### A.3 Alternativas

| Alternativa | Qué es | Costo mensual | RPO (pérdida máxima) | RTO (tiempo para volver) | Riesgos |
|---|---|---|---|---|---|
| **A0. Solo Supabase diario** | Lo incluido en Pro | USD 0 | **≤ 24 h** | 1–4 h (restauración en el panel; depende del tamaño) | Retención de solo 7 días: un error que se nota en la semana 2 ya no se puede deshacer. Restaura todos los colegios a la vez. Sin copia fuera de Supabase: si se pierde la cuenta o la organización, se pierde todo. Sin archivos |
| **A1. A0 + `pg_dump` propio programado** (recomendado) | Volcado lógico diario (o cada 6 h) en formato *custom*, cifrado, en almacenamiento externo | **~USD 0–3** (R2: USD 0,015/GB-mes, 10 GB gratis, sin cargo por egress, [developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/)). Con 5 colegios de 500 alumnos, un volcado comprimido pesa ~1 GB el primer año; 26 copias (14 diarias + 12 mensuales) ≈ 26 GB ≈ **USD 0,25**. El ejecutor (GitHub Actions o un VPS pequeño) cuesta USD 0–5 (**a verificar** los minutos incluidos de Actions) | 24 h (diario) o 6 h | 2–6 h para reconstruir en un proyecto nuevo; 30–60 min para extraer un solo colegio | **Copia de datos de menores fuera de Supabase:** hay que cifrarla (`age`/`gpg`, con la clave fuera del almacenamiento), declarar al proveedor como encargado de tratamiento y elegir la región. El secreto de la BD queda en el ejecutor. El volcado debe usar la conexión **directa o session (5432)**, nunca el pooler 6543. Un volcado que falla sin que nadie se entere: hace falta alerta (Sentry Cron Monitor o UptimeRobot heartbeat). Incluir el esquema `auth` |
| **A2. A0 + PITR** (opción, **no aprobada**) | Recuperación a cualquier segundo de los últimos 7, 14 o 28 días | **USD 100 / 200 / 400** al mes. Exige cómputo Small o mayor (ya previsto) | **~2 min** (el WAL se respalda cada 2 min) | 1–4 h | Costo fijo alto para pocos colegios. Sigue restaurando el proyecto entero. No cubre los archivos ni da una copia fuera de Supabase |
| **A3. A1 + A2** | Lo mejor de los dos | USD 101–405 | ~2 min | 1–4 h (o 30–60 min para un colegio desde el volcado) | Los de A1 |

**Recomendación:** A1 desde el primer colegio con contrato. Evaluar A2 cuando haya ≥ 5 colegios **o** cuando un colegio exija contractualmente un RPO menor de 24 h. Al pasar a A2, el `pg_dump` sigue siendo la copia fuera del proveedor.

### A.4 Respaldo de archivos (Cloudinary)

Hoy **no hay ningún respaldo** de los archivos.

| Opción | Costo | RPO | Notas |
|---|---|---|---|
| **F1. Script propio semanal**: recorre `archivos` (BD) y copia a R2 los objetos nuevos desde la última corrida, con `storageDe(proveedor).leer` (misma abstracción que la exportación), conservando `khipu/<tenantId>/<carpeta>/<id>` | R2: ~3 GB por cada 1 000 alumnos y año → < USD 0,50/mes con 5 colegios | 7 días (diario si se quiere) | Recomendado. Reutiliza `FileStorage`. Debe poder reanudarse y respetar los límites de la Admin API de Cloudinary (**a verificar**). Mismos cuidados de cifrado y encargado que A1 |
| F2. Respaldo automático de Cloudinary (función de los planes pagados) | Incluido en Plus o superior (**a verificar**) | Continuo | Exige pasar a Plus (USD 89–99/mes). La copia queda dentro de Cloudinary salvo que se configure un bucket propio |
| F3. Migrar los archivos a S3 o R2 con versionado | Depende del proveedor | Continuo | `S3Storage` y `scripts/migrar-archivos.ts` ya existen (specs/14). R2 es compatible con S3 (**a verificar** con `S3_ENDPOINT`). No es migrar la app a AWS |

### A.5 Frecuencia y retención propuestas

| Qué | Frecuencia | Retención |
|---|---|---|
| Respaldo de Supabase | Diario (automático) | 7 días |
| `pg_dump` cifrado | Diario a las 03:00 (Lima), fuera del horario escolar | 14 diarios + 12 mensuales (el del día 1) |
| Archivos (F1) | Semanal (domingo); diario en época de matrícula y libretas si se quiere | Mientras exista el archivo en origen + 30 días |
| Variables y secretos | Ante cada cambio | En el gestor de secretos del equipo |
| Simulacro de restauración | **Trimestral**, y siempre antes del inicio del año escolar | Acta en `docs/` (sin datos personales) |

### A.6 Procedimiento de restauración

**Caso 1 — Se cayó o se dañó toda la BD.**
1. Declarar el incidente: aviso en la plataforma y a la dirección de cada colegio.
2. Si el daño es de las últimas horas y el respaldo diario sirve: *Database → Backups* → elegir el respaldo anterior al daño → restaurar. Si PITR está activo: elegir el minuto exacto.
3. Si Supabase no está disponible: crear un proyecto nuevo en la misma región, `pg_restore` del último volcado cifrado (descifrar en un equipo controlado), cambiar `DATABASE_URL` y las claves de Supabase en Vercel y volver a desplegar. Configurar de nuevo la URL y el SMTP de Auth (`docs/despliegue.md` §1).
4. Verificar: inicio de sesión, pasar lista en un colegio de prueba, `/monitoreo` (cron y cola) y conteos por tabla.
5. Reprocesar la cola (`/monitoreo` → «Procesar la cola ahora»). Revisar que no se dupliquen avisos de una mañana ya enviada.
6. Informar a los colegios qué ventana de datos se perdió (RPO). Lo cargado en esa ventana se vuelve a registrar.

**Caso 2 — Hay que recuperar un solo colegio** (por ejemplo, un borrado masivo por error).
1. Restaurar el último volcado bueno en un Postgres aparte (local o un proyecto temporal).
2. Exportar las filas de ese `tenant_id` con un script que respete el orden de las FK. **No existe todavía.**
3. Insertarlas en producción dentro de una transacción, sin pisar lo que se cargó después (decidirlo caso por caso con el colegio).
4. Auditar la operación en `auditoria_plataforma`.

**Caso 3 — Se perdieron archivos.** Copiar desde R2 (F1) al proveedor activo con un script basado en `migrarArchivos`, manteniendo `Archivo.publicId`.

**Simulacro trimestral** (registrar los tiempos reales para medir el RTO):
1. Restaurar el volcado más reciente en un proyecto o Postgres de prueba **aislado**: sin SMTP ni push configurados, para no enviar avisos reales.
2. Comprobar los conteos por tabla y por colegio contra producción (como `scripts/estres/contar.ts`).
3. Abrir la app contra esa BD y verificar el inicio de sesión de un usuario de prueba.
4. Restaurar 10 archivos al azar desde R2 y comparar sus *hashes*.
5. Borrar el entorno del simulacro y anotar en el acta la fecha, la duración, los problemas y las acciones.

### A.7 Riesgos

- **Datos de menores en copias:** cada copia es otro lugar donde puede filtrarse. Siempre cifrada, con acceso mínimo y retención limitada. Debe constar en el registro del banco de datos y en el contrato (encargados de tratamiento, transferencia internacional: Brasil y la región de R2). Revisión legal pendiente.
- **Un respaldo que nunca se probó no es un respaldo:** de ahí el simulacro trimestral.
- **Restaurar retrocede a todos los colegios**, porque la BD es multitenant. Hay que comunicarlo bien.
- **Avisos duplicados** al reprocesar la cola tras restaurar: revisar los `avisos` en estado `enviando` o `pendiente` antes de reanudar.
- **Pérdida de la cuenta** (Supabase o Cloudinary): sin A1 y F1 no hay plan B. Activar 2FA y tener al menos dos administradores en cada servicio.
- **Claves VAPID y `APP_SECRET`:** si se pierden, se invalidan los push y los enlaces firmados (tokens de justificación).

---

## B. Exportación institucional

### B.1 Qué existe hoy (`src/lib/server/exportar.ts`, specs/15)

| Aspecto | Estado actual |
|---|---|
| Quién la pide | **Dirección** del colegio en `/configuracion/exportar`, o el equipo Khipu desde el panel de plataforma |
| Proceso | En segundo plano: fila `pendiente` en `exportaciones_colegio`, procesada al momento con `after()` y, como respaldo, por el cron `/api/cron/exportaciones` (diario). Reserva atómica, recuperación de las colgadas (> 15 min) y 3 intentos |
| Contenido del ZIP | `colegio.json`; `tablas/<tabla>.json`, un archivo por tabla con `tenantId` (la lista sale sola de `Prisma.ModelName`; un test verifica que ninguna tabla quede fuera sin querer); `perfiles` (contacto de los miembros); `archivos/<id>.<ext>` (los que el proveedor entregue; los que fallen se listan en el README); `README.txt` |
| Excluido a propósito | Hashes de tokens y QR (`JustificacionToken`, `CarnetQr`) y la actividad privada de Nudito+ (`NuditoConversacion`, `NuditoMensaje`, `AlertaNudito`, `ResumenNudito`, `UsoNudito`). Sí se exportan las licencias, los pagos y los consentimientos de IA |
| Formatos | **Solo JSON** (más los archivos originales: PDF, JPG, PNG, WEBP, DOCX, XLSX) |
| Memoria | En flujo: lotes de 500 filas, un archivo a la vez y un temporal en `os.tmpdir()`. La memoria pico no depende del tamaño del colegio |
| Entrega | Se guarda como `Archivo` privado (`application/zip`) en el proveedor. Descarga en `GET /api/exportar/<id>`, solo dirección, con auditoría; en Cloudinary o S3 redirige a una URL firmada de 5 min |
| Vencimiento | **El ZIP se borra a los 7 días** (`EXPORTACION_VENCE_DIAS`); la fila queda como «Vencida» |
| Auditoría | `exportar · colegio` al terminar (con conteos) y `exportar · exportacion` en cada descarga |
| Borrado del colegio | Manual: `pnpm khipu:borrar-colegio <slug> --confirmar <slug>` (borra antes los archivos del proveedor). **No hay borrado automático** |

### B.2 Problemas detectados (a verificar en el primer despliegue)

1. **Límite de tamaño de Cloudinary.** El ZIP se sube como un solo archivo. Cloudinary admite **10 MB por archivo en Free y 20 MB en planes pagados** (según su foro: [community.cloudinary.com](https://community.cloudinary.com/discussion/comment/1707), **a verificar**). Un colegio de 100 alumnos ya tiene ~300 MB de archivos al año: con archivos, la exportación terminaría en `error`.
2. **`/tmp` de Vercel: 500 MB** (**a verificar** con Fluid compute). Un colegio de 300 alumnos o más supera ese tamaño en un año.
3. **Duración: 300 s** por defecto (hasta 800 s en Pro). Descargar y comprimir varios GB de Cloudinary uno por uno puede no caber.
4. **Formato solo JSON:** sirve para migrar a otro sistema, pero un colegio no puede abrirlo en Excel.
5. **Vencimiento de 7 días** y cron diario: suficiente para el uso diario, pero no es una «garantía de salida» al terminar el contrato.

### B.3 Propuesta: exportación completa

**Contenido** (solo los datos que el colegio está autorizado a recibir; las mismas exclusiones de hoy):

| Parte | Formato | Detalle |
|---|---|---|
| Datos | **JSON** (uno por tabla, como hoy) **+ CSV** (UTF-8 con BOM, separador `,`, protección contra fórmulas como en `aCsv`) | El JSON sirve para migrar a otro sistema y el CSV para abrirlo en Excel. Un `diccionario.csv` describe cada tabla y columna en español |
| Vistas legibles | CSV | Las que un colegio usa: alumnos con apoderados, asistencia por alumno y día, notas por periodo y curso, justificaciones, comunicados, documentos. Ya existen consultas parecidas en los reportes |
| Documentos oficiales | **PDF** | Libretas publicadas de cada periodo y alumno, reporte de asistencia anual por salón y consolidados de notas. Se generan con los mismos componentes `@react-pdf` |
| Archivos | Originales | `archivos/<carpeta>/<id>-<nombre>`, con `archivos/indice.csv` (id, nombre, tipo, tamaño, a qué pertenece, SHA-256) |
| Control | `manifiesto.json` + `LEEME.txt` | Fecha, colegio, versión del esquema, conteos por tabla, SHA-256 de cada parte, exclusiones y su motivo |

**Partes:** en lugar de un solo ZIP, un **paquete de datos** (JSON + CSV + PDF; pocos MB) y **paquetes de archivos de ≤ 1–2 GB** cada uno, armados uno por invocación del worker. Así no se pasa de `/tmp` ni de la duración máxima.

**Dónde guardarla:** fuera de Cloudinary, por su límite de tamaño:
- **Opción 1:** un bucket S3 o R2 privado solo para exportaciones, con `S3Storage` (ya existe), sin migrar el resto de archivos. **Recomendada.**
- **Opción 2:** Supabase Storage (100 GB incluidos en Pro; límite por archivo **a verificar**). Exige un proveedor `FileStorage` nuevo.

**Quién la solicita:**
- **Durante el contrato:** dirección, como hoy (copias periódicas, cuando quiera).
- **Al terminar el contrato:** el **representante legal o la dirección** del colegio, por escrito (correo o el formulario de la mesa de ayuda, specs/23). El equipo Khipu la prepara desde el panel de plataforma y la deja auditada.
- Las familias **no** reciben la exportación institucional. Su derecho de acceso (Ley 29733) es un flujo distinto, todavía no implementado.

**Cómo se entrega:**
- Un enlace de descarga en `/configuracion/exportar`, solo para dirección, con URL firmada de corta duración (5 min por clic) y auditoría de cada descarga.
- Al terminar el contrato, la cuenta de dirección pasa a **solo lectura con acceso únicamente a la exportación** durante el plazo de abajo.
- Un correo a dirección cuando la exportación está lista, sin adjuntos y con un enlace a la página.
- Opcional: entregarla en un medio físico cifrado, con la contraseña por otro canal, si el colegio lo pide.

**Plazo propuesto (sujeto a revisión legal):**
- El colegio puede pedir y descargar su exportación completa **durante 60 días calendario desde el fin del contrato**.
- Mientras dure ese plazo, los paquetes de la exportación final no vencen a los 7 días: se conservan hasta el día 60.
- **No se implementa eliminación automática por vencimiento.** Al día 60 el sistema **no borra nada solo**: el colegio queda marcado como «plazo de exportación vencido» y el equipo Khipu ejecuta el borrado manual (`khipu:borrar-colegio`, con su confirmación) solo tras una confirmación escrita del colegio o la decisión documentada del responsable, y lo registra en `auditoria_plataforma`.
- Los respaldos (A1, PITR) que contengan datos del colegio borrado vencen por su propia rotación (≤ 12 meses en A1). Hay que decirlo en el contrato y en la política de privacidad.

### B.4 Qué falta implementar

1. **Guardar la exportación fuera de Cloudinary** (bucket S3/R2 de exportaciones vía `S3Storage`) o en partes que quepan en el límite. *Bloqueante en producción.*
2. **Paquetes por partes** (datos + archivos en bloques de ≤ 1–2 GB), con un worker que avance una parte por invocación y retome donde quedó.
3. **CSV por tabla y `diccionario.csv`**, más vistas legibles (alumnos-apoderados, asistencia, notas).
4. **PDF de documentos oficiales** (libretas publicadas por periodo, reporte anual de asistencia y consolidados) generados en segundo plano.
5. **`manifiesto.json` con SHA-256** e `indice.csv` de archivos.
6. **Exportación de fin de contrato:** estado del contrato en `Tenant` o en la suscripción (specs/20), modo de solo lectura con acceso a la exportación, plazo de 60 días y paquetes que no vencen a los 7 días.
7. **Marca de «plazo vencido»** y aviso al equipo Khipu en `/monitoreo`. **Sin borrado automático.**
8. **Cron de exportaciones más frecuente** (cada 5–15 min con Vercel Pro) para que las partes avancen sin esperar al día siguiente.
9. **Script de extracción de un solo colegio** desde un volcado (para la restauración del caso 2 y como base de una exportación SQL opcional).
10. **Acceso a datos de la familia** (derecho ARCO): flujo aparte, incluida la actividad de Nudito+ que hoy se excluye. Pendiente de definir con un abogado.
11. Texto legal: cláusula de devolución y borrado en el contrato, plazo de 60 días, retención de respaldos y encargados de tratamiento. **Externo: abogado.**
12. Tests: partes y reanudación, CSV contra JSON (mismos conteos), manifiesto y hashes, fin de contrato y solo lectura, y que nada se borre solo.

Al implementar cualquiera de estos puntos hay que actualizar `specs/15` (y `specs/14` si cambia el almacenamiento) en el mismo commit.

### B.5 Respaldos operativos: qué falta implementar

1. Job de `pg_dump` diario cifrado hacia R2/S3, con alerta si falla (Sentry Cron Monitor o heartbeat).
2. Job semanal de copia de archivos a R2/S3 (F1).
3. Procedimiento escrito y acta del primer simulacro de restauración.
4. Inventario de secretos (VAPID, `APP_SECRET`, `CRON_SECRET`) en un gestor de secretos del equipo, con dos administradores.
5. Decisión sobre PITR. **No aprobado.**
