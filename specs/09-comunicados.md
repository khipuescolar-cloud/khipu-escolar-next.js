# 09 — Comunicados

> Estado: implementado · Plan: Básico · Última actualización: 2026-10-26 (Claude Code, rama `feat/gestion`)

## Objetivo
Dirección y profesores publican anuncios para todo el colegio o para un salón; las familias los leen y reciben un aviso por correo.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Publicar para todo el colegio o un salón; ver todos; editar o borrar los suyos (24 h) | Editar los de otros |
| Profesor | Publicar para sus salones (tutor o dicta); ver los de todo el colegio y sus salones | Publicar para todo el colegio ni para salones ajenos |
| Apoderado | Leer los de todo el colegio y los salones de sus hijos | Publicar |

## Flujos
1. `/comunicados`: formulario (para quién, título, mensaje) → «Publicar y avisar».
2. Se encola un aviso `comunicado` por familia (una sola vez por apoderado aunque tenga varios hijos), solo con consentimiento vigente y `recibeAvisos`. El resultado dice «Se avisó a N familias».
3. El autor edita o borra dentro de las primeras 24 h (auditado).

## Reglas de negocio
- Título 1–120, cuerpo 1–5000 (zod). Adjuntos: pendiente (spec 14).
- Editar no vuelve a avisar.

## Modelo de datos
`comunicados` (`salonId` null = todo el colegio), `avisos`.

## Contratos de `src/lib/server/comunicados.ts`
```ts
listarComunicados(ctx): ComunicadoVista[]
salonesParaPublicar(ctx)
publicarComunicado(ctx, { titulo, cuerpo, salonId|null }): { id, avisados }
editarComunicado(ctx, id, { titulo, cuerpo }) / borrarComunicado(ctx, id)   // solo autor, ≤ 24 h
```

## Rutas y UI
`/comunicados` (todos los roles de plan Básico+).

## Errores y casos borde
Fuera de las 24 h: «Solo se puede cambiar dentro de las primeras 24 horas.» Profesor sin salón elegido: «Elige uno de tus salones.»

## Pruebas
- integración: `tests/integracion/gestion-mensajes-privacidad.test.ts` (alcance, avisos por familia, 24 h) · e2e: recorrido de `/comunicados` en `tests/e2e/direccion-panel.test.ts`.

## Pendientes
- Adjuntos (spec 14), push, enlace directo al comunicado en el correo (hoy lleva a `/comunicados`).
