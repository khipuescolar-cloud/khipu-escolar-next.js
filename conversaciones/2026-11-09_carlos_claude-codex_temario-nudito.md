# Temario de Nudito (simplificación de la planificación anual)

| Campo | Valor |
|---|---|
| Fecha | 2026-11-09 |
| Colaborador | Carlos (producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (supervisión y cierre) / Codex · GPT-6-Sol (implementación hasta agotar créditos) |
| Rama y commits | `feat/nudito-temario` · `08239bd` + commit de cierre |
| Specs afectadas | `specs/48-nudito-temario.md` (antes `48-planificacion-academica-anual.md`), `specs/49`, `specs/44`, `specs/35`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> estoy teniendo problemas para saber si entendiste para que sirve el modulo de planificacion anual

> no, asi no deberia funcionar; la planificacion anual en realidad solo es una forma de poder alimentar a Nudito y solo deberia ser para 3 cursos como matematica , comunicacion y ciencias; solo esos 3 cursos son los que deben planificarse, ademas que no deberia ser un nuevo modulo o capaz si, pero lo ideal seria que dentro de nudito ; se pueda dar una opcion de seleccionar por curso, seleccionar temas; y si hay 2 profesores dentro del mismo grado y curso pues que puedan dar una revision a esos temas que nudito enseñara ; una vez finalizada la elavoracion de los temarios y sea aceptados por ambos profesores, pues que pueda recien habilitarse a los estudiantes el nudito con todos sus temas

> se acabaron los creditos de codex, puedes crearlo tu por medios de multiagentes

## Decisiones
- Respuestas de Carlos a las preguntas de diseño: todos los profesores son iguales (sin coordinador); solo se revisan los temas, no el contenido de las lecciones; dirección solo ve el estado; se conservan orden de temas, comentarios por tema y «Copiar del año anterior».
- El temario vive dentro de Nudito (`/nudito/temario`, pestañas Temario · Seguimiento); se quita «Planificación anual» del menú y `/planificacion/*` redirige.
- Solo Matemática, Comunicación y Ciencia y Tecnología; solo temas del catálogo global.
- Se reutilizan las tablas `planes_anuales`/`plan_anual_*` sin migración: `rondaRevision` cuenta cambios y reinicia aceptaciones; al aceptar todos se crea `plan_anual_versiones` y el estado pasa a `publicado` («Habilitado»). El alumno lee siempre la última versión habilitada.
- Las lecciones aprobadas por docentes dejan de ser requisito para que el alumno vea un tema.
- Tras agotarse los créditos de Codex, Claude terminó el cierre directamente (quedaba poco: arreglo de UI, e2e y documentación), sin lanzar subagentes.

## Cambios realizados
- Codex: servicio `src/lib/server/plan-anual/temario.ts`, páginas `/nudito/temario` y `/nudito/temario/[id]`, redirección de `/planificacion`, eliminación del flujo anterior (coordinador, observaciones, reuniones, versiones, materiales), seed demo, specs y pruebas nuevas.
- Claude: reescritura legible de `/nudito/temario/[id]` (estado y botón «Acepto» arriba, comentarios plegables, temas ya elegidos marcados en el catálogo, filtro de competencia como lista, «Quitar» sin rojo sólido, aviso cuando los alumnos siguen con la versión anterior), componente `PestanasNudito` reutilizado en Temario y Seguimiento, nivel con mayúscula, selector e2e ajustado, spec 48 renombrada y completada.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test`: 160 archivos, 1280 pruebas en verde.
- `E2E_PORT=3060 APP_BASE_DOMAIN=lvh.me:3060 pnpm e2e tests/e2e/plan-anual-nudito.test.ts`: 1/1 en verde.
- `pnpm e2e tests/e2e/nudito-tutor.test.ts` (mismo puerto): 10/10 en verde.
- Capturas revisadas de `/nudito/temario` y del detalle con la cuenta de un profesor demo.

## Pendientes y preguntas abiertas
- No se ejecutó `pnpm db:reconstruir` (la BD local es compartida con otras sesiones); el seed actualizado se aplica en la próxima reconstrucción.
- Falta integrar `feat/nudito-temario` a `dev` (espera visto bueno de Carlos).
- Next dev muestra «1 Issue» en el overlay; la consola de `/nudito/temario` no registra errores, no parece venir de este cambio.
