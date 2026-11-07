# 31 — Documentos del colegio

> Estado: implementado en Khipu Pro · Actualizado: 2026-11-06 · Sección Comunicación

## Objetivo y espacios

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

## Roles

| Rol | Lectura | Escritura y compartir |
|---|---|---|
| Dirección | Todo el colegio | Todo recurso; restaura y elimina definitivamente cualquier elemento. |
| Administrativo | Biblioteca visible, su unidad, compartidos | Crea en Mi unidad y Biblioteca; edita lo visible en Biblioteca y donde es editor. |
| Profesor | Biblioteca según rol/salón, su unidad, compartidos | Crea carpetas en Mi unidad, sube allí o a salones propios de la Biblioteca; administra lo suyo o donde es editor. Compartir con grupos requiere un salón propio; familias y alumnos ajenos quedan fuera. |
| Apoderado / alumno | Acceso efectivo por grupo, persona o biblioteca | Descarga y destaca. Nunca crea, sube ni recibe nivel Editor. |
| Portería | Ninguna | Ninguna. |

Los permisos se comprueban en servidor con `ctx.db` y `requireFeature(ctx, "documentos")`. La URL o un `tenantId` del cliente nunca concede acceso. Dirección y propietario tienen acceso total. Una entrada `editor` permite editar, mover, compartir y borrar; `lector` permite ver y descargar. Un grupo `rol+salonId` exige pertenencia al salón. Una entrada de carpeta se hereda por descendientes y documentos. Una entrada directa de archivo añade acceso. En Biblioteca se mantienen las reglas originales de `visibleRoles` y `salonId`; una carpeta puede seguir siendo visible para todos si `visibleRoles=[]`. En Mi unidad, `visibleRoles=[]` significa acceso general restringido. El acceso general por roles y salón se edita en Compartir. Las familias y alumnos siempre tienen lectura, incluso al recibir acceso general.

## Flujos y UI

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

## Datos y migraciones

`20261115090000_documentos_drive` crea `AmbitoDocumento`, `NivelCompartidoDocumento`, las tablas `compartidos_documento`, `destacados_documento`, `accesos_documento` y los campos de ámbito/papelera. `20261115090100_documentos_acceso_general` añade `salonId` opcional a carpetas. Las tablas nuevas tienen CHECK para exactamente un recurso, índices y unicidad por destinatario, RLS habilitado y forzado, y `REVOKE ALL` a `anon`/`authenticated`. Las relaciones de recurso son Cascade. Todos los registros existentes quedan en Biblioteca.

`CompartidoDocumento` guarda recurso (carpeta o documento), destinatario (membresía o rol con salón opcional), nivel, creador y fecha. `DestacadoDocumento` guarda usuario y recurso. `AccesoDocumento` guarda última apertura por usuario/recurso. Los archivos siguen en `Archivo.documentoId` y su ruta estable `/archivos/<id>`.

## Contratos de servidor

- `documentos-permisos.ts`: `contextoPermisosDocumento`, `nivelCarpeta`, `nivelDocumento`, `destinatarioCoincide`, `puedeEditarNivel`. Centraliza visibilidad heredada y niveles.
- `documentos.ts`: `listarContenido(ctx, {vista, carpetaId, q, orden})`, `opcionesDeCarpeta`, `salonesParaDocumentos`, `puedeVerDocumento`; `crear/editar/borrarCarpeta`, `subir/editar/reemplazar/borrarDocumento`. `borrar*` ahora son movimientos a papelera. Mantiene validación de archivo y avisos.
- `documentos-drive.ts`: `personasParaCompartir` (profesor: solo familias y alumnos de sus salones), `accesosDeRecurso`, `detalleAccesos` (propietario, entradas, heredadas, acceso general), `compartirRecurso`, `quitarAccesoRecurso`, `cambiarAccesoGeneral`, `renombrarRecurso`, `destacarRecurso`, `registrarAccesoDocumento`, `moverRecurso`, `restaurarRecurso`, `eliminarDefinitivoRecurso`, `vencimientoPapelera`, `vaciarPapeleraVencida`.
- `actions.ts` vuelve a validar contexto, rol y plan en cada operación. Las acciones del diálogo (`compartirDirectoAction`, `quitarAccesoDirectoAction`, `accesoGeneralDirectoAction`, `renombrarDirectoAction`, `moverDirectoAction`, `cargarDetalleAccesosAction`) devuelven `{ok, mensaje|error}` sin redirigir; los errores de negocio se muestran y los 403/404 de Next no se tragan. `/api/documentos/subir` aplica el mismo servicio para arrastre. `/archivos/<id>` conserva comprobación por colegio y descarga auditada.
- Las operaciones de creación, edición, compartir, cambio de acceso, mover, destacar, papelera, restauración, borrado definitivo y descarga generan auditoría. La apertura alimenta Recientes.

## Pruebas

Unitaria `tests/unit/cabeceras-seguridad.test.ts`: `DENY` global y `SAMEORIGIN` solo en `/archivos/<id>?vista=1`. Integración `tests/integracion/documentos.test.ts`: detalle de accesos (propietario, heredados, general), renombrar, mover sin ciclos, lector sin permisos, buscador acotado del profesor, papelera con vencimiento y sin huérfanos, compatibilidad de visibilidad antigua, archivo y reemplazo, aviso, roles, salón, herencia, Editor/Lector, familia sin Editor, profesor fuera de su salón, papelera/restauración/borrado de proveedor, destacados, aislamiento entre colegios y plan Base. E2E `tests/e2e/documentos.test.ts`: Lucía crea en Mi unidad con Nuevo, comparte con Familias de 3.° B (combobox, chip, Lector, pie Copiar enlace/Listo), sube un PDF con progreso y lo renombra con F2; Rosa lo ve en Compartido conmigo, abre la vista previa y lo descarga (con las cabeceras de incrustación correctas); Pedro no lo ve; papelera/restauración; Nuevo visible en todas las vistas, creación desde Papelera, subida múltiple desde Recientes y creación dentro de carpeta compartida con Editor; portería y Khipu Base sin acceso.

## Decisiones abiertas

- Historial de versiones y más formatos Office siguen fuera de alcance.
- La vista previa del PDF depende del visor del navegador (los móviles suelen abrir «Abrir en otra pestaña»); no se agregó pdf.js para no sumar dependencias.
- Falta mover por arrastre entre carpetas, descarga de carpetas como ZIP y restauración en lote.
- El vaciado a 30 días tiene función de mantenimiento, pendiente de conectarla al mantenimiento programado existente.
- El aviso al compartir una carpeta vacía no genera mensaje. Otros destinatarios distintos de familias no tienen plantilla de aviso de documentos todavía. El aviso de carpeta recorre sus documentos directos; las subcarpetas quedan para una iteración posterior.
