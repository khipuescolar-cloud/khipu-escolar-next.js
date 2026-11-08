# Horario unificado dentro de la Agenda

| Campo | Valor |
|---|---|
| Fecha | 2026-11-07 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta el 2026-11-11) |
| Rama y commits | `feat/agenda-unificada` |
| Specs afectadas | `specs/34-horario.md`, `specs/12-tareas-y-agenda.md`, `specs/19-planes-modulos-y-roles.md` |

## Pedidos del colaborador (textual)
> no entiendo muy bien cual es la diferencia entre el modulo de Mi Horario y el modulo de Agenda, podrias decirme porfavor

> puedes unificarlo todo en el modulo de Agenda porfavor, quiero que todo este ahi centralizado

## Decisiones
- Khipu Base (sin `agenda`): la Agenda se muestra con solo el horario de clases; eventos, exámenes y reuniones siguen siendo de Khipu Pro (elegido por Carlos).
- Las pantallas de dirección para armar horarios (horarios de salones, carga de profesores, plantillas) también pasan a la Agenda (elegido por Carlos).
- La Agenda es un módulo con pestañas por rol; las rutas del horario quedan en `/agenda/horario/…` y `/horario/…` redirige ahí.

## Cambios realizados
- `src/app/colegio/[slug]/horario/` → `src/app/colegio/[slug]/agenda/horario/` (páginas, actions y plantillas); enlaces y `revalidatePath` actualizados.
- `src/app/colegio/[slug]/horario/[[...resto]]/page.tsx`: redirección de enlaces viejos.
- `src/components/agenda/PestanasAgenda.tsx`: pestañas Calendario / Mi horario / Horario / Horarios de salones / Carga de profesores / Plantillas de horario según rol y plan.
- `agenda/page.tsx`: pestañas; sin `agenda` redirige a la primera pestaña del horario.
- `src/lib/navegacion.ts`: se quitan «Mi horario», «Horario», «Horarios» y «Plantillas de horario» del menú; el mosaico «Agenda» tiene `alternativa: "horario"`; `layout.tsx` la resuelve.
- `src/lib/modulos.ts`: roles del módulo `horario` en `USOS_FUERA_DE_NAVEGACION`.
- `ZonaSeccion`: el horario ya no fuerza la sección «Día a día»; sus páginas usan «Académico».
- e2e actualizados: `horario`, `plantillas-horario`, `planes-modulos`.

## Validación
- `pnpm typecheck` y `pnpm lint`: sin errores.
- `pnpm test`: 155 archivos, 1241 pruebas OK.
- Playwright (puerto 3060): `horario`, `plantillas-horario`, `planes-modulos`, `agenda-calendario`, `tareas-agenda` → 12/12 OK.

## Pendientes y preguntas abiertas
- Opcional: mostrar también las clases del salón en el calendario de alumnos y familias (hoy solo el profesor ve sus clases en «Calendario»; el horario del salón está en su pestaña).
