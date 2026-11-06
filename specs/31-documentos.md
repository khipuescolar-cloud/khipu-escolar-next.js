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

- El botón «Nuevo» ofrece «Nueva carpeta» y «Subir archivo». El nombre es obligatorio y único, sin distinguir mayúsculas, entre carpetas hermanas del mismo espacio. Los archivos permitidos son PDF, JPG, PNG, WEBP, DOCX y XLSX, hasta 10 MB; se validan por firma. La subida por arrastre en escritorio usa el mismo servicio y muestra estado por archivo.
- Migas de pan, búsqueda por nombre visible, carpetas primero, orden por modificación o nombre y vista de lista/cuadrícula (preferencia local con `try/catch`). En móvil se usa selector de vista y filas sin desbordamiento. La lista muestra Nombre, Propietario, Última modificación y Tamaño.
- Clic en carpeta navega; clic en archivo abre vista previa. PDF e imágenes se sirven `inline` solo con `?vista=1` y después de la validación de `/archivos/<id>`; Office ofrece descarga. La descarga normal conserva `Content-Disposition: attachment` y auditoría.
- Menú ⋮ y clic derecho: abrir, descargar, renombrar, mover, compartir, copiar enlace, destacar, detalles y papelera, según permiso. Enter activa los botones; Supr envía a papelera y F2 abre edición. Selección múltiple permite mover, descargar o enviar a papelera. El panel lateral muestra tipo, tamaño, ubicación, propietario, creación, modificación, accesos directos y acciones recientes de auditoría.
- Compartir permite buscar una persona activa o elegir grupos por rol y salón. Cada entrada recibe Lector o Editor; el propietario encabeza la lista; se puede quitar acceso. Acceso general permite Restringido o roles marcados con salón opcional. Copiar enlace no crea permisos. «Avisar a las personas» usa por ahora el canal existente `documento_nuevo` para familias cuando se comparte un documento o una carpeta con documentos directos. El aviso opcional de la subida también usa ese canal; se respetan consentimiento y preferencias existentes.
- Borrar mueve a Papelera (`eliminadoAt`, `eliminadoPorId`). Se puede restaurar o eliminar para siempre; el borrado definitivo retira los archivos del proveedor después de la cascada de BD. `vencimientoPapelera` es función pura de 30 días; `vaciarPapeleraVencida` puede invocarse desde mantenimiento existente sin crear un cron nuevo. Restaurar una carpeta restaura sus descendientes y documentos.
- Reemplazar un archivo mantiene la regla previa: el último reemplaza al anterior, sin historial de versiones. Las notificaciones y el candado del plan no cambian.

## Datos y migraciones

`20261115090000_documentos_drive` crea `AmbitoDocumento`, `NivelCompartidoDocumento`, las tablas `compartidos_documento`, `destacados_documento`, `accesos_documento` y los campos de ámbito/papelera. `20261115090100_documentos_acceso_general` añade `salonId` opcional a carpetas. Las tablas nuevas tienen CHECK para exactamente un recurso, índices y unicidad por destinatario, RLS habilitado y forzado, y `REVOKE ALL` a `anon`/`authenticated`. Las relaciones de recurso son Cascade. Todos los registros existentes quedan en Biblioteca.

`CompartidoDocumento` guarda recurso (carpeta o documento), destinatario (membresía o rol con salón opcional), nivel, creador y fecha. `DestacadoDocumento` guarda usuario y recurso. `AccesoDocumento` guarda última apertura por usuario/recurso. Los archivos siguen en `Archivo.documentoId` y su ruta estable `/archivos/<id>`.

## Contratos de servidor

- `documentos-permisos.ts`: `contextoPermisosDocumento`, `nivelCarpeta`, `nivelDocumento`, `destinatarioCoincide`, `puedeEditarNivel`. Centraliza visibilidad heredada y niveles.
- `documentos.ts`: `listarContenido(ctx, {vista, carpetaId, q, orden})`, `opcionesDeCarpeta`, `salonesParaDocumentos`, `puedeVerDocumento`; `crear/editar/borrarCarpeta`, `subir/editar/reemplazar/borrarDocumento`. `borrar*` ahora son movimientos a papelera. Mantiene validación de archivo y avisos.
- `documentos-drive.ts`: personas y grupos para compartir; listar/añadir/quitar accesos; acceso general; destacar; registrar apertura; mover; restaurar; eliminar definitivamente; vencimiento y vaciado a 30 días.
- `actions.ts` vuelve a validar contexto, rol y plan en cada operación. `/api/documentos/subir` aplica el mismo servicio para arrastre. `/archivos/<id>` conserva comprobación por colegio y descarga auditada.
- Las operaciones de creación, edición, compartir, cambio de acceso, mover, destacar, papelera, restauración, borrado definitivo y descarga generan auditoría. La apertura alimenta Recientes.

## Pruebas

Integración `tests/integracion/documentos.test.ts`: compatibilidad de visibilidad antigua, archivo y reemplazo, aviso, roles, salón, herencia, Editor/Lector, familia sin Editor, profesor fuera de su salón, papelera/restauración/borrado de proveedor, destacados, aislamiento entre colegios y plan Base. E2E `tests/e2e/documentos.test.ts`: Lucía crea en Mi unidad, comparte con Familias de 3.° B, sube PDF; Rosa lo ve y descarga; Pedro no lo ve; papelera/restauración; portería y Khipu Base sin acceso.

## Decisiones abiertas

- Historial de versiones y más formatos Office siguen fuera de alcance.
- El vaciado a 30 días tiene función de mantenimiento, pendiente de conectarla al mantenimiento programado existente.
- El aviso al compartir una carpeta vacía no genera mensaje. Otros destinatarios distintos de familias no tienen plantilla de aviso de documentos todavía. El aviso de carpeta recorre sus documentos directos; las subcarpetas quedan para una iteración posterior.
