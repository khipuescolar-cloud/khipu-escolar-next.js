# Rediseño de la landing, parte 1: textos y detalles visuales seguros

| Campo | Valor |
|---|---|
| Fecha | 2026-10-30 |
| Colaborador | jafet (diseño, marca y marketing) |
| Agente y modelo | Claude Code · claude-opus-5-5 (con 4 subagentes de análisis: UI, persona, marca y marketing) |
| Rama y commits | `REDISEÑO-LANDING-JAFET` · ver el log de la rama |
| Specs afectadas | `specs/25-landing-publica.md` |

## Pedidos del colaborador (textual)
> dame un análisis tanto de diseño, marketing y cómo poder enganchar al abrir solamente la página. No, pero como ya te hemos recalcado, no cambies funcionalidades porque si no se puede romper la página.

> ok haz todo lo que mejor sabe sahcer pero sin romper la pagina ok? tenemos flow podemos mejorar algunas cosas con eso y ser profesionales

## Decisiones
- Regla del acuerdo Jafet–Sebas: en la landing y el login solo cambian el diseño y los textos, nunca la funcionalidad (formulario, enlaces, anclas, `?plan=`, planes de la BD, lógica JS/GSAP, SEO, accesibilidad, servidor, tests).
- El h1 y el título «Programa piloto 2026: buscamos los primeros colegios» **no se cambian**, porque `tests/e2e/landing-publica.test.ts` los verifica. El titular nuevo propuesto («Las familias saben al toque si su hijo llegó. Y sus profesores, sin dar su WhatsApp.») queda para que Sebas actualice el test.

## Cambios realizados
- `src/app/(sitio)/page.tsx` (solo textos y clases):
  - Subtítulo del hero dirigido al director.
  - Garantía «Datos protegidos según la Ley 29733».
  - Textura decorativa del khipu detrás del hero (`aria-hidden`, `pointer-events-none`).
  - Franja del piloto con tres beneficios y el botón «Quiero ser colegio fundador»; el `href="#demo"` no cambia.
  - Nueva respuesta para «¿Cuánto tarda empezar?».
  - Íconos del FAQ en un solo tono (índigo).
  - «Solicite una demo» (usted).
- `public/landing/textura-khipu.svg`: nuevo asset decorativo (cuerdas y nudos en blanco).
- `specs/25-landing-publica.md`: se documentan los cambios.

## Validación
- Revisión del diff: solo cambian strings, `className` y un asset. No se tocaron `name`, `href`, `id`, `aria-*`, la lógica ni los tests.
- No se pudo correr `pnpm lint/typecheck/test` en la PC de Jafet (pnpm no está instalado y no hubo permiso para instalar dependencias). La validación es el build del preview de Vercel de la rama.

## Pendientes y preguntas abiertas
- **Antes de integrar:** Jafet y Sebas confirman los beneficios del piloto (8 semanas sin costo, ayuda para cargar la lista, precio de fundador en 2027).
- Sebas: si se aprueba el titular nuevo, cambiar el h1 y el test e2e; mostrar «Solicitar demo» en el encabezado del celular; enlace de WhatsApp y correo con dominio propio; `metadataBase` (hoy lvh.me:3000).
- Jafet: capturas nuevas en horario escolar, logo (opción A o B) y Nudito 2.0 (bocetos en el panel de Jafet, docs/12-analisis-landing).

## Parte 2: fotos del mosaico
> ok ahora ponlo en la pagina web por favorlo de las imagenes nuevas

> listo, y que se vea super profesional por favor

- Fotos generadas por Jafet en Google Flow (Nano Banana 2.1), estilo foto de celular, nivel socioeconómico B. Recortadas y comprimidas (JPEG 80) en `public/landing/fotos/`.
- Sección nueva «Así se vive un día con Khipu» en `page.tsx` (mosaico de 5 fotos con etiqueta de ícono + texto y la nota «Imágenes referenciales.»). Sin ancla nueva y sin `<figure>`, para no cambiar el `figure img` del hero que revisa el test e2e.
- `foto-papa-oficina.jpg` queda de reserva (no se usa todavía).
