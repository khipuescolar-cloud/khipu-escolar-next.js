# Banco de conocimiento de Nudito: temarios de los 33 grados × cursos y fichas de Mat. 3.°

| Campo | Valor |
|---|---|
| Fecha | 2026-11-09 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (supervisor y subagentes) / Codex · GPT-6-Sol (infraestructura) |
| Rama y commits | `feat/nudito-banco` · `2a05676` … `2c5bb25` (18 commits sobre `dev`) |
| Specs afectadas | `specs/50-nudito-banco-de-conocimiento.md` (nueva), `specs/48-nudito-temario.md`, `specs/43-nudito-practica-y-dominio.md`, `specs/42`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> pero no me aparecen los temas, en vez de ponerme a buscar me deben aparecer todos los temas , como memcniones deben aparecer por grado unos 200 a 300 temas a eleccion

> pero ese resumen y ejercicios nudito mismo lo crea; … el profesor lo unico que hara es seleccionar los temas … internamente ya sabe cual es el tema, el resumen y los futuros ejercicios, eso seria como un banco de conocimiento ; debemos tener un banco de conocimiento perfecto para que podamos enseñarle. eso podrias buscarlo por internet para poder guiarte mejor

> puedes usar codex para que hagas la busqueda mas rapida

> bueno me parece bien 129 temas con sus respectiva clase y tareas; pero me estas diciendo que solo es de 3º grado, puedes hacerlo para todos los grados , primaria y segundaria

(Respuestas a preguntas: cantidad «por curso»; fuente CNEB; ante el rechazo del primer banco eligió «Temas reales» — 120–180 por grado y curso, sin relleno.)

## Decisiones
- Fuente: CNEB / programas curriculares MINEDU. Los desempeños de primaria y secundaria ya estaban transcritos en `src/lib/cneb/` (no hizo falta OCR del PDF escaneado de secundaria).
- Se rechazó el primer banco de Mat. 3.° (239 fichas infladas por verbo/número y ejercicios que no correspondían al tema). Se reemplazó por una lista de 129 temas reales, aprobada por Carlos, y 129 fichas escritas a mano.
- Temarios de 100–180 temas por grado y curso sin relleno; un tema que vuelve en otro grado lleva su alcance en el nombre. Cada `.md` lista las «decisiones dudosas» para la revisión docente.
- Codex: infraestructura genérica (esquema, cargador perezoso por área/nivel/grado, validador, UI). Claude: contenidos mediante subagentes y revisión.
- Texto corto del banco con modo `literal` y tolerancia de tipeo por palabra larga (el corrector anterior aceptaba «2, 3, 6» por «2, 3, 5», «menor» por «mayor» y «5÷30» por «30÷5»).
- Opción múltiple: orden de opciones mezclado y explicaciones sin letras (la pantalla no muestra letras).
- Catálogo del temario con el nombre oficial de la competencia.

## Cambios realizados
- `src/lib/nudito/conocimiento/`: esquema zod genérico, `cneb/<area>.json` con códigos de desempeño, cargador `servidor.ts`, banco `banco/<area>/<nivel>-<grado>/temario-propuesto.json` (33) y `primaria-3/fichas/*.json` (129 fichas, 1 615 ejercicios).
- `docs/nudito/temario-*.md`: vista legible de los 33 temarios (3 839 temas: Mat. 1 365, Com. 1 139, CyT 1 335).
- `scripts/nudito-validar-banco.ts`: valida todos los temarios (cobertura de desempeños, prerrequisitos, nombres repetidos entre grados) y las fichas (esquema, plantillas, pistas, aritmética, datos personales).
- `src/lib/nudito/evaluadores/comun.ts`, `contratos.ts`: modo `literal` y tolerancia de tipeo más estricta (+ test `nudito-texto-literal`).
- `src/app/colegio/[slug]/nudito/temario/[id]/`: catálogo completo sin búsqueda, agrupado por competencia y bloque.

## Validación
- `pnpm lint`, `pnpm typecheck`: OK.
- `pnpm test`: 164 archivos, 1 295 pruebas OK.
- `pnpm nudito:validar-banco`: «Banco válido: 129 fichas activas; 1615 ejercicios» y 33 temarios OK.
- e2e (`E2E_PORT=3061`): `plan-anual-nudito` y `nudito-tutor` OK (12 pruebas); captura a 360 px revisada.

## Pendientes y preguntas abiertas
- Revisión docente de los 33 temarios (decisiones dudosas en cada `.md`; p. ej. temas sensibles en CyT 2.° sec. y 6.° prim., literatura en Com. 4.° sec., numeración de 6.° prim.).
- Fichas de las 32 combinaciones restantes (≈ 3 700 fichas), grado por grado.
- Revisión pedagógica de las 129 fichas de Mat. 3.°.
- Merge a `dev` pendiente del visto bueno de Carlos.
