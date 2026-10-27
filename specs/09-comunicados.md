# 09 — Comunicados

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-27 (Claude Code, rama `feat/p2-comunicacion`)

## Objetivo
Dirección y profesores publican anuncios para todo el colegio o para un salón; las familias los leen y reciben un aviso por correo y push, con archivos adjuntos opcionales.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Publicar para todo el colegio o un salón; ver todos; editar o borrar los suyos (24 h) | Editar los de otros |
| Profesor | Publicar para sus salones (tutor o dicta); ver los de todo el colegio y sus salones | Publicar para todo el colegio ni para salones ajenos |
| Apoderado | Leer los de todo el colegio y los salones de sus hijos | Publicar |

## Flujos
1. `/comunicados`: formulario (para quién, título, mensaje, adjuntos) → «Publicar y avisar».
2. Se encola un aviso `comunicado` por familia (una sola vez por apoderado aunque tenga varios hijos), solo con consentimiento vigente y `recibeAvisos`: una fila de **correo** (si la familia no lo apagó) y una de **push** por cada dispositivo suscrito (si no apagó el push), según `preferencias_aviso`. Después de responder, la acción llama a `procesarCola({ tenantId })` con `after()`: no espera al cron (tope diario y reserva atómica de la cola intactos). El resultado dice «Se avisó a N familias».
3. El autor edita o borra dentro de las primeras 24 h (auditado).

## Reglas de negocio
- Título 1–120, cuerpo 1–5000 (zod).
- **Adjuntos** (`src/lib/server/adjuntos.ts`, spec 14): hasta 5 por comunicado, 10 MB cada uno; PDF, JPG, PNG, WEBP, DOCX y XLSX (tipo real por firma; DOCX/XLSX son ZIP y se distinguen por `word/document.xml` / `xl/workbook.xml`). Se suben como privados por `FileStorage` y se enlazan con `archivos.comunicado_id` (+ `nombre`). Se validan **antes** de crear el comunicado: si uno falla no se publica nada. Al editar (24 h) se pueden quitar y agregar (máx. 5 en total); al borrar el comunicado se borran sus archivos del proveedor y la BD.
- **Descarga**: enlace estable `/archivos/<id>` (descarga como adjunto). Pasa por `requireArchivoVisible`: dirección y autor siempre; profesores, apoderados y administrativos solo si pueden ver el comunicado (todo el colegio, o su salón). Portería y familias/profesores de otro salón: 403.
- **Enlace directo**: el correo y el push llevan a `/comunicados#comunicado-<id>` (`urlComunicado`). Se eligió un ancla estable y no una ruta `/comunicados/[id]` porque la lista ya muestra los comunicados completos; la tarjeta tiene ese `id` y se resalta con `:target`. La fila `avisos` guarda `referenciaId = comunicado`.
- Editar no vuelve a avisar.

## Modelo de datos
`comunicados` (`salonId` null = todo el colegio), `archivos` (`comunicado_id`, `nombre`), `avisos`.

## Contratos de `src/lib/server/comunicados.ts`
```ts
listarComunicados(ctx): ComunicadoVista[]
salonesParaPublicar(ctx)
publicarComunicado(ctx, { titulo, cuerpo, salonId|null }, adjuntos?: EntradaAdjunto[]): { id, avisados }
editarComunicado(ctx, id, { titulo, cuerpo }, { nuevos?, quitar? }) / borrarComunicado(ctx, id)   // solo autor, ≤ 24 h
urlComunicado(slug, id)   // /comunicados#comunicado-<id>
```

## Rutas y UI
`/comunicados` (todos los roles de plan Básico+).
- Diseño: tarjetas (`Card`) con insignia de destino y autor con avatar. Publicar y editar se hacen en `Dialog` (`FormularioComunicado.tsx`) con `CamposAdjuntos` (input de archivos con etiqueta visible «Adjuntar archivos (opcional)», lista de elegidos y casillas «Quitar» al editar); los adjuntos se listan con `ListaAdjuntos` (ícono por tipo, nombre, tamaño y descarga); borrar con `BotonConfirmar`. El resultado sale como toast (`Notificar`). Estado vacío con `EstadoVacio`.

## Errores y casos borde
Adjunto no válido: «“x.txt” no se puede adjuntar. Solo aceptamos PDF, JPG, PNG, WEBP, DOCX o XLSX.» · «“x” pesa más de 10 MB.» · «Puedes adjuntar hasta 5 archivos.» Fuera de las 24 h: «Solo se puede cambiar dentro de las primeras 24 horas.» Profesor sin salón elegido: «Elige uno de tus salones.»

## Pruebas
- integración: `tests/integracion/gestion-mensajes-privacidad.test.ts` (alcance, avisos por familia, 24 h) · e2e: recorrido de `/comunicados` en `tests/e2e/direccion-panel.test.ts` y `tests/e2e/comunicados-adjuntos.test.ts` (publicar con PDF, descarga de la familia, 403 a portería).
- integración: `tests/integracion/adjuntos-comunicados-tareas.test.ts` (validación, acceso por rol y salón, editar/borrar) y `tests/integracion/preferencias-personal-y-comunicados-push.test.ts` (correo + push, preferencias, enlace directo) · unit: plantilla `comunicado` en `tests/unit/plantillas-avisos.test.ts`.

## Pendientes
- Ninguno.
