# Landing menos «hecha por IA»: íconos sueltos en lugar de burbujas

| Campo | Valor |
|---|---|
| Fecha | 2026-11-06 |
| Colaborador | jafet (diseño, marca y marketing) |
| Agente y modelo | Claude Code · claude-sonnet-5-5 |
| Rama y commits | `REDISEÑO-LANDING-JAFET` · ver el log de la rama |
| Specs afectadas | `specs/25-landing-publica.md` |

## Pedidos del colaborador (textual)
> ya mi rey ahora vas a analizar lo que dijo en este audio largo mi primo
>
> ok mi rey como vamos podemos avanzar con ello??

(Contexto: un audio de Sebas del 2026-11-05 pide que la landing se note menos hecha por IA, sobre todo por las burbujas de íconos en los encabezados, y que tenga más contraste y seriedad.)

## Decisiones
- Primera tanda: quitar las pastillas de color detrás de los íconos y dejar íconos sueltos con trazo fino.
- No se tocó nada de funcionalidad. Los círculos de estado sobre las fotos de roles se dejan porque llevan significado (llegó / no llegó).
- El color gris general (`--muted-foreground`) ya cumple contraste y es global de la app, así que no se toca; solo sube el texto de las funciones.

## Cambios realizados
- `src/app/(sitio)/page.tsx`: `Icono` sin pastilla; checks de Planes y Nudito sin círculo; texto de funciones a `text-foreground/80`.
- `specs/25-landing-publica.md`: se documenta.

## Validación
- No se pudo correr lint ni typecheck local; la validación es el build de Vercel de la rama.

## Pendientes
- Capturas reales de los módulos nuevos de Sebas (registro diario, libreta) para sustituir ilustraciones.
- Revisar la sección Comunicación y vocabulario de colegio peruano.
