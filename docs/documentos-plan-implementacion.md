# Plan de implementación: reestructuración de Documentos (Etapa 3 de SDD) · 2026-11-07

Base: `specs/31`, `specs/45`, `specs/46`, `specs/39` y `docs/documentos-diagnostico-2026-11.md`. Cuatro flujos paralelos para cuatro agentes Codex, cada uno en su worktree (`khipu-wt/<rama>`), con **propiedad de archivos disjunta**. Nada de nube, push, deploy ni migraciones remotas: todo es local. Cada flujo actualiza su spec en el mismo commit y deja su archivo de `conversaciones/` (norma del repo); esta etapa no lo crea.

Clasificación de tareas: **R** reutilización · **M** modificación · **N** nueva · **MIG** migración · **T** prueba · **D** documentación.

Correspondencia con la prioridad de la Etapa 4: 1 repositorio centralizado → W1 · 2 organización académica → W2 · 3 biblioteca y permisos → W4 · 4 archivos reutilizados en Tareas → W2 · 5 cuotas y monitoreo → W1 · 6–8 solicitudes, versiones, revisión, reportes → W3.

## 0. Paso 0 (orquestador, antes de lanzar los flujos): contratos y centinelas

Un commit pequeño en una rama `docs-base` que parte de `dev` y que todas las ramas de trabajo usan como base. Sin migraciones ni modelos nuevos.

| Tarea | Clase | Contenido |
|---|---|---|
| P0-1 | M | `prisma/schema.prisma`: comentarios centinela `// @@W1`, `// @@W2`, `// @@W3` (separados por una línea en blanco y en puntos distintos) dentro de `Archivo`, `Tenant`, `Membership`, `Curso`, `Tarea`, `Documento`, y al final del archivo cuatro bloques `// ===== W1 =====` … `// ===== W4 =====`. Cada flujo inserta sus relaciones inversas solo bajo su centinela |
| P0-2 | N | Contratos con cuerpos provisionales (compilan y permiten desarrollar en paralelo): `src/lib/server/almacenamiento/index.ts` (tipos de `specs/45` y `materializarArchivos`, ver §W1; los cuerpos delegan en el camino actual `guardarAdjuntos` **sin cuota**), `src/lib/server/materiales/index.ts` y `src/lib/server/solicitudes/index.ts` (firmas de §W2/§W3; devuelven vacío o lanzan «no implementado»), `src/lib/server/archivos-acceso/{tipos,material,solicitud}.ts` (resolvedores que devuelven `null`) |
| P0-3 | N | Nombres de plantillas de aviso en la bandeja (`material_nuevo`, `solicitud_nueva`, `solicitud_observada`, `solicitud_aprobada`, `solicitud_version`, `cuota_umbral`) en el registro de plantillas (`src/lib/server/email/plantillas.ts`, **a verificar su estructura**) con texto provisional |
| P0-4 | D | `.env.example` / nota: cada worktree usa su base de datos y su puerto (§Entornos) |

Contrato común para recibir archivos desde cualquier flujo (lo implementa W1, lo consumen W2, W3 y W4):

```ts
export type EntradaArchivo = { nombre: string; buffer: Buffer } | { subidaId: string };
/** Resuelve cada entrada (buffer del servidor o subida directa confirmada), aplica cuota y categoría y devuelve filas `Archivo` sin dueño. */
export function materializarArchivos(ctx: TenantContext, categoria: CategoriaArchivo, entradas: EntradaArchivo[], opciones?: { critica?: boolean; maxArchivos?: number }): Promise<Archivo[]>;
```
El flujo dueño crea su fila de enlace con esos `Archivo`; si falla, llama a `liberarArchivo` (compensación). Resolvedores de acceso (los llama `requireArchivoVisible`):

```ts
// src/lib/server/archivos-acceso/tipos.ts
export type ResultadoAcceso = "permitir" | "denegar" | null;   // null = no es mío, pregunta al siguiente
export type ResolverAcceso = (ctx: TenantContext, archivo: Archivo) => Promise<ResultadoAcceso>;
```

## Entornos y ejecución en paralelo

- **Una base por worktree.** El Supabase local es único y las migraciones de ramas distintas chocarían. Cada agente crea su base (por ejemplo `khipu_w1`…`khipu_w4`) como copia de la base ya sembrada (`CREATE DATABASE … TEMPLATE …`), apunta `DATABASE_URL`/`DIRECT_URL` de su `.env` y corre `pnpm db:deploy`. **A verificar** que los tests de integración y `auth.users` funcionen con una base copiada; si no, usar un esquema aparte o turnos.
- **Puertos e2e distintos:** W1 3061, W2 3062, W3 3063, W4 3064 (el de referencia es 3060). `.next` propio por worktree.
- Comandos mínimos por tarea: `pnpm typecheck`, `pnpm lint`, el `vitest` del archivo tocado; suite completa y e2e solo al cerrar el flujo. No reportar pruebas no ejecutadas.

## W1 — Almacenamiento, cuotas y observabilidad (backend + migración propia)

Rama `docs-w1-almacenamiento` · migración **`20261116090000_almacenamiento_cuotas`** · spec: `specs/45`, `specs/14` (sección de carga directa).

### Tareas (en orden)

| ID | Clase | Tarea | Depende de |
|---|---|---|---|
| W1-1 | MIG, N | Enums `CategoriaArchivo`, `EstadoSubida`; columnas `Archivo.categoria`, `Archivo.sha256`; tablas `almacenamiento_colegio`, `uso_almacenamiento_categoria`, `subidas_archivo`, `metricas_almacenamiento_dia` (bigint, RLS cerrado, `REVOKE`); backfill de categoría por FK, una fila por colegio con `usado = SUM(bytes)` y límite provisional por rango solo para colegios Pro | P0 |
| W1-2 | N, T | `src/lib/almacenamiento.ts` (puro): `limitePorDefecto`, umbrales con histéresis, tipos por categoría, `segundosUrl`. Pruebas unit | W1-1 |
| W1-3 | N, T | `almacenamiento/cuotas.ts`: `reservar`, `confirmarUso`, `liberarReserva`, `descontar` con la sentencia atómica de `specs/45`; reserva crítica; cuota de borradores por persona. Pruebas de concurrencia (8, 9) | W1-1, W1-2 |
| W1-4 | M, T | Extender `FileStorage` (`prepararSubida`, `inspeccionar`, `leerRango`); implementar en `s3.ts` (URL prefirmada `PUT` con `Content-Length` firmado) y `local.ts` (ruta firmada HMAC). Cloudinary: sin carga directa. Prueba unit con S3 simulado | W1-1 |
| W1-5 | N | `app/colegio/[slug]/api/almacenamiento/local/[token]/route.ts` (PUT local con límite de bytes y expiración) | W1-4 |
| W1-6 | N, T | `almacenamiento/subidas.ts`: `iniciarSubida`, `confirmarSubida` (idempotente, valida tamaño, firma e interior ZIP), `cancelarSubida`, `materializarArchivos`, `guardarArchivoCentral`, `liberarArchivo`, `recategorizarArchivo`. Pruebas 6, 10 y aislamiento | W1-3, W1-4 |
| W1-7 | M | `adjuntos.ts` (`guardarAdjuntos`, `quitarAdjuntos`, `borrarArchivos`), `storage/index.ts` (`guardarArchivo`), logo y fotos pasan por el medidor; quitar el límite fijo de 10 MB en favor de `limitesDe` | W1-6 |
| W1-8 | M, T | Refactor `archivos.ts`: `requireArchivoVisible` recorre resolvedores (`archivos-acceso/legado.ts` conserva **tal cual** las reglas actuales; luego `material`, `solicitud`). Prueba de regresión: la matriz actual de accesos no cambia (18) | P0 |
| W1-9 | M | `archivos/[id]/route.ts`: expiración por categoría (60/300 s), métrica de descarga y auditoría solo en categorías sensibles | W1-2, W1-8 |
| W1-10 | N, T | Umbrales 70/85/95: aviso a dirección con `entregarNotificaciones` (plantilla `cuota_umbral`) y `auditar` | W1-3 |
| W1-11 | N, T | `almacenamiento/metricas.ts` (upsert diario por evento) y `resumenAlmacenamiento(ctx)` / `resumenAlmacenamientoPlataforma()` | W1-3 |
| W1-12 | N | Mantenimiento: `barrerSubidasVencidas`, `reconciliarCuotas`, `purgarPapeleraVencida` (respeta `purgaAutomaticaActiva`, exclusiones de `specs/45`); `app/api/cron/almacenamiento/route.ts` + entrada diaria en `vercel.json` (**verificar plan de Vercel** antes) y `scripts/reconciliar-cuotas.ts` | W1-6, W1-11 |
| W1-13 | M, T | Corregir `mantenimiento-archivos.ts` (excluir `entregaId`, `reunionId`, `nuditoSesionId`; heurística solo para `categoria = otro`); prueba que reproduce el borrado indebido y ahora no ocurre | W1-1 |
| W1-14 | M, T | `exportar.ts`: `subidas_archivo` y `metricas_almacenamiento_dia` en `TABLAS_OMITIDAS` con motivo; test de cobertura sigue verde | W1-1 |
| W1-15 | N | `src/lib/subida-directa.ts` (cliente: XHR con progreso, 3 reintentos) | W1-6 |
| W1-16 | N | `configuracion/almacenamiento/page.tsx` (dirección: uso, % y categorías) y sección en `plataforma/monitoreo` (**verificar** estructura): lista de colegios, uso, límite (editable por el equipo Khipu) | W1-11 |
| W1-17 | D | `specs/45`, `specs/14`, `docs/despliegue.md` (variables S3/Supabase, CORS, qué mirar en el panel del proveedor) | todas |

### Archivos
- **Posee (crea):** `src/lib/server/almacenamiento/**`, `src/lib/almacenamiento.ts`, `src/lib/subida-directa.ts`, `src/lib/server/archivos-acceso/{index,legado}.ts`, `src/app/colegio/[slug]/api/almacenamiento/**`, `src/app/api/cron/almacenamiento/route.ts`, `src/app/colegio/[slug]/configuracion/almacenamiento/**`, sección de `src/app/plataforma/monitoreo/` (archivo nuevo + una línea de importación), `scripts/reconciliar-cuotas.ts`, la migración, `tests/unit/almacenamiento*.test.ts`, `tests/integracion/almacenamiento-cuotas.test.ts`, `tests/integracion/archivos-acceso.test.ts`.
- **Posee (modifica):** `src/lib/server/storage/{tipos,index,local,s3}.ts`, `src/lib/server/adjuntos.ts`, `src/lib/server/archivos.ts`, `src/app/colegio/[slug]/archivos/[id]/route.ts`, `src/lib/server/mantenimiento-archivos.ts`, `src/lib/server/exportar.ts`, `src/lib/server/logo.ts`, `src/lib/server/nudito/fotos.ts`, `vercel.json`, `.env.example`, `docs/despliegue.md`, `specs/45`, `specs/14`, `prisma/schema.prisma` (solo bloque `W1` y centinelas `@@W1`).
- **NO debe tocar:** `documentos*.ts`, `src/app/colegio/[slug]/documentos/**`, `tareas/**` y su UI, `materiales/**`, `solicitudes/**`, `archivos-acceso/{material,solicitud}.ts`, `src/lib/navegacion.ts`, `specs/31`, `specs/39`, `specs/46`.

### Contratos que expone
Los de `specs/45` §«Carga directa» (`iniciarSubida`, `confirmarSubida`, `cancelarSubida`, `materializarArchivos`, `guardarArchivoCentral`, `liberarArchivo`, `recategorizarArchivo`, `limitesDe`, `resumenAlmacenamiento`, `segundosUrl`, `barrerSubidasVencidas`, `reconciliarCuotas`), `ResolverAcceso`, `subirDirecto` (cliente).
Consume: nada de W2–W4.

### Terminado cuando
Pruebas 6, 8, 9, 10 y 18 pasan con proveedor `local`; la prueba unit de S3 pasa; el backfill deja `usado = SUM(bytes)`; la matriz de acceso previa no cambia; el limpiador ya no tocaría entregas; `pnpm lint && pnpm typecheck && pnpm test` verdes; spec 45 al día.

## W2 — Materiales de clase e integración con Tareas

Rama `docs-w2-materiales` · migración **`20261116090100_materiales_clase`** · spec: sección «Materiales de clase» de `specs/31` y `specs/39`.

### Tareas

| ID | Clase | Tarea | Depende de |
|---|---|---|---|
| W2-1 | MIG, N | Enum `EstadoMaterial`; tablas `materiales_clase`, `material_secciones`, `material_versiones`, `material_version_archivos`, `tarea_materiales` (RLS cerrado, índices, unicidad, `Archivo` con `Restrict`) | P0 |
| W2-2 | N, T | `src/lib/materiales.ts` (puro): agrupación año → curso → sección, reglas de estado, nombres | — |
| W2-3 | N | `materiales/permisos.ts`: visibilidad SQL acotada (profesor propio; alumno y apoderado por `salonIdsVisibles`/`alumnoDeLaCuenta`; dirección lectura), `cursosGemelos` reutilizado | W2-1 |
| W2-4 | N, T | `materiales/gestion.ts`: `crearMaterial`, `actualizarMaterial`, `nuevaVersionMaterial`, publicar/archivar, papelera, restaurar, `eliminarDefinitivoMaterial` (bloquea si hay `tarea_materiales`). Pruebas 1, 2, 3, 4, 17 | W2-1, P0 |
| W2-5 | N, T | `materiales/vistas.ts`: `listarMateriales` (árbol automático, años anteriores), `opcionesParaCompartir`, detalle con versiones. Prueba 5 | W2-3 |
| W2-6 | N | `archivos-acceso/material.ts`: acceso por sección, o por tarea publicada visible que lo referencia | W2-3 |
| W2-7 | N | `materiales/borradores.ts`: `materialDesdeBorrador` (recategoriza, no copia) | W2-4 |
| W2-8 | N | `notificaciones/avisos-materiales.ts` (opcional «avisar», idempotente) | W2-4 |
| W2-9 | M, T | Tareas: `crearTarea`/`actualizarTarea` aceptan `materialesExistentes`; `vistas.ts` une archivos propios y referenciados; `limitesTarea(ctx)` lee `limitesDe` (3 archivos por entrega); borrar tarea no borra archivos. Prueba 7 y ajuste de `tareas-classroom`, `adjuntos-comunicados-tareas` | W2-4, W1 (`limitesDe`) |
| W2-10 | M | UI de Tareas: selector «Elegir de mis materiales» en `CamposNuevaTarea` y materiales referenciados en `tareas/[id]` | W2-9 |
| W2-11 | N | Server actions `documentos/materiales/actions.ts` (iniciar/confirmar subida y CRUD; validan contexto, rol y plan) | W2-4 |
| W2-12 | T | Integración 19 (Base → 403), 6 (otro colegio); e2e: docente publica a dos secciones y alumno lo ve; tarea con material existente | W2-11 |
| W2-13 | D | `specs/31` (solo la sección Materiales), `specs/39` | todas |

### Archivos
- **Posee (crea):** `src/lib/server/materiales/**` (el `index.ts` provisional del Paso 0 se reemplaza), `src/lib/materiales.ts`, `src/lib/server/archivos-acceso/material.ts`, `src/lib/server/notificaciones/avisos-materiales.ts`, `src/app/colegio/[slug]/documentos/materiales/actions.ts`, la migración, `tests/unit/materiales-reglas.test.ts`, `tests/integracion/{materiales-clase,tareas-materiales-existentes}.test.ts`, `tests/e2e/materiales-clase.test.ts`.
- **Posee (modifica):** `src/lib/server/tareas/{gestion,vistas,comun,index}.ts`, `src/app/colegio/[slug]/tareas/{actions.ts,CamposNuevaTarea.tsx}` y `tareas/[id]/**`, `tests/integracion/{tareas-classroom,adjuntos-comunicados-tareas}.test.ts`, `specs/39`, sección «Materiales de clase» de `specs/31`, `prisma/schema.prisma` (bloque `W2`, centinelas `@@W2`).
- **NO debe tocar:** `storage/**`, `adjuntos.ts` (salvo consumirlo), `archivos.ts`, `almacenamiento/**`, `documentos*.ts`, UI de `documentos/` (salvo `materiales/actions.ts`), `solicitudes/**`, `navegacion.ts`.

### Contratos
Expone (`src/lib/server/materiales/index.ts`):
```ts
export type SeccionMaterial = { cursoId: string; curso: string; salonId: string; salon: string; anio: number };
export type MaterialVista = {
  id: string; titulo: string; descripcion: string | null; unidadTema: string | null;
  estado: "borrador" | "publicado" | "archivado"; versionActual: number; autor: string;
  archivos: AdjuntoVista[]; secciones: SeccionMaterial[]; actualizadoAt: Date;
  gestionable: boolean; referenciadoPorTareas: number; enPapelera: boolean;
};
export type ArbolMateriales = { anios: { anio: number; archivado: boolean;
  cursos: { nombre: string; secciones: { cursoId: string; salonId: string; salon: string; materiales: MaterialVista[] }[] }[] }[] };
export function listarMateriales(ctx, f?: { anio?: number; curso?: string; salonId?: string; q?: string; estado?: string; papelera?: boolean; incluirArchivados?: boolean }): Promise<ArbolMateriales>;
export function opcionesParaCompartir(ctx): Promise<SeccionMaterial[]>;
export function crearMaterial(ctx, e: { titulo: string; descripcion?: string; unidadTema?: string; cursoIds: string[]; archivos: EntradaArchivo[]; publicar: boolean; avisar?: boolean }): Promise<{ id: string }>;
export function actualizarMaterial(ctx, id: string, e: { titulo: string; descripcion?: string; unidadTema?: string; cursoIds: string[] }): Promise<void>;
export function nuevaVersionMaterial(ctx, id: string, e: { archivos: EntradaArchivo[]; nota?: string }): Promise<{ numero: number }>;
export function publicarMaterial(ctx, id: string, avisar?: boolean): Promise<void>;
export function archivarMaterial(ctx, id: string): Promise<void>;
export function moverMaterialAPapelera(ctx, id: string): Promise<void>;
export function restaurarMaterial(ctx, id: string): Promise<void>;
export function eliminarDefinitivoMaterial(ctx, id: string): Promise<void>;
export function materialDesdeBorrador(ctx, documentoId: string, e: { cursoIds: string[]; unidadTema?: string; publicar: boolean }): Promise<{ id: string }>;
export function materialesElegiblesParaTarea(ctx, cursoId: string): Promise<MaterialVista[]>;
export const resolverAccesoMaterial: ResolverAcceso;
```
Acciones: `crearMaterialAction`, `nuevaVersionMaterialAction`, `iniciarSubidaMaterialAction`, `confirmarSubidaMaterialAction`, etc., devolviendo `{ ok, mensaje | error }`.
Consume de W1: `EntradaArchivo`, `materializarArchivos`, `liberarArchivo`, `recategorizarArchivo`, `limitesDe`, `ResolverAcceso`.

### Terminado cuando
Pruebas 1–5, 7, 17 (materiales), 19 y 6 pasan; un material compartido con 5 secciones deja 1 `Archivo` y 5 filas; la tarea que referencia un material no duplica bytes y sigue viéndose tras una nueva versión (versión fijada); lint, typecheck y tests de Tareas verdes; `specs/31` (sección) y `specs/39` al día.

## W3 — Solicitudes documentales (gestión académica)

Rama `docs-w3-solicitudes` · migración **`20261116090200_solicitudes_documentales`** · spec: `specs/46`.

### Tareas

| ID | Clase | Tarea | Depende de |
|---|---|---|---|
| W3-1 | MIG, N | Enums y tablas de `specs/46` (`solicitudes_documentales`, `solicitud_destinatarios`, `solicitud_versiones`, `solicitud_version_archivos`, `solicitud_eventos`); triggers de inmutabilidad (versión, evento); RLS cerrado | P0 |
| W3-2 | N, T | `src/lib/solicitudes.ts` (puro): tabla de transiciones, `vencida`, `entregaTardia`, expansión de áreas, cumplimiento. Unit | — |
| W3-3 | N, T | `solicitudes/gestion.ts`: crear, editar (borrador), publicar, anular, cerrar/reabrir, destinatarios (profesor o área), cambiar plazo, retirar. Prueba 11 | W3-1, W3-2 |
| W3-4 | N, T | `solicitudes/versiones.ts`: `presentarVersion` con reclamo atómico (`updateMany` por estado), tardía fija, compensación con `liberarArchivo`. Pruebas 12, 14 y concurrencia | W3-3 |
| W3-5 | N, T | `solicitudes/revision.ts`: comenzar, observar, aprobar, reabrir; eventos y `auditar`. Pruebas 13, 15 | W3-4 |
| W3-6 | N, T | `solicitudes/vistas.ts`: bandeja de dirección, «mis solicitudes» del profesor, detalle con línea de tiempo (16) | W3-5 |
| W3-7 | N, T | `solicitudes/reportes.ts`: contadores y cumplimiento por docente/área y por rango; CSV (`api/documentos/solicitudes/reporte/route.ts`) | W3-6 |
| W3-8 | N | `archivos-acceso/solicitud.ts` (dirección y destinatario; plantilla para destinatarios; nunca soporte) y avisos (`notificaciones/avisos-solicitudes.ts`) | W3-3 |
| W3-9 | N | Server actions `documentos/solicitudes/actions.ts` | W3-5 |
| W3-10 | T | Integración: aislamiento, Base → 403 (19), profesor no ve ajenos, 18 para archivos de solicitud; e2e del circuito completo | W3-9 |
| W3-11 | D | `specs/46` | todas |

### Archivos
- **Posee (crea):** `src/lib/server/solicitudes/**` (reemplaza el `index.ts` provisional), `src/lib/solicitudes.ts`, `src/lib/server/archivos-acceso/solicitud.ts`, `src/lib/server/notificaciones/avisos-solicitudes.ts`, `src/app/colegio/[slug]/documentos/solicitudes/actions.ts`, `src/app/colegio/[slug]/api/documentos/solicitudes/**`, la migración, `tests/unit/solicitudes-reglas.test.ts`, `tests/integracion/solicitudes-documentales.test.ts`, `tests/e2e/solicitudes-documentales.test.ts`.
- **Posee (modifica):** `specs/46`, `prisma/schema.prisma` (bloque `W3`, centinelas `@@W3`).
- **NO debe tocar:** `storage/**`, `adjuntos.ts`, `archivos.ts`, `almacenamiento/**`, `materiales/**`, `tareas/**`, `documentos*.ts`, UI de `documentos/`, `navegacion.ts`, `specs/31`, `specs/45`.

### Contratos
Expone (`src/lib/server/solicitudes/index.ts`):
```ts
export type EstadoSolicitud = "borrador" | "publicada" | "cerrada" | "anulada";
export type EstadoDestinatario = "pendiente" | "entregado" | "en_revision" | "observado" | "aprobado";
export type VersionVista = { id: string; numero: number; presentadaAt: Date; presentadaPor: string; tardia: boolean; comentario: string | null;
  resultado: "presentada" | "observada" | "aprobada"; observaciones: string | null; revisadaPor: string | null; revisadaAt: Date | null; archivos: AdjuntoVista[] };
export type DestinatarioVista = { id: string; membershipId: string; docente: string; grupo: string | null; estado: EstadoDestinatario;
  vencida: boolean; entregaTardia: boolean; versionActual: number; plazoCorreccion: Date | null; versiones: VersionVista[] };
export type SolicitudVista = { id: string; titulo: string; instrucciones: string | null; anioAcademico: number; periodoEtiqueta: string | null;
  fechaLimite: Date | null; conHora: boolean; estado: EstadoSolicitud; plantilla: AdjuntoVista | null; destinatarios: DestinatarioVista[]; resumen: ResumenSolicitud };
export type ResumenSolicitud = { destinatarios: number; pendientes: number; vencidas: number; entregadas: number; fueraDePlazo: number; enRevision: number; observadas: number; aprobadas: number };
export function crearSolicitud(ctx, e: { titulo: string; instrucciones?: string; anioAcademico: number; periodoEtiqueta?: string; plantillaDocumentoId?: string; fechaLimite?: Date; conHora?: boolean; permiteTardias?: boolean; destinatarios: { membershipIds?: string[]; areas?: string[] } }): Promise<{ id: string }>;
export function publicarSolicitud(ctx, id: string): Promise<void>;
export function presentarVersion(ctx, destinatarioId: string, e: { archivos: EntradaArchivo[]; comentario?: string }): Promise<{ numero: number }>;
export function comenzarRevision(ctx, destinatarioId: string): Promise<void>;
export function observarVersion(ctx, destinatarioId: string, e: { observaciones: string; plazoCorreccion?: Date }): Promise<void>;
export function aprobarVersion(ctx, destinatarioId: string): Promise<void>;
export function reabrirRevision(ctx, destinatarioId: string, motivo: string): Promise<void>;
export function listarSolicitudes(ctx, f?: { estado?: EstadoSolicitud; anio?: number }): Promise<SolicitudVista[]>;     // dirección: todas; profesor: solo las suyas
export function detalleSolicitud(ctx, id: string): Promise<SolicitudVista>;
export function reporteCumplimiento(ctx, f: { anio?: number; periodo?: string; desde?: Date; hasta?: Date; agrupar: "docente" | "area" }): Promise<FilaCumplimiento[]>;
export const resolverAccesoSolicitud: ResolverAcceso;
```
Consume de W1: `EntradaArchivo`, `materializarArchivos`, `liberarArchivo`, `ResolverAcceso`, `entregarNotificaciones` (existente).

### Terminado cuando
Pruebas 11–16 y 19 pasan; una transición inválida no cambia nada; dos presentaciones simultáneas crean una sola versión; el historial muestra todas las versiones con sus observaciones; el profesor no ve ajenos; lint, typecheck, tests verdes; `specs/46` al día.

## W4 — Frontend y navegación del módulo (más Biblioteca y borradores)

Rama `docs-w4-navegacion` · migración **`20261116090300_biblioteca_categorias`** · spec: `specs/31` (todo salvo «Materiales de clase»). Antes de tocar diseño: revisar `DESIGN.md`, `specs/18` y los componentes existentes; reutilizar `Select`, `Input`, `Table`, `EstadoVacio`, `EncabezadoPagina`, color de sección Comunicación; estados con ícono y palabra; objetivos táctiles de 44 px.

### Tareas

| ID | Clase | Tarea | Depende de |
|---|---|---|---|
| W4-1 | MIG, N | `documentos.categoria` (enum `CategoriaBiblioteca`), `documentos.oficial`, `documentos.archivado_at`, `carpetas_documento.archivado_at` | P0 |
| W4-2 | M, T | Biblioteca: categoría, documento oficial (no reemplazable ni purgable), archivado y «Ver archivados»; publicar solo dirección/administrativo; destinatarios explícitos; invisibilidad de restringidos en búsqueda y Recientes (20). Ajustar `documentos.test.ts` | W4-1 |
| W4-3 | M | Navegación: `?seccion=` con 8 secciones filtradas por rol, alias de `?vista=`, secciones no autorizadas ausentes y 403; reutiliza `ExploradorDocumentos` para Biblioteca, borradores, compartido, recientes, destacados y papelera | P0 |
| W4-4 | M, N | «Mis borradores»: renombrar la vista, indicador «Usaste X de 2 GB», acciones «Publicar como material de clase» y «Enviar a la Biblioteca» | W4-3, stubs W1/W2 |
| W4-5 | N | Sección Materiales de clase: árbol año/curso/sección, filtros, alta con selector de secciones, versiones, estado; consume `materiales/index.ts` | W4-3, W2 (stub) |
| W4-6 | N | Sección Gestión académica: vista de dirección (bandeja, detalle con línea de tiempo, revisar, reportes) y vista del profesor (mis solicitudes, entregar versión); consume `solicitudes/index.ts` | W4-3, W3 (stub) |
| W4-7 | M | Subida: `Subidas.tsx` y `NuevoDocumento` usan `subirDirecto` (W1) con progreso, errores por archivo y reintento; `/api/documentos/subir` queda como respaldo | W1-15 |
| W4-8 | N | `IndicadorAlmacenamiento` (barra con porcentaje y texto; dirección ve el del colegio, docente el de borradores), avisos al 85/95 % | W1-11 (stub) |
| W4-9 | M | `src/lib/navegacion.ts` y `src/lib/modulos.ts`: texto/descripcion del módulo «Documentos» (sin cambiar el plan) | W4-3 |
| W4-10 | T | e2e: navegación por rol (docente, alumno, apoderado, dirección, portería, Base), borradores con cuota, Biblioteca restringida invisible, subida directa; ajustar e2e existente | W4-7 |
| W4-11 | D | `specs/31` (todo salvo Materiales), `DESIGN.md` solo si se añade un patrón nuevo | todas |

### Archivos
- **Posee (modifica):** `src/app/colegio/[slug]/documentos/**` **excepto** `materiales/actions.ts` y `solicitudes/actions.ts`, `src/lib/server/{documentos,documentos-drive,documentos-permisos}.ts`, `src/lib/documentos.ts`, `src/lib/server/notificaciones/avisos-documentos.ts`, `src/app/colegio/[slug]/api/documentos/subir/route.ts`, `src/lib/navegacion.ts`, `src/lib/modulos.ts`, `tests/integracion/documentos.test.ts`, `tests/e2e/documentos.test.ts`, `prisma/schema.prisma` (bloque `W4`), `specs/31` (salvo «Materiales de clase»).
- **Posee (crea):** `documentos/materiales/*.tsx`, `documentos/solicitudes/*.tsx`, `documentos/IndicadorAlmacenamiento.tsx`, `documentos/PanelBorradores.tsx`, `documentos/DialogoPublicarMaterial.tsx`, la migración, `tests/e2e/documentos-navegacion.test.ts`.
- **NO debe tocar:** `storage/**`, `adjuntos.ts`, `archivos.ts`, `almacenamiento/**`, `materiales/*.ts` y `solicitudes/*.ts` (servidor), `tareas/**`, `archivos-acceso/**`.

### Contratos
Expone: ninguno de servidor (`DocumentoVista` y `Contenido` se amplían de forma compatible: `categoria`, `oficial`, `archivado`).
Consume: de W1 `subirDirecto`, `resumenAlmacenamiento`, `limitesDe`; de W2 las firmas de `materiales/index.ts` y `documentos/materiales/actions.ts`; de W3 `solicitudes/index.ts` y `documentos/solicitudes/actions.ts`. **Cómo se evita la dependencia:** el Paso 0 deja esos módulos como stubs que compilan y devuelven vacío; W4 desarrolla y prueba la UI contra ellos (y con datos de ejemplo en componentes de prueba) y solo en la integración final se conecta a los reales, sin cambiar firmas.

### Terminado cuando
Las ocho secciones aparecen solo para los roles de la matriz; Base ve candado y 403; un documento restringido es invisible para quien no lo recibe (20); «Mis borradores» muestra cuota y publica a material sin copiar; la subida usa carga directa con progreso y reintento; no hay `<select>` sueltos; objetivos táctiles de 44 px y sin scroll horizontal en móvil; lint, typecheck, tests y e2e de Documentos verdes; `specs/31` al día.

## Orden de integración recomendado

1. **Paso 0** (`docs-base`) sobre `dev` (y después de integrar `docs-nuevo`, para no pelear por `NuevoDocumento`).
2. **W1** primero: cambia `archivos.ts`, `adjuntos.ts`, `storage/**` y el esquema base de `Archivo`.
3. **W2 y W3**, en cualquier orden, rebasados sobre W1. Primero regenerar el cliente Prisma y correr sus pruebas contra el código real de W1.
4. **W4** al final (puede desarrollarse en paralelo, pero se integra después de W2 y W3 para conectar sin stubs).
5. Verificación integral (Etapa 5): `pnpm lint && pnpm typecheck && pnpm test`, `pnpm e2e` en puerto 3060 con `pnpm db:reconstruir` local, y la matriz de las 20 pruebas con su archivo y resultado. Revisión multitenant (otro colegio no ve ni descarga nada) y revisión de que Base recibe 403 en todas las rutas nuevas.

## Puntos de conflicto previsibles

| Archivo | Quién lo toca | Mitigación |
|---|---|---|
| `prisma/schema.prisma` | W1–W4 | Centinelas y bloques separados; relaciones inversas solo bajo el centinela propio; `prisma format` y `db:generate` tras cada rebase; el orquestador resuelve a mano los choques de líneas contiguas |
| `prisma/migrations/**` | W1–W4 | Nombres con timestamps distintos y posteriores a `20261115090100`; ninguna migración referencia tablas de otra (solo tablas ya existentes) |
| `src/lib/server/archivos.ts` | solo W1 | W2 y W3 aportan archivos de resolvedor propios |
| `specs/31` | W2 (Materiales), W4 (resto) | Cada uno edita solo su sección; resolver a mano |
| `src/lib/server/tareas/*` | solo W2 | W1 expone `limitesDe`, W2 lo consume |
| `src/app/colegio/[slug]/documentos/` | W4 (+ dos `actions.ts` de W2/W3) | Archivos de acciones separados por subcarpeta |
| `vercel.json`, `exportar.ts`, plantillas de aviso | W1 (plantillas: Paso 0) | Sin solapes |
| `tests/integracion/documentos.test.ts` | solo W4 | W1–W3 tienen sus propios archivos de prueba |
| `.next`, base local, puertos | todos | Una base y un puerto por worktree |

## Matriz de las 20 pruebas por flujo

W1: 6, 8, 9, 10, 18 · W2: 1, 2, 3, 4, 5, 7, 17 (materiales) · W3: 11–16 · W4: 17 (documentos), 20 · Todos: 19 (Base → 403 en cada ruta nueva). Pruebas adicionales: concurrencia de reserva, transición inválida, inmutabilidad de versiones, regresión de la matriz de acceso, limpiador sin falsos positivos, exportación con tablas nuevas.

## Decisiones pendientes que bloquean solo la parte no técnica

Proveedor y región definitivos (config reversible, no bloquea); cuotas por rango, reserva crítica y plan Base (valores configurables, se entregan con los provisionales); retención y purga física (se entrega apagada); administrativo en Gestión académica (se entrega solo dirección); máximo de versiones; PPTX/ODT en Biblioteca. Detalle en `specs/31`, `specs/45` y `specs/46`.
