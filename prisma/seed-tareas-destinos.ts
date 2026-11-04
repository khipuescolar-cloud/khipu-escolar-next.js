// Seeds (specs/35, specs/39): las tareas creadas sin secciones ni destinatarios quedan como en la migración
// 20261113090000_tareas_classroom: publicadas y ya avisadas, una sección (su curso, «Todos») y una asignación por
// alumno activo del salón. Idempotente.
type ClienteSql = { $executeRawUnsafe: (sql: string, ...valores: unknown[]) => Promise<number> };

export async function asignarTareasSinDestinos(prisma: ClienteSql, tenantId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`UPDATE tareas SET publicada_at = created_at, avisada_at = created_at WHERE tenant_id = $1::uuid AND publicada_at IS NULL AND estado = 'publicada'`, tenantId);
  await prisma.$executeRawUnsafe(
    `INSERT INTO tarea_cursos (id, tenant_id, tarea_id, curso_id, todos)
     SELECT gen_random_uuid(), t.tenant_id, t.id, t.curso_id, true FROM tareas t
     WHERE t.tenant_id = $1::uuid AND NOT EXISTS (SELECT 1 FROM tarea_cursos tc WHERE tc.tarea_id = t.id)
     ON CONFLICT (tarea_id, curso_id) DO NOTHING`,
    tenantId,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO tarea_asignaciones (id, tenant_id, tarea_id, tarea_curso_id, alumno_id)
     SELECT gen_random_uuid(), tc.tenant_id, tc.tarea_id, tc.id, a.id
     FROM tarea_cursos tc JOIN cursos c ON c.id = tc.curso_id
     JOIN alumnos a ON a.salon_id = c.salon_id AND a.tenant_id = tc.tenant_id AND a.estado = 'activo'
     WHERE tc.tenant_id = $1::uuid AND tc.todos
     ON CONFLICT (tarea_id, alumno_id) DO NOTHING`,
    tenantId,
  );
}
