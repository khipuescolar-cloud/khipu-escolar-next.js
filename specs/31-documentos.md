# 31 — Biblioteca de documentos

> Estado: en construcción · Plan: Khipu Pro (módulo `documentos`) · Última actualización: 2026-10-31 (Claude Code)

## Objetivo
Una biblioteca del colegio con **carpetas** y **permisos por rol y salón**: reglamento, protocolos, formatos, horarios,
material para docentes. Reemplaza el envío de PDFs sueltos por chat o correo.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| dirección | Crear carpetas, subir, mover y borrar documentos; ver todo | — |
| administrativo | (por definir) subir en carpetas permitidas | Ver lo que no es para su rol |
| profesor / apoderado / alumno / portería | Ver y descargar lo visible para su rol (y su salón) | Subir o borrar |

## Flujos
1. Dirección crea carpetas (anidadas) y sube un documento con título, descripción, roles visibles y salón opcional.
2. Los usuarios navegan carpetas y descargan (URL firmada; archivo privado).

## Reglas de negocio
- **Dirección siempre ve todo.**
- `Documento.visibleRoles` vacío = solo dirección (borrador/interno). Con roles: solo esos roles.
- `CarpetaDocumento.visibleRoles` vacío = sin restricción propia; con roles, solo esos roles ven la carpeta y su contenido (se combina con las carpetas padre y con el documento: hay que cumplir todas).
- `Documento.salonId`: si tiene valor, solo personal de ese salón (tutor, profesores de sus cursos) y familias/alumnos de ese salón (`salonIdsVisibles`).
- El archivo es un `Archivo` con `documentoId` (como `comunicadoId`/`tareaId`); vigente = el más reciente. Reemplazar = subir uno nuevo y borrar el anterior (incluido el del proveedor).
- `requireFeature(ctx, "documentos")`. La clave `documentos` ya está en `plan_modulos` para `pro` (migración); falta agregarla a `FEATURES` en `src/lib/planes.ts`.
- Auditar descargas de documentos con `salonId`.
- Aviso opcional a quienes pueden verlo: `TipoAviso.documento` (ya en el enum).

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus`.

- **`CarpetaDocumento`** (`carpetas_documento`): `parentId?` (auto-relación «SubcarpetasDocumento», Cascade; null = raíz; CHECK `parent_id <> id`), `nombre`, `visibleRoles Rol[]` (def. `[]`), `orden`, `creadoPorId` (membresía, NoAction), `createdAt`, `updatedAt`. Relaciones `parent`, `hijas`, `documentos`.
- **`Documento`** (`documentos`): `carpetaId?` (Cascade; null = raíz), `titulo`, `descripcion?`, `visibleRoles Rol[]` (def. `[]`), `salonId?` (Cascade), `publicadoPorId` (membresía, NoAction), `createdAt`, `updatedAt`. Relación `archivos`.
- **`Archivo.documentoId?`** (Cascade, índice).
- Se mantiene aparte `DocumentoColegio` (texto plano del antiguo Nudito).

## Contratos de `src/lib/server`
```ts
// por definir: documentos.ts — listarCarpeta(ctx, carpetaId|null), crearCarpeta, subirDocumento, moverDocumento, borrarDocumento, urlDescarga
```

## Rutas y UI
- Por definir: `/documentos`.

## Textos y UX
- Por definir.

## Errores y casos borde
- Ciclos al mover carpetas (más allá de padre = sí misma): validar en servidor.
- Borrar una carpeta borra sus subcarpetas y documentos (Cascade): los archivos del proveedor se borran en código antes.

## Pruebas
- Por definir.

## Pendientes
- Versionado de documentos; tamaño máximo; vista previa de PDF.
