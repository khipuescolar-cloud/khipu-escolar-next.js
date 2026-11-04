# 43 — Nudito: práctica, evaluación y dominio por habilidad

> Estado: borrador (paso 0: esqueletos) · Plan: Khipu Pro · Última actualización: 2026-11-14 (Claude Code, paso 0) · Responsable: Dev B

## Objetivo
Producir ejercicios **verificables** para los temas de Nudito (specs/41–42), corregirlos sin IA cuando son cerrados y decidir
el avance del alumno por tema con una política de dominio **configurable y auditable**, sin cambiar su grado oficial.

## Responsabilidades (Dev B) — todo puro, sin BD ni servidor
- `src/lib/nudito/azar.ts`: PRNG con semilla (nunca `Math.random`).
- Matemática: generadores parametrizados en `src/lib/nudito/generadores/matematica/*` (operaciones, fracciones,
  proporcionalidad, ecuaciones, perímetro y área, porcentajes), con distractores ligados a errores típicos.
- Ciencia y Tecnología: banco de ítems **revisados** (`src/lib/nudito/banco/ciencia/*.json`, con fuente y revisor). La IA no crea ítems.
- Comunicación: lecturas breves originales con preguntas literales, inferenciales y críticas, y consignas de escritura con
  rúbricas formativas (`src/lib/nudito/lecturas/comunicacion/*`, `src/lib/nudito/rubricas/*`).
- Registro `generadores/registro.ts`; evaluadores `evaluadores/*`; rúbrica simulada; `politica-dominio.ts`.

## Reglas de negocio
- `generar(tema, dificultad, semilla)` es determinista; la salida cumple `esquemaEjercicioConSolucion`.
- Evaluación de ítems cerrados por código: fracciones equivalentes según `aceptarEquivalentes`, tolerancia numérica, texto
  normalizado; respuesta de otro tipo → `incorrecto` con retro amable. `incierto` solo para lo abierto.
- Escritura: rúbrica con IA (`EvaluadorAbierto`) o **rúbrica simulada** (heurística documentada: extensión, mayúscula y punto,
  conectores, párrafos, palabras de la consigna). Confianza baja → `incierto`, que **no** cuenta para el dominio.
- **Política de dominio** (`POLITICA_DOMINIO_POR_DEFECTO`, versión «v1»; el colegio puede cambiarla en
  `nudito_config_colegio.politica_dominio`, validada con `esquemaPoliticaDominio`): ventana de evidencias, mínimo de intentos,
  puntaje ponderado (aciertos con pista y parciales pesan menos), promedio de pistas, varias sesiones distintas separadas por
  horas, dificultad mínima, ejercicios de comprobación sin pista. Subir o bajar la dificultad por rachas. Desbloquear un tema de
  un grado superior exige dominio en la dificultad indicada y todos sus prerrequisitos dominados.
- Cada cambio devuelve su **motivo legible**; C lo guarda en `nudito_dominio_eventos` con la evidencia y una copia de la política.

## Contratos
```ts
// azar.ts: crearAzar(semilla): Azar, nuevaSemilla()
// generadores/registro.ts: generadores(), obtenerGenerador(id), ejercicioPara(tema, dificultad, semilla), fuentesDisponibles()
// evaluadores/index.ts: evaluadorDe(tipo), evaluar(ejercicio, envio), evaluarRubricaSimulada(ejercicio, envio), evaluadorAbierto()
// politica-dominio.ts: POLITICA_DOMINIO_POR_DEFECTO, politicaEfectiva(cambios), evaluarDominio: EvaluarDominio
// Tipos en src/lib/nudito/contratos.ts (Generador, Evaluador, EvaluadorAbierto, Evaluacion, PoliticaDominio…)
```

## Modelo de datos
Lo persiste C: `nudito_ejercicios` (enunciado público y solución solo servidor), `nudito_intentos`, `nudito_dominios`,
`nudito_dominio_eventos`.

## Pruebas
- unit: `nudito-generadores-*.test.ts` (determinismo, 1.000 semillas sin soluciones inválidas, dificultad creciente),
  `nudito-evaluadores.test.ts`, `nudito-politica-dominio.test.ts` (no hay dominio en una sola sesión; las pistas restan; la
  comprobación es obligatoria; cada cambio tiene motivo). Fixtures: `tests/fixtures/nudito/`.

## Pendientes
- Todo lo de «Responsabilidades». Revisión pedagógica humana del banco de Ciencia y de las lecturas.
