# Rediseño del login: retrato de familia en el panel azul

| Campo | Valor |
|---|---|
| Fecha | 2026-10-30 |
| Colaborador | jafet (diseño, marca y marketing) |
| Agente y modelo | Claude Code · claude-sonnet-5-5 |
| Rama y commits | `REDISEÑO-LANDING-JAFET` · ver el log de la rama |
| Specs afectadas | `specs/18-sistema-de-diseno.md` |

## Pedidos del colaborador (textual)
> ahora con el tema de mejorar esto quiero mejorar este apartado con alguna imagen buena trabaja con flow para que lo hagas por favor y dime si es necesario actibar opus o no gracias

> ok me gustan pero necesito que sean foto estudio con el fondo borroso y de más cerca que el padre y madre esten felices con el niño en medio

> ok me encanta pero necesito que me des con un fondo de color segun la pagina web

> genial me gusta pero necesito que me pongas el azul más claro por favor

> ok a ver hazla

## Decisiones
- La foto (3 personas, fondo `#3A4BB5`) se generó en Google Flow. Es una imagen decorativa generada con IA; no representa a clientes reales.
- Se descartó ponerla a todo el ancho (720 px): corta las barbillas en pantallas de 796 px de alto. Se eligió 560 px a la derecha y abajo.
- El texto, los tres puntos y las cuerdas khipu no se tocaron. El panel solo aparece desde `lg` (en celular no cambia nada).

## Cambios realizados
- `src/app/(publico)/layout.tsx`: un `<Image>` decorativo con máscara (solo `className` y `style`).
- `public/landing/fotos/login-familia.jpg`: la foto (1200×1607, JPEG).
- `specs/18-sistema-de-diseno.md`: se documenta.

## Validación
- Maqueta HTML con la medida real del panel (720×796) revisada en el navegador.
- No se pudo correr lint ni typecheck en la PC de Jafet; la validación es el build de Vercel.

## Pendientes y preguntas abiertas
- Aviso a Sebas: este layout también envuelve recuperar, instalar y justificar, así que la foto aparece ahí también.
- Revisar en laptop y en pantalla grande el encuadre de las caras.
