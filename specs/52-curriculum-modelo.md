# 52 — Modelo de datos del currículo

> Estado: implementado (modelo aditivo; importación y servicios pendientes) · Plan: Khipu Base / Khipu Pro · Última actualización: 2026-11-09 (Codex)

## Objetivo
Un tema global puede figurar en Matemática integrada de un colegio y Álgebra de otro, sin duplicar contenido ni mezclar datos institucionales.

## Roles y permisos
| Rol | Puede |
|---|---|
| Equipo Khipu (super administrador) | Revisar y publicar el índice editorial, con auditoría en el servicio futuro. |
| Profesor | Ver y proponer temas borrador, marcados «Borrador». |
| Alumno | Ver solo temas revisados o publicados. |
| Dirección y administración | Configurar cursos y malla de su colegio; dirección consulta el estado del plan anual. |

La conformidad del temario exige a todos los profesores participantes (specs/48); dirección no lo aprueba.

## Reglas de negocio
- El banco JSON versionado conserva el contenido canónico y las claves actuales (por ejemplo, `mat.p3.…`). Los temas nuevos se importan con clave Khipu estable. El índice en BD guarda taxonomía, procedencia, fuente, estado y versión. Una importación idempotente debe hacer upsert por `clave`, sin rebajar un estado revisado ni renumerar versiones sin cambio de contenido.
- `disciplinas` es una lista: un tema puede pertenecer a varias. Un curso es una vista filtrada por disciplina; no tiene banco propio. Las disciplinas cedidas a un curso especializado se excluyen de la vista del área en ese grado (specs/51).
- El vínculo con desempeño oficial usa códigos y localizador documental globales, verificados. `Desempeno` actual es por colegio y no es el catálogo oficial global. Sin código o fuente comprobada, no se crea vínculo. Los candidatos del paquete son propuestas editoriales, no temas oficiales MINEDU.
- `CursoColegioGrado` fija oferta por año, nivel y grado. `Curso` es la instancia de salón y se enlaza opcionalmente por `cursoColegioId`; los cursos históricos quedan intactos. El servicio debe comprobar que el salón y la oferta tienen igual año, nivel y grado.
- Toda lectura o escritura institucional usa `ctx.db`. El catálogo global se lee con `db` tras autorización en servidor. `TemaCurricular` y `TemaDesempenoOficial` figuran en `MODELOS_GLOBALES` de `src/lib/server/db.ts`: `dbTenant` no les inyecta `tenantId` y la exportación del colegio los excluye; `CursoColegio` y `CursoColegioGrado` sí se exportan. La FK compuesta `(tenant_id, curso_colegio_id)` impide cruces entre colegios.

## Modelo de datos
- `TemaCurricular`: `clave` global, `areaCneb`, `disciplinas[]`, `nivel`, `grado`, `procedencia`, `fuenteId`, `fuenteLocator`, `estado` (borrador/revisado/publicado), `version`, `revisadoPorId`, `revisadoAt`.
- `TemaDesempenoOficial`: `temaClave`, códigos de competencia y desempeño, fuente, localizador y verificación.
- `CursoColegio`: `tenantId`, `cursoKhipu?`, `nombre`, `orden`, `archivadoAt`.
- `CursoColegioGrado`: `tenantId`, `cursoColegioId`, `anio`, `nivel`, `grado`, `orden`. Único por curso, año, nivel y grado.
- `Curso.cursoColegioId?`: instancia de salón, opcional para migración gradual.

## Contratos de `src/lib/server`
`src/lib/server/curriculum/modelo.ts` exporta `TemaClave`, `IndiceTemaCurricular`, `VinculoDesempenoOficial`, `DefinicionCursoColegio`, `OfertaCursoGrado` y `temaVisibleParaAlumno`. Importación, plan anual, Nudito y panel editorial comparten estas claves y estados.

## Rutas y UI
Sin rutas nuevas en esta subtarea. La UI futura marcará «Borrador» y ocultará esos temas al alumno.

## Errores y casos borde
- `cursoKhipu = null`: curso propio sin Nudito; pueden coexistir varios.
- Clave ausente del banco versionado: el importador debe reportarla antes de crear un índice huérfano.
- La FK compuesta rechaza vincular un curso de otro colegio. No se borran cursos históricos.
- La versión debe ser positiva y el grado válido para su nivel.

## Pruebas
Integración: un índice global compartido por Matemática de A y Álgebra de B; aislamiento de `dbTenant` y FK compuesta. Validación Prisma, migración local, generación de cliente y checks del proyecto.

## Pendientes
- `pnpm db:migrate` falla al reconstruir la base temporal por un problema previo a este modelo: `20261109120000_reporte_periodo_notificacion` ejecuta `ALTER TYPE "TipoNotificacion"` antes de que `20261112090100_bandeja_general` cree ese tipo. Se reprodujo P3006/P3018 en una base temporal aislada usando el esquema y las 53 migraciones anteriores, sin la migración curricular. La migración curricular se aplicó a la BD local con `pnpm db:deploy`; corregir el historial anterior queda fuera de esta subtarea.
- Sincronización del contenido importado y flujo editorial normal, servicio de aprobación por revisión y UI; son subtareas separadas.

## Aprobación inicial en bloque
`pnpm curriculum:aprobar-todo --revisor <correo>` indexa todos los temas globales versionados del banco y el catálogo de Nudito, y cambia los borradores a «revisado». Exige un super administrador activo, registra su identificador y fecha en cada tema modificado y crea una auditoría de plataforma con la nota «aprobación inicial en bloque». Es idempotente: la segunda ejecución no cambia estados ni crea otra auditoría. Por defecto solo acepta la BD local; fuera de ella requiere `--permitir-nube` y autorización del supervisor. El seed local lo ejecuta para el catálogo completo.
