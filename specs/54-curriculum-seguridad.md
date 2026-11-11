# 54 — Seguridad del currículo global

> Estado: implementado · Plan: Khipu Pro para Nudito · Actualización: 2026-11-10

## Alcance global

El índice editorial `TemaCurricular` no tiene tenant: una revisión se aplica a todos los colegios actuales y futuros. Las decisiones de acceso de cada colegio siguen bajo `requireTenantContext`, `requireFeature(ctx, "nudito_plus")`, alcance del curso/alumno y consultas institucionales con `ctx.db`. El índice global solo se lee con `db` tras autorizar el alcance. RLS para `anon` y `authenticated` permanece cerrado.

## Visibilidad

| Rol | Borrador | Revisado vigente | Revisión vencida |
|---|---|---|---|
| Profesor asignado | Ve con «Borrador» | Ve | Ve con «Revisar de nuevo» |
| Dirección | Ve el estado | Ve | Ve el estado pendiente |
| Alumno visible en el curso | No ve | Ve | No ve |
| Administrativo, portería y apoderado | No ve en el catálogo | No ve | No ve |
| Super administrador Khipu activo | Gestiona la revisión | Gestiona la revisión | Puede revisar de nuevo |

Nudito requiere Khipu Pro. El profesor se limita a sus cursos. La cuenta alumno se limita a sí misma y al salón propio. Los estados editoriales desconocidos se ocultan.

## Huella y revisión

Cada revisión guarda SHA-256 de la representación actual del tema derivado del catálogo versionado y de su ficha JSON, o de la ausencia de ficha. En cada lectura se calcula la huella actual. Si difiere de `huella_contenido_revisado`, el tema conserva su estado previo pero aparece como «Revisar de nuevo»; cualquier alumno queda excluido hasta que un super administrador vuelva a revisar. Agregar, editar o retirar una ficha cambia la huella.

Para revisar o publicar, el super administrador confirma el checklist y el servidor exige contenido resoluble, fuente, localizador y al menos un desempeño oficial verificado. Al volver a borrador se borra la huella y los datos de revisión. Publicar exige pasar primero por revisado. La actualización condicional y su entrada en `auditoria_plataforma` son atómicas. La auditoría registra actor, clave, estado anterior/nuevo y huellas, nunca datos de estudiantes.

La revisión en lote agrupa área, nivel, grado y disciplina. Revisa solo borradores y huellas vencidas, hasta 100 temas; cualquier dato incompleto o conflicto aborta el bloque completo. Cada tema genera una entrada de auditoría dentro de la misma transacción.

## Panel

`/plataforma/contenido` ofrece filtros por área, nivel, grado, disciplina y estado, contador global de pendientes, paginación y revisión individual o por bloque. El estado siempre combina ícono y palabra. La lista usa tarjetas apiladas en móvil, sin tabla con ancho forzado ni scroll horizontal.

## Integración

El lector curricular autorizado está en `src/lib/server/curriculum/autorizacion.ts`; el servicio global y de auditoría en `estado-editorial.ts`; el contrato de alumnos `temaVisibleParaAlumno` exige igualdad entre huella guardada y actual. La migración añade `huella_contenido_revisado`; no altera RLS ni agrega tenant al índice.

La revisión real del checklist legal/pedagógico sigue siendo una declaración del revisor respaldada por metadatos verificables en base de datos; conservar la ficha y la lista de documentos de sustento queda para la evolución del CMS.
