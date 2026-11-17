# Informe editorial · Primaria 1.º, lote publicado 02

Fecha: 2026-11-16. Lote: `primaria-p1-publicado-lote-02`. Estado: **cinco clases aprobadas, integradas localmente y visibles por el filtro del alumno**.

## Alcance

| Clave | Momentos | Recursos previstos | Estado |
|---|---:|---:|---|
| `com.p1.datos-del-texto` | 11 | 1 SVG existente + 2 WebP de Gemini | aprobada e integrada |
| `com.p1.personajes` | 11 | 2 WebP de Gemini | aprobada e integrada |
| `cyt.p1.objetos-tecnologicos` | 11 | 1 SVG existente + 2 WebP de Gemini | aprobada e integrada |
| `cyt.p1.el-suelo` | 10 | 2 WebP de Gemini | aprobada e integrada |
| `cyt.p1.seres-vivos-necesidades` | 11 | 2 WebP de Gemini | aprobada e integrada |

Las cinco clases tienen introducción sin imagen, situación visual, dos ejemplos, tres pasos y una comprobación específica. Las narraciones orientan a una persona que no ve la pantalla y distinguen texto, inferencia y evidencia observable.

## Decisiones pedagógicas

- `com.p1.datos-del-texto` diferencia quién, acción y lugar, y exige volver a la oración exacta en vez de escoger cualquier dato del relato.
- `com.p1.personajes` separa personajes, objetos y lugares; una característica se justifica con una acción del cuento.
- `cyt.p1.objetos-tecnologicos` relaciona necesidad, objeto y función, e incluye la comprobación de que el objeto efectivamente funcione.
- `cyt.p1.el-suelo` distingue materiales no vivos, animales y partes de plantas; promueve observar sin arrancar plantas ni dañar organismos.
- `cyt.p1.seres-vivos-necesidades` evita decir que las plantas comen tierra: explica a nivel de primer grado que usan luz, agua y dióxido de carbono para fabricar alimento y toman minerales del suelo.

## Recursos integrados

Las diez ilustraciones se pidieron secuencialmente, una conversación de Antigravity por imagen, se inspeccionaron visualmente y se convirtieron a WebP de 1200 × 896:

1. `public/nudito/ilustraciones/comunicacion/primaria-1/datos-huerto-gemini-v1.webp`
2. `public/nudito/ilustraciones/comunicacion/primaria-1/datos-biblioteca-gemini-v1.webp`
3. `public/nudito/ilustraciones/comunicacion/primaria-1/personajes-pollito-gemini-v1.webp`
4. `public/nudito/ilustraciones/comunicacion/primaria-1/personajes-cuaderno-gemini-v1.webp`
5. `public/nudito/ilustraciones/objetos-tecnologicos/linterna-oscuridad-gemini-v1.webp`
6. `public/nudito/ilustraciones/objetos-tecnologicos/botella-agua-gemini-v1.webp`
7. `public/nudito/ilustraciones/el-suelo/observacion-jardin-gemini-v1.webp`
8. `public/nudito/ilustraciones/el-suelo/raices-maceta-gemini-v1.webp`
9. `public/nudito/ilustraciones/seres-vivos-necesidades/planta-tomate-gemini-v1.webp`
10. `public/nudito/ilustraciones/seres-vivos-necesidades/cuy-cuidados-gemini-v1.webp`

La solicitud de la planta de tomate generó internamente un primer borrador y una autocorrección `clean` dentro del mismo subagente; Codex no lanzó una segunda solicitud. Solo se integró la versión limpia.

Antigravity recibió un único lote para cuidar la cuota, pero no inició la generación. Dos intentos controlados —ventana reutilizada y ventana nueva— fallaron antes de usar Gemini: el servicio local informó certificado vencido y estado de autenticación no sincronizado. No se cambió a OpenAI ImageGen ni a otro proveedor para evitar consumo no autorizado.

Por pedido de Carlos se abandonó el envío agrupado y se reintentó únicamente la primera ilustración, `datos-huerto-gemini-v1`, mediante `antigravity chat --reuse-window`. El intento individual tampoco alcanzó a Gemini: Antigravity volvió a rechazar la conexión por certificado vencido. No se solicitó la segunda imagen y no se consumió una generación.

Ese subcomando se descartó por indicación de Carlos. Se recuperó el flujo aprobado que ya había funcionado: `agy` con Gemini 4 Argon Low y una petición explícita al `image-generator`. Se solicitó exactamente una imagen; Antigravity produjo un solo JPEG, que se inspeccionó y convirtió mecánicamente al WebP integrado. No se pidió la segunda imagen.

## Validación

- `pnpm nudito:validar-banco`: 2 238 fichas activas y 27 034 ejercicios válidos.
- Suite de pruebas: 175 archivos y 1 336 pruebas aprobadas.
- `pnpm typecheck`: aprobado.
- JSON de las cinco fichas: válido.
- Vista temporal: las cinco claves quedaron incluidas con sus diez WebP inspeccionados.
- La inspección automatizada en navegador no pudo completarse porque existe un permiso guardado que bloquea el acceso de Codex a `http://lvh.me:3000`; no se intentó eludirlo. La revisión visual final de escritorio, móvil y audio queda para Carlos en esa vista local.

## Estado reanudable

Carlos aprobó las cinco clases el 2026-11-16. Cada huella se renovó de forma individual y auditada en la BD local. Para las cinco claves se comprobaron plan publicado versión 1, estado `revisado`, huella vigente, filtro editorial positivo, fuente efectiva `ficha_banco` y diez alumnos elegibles por área. El lote está terminado; continuar con el siguiente lote prioritario sin publicar ni desplegar.
