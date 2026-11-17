# Revisión lote 03, ronda 2 (Comunicación P2-P6)

| Clave | Veredicto |
|---|---|
| com.p2.informacion-en-partes | APROBADA |
| com.p3.informacion-explicita | APROBADA |
| com.p4.causa-y-efecto | APROBADA (retoque menor opcional) |
| com.p5.idea-principal | APROBADA |
| com.p6.proposito-y-punto-de-vista | APROBADA |

Verificado: `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios) y `pnpm typecheck` sin errores; `git diff --check` limpio. Ejercicios y respuestas intactos: solo cambia `claseGuiada`, salvo `ejemplos` en com.p5 («Se hacen tamales», aceptado). Todos los recursoRef existen y todos los recursos se usan. Sin «Atención:», «¿Es verdad que…» ni «como puedes ver».

Defectos previos: todos corregidos. P2 cartel reescrito; P4 `cadena` solo en -efecto/-cadena (dice mirar primer y último cuadro); P5 ya no depende solo del color, esquema presentado sin «otra vez», idea principal de la comprobación es la última oración; P6 situacion-columnas dice «tres líneas», chasqui-lee cita ahora el texto.

Renderizado Chrome headless 360 px (10 SVG + WebP): sin solapes ni cortes, fieles a narración/alt/descripcion. Los 3 SVG rehechos (640×480, 26-30 px) legibles.

Defectos menores nuevos (no bloquean):
1. `causa-y-efecto-cadena.svg` (viewBox 720, texto 18-21) queda ~9-10 px a 360 px; `informacion-en-partes-pedro.svg` (20-24) ~10-12 px. Subir a ≥23.
2. `idea-principal-posiciones.svg`: las oraciones son cajas vacías; la descripcion las llama oraciones. Aceptable como esquema; la oración real se lee en la narración.

Ilustraciones faltantes: P2 tiene la WebP (coincide con descripcion). P3-P6 tienen 2 diagramas cada una, con texto visible en narración: suficientes sin Gemini.

Sin comprobar: audio/TTS real (Qhapaq Ñan, ordeña, chasqui), recorrido en la app (móvil/escritorio, tema oscuro, pausa/reanudar), lector de pantalla.
