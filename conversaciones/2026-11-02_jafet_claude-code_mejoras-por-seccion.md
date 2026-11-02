# Mejoras de diseño por sección (Funciones, Cómo funciona, Planes, Preguntas, Login, Demo)

| Campo | Valor |
|---|---|
| Fecha | 2026-11-02 |
| Colaborador | jafet (diseño, marca y marketing) |
| Agente y modelo | Claude Code · claude-sonnet-5-5 (revisión: agente UI Designer) |
| Rama y commits | `REDISEÑO-LANDING-JAFET` · ver el log de la rama |
| Specs afectadas | `specs/25-landing-publica.md` |

## Pedidos del colaborador (textual)
> ahora necesitamos saber que podemos mejorar en la web, visita tanto el apartado de FUNCIONES, COMO FUNCIONA, PLANES, PREGUNTAS, LO DE INGRESAR Y SOLICITAR DEMO, cada uno tiene que ser atractivo y parte de ello necesito que tenga un agente de diseño por favor
>
> ok entonces solo cambiemos lo que es diseño por favor nada de funcionalidades eso nos ayudaria muchisimo

## Decisiones
- El informe completo del agente está en el panel de Jafet (`docs/14-mejoras-por-seccion.md`). Se aplica solo lo marcado [SOLO DISEÑO] y verdadero con lo que la página ya afirma.
- No se publican marcadores `[COMPLETAR]`: se omiten cupos, plazos por paso, fotos de Jafet y Sebas, precio y la frase «quién hace qué» (hay que decidir primero quién carga los datos).
- No se aplicó la foto ni la banda de marca en el login (una foto ya se probó y Jafet prefirió volver atrás; la banda toca el layout compartido).
- Los textos nuevos del botón y los enlaces evitan repetir «Solicitar demo» para no chocar con los tests e2e.

## Cambios realizados
- `src/app/(sitio)/page.tsx` y `src/app/(publico)/login/page.tsx`: ver el bullet de la spec 25. Solo `className`, íconos de lucide y textos de marketing.
- `specs/25-landing-publica.md`: se documenta.

## Validación
- No se pudo correr lint ni typecheck en la PC de Jafet; la validación es el build de Vercel de la rama. Los tests e2e revisan el h1, el h3 de cada plan, `section#id`, el título «Entrar» y el formulario: ninguno cambia.

## Pendientes para Sebas
- Revisar que las respuestas nuevas del FAQ sean verdad (aviso por notificación, WhatsApp/SMS opcional, mesa de ayuda en todos los planes).
- Lo que exige tocar funcionalidad (precio visible, texto del botón del formulario, enlaces nuevos, acordeón abierto) está en la lista final del informe.
