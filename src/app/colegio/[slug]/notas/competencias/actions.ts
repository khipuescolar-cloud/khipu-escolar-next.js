"use server";

import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { crearCompetencia, desactivarCompetencia, editarCompetencia, reactivarCompetencia, restaurarPlantillaOficial } from "@/lib/server/curriculo";

const destino = (f: FormData) => {
  const curso = texto(f, "cursoId");
  return /^[-0-9a-f]{36}$/.test(curso) ? `/notas/competencias?curso=${curso}` : "/notas/competencias";
};

export async function crearCompetenciaAction(f: FormData) {
  const ctx = await contextoDeAccion();
  await ejecutarYVolver(destino(f), async () => {
    await crearCompetencia(ctx, { cursoId: texto(f, "cursoId"), nombre: texto(f, "nombre"), descripcion: texto(f, "descripcion") });
    return "Competencia creada.";
  });
}

export async function editarCompetenciaAction(f: FormData) {
  const ctx = await contextoDeAccion();
  await ejecutarYVolver(destino(f), async () => {
    await editarCompetencia(ctx, texto(f, "competenciaId"), { nombre: texto(f, "nombre"), descripcion: texto(f, "descripcion") });
    return "Competencia actualizada.";
  });
}

export async function desactivarCompetenciaAction(f: FormData) {
  const ctx = await contextoDeAccion();
  await ejecutarYVolver(destino(f), async () => {
    await desactivarCompetencia(ctx, texto(f, "competenciaId"));
    return "Competencia desactivada.";
  });
}

export async function reactivarCompetenciaAction(f: FormData) {
  const ctx = await contextoDeAccion();
  await ejecutarYVolver(destino(f), async () => {
    await reactivarCompetencia(ctx, texto(f, "competenciaId"));
    return "Competencia reactivada.";
  });
}

export async function restaurarPlantillaAction(f: FormData) {
  const ctx = await contextoDeAccion();
  await ejecutarYVolver(destino(f), async () => {
    await restaurarPlantillaOficial(ctx, texto(f, "cursoId"));
    return "Plantilla oficial restaurada.";
  });
}
