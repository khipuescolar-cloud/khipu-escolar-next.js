# Nudito por curso y disponibilidad de práctica

| Campo | Valor |
|---|---|
| Fecha | 2026-11-10 |
| Colaborador | Carlos (supervisor) |
| Agente y modelo | Codex · gpt-6-luna |
| Rama y commits | `feat/curriculum-importacion` · `72c5a99`, `4148f7c` |
| Specs afectadas | `specs/42-nudito-curriculo.md`, `specs/48-nudito-temario.md`, `specs/49-nudito-contenidos-del-plan.md`, `specs/50-nudito-banco-de-conocimiento.md` |

## Pedidos del colaborador (textual)

> Nueva tarea (tu rama ya tiene la ola 1 integrada): lee y ejecuta /tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/46db96ee-790c-4f66-ae50-1db53ff8b61e/scratchpad/curriculum-E.md

> Cambio del supervisor (decisión de Carlos: que los profesores ya puedan elegir TODOS los temas y los alumnos practicar): 1) el catálogo del temario de cada curso debe mostrar todos los temas de `temario-propuesto.json` de su área/grado (filtrados por disciplina según el curso), no solo los que tienen ficha; hoy `temasDeConBanco` solo carga fichas y cae al catálogo viejo de 5–7 temas. 2) Los temas sin ficha se pueden elegir; en el catálogo del profesor llevan la marca «Práctica en preparación» (ícono + palabra). 3) El alumno ve en Nudito los temas del temario publicado que tengan ficha (o generador del catálogo viejo); los que aún no tienen ficha aparecen como «Pronto» sin poder practicarlos, nunca como error. Mantén las claves históricas. Actualiza specs/48 y 50.

> Cuota restablecida. Continúa tu tarea anterior desde donde quedó (revisa git status de tu worktree), incluidos los agregados del supervisor. Antes: rebase no hace falta. Termina con pnpm lint, typecheck y test en verde, commits pequeños y resumen ultra breve (estilo caveman: solo hechos, comandos y resultados).

## Decisiones
- Temario, catálogo de curso y plan publicado se resuelven por curso Khipu. Cursos especializados filtran sus disciplinas; el área excluye las que el grado asigna a cursos especializados.
- Propuesta completa, fichas y catálogo histórico se combinan sin cambiar claves. Alumno conserva orden publicado; práctica disponible con ficha o generador histórico.
- Profesor: «Práctica en preparación» sin práctica y «Borrador» según estado editorial. Alumno ve «Pronto» deshabilitados.
- No se borraron sesiones, intentos ni dominios.

## Cambios realizados
- Servicios de plan anual y Nudito: grupos y catálogo por curso Khipu.
- Cargador de conocimiento y selector: carga de propuestas, claves históricas y estado «Pronto».
- Pruebas de integración: Química/Ciencia y Tecnología, disciplinas, orden y cursos separados.
- Specs 42, 48, 49 y 50.
- Commits: 72c5a99 Scope Nudito curricula by Khipu course; 4148f7c Document course curricula and practice readiness.

## Validación
- pnpm lint — 0.
- pnpm typecheck — 0.
- pnpm test — 0; 170 archivos, 1320 pruebas.
- Tests Nudito dirigidos — 0; 4 archivos, 32 pruebas.

## Pendientes
- Ninguno.