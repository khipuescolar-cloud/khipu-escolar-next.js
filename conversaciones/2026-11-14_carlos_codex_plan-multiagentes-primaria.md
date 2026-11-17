# Plan para extender el refuerzo audiovisual de Nudito a primaria

| Campo | Valor |
|---|---|
| Fecha | 2026-11-14 |
| Colaborador | Carlos |
| Agente | Codex |
| Rama y commits | Workspace actual; sin commit en esta sesión |
| Specs afectadas | specs/50-nudito-banco-de-conocimiento.md (enlace de planificación) |

## Pedido del colaborador (textual)

> perfecto, ahora me encanta como esta trabajando nudito y como estructura la teoria y como arma las imagenes, textos, preguntas y en especial como esta integrado con el audio; dentro de esta conversacion hemos mejorado mucho lo que venia siendo el texto y contenido de las lecciones; puedes armar una guia para poder levantar multiagentes de codex para que actualicen todo lo que ya tiene hecho solo para primaria; necesito que lo mejoren asi como hicimos con este tema de "La tecnología avanza con la ciencia" pero ahora con todos los temas de todos los cursos que hemos escogido; necesito entonces el archivo que explica las reglas y normas de nudito; tambien quiero el promp para la nueva conversacion con Codex y que despliegue multiagentes del mismo y que pueda orquestarlos, si es posible que use modelos chinos que tengo instalados en mi computador si necesita algo y si vez que no son necesarios no lo uses, porfavor quiero ahora solo la planificacion y el archivo, una vez se restablesca mis creditos lanzare el orquestador con los multiagentes

## Decisiones

- Solo documentación y planificación en esta sesión; no se iniciaron agentes ni se modificaron lecciones, modelos locales o base de datos.
- Cobertura prevista: las 18 combinaciones de primaria, con prioridad en claves escogidas en planes publicados; inventario real al comenzar la ejecución.
- Regla pedagógica extraída del piloto aprobado: explicación escolar, recursos pertinentes, narración accesible, preguntas naturales y comprobación directa.
- Generalizar los casos particulares del piloto antes de escalar el banco. Revisar huellas editoriales de forma explícita por lote sin aprobar cambios automáticamente.
- Inventario y validación mediante scripts; modelos Codex según capacidad/costo. Modelos locales opcionales para tareas auxiliares y solo si se verifica su disponibilidad.
- Reparto por archivos y lotes con worktrees, muestras previas, revisión independiente y registro reanudable.

## Archivos

- `docs/nudito/GUIA-REFUERZO-PRIMARIA-MULTIAGENTES.md`: normas, alcance, recursos, audio, evaluación, arquitectura, orquestación, modelos, fases y aceptación.
- `docs/nudito/PROMPT-ORQUESTADOR-PRIMARIA.md`: prompt completo para la futura conversación de ejecución.
- Spec 50: enlace y aclaración de estado de planificación.

## Validación y pendientes

Se contrastó el plan con AGENTS, specs 49/50 y la política de modelos existente. Los conteos históricos se identifican como referencias pendientes de inventario. Revisión de diferencias y espacios en blanco al cerrar; no se requieren pruebas de aplicación para estos cambios de documentación. Pendiente: Carlos enviará el prompt en una nueva conversación cuando disponga de créditos; entonces comenzará la auditoría y ejecución.
