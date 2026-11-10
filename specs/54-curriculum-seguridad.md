# 54 — Seguridad del currículo global

> Estado: implementación parcial · Plan: Khipu Pro para Nudito · Actualización: 2026-11-09

## Objetivo

Separar la revisión editorial global de la selección institucional del colegio. Un tema en borrador puede estar en un temario aceptado, pero su contenido no aparece al alumno hasta que Khipu lo marque revisado.

## Acceso

| Rol | Borrador | Revisado | Cambio editorial |
|---|---|---|---|
| Profesor de curso visible | Ve con marca «Borrador» | Ve | No |
| Dirección | Ve el estado | Ve | No |
| Alumno | No ve | Ve si el plan institucional está habilitado | No |
| Administrativo, portería y apoderado | No ve | No ve en el catálogo de Nudito | No |
| Super administrador Khipu activo | Por flujo editorial global | Por flujo editorial global | Sí, auditado |

Cada lector del colegio exige requireTenantContext(slug), requireFeature(ctx, "nudito_plus") y alcance del curso o alumno. Las consultas por colegio usan ctx.db; el identificador de tenant no se recibe del cliente. El modo soporte de Khipu conserva solo lectura y no sustituye el rol editorial global. Un colegio Base no tiene Nudito. El estado editorial desconocido se oculta.

## Cambio editorial

cambiarEstadoEditorial exige sesión de super administrador activo. Valida clave, estado y preparación legal/pedagógica acreditada por el repositorio antes de revisar; aplica un cambio condicional frente al estado previo y escribe auditoria_plataforma en la misma transacción. La entrada de auditoría registra clave, estado anterior y nuevo, sin datos de estudiantes. No hay control de edición editorial desde dirección ni aprobación adicional del temario: se mantiene la aceptación unánime de profesores de specs/48.

La publicación real requiere completar el checklist legal y pedagógico del paquete (fuente, licencia, desempeño verificable, revisión docente, accesibilidad). El importador deja los candidatos en borrador.

## Integración pendiente

El modelo global aún no está en esta rama. RepositorioEstadoEditorial define el contrato de lectura y actualización condicional; conectar su implementación Prisma al modelo de la subtarea A. Los lectores de temas globales deberán aplicar filtrarVisibles antes de serializar y comprobar el curso o alumno con el contexto tenant. Hasta esa conexión no se expone una acción web de cambio de estado.

RLS para anon y authenticated permanece cerrado. El SQL de ejemplo del paquete no se ejecuta.

## Verificación

Pruebas de roles × estados, marca de borrador, valor desconocido cerrado y dos colegios; controles completos de catálogo global y cambio editorial al integrar la tabla.
