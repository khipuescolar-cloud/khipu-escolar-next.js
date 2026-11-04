# Módulo de evaluaciones — documento técnico y funcional

> Última actualización: 2026-11-03. Fuente: dos entrevistas con una docente (2026-10-31 y 2026-11-02) y el código del repositorio.
> Reglas de negocio vigentes y contratos: `specs/11-notas-y-libreta.md` (manda sobre este documento si difieren).
> Capacidades y desempeños CNEB: `specs/30`. Consolidado de dirección: `specs/33`. Avisos: `specs/06`.
> NSP, justificaciones, recuperación, incidencias, correcciones auditadas, resumen diario y libretas emitidas: `specs/37`.

## 1. Principio

Khipu **registra y comunica**; **no decide la calificación**. La nota del periodo por competencia la pone el profesor.
Toda fórmula que convierta notas o puntajes en una calificación es **provisional** y está **apagada por defecto**
hasta que se valide con docentes del piloto.

## 2. Qué está confirmado y qué no

| # | Regla | Estado | Cómo la aplica Khipu |
|---|---|---|---|
| C1 | La calificación final se reporta **por competencia** | Confirmada (docente) | `calificaciones_periodo` única por alumno + competencia + periodo |
| C2 | Cada curso tiene competencias → capacidades → desempeños | Confirmada | `competencias`, `capacidades`, `desempenos` (catálogo CNEB, specs/30) |
| C3 | Instrumentos: lista de cotejo, rúbrica y prueba escrita | Confirmada | `evaluaciones.instrumento` + criterios (sección 5) |
| C4 | Una evaluación puede medir **varias competencias** y dar una nota por cada una | Confirmada | Una fila de `evaluaciones` por competencia, unidas por `grupo_id` |
| C5 | Rúbrica = criterios con escala de puntaje (p. ej. 1–3); lista de cotejo = cumple/no cumple | Confirmada | `criterios_evaluacion` + `resultados_criterio`, guardados **tal cual** |
| C6 | El registro auxiliar guarda criterios y desempeños por clase, ligados a competencias | Confirmada | Rejilla agrupada por competencia + criterios por columna |
| C7 | Descripciones de progreso por competencia y periodo; a mitad del trimestre: logros, dificultades, recomendaciones | Confirmada | Informe de progreso (opcional) |
| C8 | La libreta lleva: colegio, cursos, calificaciones, comentarios por competencia y comentario general del tutor | Confirmada (su plataforma) | Libreta en pantalla y PDF + `comentarios_tutor` |
| C9 | En su colegio la secretaria pasa las notas al SIAGIE a mano; cada institución tiene sus formatos | Confirmada (un colegio) | Sin integración (sección 8) |
| H1 | Cómo sale la nota del periodo («se promedia») | **Hipótesis** | Sin sugerencia por defecto; «promedio» y «más frecuente» son opcionales y provisionales |
| H2 | Ponderaciones por tipo de evaluación | **No hay** en la plataforma de la docente; no es regla universal | Campo `peso` por columna (vale 1); solo lo usa una regla provisional, si está activa |
| H3 | Redondeo, decimales, conversión puntaje → AD/A/B/C | **Sin respuesta** | No se implementa |
| H4 | Nota única del curso (promedio de competencias) | **No confirmada** | No existe: se quitó el «Promedio» del consolidado |
| H5 | Obligatoriedad del informe de progreso y del comentario del tutor | **Sin confirmar** | Ambos opcionales |
| H6 | Conclusión descriptiva obligatoria en B y C | Basada en la norma del MINEDU; **confirmar** | Se exige en B y C |
| C10 | Plazo para justificar: 15 días calendario (día 0 = falta; vence 23:59:59 del día 15, hora del colegio) | Confirmada (product owner, 2026-11-03) | `tenants.plazo_justificacion_dias` (specs/37) |
| C11 | Al vencer el plazo sin justificación se aplica la consecuencia que configure el colegio (no universal) | Confirmada (product owner) | `tenants.consecuencia_vencimiento_*`; sin configurar = alerta |
| C12 | La recuperación se registra en la actividad original, con fecha de recuperación e historial | Confirmada (product owner) | `notas.recuperacion`, `fecha_recuperacion`, `historial_notas.tipo = recuperacion` |
| H8 | Qué pasa si el profesor no autoriza la recuperación | Decisión provisional: queda NSP sin nota ni consecuencia | Validar con docentes |
| H7 | Umbrales del tablero («logro esperado» AD/A o ≥ 14; «en riesgo» C o < 11) | **No validados** | Siguen en el tablero de dirección como indicador, no como nota |

## 3. Entidades y relaciones

```
Periodo (por nivel: bimestre/trimestre/semestre)
Curso (salón, profesor) ─┬─ Competencia ─┬─ Capacidad
                         │               └─ Desempeño (nivel, grado)
                         └─ Evaluación (una fila por competencia; grupo_id une las columnas de una misma evaluación)
                              ├─ instrumento?, descripcion?, fecha, peso, estado (programada | publicada), publicada_at
                              ├─ EvaluacionDesempeno (M:N con desempeños)
                              ├─ CriterioEvaluacion (escala puntaje 0..N | cumple, desempeño?)
                              │    └─ ResultadoCriterio (alumno: puntaje | cumple) — evidencia, no nota
                              ├─ Nota (alumno: AD/A/B/C o 0–20, observación) — la pone el profesor
                              └─ HistorialNota (valor anterior → nuevo, quién, cuándo)
CalificacionPeriodo (alumno + competencia + periodo, conclusión) — la confirma el profesor; va a la libreta
InformeProgreso (alumno + competencia + periodo: logros, mejorar, recomendaciones) + EnvioInformeProgreso (curso + periodo)
ComentarioTutor (alumno + periodo) — va a la libreta
Tenant.sugerencia_periodo (columna `calculo_literal`): ninguna (defecto) | promedio | frecuente — provisionales
```

Todas las tablas llevan `tenant_id`, se consultan con `ctx.db` (tenant inyectado) y tienen RLS cerrado para `anon` y
`authenticated`.

## 4. Estados y flujo

| Estado | Qué significa | Quién lo cambia | Qué ve la familia |
|---|---|---|---|
| **Programada** | Creada (con fecha, descripción y competencias). Sus notas son **borrador** | Profesor al crearla | La evaluación en la agenda; **no** las notas |
| **Publicada** | Resultados visibles | Profesor del curso («Publicar resultados») | Las notas y observaciones en «Notas» |
| **Cerrada** | Curso cerrado en el periodo o periodo cerrado: nada se edita | Profesor/dirección (cierre de curso), dirección (periodo) | Igual que publicada |

Flujo del ejemplo (examen de Comunicación del 22 de noviembre):
1. El profesor, en Notas → «Nueva evaluación», elige título, instrumento, fecha, descripción y las competencias que
   evalúa, con «Avisar a las familias» marcado → `evaluacion_programada`: un aviso por familia, con los hijos juntos.
2. El examen aparece en la agenda del salón y en «Mi horario» como evento del día, sin hora.
3. El profesor registra resultados: notas por competencia en el registro auxiliar y, si quiere, puntajes por criterio.
   Todo queda en borrador.
4. «Publicar resultados»: la familia ve las notas y recibe una **notificación en Khipu y un Web Push** (outbox por evento,
   specs/38; sin correo por cada nota: el resumen diario se retiró el 2026-11-03). Publicar otra vez se rechaza.
5. Cada cambio posterior exige tipo y motivo (mínimo 5 caracteres no vacíos), queda en `historial_notas` (inmutable) y avisa a esa familia (`nota_corregida`).
   Quien faltó ese día tiene **NSP** (lo pone la asistencia); quien asistió y no entregó, **NE**. Ninguno es un número.
6. Al final del periodo, el profesor confirma la calificación por competencia con su conclusión, el tutor escribe su
   comentario, se cierran los cursos y dirección publica la libreta (`libreta_publicada`). Publicar **emite** una versión
   congelada; después solo cambia por rectificación aprobada por dirección (versión nueva; specs/37).
   La emisión ocurre antes de marcar el periodo como publicado (un fallo a medias se reintenta sin duplicar) y las
   versiones emitidas no se borran (trigger y FK `RESTRICT`, salvo al borrar el colegio completo).

## 5. Instrumentos con criterios

- Desde «Evaluaciones del periodo» → «Criterios» de una columna (evaluación + competencia).
- Cada criterio tiene una descripción, una escala (puntaje de 0 a N, con N entre 1 y 100, o cumple/no cumple) y puede ligarse a un desempeño de esa
  competencia y del grado del salón.
- Los resultados se guardan **tal cual**. La rejilla muestra totales de referencia («2 de 3 puntos», «Cumple 1 de 2»).
- **No** hay conversión a AD/A/B/C ni a la nota: la nota la pone el profesor. Queda abierto modelar después plantillas de rúbricas
  reutilizables y una regla de conversión por colegio, cuando se valide.

## 6. Roles

| Rol | Puede |
|---|---|
| Profesor del curso | Crear, editar y eliminar evaluaciones (eliminar: solo borradores sin historial, NSP, consecuencia ni recuperación) y criterios; autorizar y registrar recuperaciones (solo él, no el tutor); poner notas y resultados; publicar y reenviar; informe de progreso; confirmar calificaciones; cerrar el curso |
| Tutor del salón | Lo anterior en sus cursos y, además, el comentario de tutoría de sus alumnos (periodo abierto) |
| Dirección | Ver todo (registro, historial, criterios, consolidado), cerrar y reabrir cursos y periodos, publicar la libreta, elegir la sugerencia provisional. No edita notas |
| Apoderado / alumno | Solo sus hijos o a sí mismo: notas **publicadas**, informes compartidos y la libreta publicada. Nunca promedios del salón ni comparaciones |
| Otros roles / Khipu Base | 403 |

## 7. Cálculos

- **Confirmados:** ninguno automático. Khipu solo muestra datos: la lista de notas del periodo por competencia y los totales
  de los criterios como referencia.
- **Provisionales** (apagados por defecto; dirección los activa en Configuración → «Escala de calificación»):
  - `promedio`: en vigesimal, el promedio con pesos redondeado al entero; en literal, AD 4, A 3, B 2, C 1 con pesos,
    redondeado al más cercano, y el empate sube.
  - `frecuente`: la nota más frecuente; si empatan, la más reciente (en vigesimal, promedio).
  - Con cualquiera de las dos, el profesor confirma o cambia la calificación.

## 8. SIAGIE

Pendiente de validar. **No hay integración ni formato compatible con SIAGIE.** El consolidado del salón (Excel y PDF,
specs/33) es una exportación genérica de las calificaciones confirmadas; no se presenta como formato oficial.

## 9. Preguntas pendientes

**Para docentes (y para revisar la plataforma que ofreció mostrar):**
1. ¿Cómo pasa la rúbrica de puntajes a AD/A/B/C? ¿Hay tabla de conversión por colegio o por instrumento?
2. ¿La nota del periodo es el promedio de **qué**: de todas las notas de la competencia, de los criterios o de los instrumentos?
3. Redondeo: ¿decimales?, ¿hacia arriba en el empate?, ¿excepciones a criterio del profesor?
4. ¿Hay una nota final por curso o solo por competencia? ¿Y en secundaria con escala vigesimal?
5. ¿El informe de mitad de periodo es obligatorio? ¿Lo pide la UGEL o es práctica del colegio?
6. ¿El comentario del tutor es por periodo o solo al cerrar el año?
7. ¿La conclusión descriptiva es obligatoria solo en B y C o en todos los niveles de logro?
8. ¿Las rúbricas se reutilizan entre evaluaciones o salones? (plantillas)

**Para la secretaria (SIAGIE):**
1. ¿Qué datos pasa al SIAGIE y en qué momento (por periodo o fin de año)?
2. ¿Usa importación por archivo o digita a mano? ¿Qué formato pide?
3. ¿Qué pasa si hay que corregir una nota ya registrada?
4. ¿Qué datos de los estudiantes maneja en el SIAGIE que Khipu no tiene?

## 10. Decisiones tomadas en esta etapa (2026-11-03)
- Flujo definitivo de asistencia ↔ registro auxiliar (specs/37): NSP automático, plazo de 15 días calendario, consecuencia
  configurable (sin configuración no se aplica nada), recuperación en la actividad original, «No entregó» (NE) para quien
  asistió y no entregó, libreta emitida con rectificaciones. El resumen académico diario se reemplazó (mismo día) por notificaciones por evento (specs/38).
- Sin sugerencia de calificación por defecto; las fórmulas quedan como opciones provisionales.
- El consolidado de dirección muestra solo las calificaciones confirmadas, sin «Promedio» del alumno.
- Programar y publicar, historial de notas, comentario del tutor y criterios de instrumentos: implementados.
- Las evaluaciones que ya existían quedaron publicadas: la familia ya veía esas notas, así que nada se esconde.
