# Revisión independiente lote 07 (Matemática 6.º)

| Clave | Veredicto |
|---|---|
| mat.p6.area-triangulos | CAMBIOS |
| mat.p6.ecuaciones-cuatro-operaciones | CAMBIOS |
| mat.p6.multiplicacion-fracciones | CAMBIOS (menor) |
| mat.p6.operaciones-decimales | CAMBIOS |
| mat.p6.patrones-termino-general | CAMBIOS |
| mat.p6.proporcionalidad-directa | CAMBIOS |

Exactitud: todos los cálculos (narración, ejemplos, contraejemplos, comprobaciones) recalculados con Fraction/Decimal/enteros; correctos, sin ambigüedad. Las claseGuiada no tienen opciones de respuesta, así que no aplica la letra correcta ni `respuesta`. Voz: tú, español del Perú, sin «Atención:», sin «¿Es verdad que…», sin «recuerda» inicial, sin frases sueltas. «n» y «equis» se alternan; «n» en voz puede leerse «ene» (claro en 6.º, pero conviene decir «la letra n»). Técnica: claseGuiada v1 válida, ids únicos, sin recursoRef rotos ni recursos sin usar, idea inicial sin imagen, 3 recursos distintos por clave. Las 6 fichas solo difieren de HEAD en `claseGuiada`. `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK. Los 18 SVG (640x480) renderizados en Chrome headless a 360 px: legibles, sin solapes, alt/descripcion fieles al dibujo.

## Defecto recurrente: imagen que revela la respuesta antes de razonarla
El SVG muestra la solución completa y está en el momento «guiado», que solo plantea el dato. Corrección sugerida común: quitar `recursoRef` del momento «guiado» y ponerlo en el «razona» donde la narración ya llega al resultado (o usar un SVG sin resultado).

1. area-triangulos, `ejemplo-2-guiado` (tapete-altura): el SVG ya muestra «30 × 24 ÷ 2 = 360 cm²» cuando la narración solo llega a 720. Quitar recursoRef aquí (en `contraejemplo`/`paso-1` sí corresponde).
2. area-triangulos, `ejemplo-1-guiado` (paralelogramo): el SVG ya dice «cada triángulo: 30 cm²» antes de que la narración lo calcule (sesenta entre dos). Mover la imagen a `ejemplo-1-razona`, o quitar la línea del triángulo en el SVG.
3. area-triangulos, `ejemplo-1-razona`: dice «un triángulo alto y delgado y otro bajo y ancho», que el SVG (paralelogramo único) no muestra. Quitar esa frase o el recursoRef.
4. ecuaciones, `ejemplo-1-guiado` (balanza): el SVG muestra «4x = 24» y «x = 6». Igual que 1.
5. ecuaciones, `ejemplo-2-guiado` (inversas): el SVG muestra 24, 8 y «n = 24» antes de deshacer. Mover a `ejemplo-2-razona`.
6. decimales, `ejemplo-2-guiado` (jarras): el SVG muestra «1,3 L» en cada jarra y todo el reparto; la narración solo reparte las unidades. Mover a `ejemplo-2-razona`.
7. patrones, `ejemplo-1-guiado` (palitos): el SVG muestra «T(n) = 3n + 1» y «3 × 1 + 1 = 4» antes de buscar la regla. Mover a `ejemplo-1-razona`.
8. patrones, `ejemplo-2-guiado` (tabla): el SVG muestra «5 × n», «+ 2» y «T(n) = 5n + 2» cuando la narración solo dice «usamos cinco n». Mover a `ejemplo-2-razona`.
9. proporcionalidad, `situacion-arroz` y `ejemplo-1-guiado` (arroz): la tabla completa (1 kg = S/ 4, 7 kg = S/ 28) está visible antes de calcularlo. Mover a `ejemplo-1-razona`; la situación podría ir sin imagen.
10. proporcionalidad, `ejemplo-2-guiado` (regla): el SVG muestra «450 ÷ 3 = 150 km»; la narración solo plantea los pares. Mover a `ejemplo-2-razona`.
11. fracciones, `ejemplo-1-guiado` (huerta) (menor): el SVG muestra «1/2 × 3/4 = 3/8» mientras la narración calcula 1×3 y 2×4. Aceptable en la situación inicial; en el guiado mejor pasar la imagen a `ejemplo-1-razona`, que dice «en el dibujo».

## Observaciones menores (no bloquean)
- ecuaciones `ejemplo-2-guiado`: «Si n es el dinero repartido, n entre tres menos dos es igual a seis» se entiende mejor como «la letra n».
- fracciones `paso-1`, `paso-2` (huerta) y decimales `paso-1`: reutilizan el mismo SVG de ejemplos ya vistos; coherentes con lo narrado.

## Sin comprobar
Audio real (lectura de «n», «equis», «cero coma doce»), recorrido en la app con la UI, SVG dentro del componente de Nudito.
