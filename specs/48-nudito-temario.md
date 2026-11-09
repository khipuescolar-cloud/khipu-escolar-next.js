# 48 — Temario de Nudito

> Estado: implementación en la rama feat/nudito-temario · Plan: Khipu Pro · 2026-11-09

## Objetivo
Los profesores que dictan Matemática, Comunicación o Ciencia y Tecnología en un mismo año, nivel y grado eligen juntos los temas que Nudito enseñará. La dirección consulta el estado. Todos los profesores activos del grupo aceptan el temario para habilitarlo a los alumnos.

## Grupo y acceso
Un grupo es (colegio, año, nivel, grado, área CNEB). Los profesores se obtienen de cursos.profesor_id y se deduplican entre secciones. Solo se admiten las tres áreas del catálogo de Nudito. El servidor rechaza áreas distintas y temas fuera del catálogo global del grado; no admite claves col:. Cada página y acción exige contexto del colegio y nudito_plus. Dirección ve todos los grupos y filtra por año, nivel, grado y área; no crea, edita ni acepta. Profesor solo ve y edita sus grupos.

## Estados y aceptación
- Sin temario: no hay fila o no hay temas ni versión habilitada.
- En revisión: hay temas, pero falta al menos una aceptación de la ronda actual. Se muestra quién falta.
- Habilitado para alumnos: todos los profesores activos aceptaron la ronda y existe una versión publicada.
- Un profesor basta si es el único del grupo. Todos son iguales: no hay coordinador.
- Agregar, quitar, copiar o reordenar temas incrementa rondaRevision y deja el plan en borrador. Las conformidades de rondas anteriores permanecen como histórico, pero dejan de contar. Los comentarios no reinician aceptaciones.
- Al aceptar se vuelve a comprobar dentro de una transacción la ronda, los temas y las conformidades. Cuando todos aceptaron se crea plan_anual_versiones y el estado pasa a publicado en esa transacción. Si un temario publicado cambia, la versión anterior continúa visible hasta la siguiente aceptación completa. No se borran sesiones, intentos ni dominios.
- No hay rondas de observaciones, coordinador, unidades, reuniones, pestaña de versiones ni revisión de lecciones. Las columnas y tablas anteriores permanecen para evitar una migración destructiva.

## Interfaz
La única entrada docente de Nudito lleva a Seguimiento; pestañas superiores Temario y Seguimiento. /nudito/temario lista grupos y estados. /nudito/temario/[id] muestra arriba el estado, la aceptación de cada profesor y el botón «Acepto este temario» (se oculta cuando ya aceptaste); si un temario habilitado tiene cambios sin aceptar, avisa que los alumnos siguen con la versión anterior. Debajo, catálogo con búsqueda, filtro de competencia, páginas y selección múltiple; temas elegidos con subir, bajar y quitar; comentarios por tema plegables («Comentarios (n)») con autor y hora del colegio; los temas ya elegidos aparecen marcados y bloqueados en el catálogo; pestañas compartidas en `PestanasNudito`; profesores y aceptación. Se puede copiar el temario del año anterior cuando el actual está vacío. Dirección ve el detalle en solo lectura. Las rutas antiguas /planificacion y subrutas redirigen a estas pantallas.

## Alumno
/nudito toma los temas, en orden, de la última foto en plan_anual_versiones. No exige lección publicada ni bloquea por semana. Si no existe versión, muestra el mensaje amable de preparación. El repaso usa una lección publicada cuando la haya y el catálogo en caso contrario (specs/49).

## Datos demo y pruebas
Nuevo Horizonte tiene temarios habilitados para 5.° A en las tres áreas, uno en revisión con un profesor pendiente y 3.° primaria Matemática sin temario. Se verifican reglas puras, aislamiento por colegio y grupo, versión visible al alumno, permisos y un recorrido móvil 360×740.
