# Revisión lote 04, ronda 2 (Matemática)

| Clave | Veredicto |
|---|---|
| mat.p2.patrones-aditivos | APROBADA (obs. menor) |
| mat.p3.grupos-iguales | APROBADA |
| mat.p4.fracciones-equivalentes | APROBADA |
| mat.p5.numeros-decimales | APROBADA |
| mat.p6.porcentajes | APROBADA |

Defectos 1-9 de la ronda 1 verificados contra los archivos: corregidos. Cálculos recalculados (3-6-9-12-15-18-21; 2-5-8-11-14; 5-10-15-20-25; 3x4=12; 5x3=15; 2x5=10; 4x6=24; 1/2=2/4=3/6=4/8; 2/3 y 4/6 de 12 = 8; 2/6=1/3; 0,6/0,2/0,8/0,7; 25 % de 80=20; 10 % de 80=8; 75 % de 40=30; 75 % de 160=120; 20 %=1/5): correctos, una sola respuesta en cada comprobación. p5: "Cero coma siete" = id a, respuesta a, únicas. recursoRef: sin rotos ni recursos sin usar en las 5 claves; los 15 src existen. Ejercicios intactos: git diff solo quita `"revisado": null` (pasa a llevar coma) y añade claseGuiada. `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK.

SVG nuevos renderizados en Chrome headless a 360 px: legibles (texto mínimo ~11 px en el título de porcentajes, resto mayor), sin solapes, fieles a alt/descripcion/narración.

## Defectos nuevos
- Menor (p2 `ejemplo-1-razona`): con recursoRef regla-mas-tres, narra 15, 18 y 21 pero el SVG llega solo hasta 12. Ya no contradice el título, pero el dibujo no respalda lo narrado. Opcional.
- Menor: los SVG antiguos (patrones-aditivos, grupos-iguales, porcentajes, numeros-decimales, fracciones-equivalentes) no se re-renderizaron aquí; ya no se usan como recursoRef de estas claves salvo los listados.

## Sin comprobar
- Audio real (TTS: lectura de comas y números, sincronía).
- Recorrido en la app (carga de recursos por momento, comprobación interactiva, móvil real); los SVG se vieron sueltos, no dentro del componente.
