# Revisión independiente lote 03 (Comunicación P2-P6)

Revisor: Claude (no autor). Solo lectura; no se tocó ninguna ficha.

| Clave | Veredicto |
|---|---|
| com.p2.informacion-en-partes | APROBADA (1 retoque menor opcional) |
| com.p3.informacion-explicita | APROBADA |
| com.p4.causa-y-efecto | CAMBIOS (menores) |
| com.p5.idea-principal | CAMBIOS |
| com.p6.proposito-y-punto-de-vista | CAMBIOS |

## Técnica (verificado)
- `pnpm nudito:validar-banco`: "Banco válido: 2238 fichas activas; 27034 ejercicios". `pnpm typecheck`: sin errores.
- Las 5 fichas son idénticas a HEAD si se ignora `claseGuiada` (ejercicios/respuestas intactos).
- version 1; ids de momentos únicos; todo recursoRef existe y todo recurso se usa; momento `idea` sin recursoRef; 2 recursos por clave (P2: 3).
- Sin «Atención:», sin «¿Es verdad que…», sin «como puedes ver». Comprobaciones: una sola respuesta, distractores sin pistas.

## Recursos (renderizados con Chrome headless a 360 px; WebP abierta)
- partes-feria WebP: coincide con narración y descripcion (soga, rayuela, banderines, niña con botella verde). Sin texto incrustado.
- Los 10 SVG renderizan sin solapes ni cortes. Textos pequeños (~7-8 px a 360 px) en idea-principal-posiciones (leyenda inferior), proposito-pistas (cuerpo de las 4 tarjetas) y informacion-explicita-evidencia (línea "Pregunta").

## Defectos
P2
1. `situacion-feria`: «Un cartel que invitara a esta feria daría cada dato…» es forzado. Sugerido: «Un cartel de esta feria da cada dato en un lugar distinto: el día, los juegos y lo que hay que traer.» (menor)

P4
1. `ejemplo-sombrero-lee` muestra el recurso `cadena`, que ya trae el paso «tomó mucho sol», dato que la narración aún no introduce (solo aparece en `ejemplo-sombrero-cadena`). Mover `recursoRef: cadena` de `ejemplo-sombrero-lee` a `ejemplo-sombrero-efecto` (o quitarlo de `-lee`), y en `-efecto` indicar que por ahora se miran solo el primer y el último cuadro.
2. `cadena.svg`: la banda «Palabras que unen…» y los cuadros son legibles pero justos en móvil; aceptable, revisar en navegador.

P5
1. `ejemplo-maiz-lee` y `ejemplo-maiz-prueba`: «Se hace tamales» es agramatical. Corregir a «Se hacen tamales» en ambos (y en el párrafo, que debe coincidir con el ejercicio de la ficha si existe).
2. `ejemplo-huerto-posicion`: «Mira otra vez el esquema de tres columnas» pero `posiciones` aparece ahí por primera vez. Cambiar a «Mira el esquema de tres columnas» y describirlo (inicio, medio, final).
3. Narración depende solo del color («la oración amarilla»). Añadir «la que está resaltada» y mantener la leyenda; la leyenda del SVG es muy pequeña en móvil (subir a ≥10 px equivalente).
4. Comprobación: la respuesta es la primera oración, lo que premia el atajo «primera = principal» justo cuando el tema enseña lo contrario. Sugerido: poner la idea principal al final o en medio del párrafo de comprobación.

P6
1. `situacion-columnas`: «Tiene dos columnas» pero el SVG muestra tres filas (Propósito, Punto de vista, Pistas). Corregir: «Tiene tres líneas: propósito, punto de vista y pistas (pide y creo)».
2. `ejemplo-chasqui-lee`: no se muestra el texto, solo se describe («Cuenta cómo viajaba… da distancias…»). Comunicación exige texto visible. Añadir 2-3 oraciones citadas, p. ej. «El chasqui recorría el Qhapaq Ñan llevando mensajes. Cada pocos kilómetros había un tambo donde descansaba. Un tramo de unos veinte kilómetros se hacía en una jornada.» (revisar datos antes de fijar cifras).
3. `proposito-pistas.svg`: texto de las tarjetas muy pequeño en móvil.

## Ilustraciones faltantes
Solo existe 1 de las de Gemini (P2). Todas las claves cumplen el mínimo de 2 recursos distintos con diagramas, así que son suficientes sin las ilustraciones pendientes. P3-P6 quedan sin ilustración; no bloquea.

## Sin hacer (no dado por hecho)
- Prueba real en navegador (móvil y escritorio) del reproductor de clase guiada: tamaño efectivo de los SVG, tema oscuro, alt/descripcion leídos por lector de pantalla.
- Audio/TTS: no se escuchó ninguna narración (pronunciación de «Qhapaq Ñan», «ordeña», «chasqui»).
- Consistencia de los párrafos de comprobación con los ejercicios en pantalla.
- No leí informe-editorial-primaria-lote-03.md (juicio previo a su lectura).
