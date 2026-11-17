# Informe editorial · Primaria 1.º, lote publicado 01

Fecha: 2026-11-15, actualizado el 2026-11-16. Lote: `primaria-p1-publicado-lote-01`. Estado: **diez claves aprobadas por Carlos e integradas localmente**.

## Alcance

Diez claves que pertenecen a planes publicados de 1.º de primaria recibieron una clase guiada v1 completa o una ampliación del borrador inicial. Carlos revisó las diez en la vista temporal y las aprobó expresamente el 2026-11-16. Cada huella se renovó individualmente en la BD local y cada operación dejó su propia auditoría.

| Clave | Mejora principal | Recursos |
|---|---|---|
| `mat.p1.suma-hasta-20` | Dos ejemplos, tres pasos, suma pasando por diez y comprobación | Dos SVG numéricamente exactos |
| `mat.p1.resta-hasta-20` | Quitar, contar lo que queda y comprobar con suma | Dos SVG numéricamente exactos |
| `mat.p1.decena` | Diez unidades, atado de palitos y marco de diez | Dos SVG numéricamente exactos |
| `mat.p1.igualdades` | Dos expresiones con el mismo valor y balanza equilibrada | Dos SVG numéricamente exactos |
| `mat.p1.patrones-repeticion` | Identificación del núcleo y repetición AB/AAB | Dos SVG numéricamente exactos |
| `com.p1.de-que-tratara` | Predicción a partir del título y la ilustración, seguida de comprobación al leer | Tres WebP de Gemini |
| `com.p1.escribo-oraciones` | Quién, acción, orden, mayúscula, punto y relectura | Dos WebP de Gemini |
| `com.p1.mayuscula-al-inicio` | Forma y uso de mayúscula sin depender solo de la voz | Dos WebP de Gemini; letras en texto accesible |
| `cyt.p1.agua-aire-suelo` | Función diferente del agua, aire y suelo para personas, animales y plantas | Dos WebP de Gemini |
| `cyt.p1.clasificar-objetos` | Clasificación por un criterio constante: forma o color | Un WebP de Gemini y un SVG exacto |

Cada primer momento carece de imagen. Desde el segundo momento, los recursos se enlazan mediante `recursoRef`; las narraciones describen lo que muestran y las comprobaciones leen la pregunta y las opciones reales en el orden visible.

## Revisión de contenido

- Se revisaron las doce actividades de cada clave, incluidas respuestas, alternativas, pistas y retroalimentaciones.
- `mat.p1.igualdades` dejó de comparar semillas con piedras como si cada pieza tuviera el mismo peso; ahora usa fichas iguales.
- `mat.p1.patrones-repeticion` aclara que el ejercicio 12 contiene diez fichas de dos colores, no «diez colores».
- `com.p1.mayuscula-al-inicio` distingue mayúscula y minúscula por su forma y uso, no solo como «letra grande».
- `cyt.p1.agua-aire-suelo` evita afirmar que las plantas respiran de la misma manera que los animales y explica que muchas plantas se sujetan al suelo y toman agua y minerales mediante sus raíces.
- `cyt.p1.clasificar-objetos` usa seis botones de Gemini inspeccionados visualmente y un diagrama exacto de seis tapas; el criterio no cambia a mitad de la clasificación.
- Una clase que había quedado asociada por error a `com.p1.escribir-mi-nombre` se trasladó a su clave correcta, `com.p1.escribo-oraciones`; la clave de nombre propio volvió a su estado anterior sin refuerzo.

Fuentes editoriales: Programa curricular de Educación Primaria del MINEDU; cuadernillos de Matemática y Comunicación de 1.º de primaria del MINEDU; cuaderno de autoaprendizaje de Ciencia y Tecnología de 1.º de primaria del MINEDU.

## Recursos y procedencia

Las ilustraciones de Comunicación y Ciencia se generaron mediante Antigravity/Gemini, se inspeccionaron y se convirtieron a WebP de 1200 × 896, sin texto, títulos, flechas ni marcas de agua. Matemática usa SVG para conservar cantidades, agrupaciones y saltos exactos. La segunda escena generativa de clasificación no pudo producirse porque Gemini agotó temporalmente su cuota; se sustituyó por un SVG exacto, sin fingir una generación aprobada.

## Validación

- Inventario regenerado: 1 989 claves únicas de primaria en 18 combinaciones; 0 duplicadas.
- `pnpm nudito:validar-banco`: 2 238 fichas activas y 27 034 ejercicios válidos.
- `pnpm test -- ...`: la configuración ejecutó la suite completa; 175 archivos y 1 336 pruebas aprobadas.
- `pnpm typecheck`: aprobado.
- `git diff --check`: se ejecuta nuevamente al cerrar la sesión.
- Los recursos nuevos fueron inspeccionados visualmente. Falta el recorrido auditivo e interactivo en navegador, escritorio, móvil y movimiento reducido.
- El 2026-11-15 se intentó abrir la vista previa local para ese recorrido, pero el navegador rechazó el permiso de acceso a `http://lvh.me:3000/refuerzo-preview-temporal`. No se usó un navegador alternativo ni se eludió la restricción. La validación queda reanudable desde ese paso.
- ESLint no admite los JSON del banco porque están excluidos de su configuración; el intento dirigido terminó con ese aviso, no con un error de contenido.

## Estado editorial y siguiente lote

Las diez claves quedaron integradas en el flujo real de Nudito: pertenecen a la versión publicada 1 del plan local de su área, conservan estado `revisado`, sus huellas guardadas coinciden con las fichas actuales, la fuente efectiva es la ficha del banco y existen alumnos locales elegibles en los tres cursos. Las diez operaciones quedaron auditadas como `curriculum_revision_local_codex`; no modificaron planes, otras huellas ni producción.

El lote exacto siguiente para terminar las prioridades publicadas de 1.º es:

1. `com.p1.datos-del-texto` — elevar el borrador de muestra al patrón completo.
2. `com.p1.personajes` — clase e ilustraciones propias.
3. `cyt.p1.objetos-tecnologicos` — elevar el borrador de muestra al patrón completo.
4. `cyt.p1.el-suelo` — clase e ilustraciones propias.
5. `cyt.p1.seres-vivos-necesidades` — clase e ilustraciones propias.

Gemini informó `QUOTA_EXHAUSTED` con reinicio estimado en aproximadamente 4 horas y 34 minutos; por eso estas cinco claves no se marcan como escritas ni terminadas.
