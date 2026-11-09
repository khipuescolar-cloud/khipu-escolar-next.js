# Ajuste de píldoras de calificación en Libreta

| Campo | Valor |
|---|---|
| Fecha | 2026-11-09 |
| Colaborador | Carlos (producto) |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | `feat/libreta-tabla` · este commit |
| Specs afectadas | `specs/11-notas-y-libreta.md` |

## Pedidos del colaborador (textual)

> Ajuste visual (revisé capturas): las píldoras de calificación se parten en dos líneas ('B · En' / 'proceso'). 1) En TablaLibretas, cada celda debe mostrar una píldora compacta en una sola línea: ícono + solo la letra o el número (p. ej. 'B'), con whitespace-nowrap, y la etiqueta completa en title y aria-label (ej. 'B · En proceso'); agrega debajo de la tabla una leyenda breve de la escala (AD/A/B/C con su etiqueta) para literal. 2) En DocumentoLibreta, la columna Calificación debe mostrar la píldora completa en una línea (whitespace-nowrap, ancho de columna suficiente, p. ej. w-40). Si conviene, añade una variante compacta a src/components/Calificacion.tsx sin romper otros usos. Corre lint, typecheck y los e2e de libreta (node_modules ya está instalado de verdad en el worktree, usa pnpm normal) y haz commit. No toques tsconfig.json en el commit.

## Decisiones

- Se añadió `compacta` como variante opcional de `Calificacion`; la presentación existente sigue siendo la predeterminada.
- El texto completo queda en `title` y `aria-label` y todas las píldoras usan `whitespace-nowrap`.
- La tabla muestra la leyenda solo cuando la escala del colegio es literal.

## Cambios realizados

- `src/components/Calificacion.tsx`: variante compacta y etiquetas accesibles.
- `src/app/colegio/[slug]/libreta/TablaLibretas.tsx`: variante compacta y leyenda literal.
- `src/app/colegio/[slug]/libreta/DocumentoLibreta.tsx`: columna y celdas de calificación de una línea.
- `src/lib/server/libreta.ts`: escala del colegio en el resumen.
- `tests/e2e/notas-libreta.test.ts`: aserciones del texto, etiqueta y `white-space`.
- `specs/11-notas-y-libreta.md`: regla visual actualizada.
- `tsconfig.json` ya aparecía modificado al iniciar esta sesión; se dejó fuera del commit.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- `E2E_PORT=3060 APP_BASE_DOMAIN=lvh.me:3060 pnpm e2e tests/e2e/notas-libreta.test.ts`: 9 de 9 pruebas aprobadas.
- `git diff --check`: sin errores.

## Pendientes y preguntas abiertas

- Ninguno para este ajuste.
