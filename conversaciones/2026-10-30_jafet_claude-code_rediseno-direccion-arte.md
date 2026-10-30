# Dirección de arte «El registro bien anudado»: fotos en duotono en Roles

| Campo | Valor |
|---|---|
| Fecha | 2026-10-30 |
| Colaborador | jafet (diseño, marca y marketing) |
| Agente y modelo | Claude Code · claude-sonnet-5-5 |
| Rama y commits | `REDISEÑO-LANDING-JAFET` · ver el log de la rama |
| Specs afectadas | `specs/25-landing-publica.md` |

## Pedidos del colaborador (textual)
> de esto necesito que hagas esto la dirección de arte por favor (propuesta publicada en el panel de Jafet: https://claude.ai/artifact/9fLez15AuPqG55Vjuk3Hge)

## Decisiones
- De la propuesta se aplica ahora lo que es solo estilo: fotos en duotono en el panel de Roles y más contraste en «Sin Khipu». La textura khipu del hero y los íconos del FAQ en un solo tono ya estaban.
- No se aplica todavía: precio más grande en los planes (hoy todos dicen «Precio según tamaño del colegio»; agrandarlo se vería mal y el precio sale de la BD), ilustraciones de roles y el patrón v2 (faltan los archivos finales).

## Cambios realizados
- `src/app/(sitio)/_componentes/PestanasRoles.tsx`: `<Image>` decorativa y degradado en el panel de cada rol; se agregan `foto` y `fotoClase` a `ROLES`. No cambian las pestañas, el teclado, los `id` ni los `aria-*`.
- `src/app/(sitio)/_componentes/DiaEnElColegio.tsx`: solo `relleno="bg-pizarra/70"` de la fila «Sin Khipu». No cambia nada de GSAP.
- `specs/25-landing-publica.md`: se documenta.

## Validación
- No se pudo correr lint ni typecheck en la PC de Jafet; la validación es el build de Vercel de la rama.

## Pendientes y preguntas abiertas
- Revisar en Vercel que el texto del panel de color se lea bien sobre la foto en las tres pestañas (turquesa y cochinilla son las más claras).
