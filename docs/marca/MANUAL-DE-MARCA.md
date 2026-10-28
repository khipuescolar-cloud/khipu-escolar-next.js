Khipu Escolar es la plataforma que une al colegio, a los profesores y a las familias: avisos de asistencia al momento, chat con el tutor, notas y a Nudito, el asistente con IA. El nombre viene del **khipu**, el sistema inca de cuerdas con nudos para llevar registros: cada nudo es un dato, igual que cada asistencia, nota o tarea que guarda la plataforma.

> **Tagline:** «Cada día de tu hijo, bien anudado.»
> Alternativas: «Lo que pasa en el aula, te llega al toque.» (redes) · «Registros que unen a la familia y al colegio.» (directores)

## Nombre

- Escribe **Khipu Escolar** en lo público (web, redes, ventas, correos). La palabra «Khipu» casi nunca va sola: va con «Escolar», con Nudito o en un contexto de colegio, para no confundirse con Khipu, una fintech chilena de pagos.
- Dentro del panel, la barra superior puede decir solo «khipu», porque el contexto ya es escolar.
- Escribe «Khipu» con K y H. No uses «Quipu», «Kipu» ni «KHIPU» en mayúsculas.
- No uses monedas, tarjetas, flechas de dinero ni gráficos de pagos junto a la marca.

## Logotipo e isotipo

Las piezas están en el grupo **Logos**:

| Pieza | Archivo | Cuándo usarla |
|---|---|---|
| Isotipo | `isotipo.svg` | La K de cuerda sola: avatar de redes, sellos, esquina de documentos |
| Isotipo blanco | `isotipo-blanco.svg` | Sobre `indigo` o sobre fotos oscuras |
| Logotipo horizontal | `logotipo-horizontal.svg` | Barra del panel, firmas de correo y encabezados |
| Logotipo horizontal blanco | `logotipo-horizontal-blanco.svg` | Sobre `indigo` |
| Logotipo Escolar | `logotipo-escolar.svg` | La versión pública principal: web, ventas y redes |
| Logotipo de una tinta | `logotipo-una-tinta.svg` | Impresión barata, sellos, bordados y fax |
| Ícono de app | `icono-app.svg` | Tiendas de apps y pantalla de inicio del celular (1024 px) |
| Favicon | `favicon.svg` | Pestaña del navegador (16–32 px): K simplificada con un solo nudo |

- **Construcción:** el isotipo es una K hecha de cuerda. El palo es la cuerda principal y los dos brazos son cuerdas colgantes, cada una con un nudo en la punta. El nudo de arriba siempre es `maiz`. El logotipo «khipu» está dibujado con el mismo trazo redondeado, y el punto de la **i** es otro nudo `maiz`.
- **Área de seguridad:** deja libre alrededor del logotipo, como mínimo, la altura de la «k» dividida entre dos. Ningún texto ni borde entra en esa zona.
- **Tamaños mínimos:** el logotipo horizontal mide 96 px de ancho (en pantalla) o 25 mm (impreso). El isotipo baja hasta 24 px; por debajo, usa `favicon.svg`.
- **Fondos:** sobre `fondo`, `superficie` o blanco, usa la versión `indigo`. Sobre `indigo` o fotos oscuras, usa la versión blanca. Sobre `maiz` o `cochinilla`, usa la versión de una tinta en `tinta`.
- **No hagas esto:** estirar o girar la marca, cambiar los colores de los nudos, ponerle sombra o degradado, encerrarla en una forma que no sea el ícono de app, ni escribir «khipu» con otra tipografía.
- La palabra ESCOLAR de `logotipo-escolar.svg` es texto provisional en Sora. Antes de imprimir, conviértela a trazos en Figma.

## Color

La paleta toma los tintes naturales de los textiles andinos (índigo, cochinilla, maíz y el turquesa de los lagos) en tonos limpios y con mucho fondo claro. No es folclórica: nada de grecas ni de mezclar todos los colores a la vez.

- **Marca:** `indigo` es el color de la marca y de la barra superior. `cochinilla` es para Nudito y los destacados. `turquesa` es para los íconos y los gráficos. `maiz` es solo para los nudos y los fondos cálidos.
- **Interfaz:** usa `fondo` para la página, `superficie` para las tarjetas y `superficie-2` para lo secundario. El texto va en `tinta` y lo secundario en `pizarra`. Las divisiones van en `arena`.
- **Botones:** el principal va en `acento` con texto `sobre-acento`. Los enlaces van en `indigo-cielo`.
- **Proporción en una pieza:** 60 % de fondo claro, 25 % de `indigo`, 10 % de `cochinilla` o `turquesa` y 5 % de `maiz`.
- **Nunca** escribas texto en `maiz` sobre blanco. Nunca uses `cochinilla` para errores.

### Estados de asistencia (fijos, no cambian por colegio)

| Estado | Texto e ícono | Fondo | Siempre con |
|---|---|---|---|
| Llegó | `estado-llego` | `estado-llego-fondo` | ✓ y la palabra «Llegó» |
| Llegó tarde | `estado-tarde` | `estado-tarde-fondo` | un reloj y «Tarde» |
| No llegó | `estado-falta` | `estado-falta-fondo` | ! y «No llegó» |

- Nunca comuniques un estado solo con el color: va siempre con el ícono y la palabra, por las personas daltónicas y por los correos impresos en blanco y negro.
- El verde y el rojo también se distinguen por su claridad, no solo por el tono.

## Tipografía

- **Títulos:** Sora, en `titulo-xl`, `titulo-1` y `titulo-2`. Es geométrica y redondeada, como el trazo de la cuerda.
- **Texto:** Inter, en `cuerpo`, `cuerpo-sm`, `etiqueta` y `sobretitulo`. Se lee bien en celulares baratos y trae todas las tildes y la ñ.
- **Nudito:** Nunito Bold en `voz-nudito`, solo en sus burbujas, stickers y redes.
- Las tres son gratis en Google Fonts. En Next.js se cargan con `next/font/google`. En los correos, agrega `Arial, Helvetica, sans-serif` de respaldo, porque muchos programas de correo no cargan fuentes externas.
- El texto de lectura nunca baja de 14 px. Los títulos llevan `text-wrap: balance`.

## Espacio, radios y sombras

- Arma los espacios con la escala `espacio-1` a `espacio-12` (4, 8, 12, 16, 24, 32 y 48 px). En celular, el margen lateral mínimo es `espacio-4`.
- Los botones y campos llevan `radio-md`; las tarjetas y mosaicos, `radio-lg`; las etiquetas de estado, `radio-pildora`.
- `sombra-1` va solo al pasar el cursor y en el botón de Nudito. En reposo, las tarjetas se separan con un borde `arena`, sin sombra.
- El foco del teclado es un anillo sólido de 2 px en `indigo-cielo`, separado 2 px del control.

## Iconografía

- Usa íconos de línea de [Lucide](https://lucide.dev): trazo de 2 px y puntas redondeadas, que combinan con la cuerda del logotipo. Van en `tinta` o en `indigo`; el color de estado se reserva para los íconos de asistencia.
- No mezcles íconos rellenos con íconos de línea. Nada de íconos 3D ni de emojis en los avisos serios.

## Imagen y fotografía

- **Sí:** escenas reales de colegios peruanos con luz natural (un padre que mira el celular tranquilo, una profesora pasando lista). Personas diversas, de ciudad y de provincia.
- **Ley 29733:** nunca muestres la cara ni los datos de un alumno real sin el consentimiento firmado de sus padres y del colegio. Prefiere tomas de espalda, de manos o de lejos.
- **No:** llamas, chullos, Machu Picchu ni el «estilo souvenir»; fotos de banco de oficina gringa, ni imágenes de niños hechas con IA.
- El patrón `patron-khipu.svg` (grupo **Patrones**) sirve de fondo suave en portadas, presentaciones y redes, nunca detrás de texto largo.

## Nudito

Nudito es un nudo de cuerda en `cochinilla` cuya curva de abajo forma una sonrisa. Sus ojos son puntos `indigo`, el brillo es `maiz` y la colita, `turquesa`. Está en el grupo **Mascota**.

- **Su personalidad:** atento, claro, cálido, humilde y discreto. Habla como una buena tutora.
- **No da malas noticias.** El aviso de falta o de un problema lo firma el colegio, en tono serio. Después, Nudito solo ofrece ayuda: «¿Quieres que te ayude a escribirle a la tutora?».
- **Nunca** inventa datos, compara alumnos, usa la culpa ni las rachas, ni guarda secretos con un menor. Si no sabe algo, deriva a una persona del colegio.
- **Siempre deja claro que es una IA:** «Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.»
- **Nudito nunca reemplaza al logotipo:** Khipu Escolar siempre firma en algún lugar de la pieza.

## Voz y tono

- Habla como una buena tutora, no como un banco ni como un manual. Una idea por mensaje.
- Trata de «tú» a las familias y de «usted» a los directores en ventas, salvo que el colegio pida otra cosa.
- Da datos concretos: la hora, el curso y el nombre del profesor.

| Sí | No |
|---|---|
| «Mateo llegó al colegio a las 7:52 a. m.» | «Se informa que el registro de asistencia del alumno ha sido actualizado.» |
| «Lucía llegó tarde hoy (8:15 a. m.). Si tienes dudas, escríbele a su tutora.» | «ALERTA: TARDANZA DETECTADA.» |
| «Mañana hay examen de Matemática. Nudito te recuerda repasar fracciones.» | «¡No lo dejes para último momento!» (regaña al padre) |
| «Esta sección todavía no está disponible.» | «Ups, algo salió mal 😅» |

- No uses tecnicismos con los padres («multitenant», «dashboard», «notificación push»).
- No exageres («la mejor plataforma del mundo», «revolucionaria»).
- En redes y con Nudito, usa como máximo un emoji por mensaje. En los avisos de falta, ninguno.
