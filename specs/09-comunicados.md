# 09 — Comunicados

> Estado: implementado · Plan: Khipu Base · Última actualización: 2026-11-03 (rama `pre-notificaciones`: bandeja general y canales, specs/38; antes: Claude Code, rama `feat/comunicados-nivel`)

## Objetivo
Dirección, administrativos y profesores publican anuncios para todo el colegio, uno o más niveles, un grado (todas sus secciones) o un salón; las familias los leen y reciben una notificación en Khipu y por push (y por correo si se marcó «Importante»), con archivos adjuntos opcionales.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Publicar para todo el colegio, niveles, un grado o un salón; ver todos; editar o borrar los suyos (24 h) | Editar los de otros |
| Administrativo | Lo mismo que dirección (`esGeneral` en `comunicados.ts`): publicar para cualquier destino, ver todos y descargar sus adjuntos; editar o borrar los suyos (24 h) | Editar los de otros |
| Profesor | Publicar para sus salones (tutor o dicta); ver los de todo el colegio, sus salones y el nivel o grado de sus salones | Publicar para todo el colegio, niveles, grados ni salones ajenos |
| Apoderado | Leer los de todo el colegio, los salones de sus hijos y los del nivel o grado de sus hijos | Publicar |
| Alumno (con cuenta) | Leer los de todo el colegio, su salón, su nivel y su grado | Publicar |
| Portería | — | Ver comunicados o sus adjuntos |

## Flujos
1. `/comunicados`: formulario (para quién, título, mensaje, adjuntos) → «Publicar y avisar».
   - **Para quién** (dirección y administrativo): radios «Todo el colegio» · «Por nivel» (casillas de los niveles con salones activos; uno o varios) · «Un grado» (selector agrupado por nivel: «3.° grado de primaria», «Inicial de 4 años»; todas las secciones de ese grado) · «Un salón». El profesor solo ve el selector de sus salones.
2. Destinatarios: familias de los alumnos **activos** del destino — todo el colegio; los salones del nivel o niveles; los salones de ese nivel y grado; o el salón. En nivel y grado solo cuentan los salones **no archivados**.
3. Notificación en lote (specs/38, `entregarNotificaciones`): una fila en la **bandeja** (`/notificaciones`, tipo `comunicado`, clave `comunicado:<id>`) por familia con `recibeAvisos` y membresía activa (una sola por apoderado aunque tenga varios hijos) y por cada alumno con cuenta propia del destino; **push** por cada dispositivo suscrito (consentimiento vigente y preferencia `push`). **Correo solo si el comunicado es importante** (casilla «Importante: enviar también por correo», `comunicados.importante`), con consentimiento y preferencia `correo`. Consultas en lote: alumnos del destino, vínculos con consentimiento, preferencias y dispositivos, cuentas de alumnos y `createMany` (sin una consulta por familia). Si encoló algo, la acción llama a `procesarCola({ tenantId })` con `after()`: no espera al cron. El resultado dice «Se avisó a N familias» (familias con la notificación en su bandeja). La lista muestra la insignia «Importante».
4. El autor edita o borra dentro de las primeras 24 h (auditado).

## Reglas de negocio
- Título 1–120, cuerpo 1–5000 (zod).
- **Destino** (`src/lib/audiencia-comunicado.ts`, puro): `leerAudiencia` valida el formulario (`destino` = colegio | niveles | grado | salon; `niveles[]`; `grado` = «primaria:3»; `salonId`). Sin `destino` se usa `salonId` (o todo el colegio) por compatibilidad. El servidor revisa además que haya salones activos del nivel o grado («El colegio no tiene salones activos de inicial.») y que el profesor publique solo para sus salones («Elige uno de tus salones.»). El destino no se puede cambiar al editar.
- **Quién lo ve** (`whereComunicadosVisibles`, misma regla para la lista y para descargar adjuntos en `puedeVerComunicado`): dirección y administrativo, todos; el resto, los de todo el colegio, los de sus salones, los de un nivel de alguno de sus salones, los de un grado (nivel + grado) de alguno de sus salones y los propios.
- **Etiqueta** en la lista (`etiquetaAudiencia`): «Todo el colegio», «Primaria», «Inicial y primaria», «Inicial, primaria y secundaria», «3.° grado de primaria», «Inicial de 4 años» o el nombre del salón.
- **Adjuntos** (`src/lib/server/adjuntos.ts`, spec 14): hasta 5 por comunicado, 10 MB cada uno; PDF, JPG, PNG, WEBP, DOCX y XLSX (tipo real por firma; DOCX/XLSX son ZIP y se distinguen por `word/document.xml` / `xl/workbook.xml`). Se suben como privados por `FileStorage` y se enlazan con `archivos.comunicado_id` (+ `nombre`). Se validan **antes** de crear el comunicado: si uno falla no se publica nada. Al editar (24 h) se pueden quitar y agregar (máx. 5 en total); al borrar el comunicado se borran sus archivos del proveedor y la BD.
- **Descarga**: enlace estable `/archivos/<id>` (descarga como adjunto). Pasa por `requireArchivoVisible`: dirección y autor siempre; administrativos también; profesores, apoderados y alumnos solo si pueden ver el comunicado (todo el colegio, su salón, su nivel o su grado). Portería y familias/profesores de otro salón: 403.
- **Enlace directo**: el correo lleva a `/comunicados#comunicado-<id>` (`urlComunicado`); el push abre la notificación (`/notificaciones/<id>/abrir`: la marca leída) y de ahí el mismo ancla. Se eligió un ancla estable y no una ruta `/comunicados/[id]` porque la lista ya muestra los comunicados completos; la tarjeta tiene ese `id` y se resalta con `:target`. La fila `avisos` guarda `referenciaId = comunicado`.
- Editar no vuelve a avisar.

## Modelo de datos
`comunicados`: `salon_id` (un salón) · `niveles Nivel[]` (default `{}`) · `grado int?` (con un solo nivel = ese grado de ese nivel). Todo vacío = todo el colegio. Migración aditiva `20261105090000_comunicados_por_nivel` (los existentes quedan como estaban). `archivos` (`comunicado_id`, `nombre`), `avisos`.

## Contratos de `src/lib/server/comunicados.ts`
```ts
listarComunicados(ctx): ComunicadoVista[]            // + audiencia: etiqueta del destino
whereComunicadosVisibles(ctx): Prisma.ComunicadoWhereInput
salonesParaPublicar(ctx): { id, nombre, nivel, grado }[]
publicarComunicado(ctx, { titulo, cuerpo, audiencia?: AudienciaComunicado, salonId?: string|null }, adjuntos?: EntradaAdjunto[]): { id, avisados }
// AudienciaComunicado = { tipo: "colegio" } | { tipo: "niveles", niveles } | { tipo: "grado", nivel, grado } | { tipo: "salon", salonId }
editarComunicado(ctx, id, { titulo, cuerpo }, { nuevos?, quitar? }) / borrarComunicado(ctx, id)   // solo autor, ≤ 24 h
urlComunicado(slug, id)   // /comunicados#comunicado-<id>
```

## Rutas y UI
`/comunicados` (todos los roles; Khipu Base y Khipu Pro).
- Diseño: tarjetas (`Card`) con insignia de destino (`etiquetaAudiencia`, con «Para:» solo para lector de pantalla) y autor con avatar. Publicar y editar se hacen en `Dialog` (`FormularioComunicado.tsx`) con `CamposAdjuntos` (input de archivos con etiqueta visible «Adjuntar archivos (opcional)», lista de elegidos y casillas «Quitar» al editar); los adjuntos se listan con `ListaAdjuntos` (ícono por tipo, nombre, tamaño y descarga); borrar con `BotonConfirmar`. El resultado sale como toast (`Notificar`). Estado vacío con `EstadoVacio`.

## Errores y casos borde
Adjunto no válido: «“x.txt” no se puede adjuntar. Solo aceptamos PDF, JPG, PNG, WEBP, DOCX o XLSX.» · «“x” pesa más de 10 MB.» · «Puedes adjuntar hasta 5 archivos.» Fuera de las 24 h: «Solo se puede cambiar dentro de las primeras 24 horas.» Profesor sin salón elegido o con otro destino: «Elige uno de tus salones.» Nivel sin elegir: «Elige al menos un nivel.» Grado sin elegir: «Elige un grado.» Nivel o grado sin salones activos: «El colegio no tiene salones activos de 6.° grado de primaria.»

## Pruebas
- unit: `tests/unit/audiencia-comunicado.test.ts` (lectura del formulario, columnas, etiquetas) · integración: `tests/integracion/comunicados-por-nivel.test.ts` (destinatarios por nivel y grado: solo alumnos activos de salones activos, `recibeAvisos`; lectura por rol; permisos) · e2e: `tests/e2e/comunicados-por-nivel.test.ts` (dirección publica para un grado; la familia de ese grado lo ve con su etiqueta y la de otro nivel no).
- integración: `tests/integracion/gestion-mensajes-privacidad.test.ts` (alcance, avisos por familia, 24 h) · e2e: recorrido de `/comunicados` en `tests/e2e/direccion-panel.test.ts` y `tests/e2e/comunicados-adjuntos.test.ts` (publicar con PDF, descarga de la familia, 403 a portería).
- integración: `tests/integracion/adjuntos-comunicados-tareas.test.ts` (validación, acceso por rol y salón, editar/borrar) y `tests/integracion/preferencias-personal-y-comunicados-push.test.ts` (normal: bandeja + push sin correo; importante: también correo; preferencias, enlace directo) · `tests/integracion/bandeja-general.test.ts` y `comunicados-por-nivel.test.ts` (una notificación por familia, sin correo si no es importante) · unit: plantilla `comunicado` en `tests/unit/plantillas-avisos.test.ts`.

## Pendientes
- Ninguno.
