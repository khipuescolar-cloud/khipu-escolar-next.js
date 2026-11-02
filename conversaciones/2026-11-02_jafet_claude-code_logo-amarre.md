# Logotipo nuevo «Amarre» en la landing y el login

| Campo | Valor |
|---|---|
| Fecha | 2026-11-02 |
| Colaborador | jafet (diseño, marca y marketing) |
| Agente y modelo | Claude Code · claude-sonnet-5-5 |
| Rama y commits | `REDISEÑO-LANDING-JAFET` · ver el log de la rama |
| Specs afectadas | `specs/25-landing-publica.md` |

## Pedidos del colaborador (textual)
> vamos a subir estos nuevos diseños (captura de la opción «Amarre» de la propuesta de logo)

## Decisiones
- De cuatro propuestas de K, Jafet eligió «Amarre». Se aplica solo en la landing y el login (el alcance de diseño de Jafet).
- No se reemplazan los archivos de `public/marca/`: los usan el panel, los correos, los PDF, la imagen OG y el manifest, que están fuera del alcance. Se crean archivos nuevos y un componente nuevo.
- El cruce de la cuerda sobre el palo se dibuja con una máscara, no con un borde del color del fondo, para que el SVG funcione sobre cualquier fondo.

## Cambios realizados
- Nuevos: `src/components/marca/LogoKhipu.tsx`, `public/landing/logo/logotipo.svg` y `logotipo-blanco.svg`.
- `EncabezadoSitio.tsx`, `PieSitio.tsx` y `(publico)/layout.tsx`: cambian `<Logo …/>` por `<LogoKhipu …/>` (solo la imagen y su tamaño; enlaces, `aria-label` y estructura no cambian).
- `specs/25-landing-publica.md`: se documenta.

## Validación
- No se pudo correr lint ni typecheck en la PC de Jafet; la validación es el build de Vercel de la rama.

## Pendientes para Sebas
- Conectar el logotipo nuevo en el panel (`BarraSuperior`), los correos, los PDF, `opengraph-image.tsx`, `icon.svg`, `apple-icon.png` y el manifest. Los SVG del isotipo, del ícono de app y del favicon están en `docs/13-branding/ronda-2/` del panel de Jafet.
- Revisar en el celular que «escolar» se lea bien en el encabezado (56 px de alto).
