# E2E de planificación anual → materiales → Nudito

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | colaborador (vía agente orquestador) |
| Agente y modelo | Claude Code · claude-opus-5-5 (subagente) |
| Rama y commits | `feat/plan-anual-e2e` · commit local de esta sesión |
| Specs afectadas | `specs/48-planificacion-academica-anual.md`, `specs/49-nudito-contenidos-del-plan.md` |

## Pedidos del colaborador (textual)
> TAREA: escribir `tests/e2e/plan-anual-nudito.test.ts` (Playwright) que verifique POR LA UI, sobre un colegio temporal Pro con datos ficticios:
> 1. Dos profesores dictan Matemática en dos secciones de 5.° primaria (prepara esto vía Prisma en el setup como hacen los ayudantes; Nudito activo en nudito_config_colegio).
> 2. Profesor A entra a /planificacion, ve el grupo (5.° primaria, Matemática) y crea el plan; dirección designa coordinador a A (UI de dirección); A y B agregan temas desde el catálogo (pestaña Temas); A envía a revisión; B deja una observación (pestaña Revisión); A intenta aprobar/publicar y ve el bloqueo; A resuelve y reenvía; ambos registran conformidad; A aprueba y publica; pestaña Versiones muestra la versión 1.
> 3. Pestaña Materiales: «Preparar materiales»/«Continuar» hasta completar; abrir una lección, enviarla a revisión, aprobar (B) y publicar (A) — el resto puede hacerse por servicio para no alargar.
> 4. Alumno ficticio entra a /nudito: ve su nombre en la bienvenida, el curso Matemática, SOLO los temas publicados, y NO existe el texto/botón «Otro tema»; elige un tema, ve el repaso de la lección, responde mal (ve retroalimentación), pide una pista, termina y ve resultados; puede volver a practicar.
> 5. Profesor ve /planificacion/<id>/progreso con el alumno.
> 6. Repite el recorrido del alumno (paso 4, versión corta) con viewport 360×740 y verifica `document.documentElement.scrollWidth <= window.innerWidth`.
> Limpia el colegio temporal al final (como los demás e2e).

## Decisiones
- Setup por SQL con `crearColegioTemporal` (ahora expone `miembro` y `dominio`): profesor B, salones 5.° A/B, cursos de
  Matemática, alumno con cuenta, apoderada con consentimiento de IA vigente y `nudito_config_colegio` activo.
- Todo el flujo pasa por la UI, incluidas las dos lecciones publicadas (la tercera queda en borrador para comprobar que el
  alumno no la ve). Solo se lee de la BD la solución del ejercicio abierto para responder bien/mal.
- El «bloqueo» se verifica así: con la observación abierta no hay «Aprobar/Publicar» y «Reenviar» muestra «Resuelve
  todas las observaciones abiertas.»; tras reenviar, «Aprobar plan» sin conformidades muestra el error de conformidad.

## Cambios realizados
- `tests/e2e/plan-anual-nudito.test.ts` (nuevo) y `tests/e2e/ayudantes/colegio-temporal.ts`.
- `tests/e2e/nudito-tutor.test.ts`: seguía esperando «Otro tema» (retirado por specs/49) y fallaba por modo estricto
  porque los resultados repiten el nombre del tema en «Por reforzar»; se reemplazó la prueba de «Otro tema» por una que
  verifica su ausencia y se acotó el nombre del tema a «Tus temas».
- Bug: Materiales y Progreso reventaban (error no controlado de `fotoDelPlan`) si el plan no estaba publicado → aviso.
- UX: Materiales, Progreso y observaciones de Revisión mostraban la clave interna del tema (`mat.p5.…`) → nombre del
  tema con `nombresDeTemas` (`src/lib/server/nudito/lecciones/index.ts`). `<main>` anidados dentro del layout → `<div>`.

## Validación
- `pnpm lint`, `pnpm typecheck`, vitest de `plan-anual*` y `nudito-*` (13 archivos, 125 pruebas) y e2e en el puerto 3062.

## Pendientes y preguntas abiertas
- Ninguno propio de esta sesión.
