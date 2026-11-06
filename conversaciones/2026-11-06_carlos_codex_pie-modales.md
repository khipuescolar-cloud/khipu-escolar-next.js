# Pie de modales y hojas

| Campo | Valor |
|---|---|
| Fecha | 2026-11-06 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | `dev` · `Fix modal footer alignment` (este commit) |
| Specs afectadas | `specs/18-sistema-de-diseno.md` |

## Pedidos del colaborador (textual)
> Lee y ejecuta completo el encargo en /tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/prompt-pie-modales.md . Trabaja de forma autónoma hasta terminar, sin pedir confirmaciones.

El encargo incluye el pedido original del dueño:
> «en la mayoria de modales que tienen esto en la parte inferior, se descuadra la informacion, podrias acomodarlo para que en diseño se vea bien… ves que esta todo descuadrado»

## Decisiones
- Mantener el scroll del panel y desplazar el `sticky` del pie lo mismo que el padding inferior (20 px en móvil, 24 px desde `sm`). Así funciona aunque el pie sea hijo de un formulario.
- Dar al pie un fondo opaco, separador y `z-10` para cubrir el contenido que pasa detrás; apilar las acciones a todo el ancho en móvil.
- En los dos formularios de `Sheet` con pie dentro del formulario, eliminar el padding después del pie y compensar el padding horizontal del formulario.
- No modificar la barra sticky de pasar lista: pertenece a la página, no a un modal ni a un drawer.

## Cambios realizados
- `src/components/ui/dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`: pies compartidos alineados y botones móviles a todo el ancho.
- `src/components/horario/EditorHoras.tsx`, `src/app/plataforma/anuncios/FormularioAnuncio.tsx`: pies de hojas anidados en formularios sin franja inferior ni laterales.
- `DESIGN.md`, `specs/18-sistema-de-diseno.md`: regla de diseño de pies con scroll.
- Capturas `pie-*.png` en el scratchpad del encargo a 1440 × 900 y 390 × 844.

## Validación
- `pnpm lint`: correcto.
- `pnpm typecheck`: correcto.
- `pnpm exec vitest run tests/unit`: 79 archivos, 582 pruebas aprobadas.
- Playwright manual: comunicado con scroll a mitad y al final en ambas resoluciones, otro modal de documentos y drawer de reportes. El pie quedó a 1 px del borde exterior, correspondiente al borde del panel.
- `E2E_PORT=3063 APP_BASE_DOMAIN=lvh.me:3063 NEXT_DIST_DIR=.next-pie pnpm exec playwright test tests/e2e/comunicados*.test.ts`: 4 pruebas aprobadas (55,1 s).

## Pendientes y preguntas abiertas
- Ninguno.
