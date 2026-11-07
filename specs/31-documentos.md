# 31 — Documentos: materiales, gestión académica, biblioteca y borradores

> Estado: explorador implementado (Khipu Pro); navegación por sección y metadatos de Biblioteca implementados en W4. Materiales, solicitudes y almacenamiento central pendientes de integrar con W1–W3 · Actualizado: 2026-11-07 · Sección Comunicación · Relacionadas: `45-almacenamiento-y-cuotas.md`, `46-solicitudes-documentales.md`, `39-tareas.md`, `14-archivos-cloudinary.md` · Diagnóstico: `docs/documentos-diagnostico-2026-11.md` · Plan: `docs/documentos-plan-implementacion.md`

Lo implementado hoy (explorador estilo Drive) se conserva y se describe en «Explorador vigente»; las secciones nuevas dicen qué cambia. Hasta que cada flujo se integre, **manda el comportamiento vigente**.

## Visión de la reestructuración

Documentos **no es un Google Drive**: es la gestión documental educativa del colegio. Se organiza en tres áreas y un espacio personal acotado, sobre **un solo repositorio** (`Archivo` + `FileStorage`, `specs/45`) y sin copias físicas:

| Área | Qué es | Quién | Organización |
|---|---|---|---|
| Materiales de clase | Archivos del docente para sus secciones | Docente publica; alumnos y apoderados consultan | **Automática** por año → curso → sección (+ unidad/tema opcional). Sin carpetas manuales |
| Gestión académica | Solicitudes documentales con estados, versiones y revisión (`specs/46`) | Dirección solicita y revisa; docentes entregan | Por solicitud y destinatario |
| Biblioteca del colegio | Reglamento, protocolos, calendarios, formatos, documentación oficial | Dirección y administrativo publican; cada documento dirigido a roles concretos | Carpetas (existentes) + categoría |
| Mis borradores | Archivos de trabajo privados del personal | Cada persona | Carpetas propias; cuota 2 GB por persona dentro del total del colegio |
| Compartido conmigo · Recientes · Destacados · Papelera | Vistas transversales | Todos los que usan Documentos | Mismo repositorio, sin copias |

Alcance explícito: sin edición en línea, sin sincronización de escritorio, sin enlaces públicos, sin videos grandes, sin carpetas compartidas para cualquiera.

## Tareas vs Documentos

| Tareas (`specs/39`) | Documentos |
|---|---|
| Crear tareas, instrucciones, destinatarios, fechas, **entregas de alumnos**, revisión, calificación, avisos | Organizar, distribuir, consultar y administrar información académica e institucional |
| Ya recibe entregas (implementado) | No recibe entregas de alumnos |
| Materiales de tarea: archivo nuevo **o referencia a un material de clase propio** | Los materiales de clase son la fuente reutilizable |

Ambos módulos usan el mismo repositorio y la misma cuota. Subir de nuevo el mismo archivo es una decisión del usuario; elegir uno existente nunca copia el binario.

## Navegación por rol

Ruta `/documentos?seccion=materiales|gestion|biblioteca|borradores|compartido|recientes|destacados|papelera` (el `?vista=` actual sigue aceptándose: `unidad`→`borradores`, el resto igual). Sin autorización, la sección **no aparece** y la ruta responde 403.

Implementación W4: `seccionDocumento` normaliza el alias y `puedeEntrarSeccion` aplica la matriz de roles en el servidor y en la navegación. Materiales y Gestión académica consumen `listarMateriales` y `listarSolicitudes`; mientras esos contratos sean provisionales se muestra un estado vacío.

| Sección | Dirección | Administrativo | Profesor | Apoderado | Alumno |
|---|---|---|---|---|---|
| Materiales de clase | Ver todo, retirar | — | Sus materiales | Los publicados a los salones de sus hijos | Los de su salón |
| Gestión académica | Crear, revisar, reportes | (pendiente, `specs/46`) | Solo sus solicitudes | — | — |
| Biblioteca del colegio | Administra | Publica y administra | Consulta (según rol/salón) | Consulta lo dirigido a familias | Consulta lo dirigido a alumnos |
| Mis borradores | Sí | Sí | Sí | — | — |
| Compartido conmigo, Recientes, Destacados | Sí | Sí | Sí | Sí | Sí |
| Papelera | Toda | La suya | La suya | — | — |

Portería: ninguna (403). Khipu Base: candado y 403 en todo el módulo. El profesor deja de crear en la raíz de la Biblioteca (lo cubren Materiales y Borradores); conserva lo que ya administra como Editor.

## Materiales de clase

Implementación W2: `MaterialClase` conserva metadatos y enlaza secciones existentes por `Curso`; `MaterialVersion` y `MaterialVersionArchivo` fijan los binarios de cada versión. La vista agrupa automáticamente por año, curso y sección. Un material con varios destinos tiene una sola versión y una sola fila `Archivo` por binario. La papelera registra `eliminadoAt`, permite restaurar y solo admite purga tras 30 días y sin referencias de Tareas. Las operaciones y descargas validan colegio, plan Pro, rol y asignación en el servidor. La carga directa consume los contratos de W1; hasta integrarlos, el camino por servidor sigue disponible para archivos admitidos por el almacenamiento vigente.

### Requisitos funcionales
- **RF-M1** El docente crea un material con título, descripción, unidad/tema opcional, archivo(s) y las **secciones** con las que lo comparte.
- **RF-M2** Una sección es un `Curso` del docente (curso + salón + año). Solo puede elegir cursos que dicta con el **mismo nombre** que el curso de origen (`cursosGemelos`, como Tareas). Compartir con 5 secciones guarda **un** archivo y 5 filas de enlace (prueba 4).
- **RF-M3** La vista organiza sola: año académico (`Salon.anio`) → curso (`Curso.nombre`) → sección (`Salon.nombre`) → unidad/tema. Filtros por año, curso, sección y búsqueda. Salones archivados (`Salon.archivadoAt`) pasan a «Años anteriores» sin eliminar nada.
- **RF-M4** Actualizar un material crea una **versión nueva** (la anterior se conserva, cuenta en la cuota y se consulta desde Detalles). Los alumnos ven la versión vigente.
- **RF-M5** Estados `borrador` → `publicado` → `archivado`; solo lo publicado lo ven alumnos y apoderados; avisar a las familias es opcional (reusa `documento_nuevo`/bandeja).
- **RF-M6** Convertir un borrador en material: el archivo se **recategoriza** (`borrador`→`material_clase`), no se copia.
- **RF-M7** Papelera de 30 días como el resto; no se elimina físicamente un material **referenciado por una tarea**.
- **RF-M8** Descarga con URL temporal de 300 s tras verificar acceso; se audita solo en métricas.

### Reglas de acceso (servidor)
Profesor: sus materiales. Alumno: materiales `publicado` de cursos de **su** salón (`alumnoDeLaCuenta`). Apoderado: de los salones de sus hijos (`salonIdsVisibles`). Dirección: todos (solo lectura y retiro). Administrativo, portería: ninguno. Un archivo de material se puede descargar también por quien ve **una tarea publicada** que lo referencia (`puedeVerTarea`), aunque el material no estuviera compartido con su sección. Materiales **no** usan `contextoPermisosDocumento` (modelo en memoria); usan consultas SQL acotadas por `Curso/Salon`.

### Datos (migración W2 `20261116090100_materiales_clase`, aditiva)
```prisma
enum EstadoMaterial { borrador publicado archivado }
model MaterialClase {            // materiales_clase
  id, tenantId, titulo, descripcion?, unidadTema?, estado EstadoMaterial @default(borrador),
  versionActual Int @default(1), creadoPorId (Membership), publicadoAt?, archivadoAt?,
  eliminadoAt?, eliminadoPorId?, createdAt, updatedAt
  // índices: (tenantId, creadoPorId), (tenantId, estado)
}
model MaterialSeccion {          // material_secciones, unique(materialId, cursoId)
  id, tenantId, materialId, cursoId (FK Curso, Cascade), createdAt
  // índice: (tenantId, cursoId)
}
model MaterialVersion {          // material_versiones, unique(materialId, numero)
  id, tenantId, materialId, numero Int, nota?, creadaPorId, createdAt
}
model MaterialVersionArchivo {   // material_version_archivos: una versión puede tener hasta 5 archivos
  id, tenantId, versionId, archivoId (FK Archivo, Restrict, unique), orden Int
}
model TareaMaterial {            // tarea_materiales, unique(tareaId, materialId)
  id, tenantId, tareaId (Cascade), materialId (Restrict), versionId (versión fijada), creadoPorId, createdAt
}
```
`Archivo` no gana FKs (el dueño es la fila de enlace); `categoria = material_clase`. `TareaMaterial.versionId` **fija** la versión: lo que ven los alumnos no cambia solo; el docente puede «usar la última versión». Borrar una tarea borra sus `TareaMaterial` pero **nunca** el archivo.

### Integración con Tareas
Al crear o editar una tarea, el docente puede «Elegir de mis materiales»: se valida que el material sea suyo y no esté en papelera, y se crea `TareaMaterial`. Los materiales con `Archivo.tareaId` ya existentes siguen igual. Contrato: `crearTarea`/`actualizarTarea` aceptan `materialesExistentes?: { materialId: string; versionId?: string }[]`; las vistas de tarea devuelven `materiales: AdjuntoVista[]` que unen archivos propios y referenciados. Detalle en `specs/39`.

## Gestión académica

Spec propia: `46-solicitudes-documentales.md`.

## Biblioteca institucional (mejoras sobre lo vigente)

Se conserva todo (`ambito = biblioteca`, carpetas, `visibleRoles`, `salonId`, compartir, papelera, avisos). Cambios:
- **RF-B1 Categoría** del documento: reglamento, convivencia, protocolo, calendario, formato, oficial, otro (filtro y etiqueta).
- **RF-B2 Documento oficial** (`oficial = true`): no se reemplaza ni se purga automáticamente; solo dirección lo marca y lo archiva.
- **RF-B3 Archivado** (`archivadoAt`): sale de la lista por defecto; sigue accesible con «Ver archivados». No es eliminar ni libera espacio.
- **RF-B4 Destinatarios explícitos:** el selector ofrece «Solo dirección», «Personal administrativo», «Profesores», «Alumnos», «Apoderados» (sobre `visibleRoles` y `salonId`, sin cambiar la regla). Un documento restringido es **invisible** para quien no lo recibe, incluida la búsqueda y Recientes (prueba 20).
- **RF-B5 Publicar:** dirección y administrativo. El profesor no publica en la raíz de la Biblioteca.
- Migración W4 `20261116090300_biblioteca_categorias` (`documentos.categoria`, `documentos.oficial`, `documentos.archivado_at`; `carpetas_documento.archivado_at`).

Implementación W4: las filas antiguas reciben categoría `otro`, `oficial = false` y quedan sin archivar. El filtro de categoría y «Ver archivados» se aplican en el servidor; la búsqueda y Recientes pasan por `nivelDocumento`. El formulario de publicación pide categoría y destinatarios explícitos; solo dirección puede marcar `oficial`. Se bloquean su reemplazo, envío a papelera y purga física, incluso si está dentro de una carpeta. El archivado manual de documentos está auditado.

## Mis borradores

Es la vista «Mi unidad» (`AmbitoDocumento.unidad`, valor intacto) con otro nombre y límites:
- Subir, renombrar, organizar en carpetas propias, mover a la papelera. **Privado hasta publicar**: nada se comparte automáticamente.
- Cuota de **2 GB por persona** (configurable, `specs/45`), dentro del total del colegio; incluye la papelera.
- Acciones nuevas: **«Publicar como material de clase»** (elige curso/secciones; recategoriza) y **«Enviar a la Biblioteca»** (solo dirección/administrativo). Compartir con personas sigue disponible (entrada explícita, auditada), sin enlaces públicos.
- Indicador «Usaste X de 2 GB» en la sección.

Implementación provisional W4: el indicador suma los bytes de archivos en documentos propios de `ambito = unidad` (incluida la papelera) y usa 2 GB hasta conectar `resumenAlmacenamiento`/`limitesDe` de W1. La cuota todavía no se exige desde este flujo.

## Almacenamiento y cuotas

Todo archivo pasa por `specs/45`: carga directa, cuota del colegio con reserva atómica, límites configurables (25 MB documentos de personal, 10 MB × 3 entregas), alertas 70/85/95, reserva crítica para entregas, métricas diarias. Los documentos nuevos usan `iniciarSubida`/`confirmarSubida`; `/api/documentos/subir` queda como respaldo y desaparece cuando W4 migra la subida.

## Retención y eliminación

Borrado lógico con recuperación de 30 días (vigente). La purga física automática queda apagada hasta decisión legal (`specs/45`). No se eliminan solos: documentos oficiales, versiones de solicitudes, materiales referenciados por tareas. Archivar (por año o por dirección) no es eliminar ni reduce el almacenamiento. Estados: activo, archivado, eliminado lógico, eliminado físico.

## Seguridad multitenant

`requireTenantContext` + `ctx.db` en toda operación; ninguna URL ni `tenantId` del cliente concede acceso; los `id` de material, sección, versión, archivo y subida se resuelven siempre dentro del colegio y de la membresía; archivos privados con URL temporal tras `requireArchivoVisible` (refactorizado a resolvedores por flujo, `docs/documentos-plan-implementacion.md` W1); tipo real por firma, ejecutables fuera de la lista blanca; RLS cerrado en tablas nuevas. Pendientes legales: consentimiento y política de datos de menores, retención, encargado de tratamiento del proveedor (`specs/15`).

## Matriz de pruebas obligatorias → dónde se cubren

| # | Prueba | Spec / archivo previsto |
|---|---|---|
| 1 | Profesor sube a curso autorizado | `tests/integracion/materiales-clase.test.ts` |
| 2 | Curso ajeno rechazado | ídem |
| 3 | Comparte con varias secciones | ídem |
| 4 | Sin duplicado físico (un `Archivo`, N enlaces) | ídem |
| 5 | Alumno ve solo lo autorizado | ídem |
| 6 | Otro colegio intenta acceder | `almacenamiento-cuotas.test.ts` y `materiales-clase.test.ts` |
| 7 | Tarea reutiliza archivo existente | `tests/integracion/tareas-materiales-existentes.test.ts` |
| 8 | Colegio alcanza cuota | `almacenamiento-cuotas.test.ts` |
| 9 | Dos cargas compiten por el espacio restante | ídem |
| 10 | Carga falla antes de completarse | ídem |
| 11–16 | Solicitudes: solicitar, entregar, observar, v2, aprobar, historial | `solicitudes-documentales.test.ts` |
| 17 | Borrado lógico y recuperación | `documentos.test.ts` (existente) + materiales |
| 18 | Sin permisos pide URL de descarga | `almacenamiento-cuotas.test.ts` y `archivos-acceso.test.ts` |
| 19 | Función Pro desde Base | cada suite integración + e2e |
| 20 | Documento institucional restringido invisible | `documentos.test.ts` ampliado |

## Decisiones pendientes

- Tipos de archivo ampliados (PPTX/ODT) para documentos de la Biblioteca.
- Máximo de versiones por material.
- Si el administrativo participa en Gestión académica (`specs/46`).
- Visibilidad de materiales de años anteriores para alumnos que cambiaron de salón (hoy solo ven su salón actual).
- Retención y purga (legal); cuotas y plan Base (comercial) — ver `specs/45`.

---

# Explorador vigente (conservado)

Lo que sigue describe lo implementado el 2026-11-06. Se mantiene para Biblioteca, Mis borradores («Mi unidad»), Compartido conmigo, Recientes, Destacados y Papelera. Las vistas y el nombre «Mi unidad» cambian según las secciones anteriores.

### Objetivo y espacios

El módulo permite organizar archivos del colegio con carpetas, enlaces privados y acceso heredado. Tiene seis vistas:

| Vista | Contenido |
|---|---|
| Mi unidad | Raíz y carpetas de ámbito `unidad` creadas por la membresía; los archivos propios. |
| Compartido conmigo | Carpetas y archivos de otros en `unidad` para los que existe acceso efectivo por persona, rol o salón. |
| Biblioteca del colegio | Carpetas y documentos preexistentes (`ambito=biblioteca`) y nuevos contenidos de la institución. La migración asigna este ámbito por defecto y conserva todos los registros. |
| Recientes | Recursos abiertos con registro en `accesos_documento`. |
| Destacados | Recursos marcados por la membresía en `destacados_documento`. |
| Papelera | Recursos eliminados por la membresía; dirección ve todos. |

Las vistas son filtros de la misma ruta `/documentos?vista=unidad|compartido|biblioteca|recientes|destacados|papelera&carpeta=<uuid>&q=<texto>&orden=recientes|antiguos|titulo`. El enlace a archivo usa `&archivo=<uuid>`; exige sesión y permiso al abrir y al descargar. Portería recibe 403. Khipu Base conserva el candado y 403.

### Roles

| Rol | Lectura | Escritura y compartir |
|---|---|---|
| Dirección | Todo el colegio | Todo recurso; restaura y elimina definitivamente cualquier elemento. |
| Administrativo | Biblioteca visible, su unidad, compartidos | Crea en Mi unidad y Biblioteca; edita lo visible en Biblioteca y donde es editor. |
| Profesor | Biblioteca según rol/salón, su unidad, compartidos | Crea carpetas en Mi unidad, sube allí o a salones propios de la Biblioteca; administra lo suyo o donde es editor. Compartir con grupos requiere un salón propio; familias y alumnos ajenos quedan fuera. |
| Apoderado / alumno | Acceso efectivo por grupo, persona o biblioteca | Descarga y destaca. Nunca crea, sube ni recibe nivel Editor. |
| Portería | Ninguna | Ninguna. |

Los permisos se comprueban en servidor con `ctx.db` y `requireFeature(ctx, "documentos")`. La URL o un `tenantId` del cliente nunca concede acceso. Dirección y propietario tienen acceso total. Una entrada `editor` permite editar, mover, compartir y borrar; `lector` permite ver y descargar. Un grupo `rol+salonId` exige pertenencia al salón. Una entrada de carpeta se hereda por descendientes y documentos. Una entrada directa de archivo añade acceso. En Biblioteca se mantienen las reglas originales de `visibleRoles` y `salonId`; una carpeta puede seguir siendo visible para todos si `visibleRoles=[]`. En Mi unidad, `visibleRoles=[]` significa acceso general restringido. El acceso general por roles y salón se edita en Compartir. Las familias y alumnos siempre tienen lectura, incluso al recibir acceso general.

### Flujos y UI

Pantalla (`src/app/colegio/[slug]/documentos/`): `ExploradorDocumentos` orquesta; `ListaContenido` (tabla del sistema o cuadrícula con carpetas y archivos), `AccionesItem` (menú ⋮, clic derecho y hoja inferior móvil), `DialogoCompartir`, `PanelDetalles`, `DialogosDocumentos` (renombrar, mover y vista previa), `Subidas` y `NuevoDocumento`. Color de sección Comunicación con moderación (navegación activa, íconos, selección); el índigo solo en el botón principal, enlaces y foco. La cabecera de la tabla es la del sistema (`Table`); filtros y orden usan `Select`, `Input` y `NativeSelect` del sistema, nunca `<select>` sueltos en filtros.

- **Navegación interna**: barra lateral en escritorio; en móvil, pestañas desplazables (la activa queda a la vista). Migas con la sección y la ruta de carpetas. Estados vacíos por vista («Nada compartido contigo todavía», «La papelera está vacía»…) con `EstadoVacio`; `loading.tsx` repite la forma final.
- **Nuevo**: «Nueva carpeta» (modal con nombre y «Crear») y «Subir archivo» (selector múltiple). Nombre único, sin distinguir mayúsculas, entre carpetas hermanas. Archivos permitidos: PDF, JPG, PNG, WEBP, DOCX y XLSX, hasta 10 MB, validados por firma. En escritorio también se arrastran archivos sobre la lista; el panel «Subidas» muestra barra de progreso (XHR) y error por archivo mientras se suben y conserva los errores al terminar. La publicación existente en la Biblioteca conserva la herencia de roles y salón de su carpeta (`/api/documentos/subir`); en Mi unidad lo nuevo nace restringido.
- El botón «Nuevo» está disponible en todas las vistas para dirección, administrativo y profesor. Desde una carpeta de Mi unidad crea o sube dentro de ella; desde las demás vistas y carpetas crea o sube en la raíz de Mi unidad. Si la carpeta compartida de Mi unidad concede nivel Editor, crea dentro de ella y permanece allí. El arrastre sigue el mismo destino. Al terminar, se navega a Mi unidad y a la carpeta correspondiente, o se permanece en la carpeta compartida editable; los IDs creados se señalan temporalmente en `nuevo`, se desplazan a la vista, reciben foco de teclado y se resaltan unos segundos con movimiento reducido respetado. Se resaltan todos los archivos de una subida múltiple y se limpia el parámetro sin recarga. El aviso indica el destino.
- **Contenido**: carpetas primero; búsqueda por nombre; orden (más recientes, más antiguos, título); lista/cuadrícula recordada en `localStorage` con `try/catch`. Lista con Nombre, Propietario, Última modificación y Tamaño (en móvil, nombre con propietario/fecha/tamaño en una segunda línea). Casilla «Seleccionar todo».
- **Abrir**: clic en carpeta entra; clic en archivo abre la vista previa en modal: PDF en `iframe` e imágenes con «Descargar» y «Abrir en otra pestaña»; DOCX y XLSX, tarjeta con «Descargar». `/archivos/<id>?vista=1` se sirve `inline` solo para PDF e imágenes y es lo único que se puede incrustar (`X-Frame-Options: SAMEORIGIN` y `frame-ancestors 'self'`, regla propia en `next.config.ts`; el resto de la app y la descarga normal siguen con `DENY`). La descarga normal conserva `Content-Disposition: attachment` y auditoría (`ver` con `descarga`).
- **Menú ⋮ y clic derecho** (mismas acciones; en móvil el ⋮ abre una hoja inferior con filas de 48 px): Abrir, Descargar, Compartir, Copiar enlace, Renombrar, Mover a…, Destacar/Quitar de destacados, Detalles y Mover a la papelera; cada opción solo aparece si el permiso lo permite. En Papelera: Restaurar y Eliminar para siempre (con confirmación). Teclado: Enter abre, Supr envía a la papelera y F2 renombra la fila enfocada. Renombrar (`renombrarRecurso`) y Mover (`DialogoMover`, selector de carpetas con sangría, sin ciclos ni destinos sin permiso) usan acciones directas con aviso emergente.
- **Selección múltiple**: barra con «N seleccionados», Descargar, Mover a… y Papelera.
- **Panel de detalles** (drawer lateral; hoja inferior en móvil): tipo, tamaño, ubicación, propietario, creado y modificado; quién tiene acceso (propietario, directos, heredados con su carpeta de origen y acceso general); actividad reciente (desde `auditoria`, con textos legibles y vistas consecutivas colapsadas); Compartir, Descargar y, en documentos, «Editar» (título, descripción, reemplazo de archivo).
- **Compartir** (`DialogoCompartir`, como el diálogo de Drive): buscador de personas y grupos con teclado (↑ ↓ Enter, Retroceso quita el último chip); personas con nombre, rol y correo; grupos por rol (solo dirección, administrativo), por salón («Familias de 3.° B», «Alumnos de 3.° B», «Profesores de 3.° B») y para el profesor solo sus salones y las familias y alumnos de ellos. Los elegidos quedan como chips con un nivel (Lector o Editor; Editor no se ofrece a familias ni alumnos) y la casilla «Avisar a las personas»; el pie pasa a «Cancelar / Compartir». Sin chips, la lista «Personas con acceso» muestra al propietario arriba, cada entrada con avatar o iniciales, nombre, rol, nivel editable y «Quitar acceso», y las entradas heredadas de carpetas padre (solo lectura). «Acceso general»: Restringido (solo las personas agregadas) o Todo el colegio con roles marcados y salón opcional (obligatorio para el profesor); se guarda al cambiar, sin botón. En carpetas de la Biblioteca, «Restringido» no existe (sin roles marcados la ven todos los roles, como antes). Pie fijo: «Copiar enlace» a la izquierda y «Listo» a la derecha. Copiar enlace no crea permisos. El aviso usa el canal `documento_nuevo` (por ahora solo familias que lo permiten); el aviso de carpeta recorre sus documentos directos.
- Borrar mueve a Papelera (`eliminadoAt`, `eliminadoPorId`). Restaurar una carpeta restaura sus descendientes y documentos; eliminar para siempre retira los archivos del proveedor tras la cascada de BD. `vencimientoPapelera` (30 días) y `vaciarPapeleraVencida` (solo dirección) quedan como función de mantenimiento, sin cron nuevo.
- Reemplazar un archivo mantiene la regla previa: el último reemplaza al anterior, sin historial de versiones. El candado del plan no cambia.

### Datos y migraciones

`20261115090000_documentos_drive` crea `AmbitoDocumento`, `NivelCompartidoDocumento`, las tablas `compartidos_documento`, `destacados_documento`, `accesos_documento` y los campos de ámbito/papelera. `20261115090100_documentos_acceso_general` añade `salonId` opcional a carpetas. Las tablas nuevas tienen CHECK para exactamente un recurso, índices y unicidad por destinatario, RLS habilitado y forzado, y `REVOKE ALL` a `anon`/`authenticated`. Las relaciones de recurso son Cascade. Todos los registros existentes quedan en Biblioteca.

`CompartidoDocumento` guarda recurso (carpeta o documento), destinatario (membresía o rol con salón opcional), nivel, creador y fecha. `DestacadoDocumento` guarda usuario y recurso. `AccesoDocumento` guarda última apertura por usuario/recurso. Los archivos siguen en `Archivo.documentoId` y su ruta estable `/archivos/<id>`.

### Contratos de servidor

- `documentos-permisos.ts`: `contextoPermisosDocumento`, `nivelCarpeta`, `nivelDocumento`, `destinatarioCoincide`, `puedeEditarNivel`. Centraliza visibilidad heredada y niveles.
- `documentos.ts`: `listarContenido(ctx, {vista, carpetaId, q, orden})`, `opcionesDeCarpeta`, `salonesParaDocumentos`, `puedeVerDocumento`; `crear/editar/borrarCarpeta`, `subir/editar/reemplazar/borrarDocumento`. `borrar*` ahora son movimientos a papelera. Mantiene validación de archivo y avisos.
- `documentos-drive.ts`: `personasParaCompartir` (profesor: solo familias y alumnos de sus salones), `accesosDeRecurso`, `detalleAccesos` (propietario, entradas, heredadas, acceso general), `compartirRecurso`, `quitarAccesoRecurso`, `cambiarAccesoGeneral`, `renombrarRecurso`, `destacarRecurso`, `registrarAccesoDocumento`, `moverRecurso`, `restaurarRecurso`, `eliminarDefinitivoRecurso`, `vencimientoPapelera`, `vaciarPapeleraVencida`.
- `actions.ts` vuelve a validar contexto, rol y plan en cada operación. Las acciones del diálogo (`compartirDirectoAction`, `quitarAccesoDirectoAction`, `accesoGeneralDirectoAction`, `renombrarDirectoAction`, `moverDirectoAction`, `cargarDetalleAccesosAction`) devuelven `{ok, mensaje|error}` sin redirigir; los errores de negocio se muestran y los 403/404 de Next no se tragan. `/api/documentos/subir` aplica el mismo servicio para arrastre. `/archivos/<id>` conserva comprobación por colegio y descarga auditada.
- Las operaciones de creación, edición, compartir, cambio de acceso, mover, destacar, papelera, restauración, borrado definitivo y descarga generan auditoría. La apertura alimenta Recientes.

### Pruebas

Unitaria `tests/unit/cabeceras-seguridad.test.ts`: `DENY` global y `SAMEORIGIN` solo en `/archivos/<id>?vista=1`. Integración `tests/integracion/documentos.test.ts`: detalle de accesos (propietario, heredados, general), renombrar, mover sin ciclos, lector sin permisos, buscador acotado del profesor, papelera con vencimiento y sin huérfanos, compatibilidad de visibilidad antigua, archivo y reemplazo, aviso, roles, salón, herencia, Editor/Lector, familia sin Editor, profesor fuera de su salón, papelera/restauración/borrado de proveedor, destacados, aislamiento entre colegios y plan Base. E2E `tests/e2e/documentos.test.ts`: Lucía crea en Mi unidad con Nuevo, comparte con Familias de 3.° B (combobox, chip, Lector, pie Copiar enlace/Listo), sube un PDF con progreso y lo renombra con F2; Rosa lo ve en Compartido conmigo, abre la vista previa y lo descarga (con las cabeceras de incrustación correctas); Pedro no lo ve; papelera/restauración; Nuevo visible en todas las vistas, creación desde Papelera, subida múltiple desde Recientes y creación dentro de carpeta compartida con Editor; portería y Khipu Base sin acceso.

### Decisiones abiertas

- Historial de versiones y más formatos Office siguen fuera de alcance.
- La vista previa del PDF depende del visor del navegador (los móviles suelen abrir «Abrir en otra pestaña»); no se agregó pdf.js para no sumar dependencias.
- Falta mover por arrastre entre carpetas, descarga de carpetas como ZIP y restauración en lote.
- El vaciado a 30 días tiene función de mantenimiento, pendiente de conectarla al mantenimiento programado existente.
- El aviso al compartir una carpeta vacía no genera mensaje. Otros destinatarios distintos de familias no tienen plantilla de aviso de documentos todavía. El aviso de carpeta recorre sus documentos directos; las subcarpetas quedan para una iteración posterior.
