# Comentarios de tareas: aviso al profesor y respuesta

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta el 2026-11-11) |
| Rama y commits | `feat/comentarios-tarea-avisos` |
| Specs afectadas | `specs/39-tareas.md` |

## Pedidos del colaborador (textual)
> [capturas: comentario de la alumna en la tarea y revisión del profesor] acabo de enviarle un comentario al profesor para que me responda, pero no veo que le aya llegado algo al profesor o donde lo puede ver?

## Diagnóstico
- El comentario se guardaba, pero no generaba ningún aviso. Solo se veía abriendo «Ver» en la fila del alumno, sin marca en la tabla.
- El profesor no tenía dónde responder (solo el comentario ligado a la nota).

## Cambios realizados
- `src/lib/server/tareas/vistas.ts`: `comentarTarea` avisa en la bandeja (profesor ↔ alumno/familia); `tareasDelDocente` cuenta `comentariosSinResponder` por sección.
- `tareas/[id]/revision/page.tsx` y `PanelRevision.tsx`: marca «Comentario sin responder», conversación tipo chat, campo «Responder» y apertura automática con `?alumno=`.
- `ListaDocente.tsx` y `page.tsx`: «N comentarios sin responder» en la fila de la tarea y en la carpeta del curso.
- Test de integración nuevo en `tests/integracion/tareas-classroom.test.ts`.

## Validación
- tsc y lint limpios; integración de tareas 23/23; e2e `tareas-classroom` y `tareas-agenda` en verde.
- Navegador: como Carla Mendoza, la carpeta 2.° A y la fila de Jimena muestran el comentario sin responder; el panel ofrece «Responder».

## Pendientes y preguntas abiertas
- El comentario de Jimena es anterior al cambio: no generó notificación (la marca «sin responder» sí aparece).
- Hoy el aviso es solo de bandeja; se podría sumar push al profesor si Carlos lo quiere.

## Seguimiento: chat en panel lateral
> [captura de la revisión] donde dice ver , deberia aparecer un icono como de un chat y al abrirlo que se abra un drawer como si fuera un chat para poder responder el comentario , de esa manera vamos a responder, no vamos a responder por un modal

- Nuevo `tareas/[id]/revision/ChatComentarios.tsx`: botón con ícono de chat junto a «Ver» (relleno y con punto si hay un comentario sin responder) que abre un `Sheet` lateral con la conversación y el campo para responder (Enter envía).
- El modal «Ver» ya no muestra comentarios: solo la entrega y la nota. El aviso (`?alumno=`) abre el chat.
- Validación: tsc y lint limpios; e2e `tareas-classroom` en verde; captura con Carla Mendoza (conversación con Jimena).

## Seguimiento: campo del chat
> tiene que desaparecer esto "Enter para enviar · Mayús + Enter para otra línea" tambien que el input cuando ingreso mucho texto se deforma, aqui vamos a usar un input que vaya creaciendo en vertical y acomodandose segun la cantidad de palabras que lleva, ademas que lo maximo que deberia mostrar son 3 filas y luego usar un scroll automatico

- Sin la línea de ayuda. El campo empieza en una fila, crece hasta 3 y luego hace scroll interno; vuelve a una fila tras enviar (`ajustar` en `ChatComentarios.tsx`).
- Validación: en el navegador, alto 44 px (1 fila) → 62 px (2) → 82 px tope (3 filas con 5 líneas escritas); tsc y lint limpios.
