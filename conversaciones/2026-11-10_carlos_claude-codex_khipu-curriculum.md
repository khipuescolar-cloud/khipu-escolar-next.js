# KHIPU-CURRICULUM: catálogo global, plan de estudios y Nudito por curso

| Campo | Valor |
|---|---|
| Fecha | 2026-11-09 a 2026-11-11 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (supervisor) / Codex · GPT-6-Sol y GPT-6-Luna (implementación, 4 agentes vía Herdr) |
| Rama y commits | `feat/khipu-curriculum` (integra `feat/curriculum-modelo`, `-importacion`, `-seguridad`) · hasta `d95f046` |
| Specs afectadas | `specs/52` (nueva), `53` (nueva), `54` (nueva), `51`, `48`, `49`, `50`, `42`, `35`, `36`, `10`, `16`, `00-indice` |

## Pedidos del colaborador (textual)
> ya me entregaron el documento y esta aqui todo lo que necesitas saber : KHIPU-CURRICULUM ; porfavor hazlo con multiagentes de codex para que no te desgastes tanto

> yo hare la revision, me imageino que al momento de revisar cada uno de los temas y aceptarlo, se aceptaran de manera permanente verdad? eso quiere decir que si creo un nuevo colegio ellos podran escoger entre los temas que yo acepte verdad?

> por el momento puedes hacer que todos los temas sean aceptos, ya luego si algo falla o algo esta mal te aviso, pero necesito que todo este listo para que los profesores solo seleccionen sus temas y los alumnos empiecen a hacer sis practicas

> esperamos mejor

> porfavor esto tenlo como regla para todos los agentes y modelos ; usar la skill de Caveman para que ahorres tokkens de salida

> listo ya cargaron los creditos, puedes usar codex

> lo usara para toda primaria y secundaria

> no se si el modelo que tienen codex es el indicado, si lo hace mal supervisalo porfavor

> estas seguro que aun no terminan?

(El paquete KHIPU-CURRICULUM está fuera del repo: `StartUp/KHIPU-CURRICULUM/`.)

## Decisiones
- Un solo catálogo: los 1145 candidatos del paquete se fusionan con los 3839 temas del banco; se conservan las claves actuales (reporte en `docs/curriculum/reporte-fusion.md`: 138 emparejados, 297 cubiertos, 14 nuevos, 214 conflictos para revisión, 482 de áreas sin Nudito).
- El temario lo habilitan solo los profesores (sin aprobación de dirección).
- Tema global único; los cursos del colegio (Química, Álgebra…) son vistas por disciplina.
- Alumnos solo ven contenido revisado; la revisión es global y permanente, con huella: si el contenido cambia, vuelve a «Revisar de nuevo». Carlos es el revisor y aprobó todo en bloque (`pnpm curriculum:aprobar-todo`).
- Profesores eligen todos los temas; sin ficha: «Práctica en preparación» (profesor) / «Pronto» (alumno).
- El piloto usa toda primaria y secundaria. Regla: estilo caveman para todos los agentes.

## Cambios realizados
- Modelo (`TemaCurricular`, `TemaDesempenoOficial`, `CursoColegio`, `CursoColegioGrado`, `Curso.cursoColegioId`, huella de revisión), migraciones aditivas.
- Importador dry-run y mapeo editorial (`src/lib/curriculum/importacion/`, `data/curriculum/`).
- Autorización y estado editorial (`src/lib/server/curriculum/`), panel «Revisión de contenido» en `/plataforma/contenido`.
- Plan de estudios (`src/lib/server/plan-estudios.ts`, script `curriculum:plan-desde-cursos`), demo con Aritmética en 4.° A y Química/Física en 4.° A Sec.
- Nudito por curso (`src/lib/server/plan-anual/catalogo-curso.ts`, `areas-cursos.ts`, `plan-publicado.ts`, `sesiones.ts`).
- Correcciones del supervisor: alumnos veían borradores; aprobar-todo sin huella; quitar curso de la malla podía borrar sesiones/horario/materiales; repaso sin respaldo del catálogo; Aritmética de la demo en el salón de Lucas.

## Validación
- `pnpm lint`, `pnpm typecheck`: OK. `pnpm test`: 172 archivos, 1 329 pruebas OK. `pnpm nudito:validar-banco` OK.
- `pnpm db:reconstruir` local: 3 839 temas revisados con huella.
- e2e (`E2E_PORT=3061`): `nudito-tutor` y `plan-anual-nudito` 12/12 OK.

## Pendientes y preguntas abiertas
- Fichas de las 32 combinaciones restantes (≈ 3 700): en curso con Codex GPT-6-Sol (Mat. 1.°, 2.° y 4.° primaria primero).
- Revisión humana de los 214 conflictos del reporte de fusión y aplicación de los 14 temas nuevos.
- Razonamiento Matemático necesita banco propio (sin disciplina cedida, catálogo vacío).
- Asistente de plan de estudios dentro del panel de dirección/administración (aún no diseñado).
- `pnpm db:migrate` falla por una migración antigua (TipoNotificacion), previa a este trabajo (specs/52).
- Aprobación en bloque en la nube: solo con visto bueno de Carlos.
