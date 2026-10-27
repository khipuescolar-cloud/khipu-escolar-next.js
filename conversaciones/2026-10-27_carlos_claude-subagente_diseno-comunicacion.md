# Rediseño de Mensajes, Comunicados, Nudito, Perfil y Consentimiento

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · Claude Sonnet 5.5 |
| Rama y commits | `feat/diseno-comunicacion` · ver `git log` |
| Specs afectadas | `specs/08`, `09`, `13`, `15`, `18` |

## Pedidos del colaborador (textual)
> mejora el diseño de todo el sistema y deja un archivo donde se especifique el diseño, tema, colores, formas, stilos etc

(El orquestador asignó a este subagente las pantallas de comunicación: mensajes, comunicados, Nudito, perfil y consentimiento.)

## Decisiones
- Mensajes: dos columnas en escritorio (lista + hilo), lista → hilo en móvil. Junto al hilo abierto la lista no muestra vista previa para no duplicar el texto del último mensaje (y no romper el e2e con selectores por texto).
- Comunicados: crear y editar en `Dialog`, borrar con `BotonConfirmar`; los diálogos se remontan con una clave según `?ok=`/`?error=` para cerrarse tras la acción. Sin cambios en server actions.
- Nudito: panel con tokens shadcn, chips de sugerencia iniciales (solo envían texto al motor existente; no se tocaron sus respuestas), mascota y animación intactas.
- Resultados con toast (`Notificar`) en lugar de `Flash`.

## Cambios realizados
- `src/app/colegio/[slug]/mensajes/**` (nuevo `ListaConversaciones.tsx`), `comunicados/**` (nuevo `FormularioComunicado.tsx`), `nudito/page.tsx`, `perfil/page.tsx`, `consentimiento/page.tsx`, `src/components/nudito/NuditoWidget.tsx`.
- Specs 08, 09, 13, 15 y 18 §8 (patrón de burbujas y chips).
- `archivos/[id]/route.ts` no tiene UI: sin cambios.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (275) en verde.
- e2e `chat-familia-profesor`, `nudito`, `paginas-basico-por-rol`, `crm-personal`: 10/10 en verde (puerto 3013 con `APP_BASE_DOMAIN=lvh.me:3013`, porque el 3003 lo ocupaba otro worktree).
- Capturas 1366 y 390 px, claro y oscuro, en el directorio de trabajo del agente (`.../scratchpad/diseno-comunicacion/`).
- Selectores de test: ninguno cambió.

## Pendientes y preguntas abiertas
- Quedaron 1–2 conversaciones demo de Rosa creadas para las capturas; el afterAll del e2e de chat las borra.
- Probar el flujo de crear/editar/borrar comunicado en el navegador con direccion (cubierto solo por typecheck y por la vista del diálogo).
