# 45 — Almacenamiento centralizado, carga directa, cuotas y observabilidad

> Estado: especificación (Etapa 2 SDD, sin implementar) · Plan: Khipu Pro (Base: solo medición, ver «Decisiones pendientes») · Actualizado: 2026-11-07 · Diagnóstico: `docs/documentos-diagnostico-2026-11.md` · Plan de trabajo: `docs/documentos-plan-implementacion.md` (flujo W1)

## Objetivo

Un solo punto que **mide, limita y entrega** todos los archivos del colegio (Documentos, materiales y entregas de Tareas, solicitudes documentales, comunicados, mesa de ayuda, reuniones, justificaciones, fotos, exportaciones), con carga directa al proveedor, cuota compartida por colegio y métricas sin consultas periódicas. Extiende `specs/14`; no cambia de proveedor ni crea una abstracción nueva.

## Proveedor de almacenamiento (decisión técnica)

**Vigente en el repositorio:** interfaz `FileStorage` con `local` (desarrollo y pruebas), `cloudinary` (piloto) y `s3` (implementado, compatible con endpoints propios). Supabase se usa solo para Auth (`AGENTS.md`); `docs/respaldos-y-exportacion.md` y `docs/infraestructura-y-costos.md` ya apuntan a «mover los archivos con `S3Storage`» y a R2 para copias.

**Recomendación:**
1. **No agregar proveedor ni migrar la abstracción.** Se extiende `FileStorage` con tres métodos opcionales (abajo). Se implementan para `local` y `s3`. Cloudinary no los implementa (queda con el camino por servidor, tope 4 MB en Vercel) porque su plan Free limita a 10 MB por archivo y el encargo pide 25 MB.
2. **Documentos, materiales, entregas y solicitudes nuevos se guardan con `STORAGE_PROVIDER=s3` (S3-compatible).** Por archivo se guarda `Archivo.proveedor`: lo ya subido a Cloudinary sigue funcionando y se puede migrar con `scripts/migrar-archivos.ts`.
3. **Endpoint:** el encargo prioriza Supabase Storage. Supabase Storage expone un **endpoint S3-compatible**, así que se puede usar con `S3_ENDPOINT` **sin código nuevo** (100 GB incluidos en Pro, ~USD 0,0213/GB extra). R2 (~USD 0,015/GB, sin cargo por egress) es la alternativa y ya es el destino recomendado de respaldos. Orden propuesto: **piloto con Supabase Storage vía S3 (consolida el proveedor ya contratado) y R2 solo para copias y exportaciones**; revisar si la descarga de materiales crece (egress). Es una elección de configuración reversible.
4. **A verificar antes de producción (externo, requiere cuenta real; no se hizo aquí):** que el endpoint elegido acepte URL prefirmadas `PUT` con `Content-Length` firmado, el CORS del bucket (origen `https://*.<dominio>`, método `PUT`), el límite de tamaño por objeto (≥ 25 MB) y la política de bucket privado.
5. **Decisión pendiente del dueño:** confirmar proveedor y región definitivos (afecta contrato y transferencia internacional de datos de menores).

### Extensión de `FileStorage` (contrato)

```ts
// src/lib/server/storage/tipos.ts  (propietario: W1)
export type SubidaPrefirmada = {
  publicId: string;                       // clave generada por el servidor: khipu/<tenantId>/<carpeta>/<uuid>.<ext>
  url: string;                            // destino del PUT
  metodo: "PUT";
  headers: Record<string, string>;        // Content-Type y Content-Length firmados
  expiraAt: Date;                         // 10 min
};
export interface FileStorage {
  // ...métodos existentes...
  /** Opcional. Sin él, el flujo usa el camino por servidor. */
  prepararSubida?(o: OpcionesSubida & { bytes: number; extension: string }): Promise<SubidaPrefirmada>;
  /** Opcional. HEAD del objeto: tamaño real y tipo declarado, o null si no existe. */
  inspeccionar?(publicId: string): Promise<{ bytes: number; contentType: string | null } | null>;
  /** Opcional. Lectura parcial/completa para validar firma e interior ZIP al confirmar. */
  leerRango?(publicId: string, desde: number, hasta: number): Promise<Buffer>;
}
```
`local` implementa la subida con una ruta interna firmada por HMAC (`PUT /colegio/[slug]/api/almacenamiento/local/<token>`) para que desarrollo y e2e ejerzan el mismo flujo.

## Roles y permisos

| Operación | Dirección | Administrativo | Profesor | Alumno / apoderado | Portería |
|---|---|---|---|---|---|
| Iniciar subida (según categoría) | Todas las de personal | Documentos y borradores | Materiales, borradores, solicitudes asignadas, materiales de tarea | **Solo entregas de su tarea** (categoría crítica) | No |
| Ver su consumo / el del colegio | Colegio completo | No | Su cuota de borradores | No | No |
| Cambiar límites | No (solo equipo Khipu en panel de plataforma) | No | No | No | No |
| Ver métricas por colegio | — | — | — | — | — (solo plataforma) |

La autorización **por propósito** (¿este docente puede subir a ese curso?) la hace el flujo dueño (Materiales, Tareas, Solicitudes, Documentos) **antes** de llamar a `iniciarSubida`; el servicio central valida rol, plan, límites y cuota, y ata la subida a `tenantId` y `membershipId`.

## Requisitos funcionales

- **RF-A1** Todo archivo nuevo se registra con `categoria` y se cuenta en la cuota del colegio.
- **RF-A2** Carga directa: autenticar → autorizar propósito → validar tipo/tamaño declarados → **reservar cuota** → URL prefirmada → `PUT` desde el navegador → **confirmar** → validar → registrar `Archivo` → convertir la reserva en uso.
- **RF-A3** Si el proveedor no soporta carga directa, el mismo contrato cae al camino por servidor (`guardarArchivoCentral`), también con reserva de cuota.
- **RF-A4** La confirmación verifica tamaño real (`inspeccionar`), tipo real por firma (`detectarMimeAdjunto`; para DOCX/XLSX/PPTX/ODT lee el objeto completo, máx. 25 MB, dentro del servidor, nunca por el cliente) y que el objeto pertenezca a la subida del usuario.
- **RF-A5** Subidas abandonadas o fallidas liberan su reserva y borran el objeto (barrido diario y al reintentar).
- **RF-A6** Reintento: repetir el `PUT` con la misma URL es idempotente; si la URL venció, `iniciarSubida` crea otra y cancela la anterior.
- **RF-A7** Descarga: la ruta estable `/archivos/<id>` verifica permisos y redirige a una URL temporal. Expiración **300 s** para materiales, documentos, comunicados y exportaciones; **60 s** para entregas, solicitudes, justificaciones, fotos de alumnos y cualquier archivo marcado sensible. `Cache-Control: private, no-store`. Nunca se emite URL sin pasar por `requireArchivoVisible`.
- **RF-A8** Borrado físico descuenta de la cuota; borrado lógico (papelera) **no**.
- **RF-A9** Un archivo se almacena **una vez**; cualquier otro uso es una referencia (fila de enlace), nunca una copia.
- **RF-A10** Alertas de cuota a 70 %, 85 % y 95 % hacia dirección (bandeja y push, `specs/38`) y registro en auditoría; al 100 % se bloquean las subidas ordinarias.
- **RF-A11** Reserva para operaciones críticas (ver abajo).
- **RF-A12** Métricas por colegio, categoría y día sin consultas periódicas.
- **RF-A13** Límites configurables desde backend por colegio, con valores por defecto del encargo.

## Requisitos no funcionales

- **RNF-A1** Concurrencia: dos cargas simultáneas nunca superan el límite (una sola sentencia atómica por reserva).
- **RNF-A2** Ningún binario pasa por funciones de Next en el camino directo; ningún binario en PostgreSQL.
- **RNF-A3** Aislamiento: claves de objeto con `tenantId` generado por el servidor; el cliente nunca elige clave ni `tenantId`. Tablas nuevas con RLS cerrado.
- **RNF-A4** Sin polling: contadores actualizados por evento; un barrido diario por cron (ya existen crons diarios en `vercel.json`; **a verificar** el plan de Vercel antes de añadir uno).
- **RNF-A5** Contadores en `bigint`; el reporte nunca presenta tráfico estimado como tráfico facturado.
- **RNF-A6** Reconciliación semanal que recalcula `usado` desde `archivos` y corrige deriva (se registra la diferencia).

## Modelo de datos

Migración W1 `20261116090000_almacenamiento_cuotas` (solo aditiva).

```prisma
enum CategoriaArchivo {
  documento material_clase material_tarea entrega solicitud borrador
  comunicado soporte justificacion reunion foto logo nudito exportacion otro
}
enum EstadoSubida { pendiente confirmada fallida expirada cancelada }

// columnas nuevas en Archivo
//   categoria CategoriaArchivo @default(otro)
//   sha256    String?  // opcional, integridad (exportación e índice)
// índice: (tenant_id, categoria), (tenant_id, subido_por, categoria)

model AlmacenamientoColegio {          // 1 fila por colegio, "almacenamiento_colegio"
  tenantId               String  @id @db.Uuid
  limiteBytes            BigInt?        // null = solo medir (p. ej. Base hasta decidir)
  usadoBytes             BigInt  @default(0)
  reservadoBytes         BigInt  @default(0)
  reservaCriticaPct      Int     @default(5)     // % del límite solo para categorías críticas
  maxBytesDocumento      Int     @default(26214400)   // 25 MB
  maxBytesEntrega        Int     @default(10485760)   // 10 MB
  maxArchivosEntrega     Int     @default(3)
  cuotaBorradorBytes     BigInt  @default(2147483648) // 2 GB por persona
  purgaAutomaticaActiva  Boolean @default(false)      // papelera >30 d; apagada hasta aprobación
  umbralNotificado       Int     @default(0)          // 0, 70, 85, 95
  actualizadoAt          DateTime @updatedAt
}
model UsoAlmacenamientoCategoria {     // "uso_almacenamiento_categoria", unique(tenantId, categoria)
  id String @id @default(uuid()) @db.Uuid; tenantId String @db.Uuid
  categoria CategoriaArchivo; bytes BigInt @default(0); archivos Int @default(0)
}
model SubidaArchivo {                  // "subidas_archivo" (efímera; fuera de la exportación)
  id String @id @default(uuid()) @db.Uuid; tenantId String @db.Uuid; membershipId String @db.Uuid
  categoria CategoriaArchivo; critica Boolean @default(false)
  nombre String; mimeDeclarado String; bytesDeclarados Int
  proveedor ProveedorArchivo; publicId String
  estado EstadoSubida @default(pendiente); reservaBytes BigInt
  contexto Json?                       // lo que el flujo dueño necesite devolver al confirmar
  archivoId String? @db.Uuid; error String?
  expiraAt DateTime; createdAt DateTime @default(now()); confirmadaAt DateTime?
  // índices: (tenantId, estado, expiraAt)
}
model MetricaAlmacenamientoDia {       // "metricas_almacenamiento_dia", unique(tenantId, dia, categoria)
  id String @id @default(uuid()) @db.Uuid; tenantId String @db.Uuid; dia DateTime @db.Date
  categoria CategoriaArchivo
  subidas Int @default(0); bytesSubidos BigInt @default(0)
  borrados Int @default(0); bytesBorrados BigInt @default(0)
  descargas Int @default(0); bytesDescargaEstimados BigInt @default(0)
  rechazosCuota Int @default(0); subidasFallidas Int @default(0)
}
```

Backfill (misma migración, SQL): `categoria` desde los FK existentes (`documento_id` → `documento`, `tarea_id` → `material_tarea`, `entrega_id` → `entrega`, `comunicado_id` → `comunicado`, `mensaje_soporte_id` → `soporte`, `reunion_id` → `reunion`, `nudito_sesion_id` → `nudito`, justificación/foto/logo/exportación por su referencia); una fila `almacenamiento_colegio` por colegio con `usado = SUM(bytes)`; la cuota provisional por rango de alumnos se aplica solo a colegios Pro (ver tabla), los Base quedan en `limite = null`.

### Límites por rango (provisional, Pro; validar en el piloto)

| Alumnos activos | Límite |
|---|---|
| 1–100 | 20 GB |
| 101–300 | 60 GB |
| 301–600 | 120 GB |
| 601–1000 | 250 GB |
| > 1000 | personalizado (`limiteBytes` manual) |

Función pura `limitePorDefecto(alumnosActivos)` en `src/lib/almacenamiento.ts`; **no** son constantes de negocio: se escriben en `almacenamiento_colegio.limite_bytes` y el equipo Khipu las cambia desde plataforma. No se recalculan solas al cambiar la matrícula.

## Cuotas: reserva atómica

```sql
-- reservar (devuelve 0 filas si no cabe)
UPDATE almacenamiento_colegio
   SET reservado_bytes = reservado_bytes + $n
 WHERE tenant_id = $t
   AND (limite_bytes IS NULL
        OR usado_bytes + reservado_bytes + $n
           <= limite_bytes - CASE WHEN $critica THEN 0
                                  ELSE (limite_bytes * reserva_critica_pct / 100) END)
RETURNING *;
```
La fila queda bloqueada durante el `UPDATE`: cargas simultáneas se serializan y la segunda ve el espacio ya reservado. `confirmar`: `usado += real; reservado -= reserva` (+ upsert en `uso_almacenamiento_categoria`, `metricas_almacenamiento_dia`). `cancelar/expirar`: `reservado -= reserva`. `liberarArchivo`: `usado -= bytes`. El cálculo de umbral ocurre en la misma transacción; al cruzar hacia arriba un umbral mayor que `umbralNotificado` se notifica a dirección una sola vez; vuelve a armarse al bajar 5 puntos por debajo (histéresis). Si se usó el espacio de reserva (`usado + reservado > límite − reserva`), se avisa a dirección «solo quedan entregas de alumnos».

**Reserva crítica (propuesta, por defecto 5 %; decisión pendiente):** las categorías críticas son `entrega` y, para su autor, `material_tarea` publicado en el día; pueden usar el espacio reservado. Al 100 % absoluto se bloquea todo con el mensaje «El colegio alcanzó su espacio. Avisa a dirección», y dirección ya recibió alertas a 70/85/95 y a la entrada en reserva. Nadie queda sin advertencia previa.

**Cuota de borradores (2 GB por persona):** `SUM(bytes) WHERE subido_por = X AND categoria = 'borrador'` (incluye papelera). Se valida en `iniciarSubida` además de la cuota del colegio. Está **dentro** del total del colegio.

**Qué cuenta:** todas las categorías excepto `exportacion` (se mide pero no bloquea ni cuenta contra el límite: es temporal, 7 días, y la genera el sistema) y `logo`/`foto` (cuentan; son mínimos). Versiones históricas y papelera cuentan. Archivar no libera espacio.

## Carga directa: flujo y contratos

```ts
// src/lib/server/almacenamiento/index.ts  (W1)
export type EntradaSubida = {
  categoria: CategoriaArchivo;
  nombre: string;               // se limpia con limpiarNombre
  bytes: number;
  mimeDeclarado: string;
  contexto?: Record<string, string>;   // ids que el flujo dueño recuperará al confirmar
};
export type SubidaIniciada = SubidaPrefirmada & { subidaId: string; directa: boolean };

export function limitesDe(ctx): Promise<LimitesAlmacenamiento>;
export function iniciarSubida(ctx: TenantContext, e: EntradaSubida): Promise<SubidaIniciada>;
export function confirmarSubida(ctx: TenantContext, subidaId: string): Promise<{ archivo: Archivo; contexto: Record<string,string> | null }>;
export function cancelarSubida(ctx: TenantContext, subidaId: string): Promise<void>;
/** Camino por servidor (proveedor sin carga directa o archivos pequeños): mismas reglas y cuota. */
export function guardarArchivoCentral(ctx, buf: Buffer, e: Omit<EntradaSubida,"bytes"|"mimeDeclarado">): Promise<Archivo>;
/** Borrado físico: borra del proveedor, elimina la fila, descuenta cuota. Falla si el archivo está referenciado (ver specs/31). */
export function liberarArchivo(ctx, archivoId: string): Promise<void>;
export function recategorizarArchivo(ctx, archivoId, nueva: CategoriaArchivo): Promise<void>; // p. ej. borrador → material_clase
export function barrerSubidasVencidas(ahora?: Date): Promise<{ expiradas: number; liberadosBytes: bigint }>;
export function reconciliarCuotas(tenantId?: string): Promise<{ tenantId: string; diferenciaBytes: bigint }[]>;
export function segundosUrl(c: CategoriaArchivo): number;            // 60 | 300
export function resumenAlmacenamiento(ctx): Promise<ResumenAlmacenamiento>;
```
Reglas en `confirmarSubida`: la subida debe ser del mismo `tenantId` y `membershipId`, estado `pendiente`, no vencida; `inspeccionar` devuelve tamaño igual al declarado; el tipo detectado debe estar permitido para la categoría y coincidir con la extensión; si falla, estado `fallida`, objeto borrado, reserva liberada y error claro. Idempotente: confirmar dos veces devuelve el mismo `Archivo`. El `Archivo` se crea sin dueño; el flujo dueño crea su fila de enlace y, si falla, llama a `liberarArchivo` (compensación).

Cliente (`src/lib/subida-directa.ts`, W1): `subirDirecto(file, { iniciar, confirmar, onProgreso, signal })` usa XHR (progreso), reintenta el `PUT` hasta 3 veces con espera creciente y devuelve el resultado de `confirmar`. Cada flujo aporta sus propias server actions `iniciar…Action`/`confirmar…Action` (envuelven al servicio y su autorización).

Reanudable (multipart/TUS): **fuera de alcance** (archivos ≤ 25 MB, sin videos). Se reevalúa si se permiten archivos mayores.

Tipos permitidos por categoría: base `MIMES_BASICOS` (PDF, JPG, PNG, WEBP, DOCX, XLSX); `material_clase`, `material_tarea`, `entrega`, `solicitud`, `borrador` añaden PPTX y ODT (como Tareas). Ejecutables, scripts, HTML y archivos comprimidos genéricos se rechazan por no estar en la lista blanca. Límites por defecto: documentos de personal 25 MB, entregas 10 MB × 3 archivos, comunicados y resto 10 MB; todo desde `almacenamiento_colegio`.

## Observabilidad (sin polling)

Se mide por evento y se agrega por día; no hay consultas que recorran `archivos` en cada vista.

| Métrica | Fuente |
|---|---|
| Almacenamiento total y % de cuota | `almacenamiento_colegio` |
| Por categoría, cantidad de archivos y tamaño promedio | `uso_almacenamiento_categoria` (`bytes / archivos`) |
| Crecimiento mensual | suma mensual de `bytesSubidos − bytesBorrados` en `metricas_almacenamiento_dia` |
| Solicitudes de descarga y volumen **estimado** | `descargas` y `bytesDescargaEstimados` (suma de `Archivo.bytes` al emitir la URL; es un estimado de demanda, no tráfico facturado) |
| Rechazos por cuota, subidas fallidas | `rechazosCuota`, `subidasFallidas` |

Se debe sacar del **panel del proveedor** (no se reproduce en Khipu): tráfico de salida facturado (egress), almacenamiento facturado real y objetos huérfanos. `resumenAlmacenamientoPlataforma()` alimenta una sección en `plataforma/monitoreo` (a verificar la estructura de esa página) y dirección ve su resumen en `/configuracion/almacenamiento`. Auditoría: se audita fila a fila la descarga de `entrega`, `solicitud`, `justificacion`, documentos restringidos y borrados físicos; las descargas de materiales de clase solo suman métricas.

## Retención, papelera y archivado

Estados de un archivo: **activo** (su dueño está activo), **archivado** (dueño archivado por año o por dirección; sigue ocupando espacio), **eliminado lógicamente** (dueño en papelera; sigue ocupando espacio 30 días) y **eliminado físicamente** (fila y objeto borrados; libera espacio). Reglas:
- Papelera: 30 días de recuperación (existente). La purga física automática (`purgarPapeleraVencida`, diaria) está **apagada por defecto** (`purgaAutomaticaActiva = false`) hasta la decisión legal.
- **Nunca** se purga automáticamente: documentos `oficial`, versiones de solicitudes (cualquier estado), materiales referenciados por tareas, entregas de tareas, ni archivos de un colegio en ventana de salida.
- Salida de un colegio: 60 días para exportar (sujeto a revisión legal); no hay borrado automático (existente: `khipu:borrar-colegio`).
- `limpiar-archivos` se corrige: la heurística de huérfanos solo considera `categoria = 'otro'` o categorías heredadas y **excluye** `entregaId`, `reunionId`, `nuditoSesionId`; las categorías nuevas se limpian solo por `subidas_archivo`.

## Casos de uso

- **CU-A1** Docente sube un PDF de 18 MB: `iniciarSubida` reserva, el navegador hace `PUT` con barra de progreso, `confirmarSubida` valida y registra.
- **CU-A2** El colegio está al 96 %: un profesor intenta subir un borrador y recibe «sin espacio»; un alumno entrega y funciona (reserva crítica); dirección ya fue avisada a 70/85/95.
- **CU-A3** El navegador se cierra tras iniciar: la subida vence; el barrido libera la reserva y el objeto.
- **CU-A4** Dos alumnos entregan a la vez con 12 MB libres y 10 MB cada uno: solo una reserva cabe; la otra recibe error claro y puede reintentar.

## Criterios de aceptación

1. Con `limite = 100 MB`, 10 `iniciarSubida` concurrentes de 20 MB reservan exactamente 5.
2. Una subida con tamaño real distinto del declarado o tipo distinto del permitido falla, borra el objeto y libera la reserva.
3. `liberarArchivo` baja `usado` en `bytes`; una papelera no lo baja.
4. Un usuario de otro colegio o distinto `membershipId` no puede confirmar ni cancelar una subida ajena.
5. Entregas y solicitudes emiten URLs de 60 s; materiales, 300 s; sin permiso no se emite URL.
6. Umbrales 70/85/95 se notifican una sola vez por subida del umbral.
7. El backfill deja `usado` igual a `SUM(bytes)` por colegio y toda fila con categoría.
8. La exportación sigue pasando su prueba de cobertura de tablas.

## Estrategia de pruebas

- unit: `limitePorDefecto`, `segundosUrl`, umbrales con histéresis, tipos por categoría, nombre de clave.
- integración (BD local, proveedor `local`): reserva atómica concurrente (`Promise.all`), confirmar/cancelar/expirar, falla antes de completar (prueba 10), cuota alcanzada (8), carreras por el espacio restante (9), reserva crítica, aislamiento entre colegios (6), reconciliación, limpiador sin falsos positivos, métricas.
- unit con S3 simulado: `prepararSubida`, `inspeccionar`, expiración de URLs.
- e2e: subir un PDF por carga directa local y verlo; cuota llena muestra el aviso.

## Decisiones pendientes (comercial/legal)

1. Cuotas por rango y reserva crítica del 5 % (provisionales).
2. Cuota y límites del plan Base (hoy solo se mide; `limite = null`).
3. Proveedor y región definitivos y transferencia internacional.
4. Retención y purga física automática; plazo de conservación de solicitudes aprobadas y documentos oficiales.
5. Si el almacenamiento excedente se cobra o solo se bloquea.
6. Máximo de versiones por material y por solicitud.
