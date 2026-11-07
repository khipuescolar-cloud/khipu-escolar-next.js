# Diagnóstico del módulo Documentos (Etapa 1 de SDD) · 2026-11-07

Alcance: auditoría del estado real del repositorio (rama `docs-sdd`, basada en `dev` con `docs-drive` integrado) para reestructurar Documentos y su integración con Tareas. Todo lo que sigue se verificó en código y specs; lo que no se pudo verificar se marca «a verificar». No se tocó código de la app. Especificación: `specs/31`, `specs/45`, `specs/46`. Plan: `docs/documentos-plan-implementacion.md`.

## 1. Resumen ejecutivo

1. **No hay cuotas ni medición de almacenamiento en ninguna parte.** `Archivo.bytes` existe, pero nada suma, limita ni alerta. Nada impide que un colegio llene el almacenamiento.
2. **Toda subida pasa por funciones de Next** (`Buffer` en memoria, server action o `/api/documentos/subir`). No hay carga directa al proveedor. En Vercel el cuerpo máximo es 4,5 MB (ya anotado en `docs/infraestructura-y-costos.md` §5.4) y los límites actuales (10 MB) no llegan a los 25 MB que pide el encargo para profesores.
3. **La abstracción de almacenamiento ya existe y está decidida:** `FileStorage` con `local`, `cloudinary` (piloto) y `s3` (implementado, sin probar contra cuenta real). Supabase solo se usa para Auth; no hay proveedor Supabase Storage. No hay que migrar de proveedor ni escribir una abstracción nueva: hay que **extenderla** con carga directa.
4. **Tareas sí recibe entregas** (specs/39, implementado y probado): `tarea_entregas`, `Archivo.entregaId`, reentregas, revisión, devolución, calificación. No hay que construir entregas; hay que **hacerlas pasar por el mismo medidor de cuota** y permitir que los **materiales de una tarea referencien** archivos existentes (hoy `Archivo.tareaId` ata el archivo a UNA tarea, con borrado en cascada).
5. **Documentos ya es un explorador estilo Drive** (Mi unidad, Compartido, Biblioteca, Recientes, Destacados, Papelera, compartir por persona/rol/salón, papelera con 30 días, vista previa). Es correcto y probado para la **Biblioteca**, pero **no organiza por estructura académica**: `Curso`, `Salon`, `Salon.anio` y los profesores existen y no se usan en Documentos salvo `salonId` como filtro de visibilidad.
6. **No existe nada parecido a solicitudes documentales** (programación curricular, etc.). Ni tabla, ni servicio, ni versión, ni revisión.
7. **Hallazgo de seguridad de datos:** el limpiador de huérfanos (`encontrarArchivosHuerfanos`) no excluye `entregaId`, `reunionId` ni `nuditoSesionId`. Con `--confirmar`, borraría entregas de alumnos y adjuntos de reuniones con más de 24 h. Es un script manual (simulacro por defecto), pero es un riesgo real antes de operar con cuotas y purgas. Corregir en W1 (no depende del resto).

## 2. Qué existe

### 2.1 Almacenamiento

| Pieza | Archivo | Estado |
|---|---|---|
| Interfaz `FileStorage` (`subir`, `subirDesdeRuta?`, `urlTemporal`, `borrar`) | `src/lib/server/storage/tipos.ts` | Implementada; **sin** URL de subida firmada ni lectura parcial |
| Proveedores | `storage/local.ts`, `cloudinary.ts`, `s3.ts`; `storageDe(proveedor)` | Local (dev/tests), Cloudinary (piloto, `docs/despliegue.md`), S3 (compatible: MinIO/R2 con `S3_ENDPOINT`) |
| Selección | `STORAGE_PROVIDER` (`local` por defecto) | Por archivo se guarda `Archivo.proveedor`: leer/borrar funciona aunque el activo cambie |
| Subida | `guardarArchivo` (storage/index.ts, 5 MB, magic bytes) y `guardarAdjuntos` (adjuntos.ts, 10 MB, 5 por elemento) | **Dos caminos paralelos** que llaman a `storage().subir`; otros: logo (`logo.ts`), fotos Nudito (`nudito/fotos.ts`), ZIP de exportación (`subirArchivoDesdeRuta`) |
| Descarga | `/colegio/[slug]/archivos/[id]/route.ts` + `requireArchivoVisible` (archivos.ts) | Ruta estable con permisos; Cloudinary/S3: redirección 307 a URL de 5 min; local: sirve el archivo. `Cache-Control: private, no-store` |
| Validación | `detectarMimeAdjunto` (PDF, JPG, PNG, WEBP, DOCX, XLSX; PPTX y ODT solo tareas) | Por firma y estructura ZIP; ejecutables rechazados por no estar en la lista blanca |
| Mantenimiento | `mantenimiento-archivos.ts`, `scripts/limpiar-archivos.ts`, `scripts/migrar-archivos.ts` | Manual; ver hallazgo del resumen |
| Modelo | `Archivo`: `proveedor`, `publicId`, `bytes Int`, `privado`, `subidoPorId`, **un FK por dueño** (`comunicadoId`, `tareaId`, `mensajeSoporteId`, `documentoId`, `entregaId`, `reunionId`, `nuditoSesionId`), `nombre` | Sin `categoria`, sin hash, sin estado. Borrado en cascada desde el dueño |

**Proveedor vigente (respuesta a «¿Supabase Storage?»):** el repositorio revela una decisión técnica posterior al encargo. `AGENTS.md`: «Supabase solo se usa para Auth… Archivos: interfaz FileStorage (local / Cloudinary; luego S3)». `specs/14`, `docs/infraestructura-y-costos.md` (§1.4, fila «Créditos de Cloudinary»: «mover los archivos a otro proveedor (`S3Storage` ya existe)»), y `docs/respaldos-y-exportacion.md` (A.4 F3, B opción 1: bucket S3/R2 con `S3Storage`; «Khipu no usa Supabase Storage»). Recomendación en `specs/45` §Proveedor.

### 2.2 Documentos

- Modelos: `CarpetaDocumento`, `Documento` (`ambito` = `biblioteca` | `unidad`, `visibleRoles`, `salonId`, `eliminadoAt`), `CompartidoDocumento` (carpeta o documento; persona o rol+salón; lector/editor), `DestacadoDocumento`, `AccesoDocumento`. Un solo archivo vigente por documento (`Archivo.documentoId`; reemplazar **borra** el anterior).
- Servicios: `documentos.ts` (372 líneas), `documentos-drive.ts`, `documentos-permisos.ts` (`nivelEfectivo`), `src/lib/documentos.ts` (reglas puras), `notificaciones/avisos-documentos.ts`.
- UI (1 493 líneas en `src/app/colegio/[slug]/documentos/`): `ExploradorDocumentos` orquesta seis vistas por `?vista=`; `DialogoCompartir`, `PanelDetalles`, `Subidas`, `NuevoDocumento`, etc.
- Plan: `documentos` es módulo `pro` (`src/lib/planes.ts`); `requireFeature(ctx, "documentos")` en página, acciones y rutas; Base ve candado.
- `DocumentoColegio` (`documentos_colegio`, texto) es una tabla antigua que solo usa el seed; no participa en el módulo. **No tocar.**

### 2.3 Tareas (relevante para la integración)

- Implementado (specs/39): crear/publicar/programar/cerrar, secciones (`TareaCurso`, curso «gemelo» del docente), destinatarios (`TareaAsignacion`), **entregas con intentos** (`TareaEntrega`, `Archivo.entregaId`), devolver/revisar/calificar con `Evaluacion`, comentarios privados, avisos.
- Materiales de tarea = `Archivo.tareaId` (FK único, CASCADE). Una tarea no puede apuntar a un archivo que ya existe: hoy habría que **copiar el binario**, que es exactamente lo que el encargo prohíbe.
- Límites: `tenants.tareas_max_archivos` (5) y `tareas_max_mb` (10), techo duro 5×10 MB. El encargo pide entregas de 10 MB y **3 archivos**.
- Descarga de entregas ya es la más restrictiva del sistema (alumno, apoderados, docente del curso o autor, dirección; no soporte; auditada). Se conserva.
- Anti-manipulación ya resuelta para secciones: `cursosGemelos`, alumnos activos del salón. Se reutiliza para Materiales.

### 2.4 Permisos, auditoría y exportación

- Aislamiento: `ctx.db` inyecta `tenantId` (`dbTenant`); RLS cerrado en tablas nuevas; `requireTenantContext(slug, roles)`; `salonIdsVisibles`, `alumnoIdsVisibles` (apoderado: salones de sus hijos; alumno: solo el suyo).
- `requireArchivoVisible` es una cadena secuencial de `if` por dueño del archivo. Cada flujo nuevo agregaría otra rama en el mismo archivo: **punto de conflicto** entre equipos y de crecimiento (se refactoriza a resolvedores, W1).
- Auditoría: `auditar()` (tabla `auditoria`, acciones `ver|crear|editar|borrar|exportar|enviar|…`). Descargas de documentos y de entregas se auditan una por una. Para materiales (muchos alumnos) auditar cada descarga inflaría la tabla: se proponen métricas agregadas (ver `specs/45`).
- Exportación: ZIP por tablas derivadas de `Prisma.ModelName` + `archivos/`. Una tabla nueva entra sola; un test falla si un modelo con `tenantId` no queda cubierto ni omitido a propósito. Las tablas nuevas efímeras (`subidas_archivo`) o de métricas deben decidirse en `TABLAS_OMITIDAS`. **Riesgo existente:** el ZIP único choca con Cloudinary (10–20 MB) y con `/tmp`; con cuotas de 20–250 GB hará falta exportar por partes (`docs/respaldos-y-exportacion.md` §B). No se resuelve aquí; se registra como dependencia.
- Mensajería (`mensajes`) **no tiene adjuntos** (solo la mesa de ayuda, `mensajeSoporteId`, y comunicados): el requisito «los adjuntos de mensajería siguen funcionando» se cumple trivialmente; sí deben contarse en la cuota (categorías `comunicado` y `soporte`).

## 3. Duplicaciones e inconsistencias

| # | Hallazgo | Impacto | Resolución propuesta |
|---|---|---|---|
| D1 | Dos caminos de subida (`guardarArchivo`, `guardarAdjuntos`) más logo, fotos y exportación, todos con `storage().subir` | Ninguno mide cuota; no hay un punto único para reservar | Un servicio central (`almacenamiento/`) que todos usan; los viejos delegan |
| D2 | Tres límites distintos: 5 MB (`validacion.ts`), 10 MB fijo (`MAX_BYTES_ADJUNTO`, ruta `/api/documentos/subir` con 11 MB), `tareas_max_mb` por colegio | Incoherente; no configurable de forma central | Tabla de configuración por colegio (`almacenamiento_colegio`) con valores por defecto del encargo |
| D3 | Subida de documentos por server action (`FormulariosDocumentos`) y por `/api/documentos/subir` (arrastre) | Dos validaciones y dos límites | Ambas pasan al flujo de carga directa; el endpoint actual queda como respaldo hasta migrar |
| D4 | Dos modelos de visibilidad en Documentos: legado `visibleRoles/salonId` (Biblioteca) y `CompartidoDocumento` (unidad) dentro de `nivelEfectivo` | Complejidad; funciona y está probado | **Conservar**. No unificar ahora |
| D5 | `Archivo` ata cada archivo a un dueño con FK propio y cascada | Impide referenciar sin copiar | Los dueños nuevos (versión de material, versión de solicitud) tienen el FK en su lado; `Archivo` solo gana `categoria` |
| D6 | `requireArchivoVisible` monolítico | Conflictos entre flujos | Resolvedores por flujo en archivos separados |
| D7 | `listarContenido` y `contextoPermisosDocumento` cargan **todas** las carpetas y compartidos del colegio y filtran en memoria | Crece con borradores de todos los docentes; válido para Biblioteca/Mis borradores, **no** para Materiales | Materiales usa consultas SQL acotadas por `Curso/Salon`, no este modelo |
| D8 | Reemplazar un documento borra el archivo anterior | Sin historial | Se mantiene para Biblioteca y borradores; versiones solo en Materiales y Solicitudes |
| D9 | Limpiador de huérfanos incompleto | Pérdida de entregas | Corregir con `categoria` (W1) |
| D10 | `vaciarPapeleraVencida` existe pero no está conectado a un cron | Papelera crece sin límite y cuenta contra la cuota | Cron diario con interruptor apagado hasta aprobación legal |
| D11 | `Archivo.bytes` es `Int` (máx. 2 GB por archivo) | Suficiente (límite 25 MB); **los acumulados deben ser `BigInt`** | Contadores en `bigint` |
| D12 | «Mi unidad» replica un Drive personal sin cuota ni propósito académico | Contradice «no Google Drive completo» | Se renombra «Mis borradores» y gana cuota de 2 GB por docente |

## 4. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Colegio sin límite de almacenamiento (costo no acotado) | Alta | Alto | Cuota con reserva atómica (spec 45) |
| Subidas de 25 MB fallan en Vercel (413) | Alta | Alto | Carga directa con URL firmada |
| Condición de carrera: dos cargas superan el espacio restante | Media | Medio | `UPDATE … WHERE usado+reservado+n <= limite` atómico |
| Subida iniciada y abandonada deja bytes reservados u objetos huérfanos | Media | Medio | Reserva con vencimiento y barrido diario |
| Fuga entre colegios por IDs manipulados en confirmaciones | Baja | Crítico | `subidas_archivo` ligada a `tenantId` + `membershipId`; clave de objeto generada por el servidor |
| Archivo compartido con N secciones copiado N veces | — (no existe aún) | Costo | Una sola fila `Archivo`; las secciones son filas de enlace |
| Material reutilizado en tarea se borra y rompe la tarea | Media | Medio | Versión fijada + el borrado físico se bloquea mientras haya referencias |
| Purga automática borra algo con obligación de conservación | Baja | Alto | Interruptor apagado, exclusiones (oficial, solicitudes, referenciados) y decisión legal pendiente |
| Plan Base accede a funciones Pro por rutas nuevas | Media | Medio | `requireFeature(ctx,"documentos")` en toda ruta/acción nueva (prueba 19) |
| Auditoría inflada por descargas de alumnos | Media | Bajo | Métricas diarias agregadas para materiales; auditoría fila a fila solo en entregas, solicitudes y restringidos |
| Exportación del colegio inviable con 20–250 GB | Alta (a mediano plazo) | Alto | Fuera de alcance; dependencia documentada |
| Conflictos de merge en `schema.prisma`, `archivos.ts`, `navegacion` | Alta | Bajo | Propiedad de archivos disjunta + centinelas (plan) |

## 5. Costos (referencias, no constantes de negocio)

Datos del repo: ~3 GB de archivos nuevos por 1 000 alumnos y año (`docs/infraestructura-y-costos.md`), muy por debajo de las cuotas provisionales (20 GB para 1–100 alumnos). Referencias de precio citadas por el encargo y el repo: Supabase Storage 100 GB incluidos y ~USD 0,0213/GB; R2 ~USD 0,015/GB sin egress; Cloudinary se mide en créditos (1 crédito = 1 GB guardado o transferido) y en Free limita archivos a 10 MB. Las cuotas provisionales son un **techo de control**, no una predicción de uso; validar en el piloto.

## 6. Qué se conserva y qué se reemplaza del explorador actual

| Pieza | Decisión |
|---|---|
| Modelos `Carpeta/Documento/Compartido/Destacado/Acceso` | **Conservar** (sin borrar nada) |
| `ExploradorDocumentos`, `ListaContenido`, `AccionesItem`, `DialogoCompartir`, `PanelDetalles`, `DialogosDocumentos` | **Conservar y reutilizar** para Biblioteca, Mis borradores, Compartido, Recientes, Destacados, Papelera |
| Vista «Mi unidad» (`ambito=unidad`) | **Renombrar** a «Mis borradores» (valor de enum intacto), con cuota y acción «Publicar como material» |
| Vista «Biblioteca» | **Conservar y mejorar** (categorías, documentos oficiales, destinatarios por rol más claros, permisos de publicación) |
| Navegación (`?vista=` con seis opciones) | **Reemplazar** por ocho secciones según rol (`?seccion=`), manteniendo `?vista=` como alias |
| Subida (XHR multipart / server action) | **Reemplazar** por carga directa; el respaldo queda |
| Profesor sube a Biblioteca por salón propio | **Sustituido** por Materiales de clase; los documentos existentes no se tocan |
| Carpetas manuales para material de clase | **No se ofrecen**; la organización sale de año/curso/sección |

## 7. Conclusión

El explorador actual es una buena base para Biblioteca, borradores, compartir y papelera. Lo que falta es (1) un **repositorio y medidor únicos** (almacenamiento, cuotas, carga directa, observabilidad), (2) la **capa académica** (Materiales por año/curso/sección y referencias desde Tareas) y (3) **solicitudes documentales**. Ninguna de las tres exige cambiar de proveedor, reconstruir el explorador ni tocar los planes.
