# Marca: Nudito oficial y correos

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · subagente (claude-sonnet-5-5) |
| Rama y commits | `feat/marca-nudito-correos` |
| Specs afectadas | `specs/13-nudito.md`, `specs/06-avisos-notificaciones.md` |

## Pedidos del colaborador (textual)
> okey ahora te eh dejado una carpeta completa que me entrego mi compañero de marketing; donde tiene el contenido completo de los colores, iconos, svg , etc ; quiero que lo estudies y lo implementes en el sistema; quiero que todo este como lo esta proponiendo en diseño porfavor

## Decisiones
- Nudito oficial en SVG en línea con 7 estados por CSS; selector de estado puro y testeable.
- Correos con cabecera Khipu + colegio; Nudito solo en tarea nueva y libreta; faltas/tardanzas/problemas sin Nudito ni emojis.

## Cambios realizados
- `src/components/nudito/*`, `src/lib/nudito/estado.ts`, `src/app/colegio/[slug]/nudito/page.tsx`
- `src/lib/server/email/plantillas/{base,index}.ts`
- tests: `nudito-estado`, `plantillas-avisos`, `e2e/nudito`

## Validación
- lint, typecheck y pruebas unitarias en verde; 1 prueba de integración (`dia-a-dia-offline-plazo`) falla también sin estos cambios.

## Pendientes y preguntas abiertas
- El logo del colegio en el correo requiere que el encolado de avisos agregue `logoColegioUrl` al payload (hoy solo se muestra el nombre).
