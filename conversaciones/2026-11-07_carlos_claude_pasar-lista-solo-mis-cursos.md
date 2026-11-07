# Pasar lista: solo los cursos que dicta el profesor

| Campo | Valor |
|---|---|
| Fecha | 2026-11-07 |
| Colaborador | Carlos Calderón (producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta el 11 nov.) |
| Rama y commits | `fix/pasar-lista-solo-mis-cursos` |
| Specs afectadas | `specs/04-asistencia.md` |

## Pedidos del colaborador (textual)
> en el modulo de Pasar Lista tengo una problematica; aqui solo debe aparecer los cursos que enseña un profesor y poder pasar lista , adicional a ello tambien debe aparecer el pasar lista de su propio salon, pero eso solo es asi si el alumno llego super tarde y el portero no esta para poder la asistencia al colegio , asi que ese tipo de asistencia debe ser de otro color, [Image #1] esto es lo que tengo actualmente , pero no deberia aparecer los cursos del salon que es tutor, [Image #2] solo debe aparecer este de aqui por que es la asistencia del dia de mi salon de tutoria. me deje entender?

## Decisiones
- El profesor solo ve y pasa lista en los cursos donde es `Curso.profesorId`, en cualquier salón. Ser tutor solo agrega la «Asistencia del día» de su salón.
- La restricción también va en el servidor (`requireLista`): abrir o guardar la lista de un curso ajeno da 403, también para el tutor. `requireCursoDelProfesor` no cambia porque otros módulos (notas en solo lectura) siguen dando acceso al tutor.
- «Asistencia del día» se ve como tarjeta con el color informativo (`info` / `info-fondo`, con modo oscuro), ícono de puerta y la línea «Ingreso al colegio · respaldo si portería no lo registró». No se diferencia solo por el color.
- Dirección no cambia.

## Cambios realizados
- `src/lib/server/asistencia.ts`: `opcionesDeLista` ya no ofrece al tutor los cursos de otros profesores; `requireLista` exige que el profesor dicte el curso.
- `src/app/colegio/[slug]/asistencia/page.tsx`: tarjeta distinta para «Asistencia del día».
- `tests/integracion/pasar-lista.test.ts`: caso nuevo (el tutor no ve ni pasa un curso de su salón que dicta otro profesor; quien lo dicta sí; dirección ve todo).
- `specs/04-asistencia.md`: regla y presentación actualizadas.

## Validación
- `pnpm lint`, `pnpm typecheck`: OK.
- `pnpm test`: 155 archivos, 1234 pruebas OK.
- e2e (puerto 3060) `asistencia-colegio-cursos`, `pasar-lista-aviso-justificar`, `dia-a-dia-offline-calendario`: 6 OK. 1 falla que no viene de este cambio: el reporte de dirección espera «Asistieron», pero hoy es sábado (día no hábil).
- Capturas revisadas con Carla Mendoza (tutora de 2.° A Sec.) y Pedro Salas: solo aparecen sus cursos y la tarjeta del día de su salón.

## Pendientes y preguntas abiertas
- El e2e de reportes de dirección falla en fin de semana o feriado. Habría que hacerlo independiente del día.
