# Fichas de Nudito: Matemática y Comunicación de 1.° de secundaria

| Campo | Valor |
|---|---|
| Fecha | 2026-11-13 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Codex · GPT-5 |
| Rama y commits | `feat/fichas-banco` · pendiente de registrar |
| Specs afectadas | `specs/50-nudito-banco-de-conocimiento.md` |

## Pedidos del colaborador (textual)
> claude se quedo sin creditos , puedes seguir con lo que andaba haciendo?

## Decisiones
- Se retomaron los lotes no integrados de 1.° de secundaria, en el orden definido: Matemática y Comunicación; Ciencia y Tecnología queda pendiente para completar el grado.
- La detección de posibles datos personales valida el texto didáctico, pero omite las respuestas y alternativas aceptadas: resultados matemáticos de ocho cifras no son documentos de identidad.
- Se conservan la revisión pedagógica y el muestreo manual como pendientes; esta integración acredita validación técnica del banco.

## Cambios realizados
- Se añadieron 142 fichas de Matemática y 107 de Comunicación para 1.° de secundaria, con 12 ejercicios por ficha.
- `scripts/nudito-validar-banco.ts`: se corrigió el falso positivo con respuestas matemáticas de ocho cifras.
- `specs/50-nudito-banco-de-conocimiento.md`: se actualizó el estado y avance del banco.

## Validación
- Validador del banco: `Banco válido: 2238 fichas activas; 27034 ejercicios`.
- Lint del script: ejecutado junto al validador, sin errores atribuibles al cambio.
- Typecheck: no ejecutable en este worktree porque el enlace compartido a dependencias no contiene `src/generated/prisma`; los errores reportados son de módulos Prisma y tipos Next generados ausentes.

## Pendientes y preguntas abiertas
- Escribir y validar Ciencia y Tecnología de 1.° de secundaria antes de continuar con 2.°.
- Revisión pedagógica y por muestreo de las fichas de primaria y de estas dos combinaciones antes de su publicación.
