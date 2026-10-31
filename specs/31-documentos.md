# 31 — Biblioteca de documentos

> Estado: implementado · Plan: Khipu Pro (módulo `documentos`) · Última actualización: 2026-10-31 (Claude Code, rama `feat/documentos`)

## Objetivo
Una biblioteca del colegio con **carpetas** y **permisos por rol y salón**: reglamento, protocolos, formatos, horarios,
material para docentes. Reemplaza el envío de PDFs sueltos por chat o correo.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| dirección | Ver todo; crear, renombrar, mover y borrar carpetas; subir, editar, reemplazar y borrar cualquier documento | — |
| administrativo | Lo mismo que dirección sobre carpetas y documentos **que ve** (visibilidad por rol, ver «Reglas») | Ver lo que no es para su rol |
| profesor | Subir documentos **solo a sus salones** (tutor o dicta); editar, reemplazar y borrar **solo los suyos**; ver lo visible para su rol y salón | Crear o mover carpetas; subir sin salón o a un salón ajeno; marcar «administrativo» como destinatario |
| apoderado / alumno | Ver y descargar lo visible para su rol y salón (apoderado: salones de sus hijos; alumno: el suyo) | Subir o borrar |
| portería | — (no usa la biblioteca: 403) | Todo |

## Flujos
1. Dirección o administrativo crea carpetas (anidadas) desde «Nueva carpeta» y, opcionalmente, limita quién las ve.
2. «Subir documento»: título, descripción opcional, archivo, carpeta, salón opcional, casillas de destinatarios (Familias, Alumnos, Profesores, Personal administrativo) y, solo si se marca, «Avisar a las familias».
3. Los usuarios navegan carpetas (migas de pan), buscan por título y descargan.
4. «Editar» cambia datos, destinatarios, salón y carpeta (mover) y permite **reemplazar el archivo**. «Borrar» pide confirmación (AlertDialog).

## Reglas de negocio
**Visibilidad (regla exacta, `documentoVisible` en `src/lib/documentos.ts`).** Un documento es visible para un usuario si:
1. es **dirección** (ve todo); o
2. **todas las carpetas de su cadena** (la suya y sus padres hasta la raíz) permiten su rol (`visibleRoles` vacío = sin restricción propia; con roles, solo esos), **y** además
3. es **quien lo publicó**, o su rol está en `Documento.visibleRoles` (vacío = borrador: solo dirección y su autor) **y**, si el documento tiene `salonId`, ese salón está en su alcance (`salonIdsVisibles`: profesor = sus salones; apoderado = salones de sus hijos; alumno = el suyo). El **personal administrativo no pertenece a un salón**: la restricción de salón no lo limita.

- Una carpeta es visible si ella y sus padres permiten el rol; si no, no aparece, su URL da 404 y sus documentos no salen ni en la búsqueda ni se descargan (403).
- El administrativo que crea o edita una carpeta con roles queda incluido automáticamente en ellos para no perder de vista lo que administra.
- Subcarpetas: nombre único entre hermanas (sin distinguir mayúsculas). Mover valida en servidor que no sea a sí misma ni a una descendiente.
- **Archivo:** mismos tipos y límite que los adjuntos de comunicados: PDF, JPG, PNG, WEBP, DOCX y XLSX, 10 MB, validados por firma. Un `Archivo` con `documentoId`; vigente = el más reciente.
- **Reemplazar archivo: gana el último.** Se sube el nuevo y se borra el anterior (BD y proveedor). **No hay historial de versiones** (pendiente). Cambia `updatedAt`.
- Borrar un documento o una carpeta (con subcarpetas y documentos) borra sus archivos del proveedor después de la BD (sin huérfanos; `borrarDelProveedor`).
- `requireFeature(ctx, "documentos")` en la página, en cada action y en la descarga (`requireArchivoVisible`).
- **Auditoría** (`auditar`): `crear` documento/carpeta, `editar`, `borrar`, `ver` con `detalle.descarga = true` en **cada descarga**, y `enviar` al avisar.
- **Aviso opcional** (`TipoAviso.documento`, plantilla `documento_nuevo`, ver spec 06): solo si se marca «Avisar a las familias», el documento incluye «Familias» y sus carpetas se lo permiten. Una fila por familia y canal (consentimiento y preferencias de la familia, vía `destinatariosDeAlumno`), solo a familias de alumnos activos del salón (o de todo el colegio). Idempotente. Se procesa la cola al instante (`after`). Editar no vuelve a avisar.
- Exportación del colegio (spec 15): `carpetas_documento`, `documentos` y `archivos` (con `documentoId`) entran solos por derivar de `Prisma.ModelName`; los archivos DOCX/XLSX se guardan con su extensión.
- Se mantiene aparte `DocumentoColegio` (texto plano del antiguo Nudito).

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus` (sin cambios de esquema en esta rama).

- **`CarpetaDocumento`** (`carpetas_documento`): `parentId?` (auto-relación, Cascade), `nombre`, `visibleRoles Rol[]`, `orden`, `creadoPorId`.
- **`Documento`** (`documentos`): `carpetaId?` (Cascade; null = raíz), `titulo`, `descripcion?`, `visibleRoles Rol[]`, `salonId?` (Cascade), `publicadoPorId`.
- **`Archivo.documentoId?`** (Cascade).

## Contratos de `src/lib/server`
```ts
// documentos.ts
listarContenido(ctx, { carpetaId?, q?, orden? }): Promise<Contenido>   // carpeta, ruta, subcarpetas visibles, documentos visibles
opcionesDeCarpeta(ctx), salonesParaDocumentos(ctx), puedeVerDocumento(ctx, id), puedeAdministrarCarpetas(ctx)
crearCarpeta(ctx, { nombre, parentId, visibleRoles }), editarCarpeta(ctx, id, { nombre, parentId, visibleRoles }), borrarCarpeta(ctx, id)
subirDocumento(ctx, { titulo, descripcion, carpetaId, visibleRoles, salonId, avisar }, archivo): { id, avisados }
editarDocumento(ctx, id, datos), reemplazarArchivoDocumento(ctx, id, archivo), borrarDocumento(ctx, id)
// notificaciones/avisos-documentos.ts: avisarDocumentoNuevo(ctx, documentoId)
// src/lib/documentos.ts (puro): documentoVisible, carpetaVisible, cadenaDeCarpetas, ROLES_DESTINO…
```

## Rutas y UI
- `/documentos?carpeta=<id>&q=<texto>&orden=recientes|antiguos|titulo` (todos menos portería). Descarga: `/archivos/<archivoId>` (sesión + regla de visibilidad).
- Navegación: grupo «Comunicación», ícono de carpeta; candado «Plan Khipu Pro» en Khipu Base.
- Carpetas como tarjetas (con «Restringida» para quien administra), documentos con ícono por tipo, fecha, autor, tamaño y etiquetas de destinatarios (solo las ve quien administra). Buscar por título abarca toda la biblioteca visible; orden por fecha o título.

## Textos y UX
- Vacíos: «Todavía no hay documentos» / «Esta carpeta está vacía» (con acción de subir para quien puede) y «No encontramos documentos con ese título».
- Estados con ícono + palabra; «tú» a las familias; el aviso lo firma el colegio, sin emojis.

## Errores y casos borde
- Ciclos al mover carpetas: validado en servidor. Nombre repetido entre hermanas: error de negocio.
- Archivo vacío, de otro tipo o de más de 10 MB: mensaje claro y no se crea el documento.
- Profesor sin salón o con salón ajeno: «Elige uno de tus salones» / 403.
- Documento o carpeta de otro colegio: 404 (aislamiento por `ctx.db`).

## Pruebas
- integración `tests/integracion/documentos.test.ts`: regla pura, matriz de visibilidad por rol y salón con descargas, herencia de carpetas y búsqueda, ciclos y permisos de carpetas, profesor (solo sus salones y lo suyo), validación/reemplazo/borrado sin archivos huérfanos, aviso opcional, aislamiento entre colegios y plan Base (403).
- e2e `tests/e2e/documentos.test.ts`: dirección crea carpeta y sube un PDF para familias, Rosa lo ve y lo descarga, portería no; un colegio Khipu Base temporal ve el candado.
- Demo: `prisma/seed-documentos.ts` (Nuevo Horizonte: «Reglamento y normas» con «Protocolos internos» solo para personal, «Calendario académico», «Comunicados oficiales»; siete PDF de ejemplo con visibilidad mixta, uno para 3.° B y un borrador solo de dirección).

## Pendientes
- Historial de versiones de documentos (hoy gana el último archivo).
- PPTX y otros formatos de Office (hoy PDF, imágenes, DOCX y XLSX).
- Vista previa de PDF; mover documentos en bloque; orden manual de carpetas (`orden` no tiene UI).
