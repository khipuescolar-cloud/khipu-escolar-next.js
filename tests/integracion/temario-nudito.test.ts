import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { temasDe } from "@/lib/nudito/catalogo";
import { crearTemario, agregarTemasTemario, quitarTemaTemario, aceptarTemario, detalleTemario } from "@/lib/server/plan-anual/temario";
import { temasPublicadosDelAlumno } from "@/lib/server/nudito/plan-publicado";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";
vi.stubEnv("KHIPU_TEST_NUDITO_PLUS","1");
let a:ColegioPrueba,b:ColegioPrueba,planId:string;
const claves=temasDe("matematica","primaria",3).slice(0,3).map(t=>t.clave);
const grupo={anio:2026,nivel:"primaria" as const,grado:3,area:"matematica",nombreCurso:"Matemática"};
beforeAll(async()=>{
  a=await crearColegioPrueba({plan:"pro",prefijo:"temario-a"});b=await crearColegioPrueba({plan:"pro",prefijo:"temario-b"});
  await db.salon.update({where:{id:a.salon.id},data:{grado:3}});
  await db.salon.update({where:{id:a.otroSalon.id},data:{grado:3}});
  await db.curso.update({where:{id:a.cursoTutora.id},data:{areaCneb:"matematica"}});
  await db.curso.update({where:{id:a.cursoAjeno.id},data:{areaCneb:"matematica",nombre:"Matemática"}});
  planId=(await crearTemario(a.ctxDe("tutora"),grupo)).id;
},30000);
afterAll(async()=>{await a?.limpiar();await b?.limpiar()},30000);
describe("temario compartido",()=>{
  it("aísla por colegio y solo permite docentes del grupo",async()=>{
    await expect(detalleTemario(b.ctxDe("direccion"),planId)).rejects.toThrow(/404/);
    await expect(agregarTemasTemario(a.ctxDe("direccion"),planId,[claves[0]])).rejects.toThrow(/404/);
    await expect(crearTemario(a.ctxDe("tutora"),{...grupo,area:"personal-social"})).rejects.toThrow(/solo admite/);
  });
  it("mantiene la versión habilitada mientras se edita otra ronda",async()=>{
    const ctx=a.ctxDe("direccion"),acceso={alumno:a.alumnos.mateo,modo:"alumno" as const};
    await agregarTemasTemario(a.ctxDe("tutora"),planId,claves.slice(0,2));
    await aceptarTemario(a.ctxDe("tutora"),planId);
    expect((await detalleTemario(ctx,planId)).plan.versionPublicada).toBe(0);
    await aceptarTemario(a.ctxDe("otroProfesor"),planId);
    expect((await temasPublicadosDelAlumno(ctx,acceso,"matematica")).map(t=>t.clave)).toEqual(claves.slice(0,2));
    await quitarTemaTemario(a.ctxDe("tutora"),planId,claves[0]);
    expect((await detalleTemario(ctx,planId)).docentes.every(d=>!d.acepto)).toBe(true);
    expect((await temasPublicadosDelAlumno(ctx,acceso,"matematica")).map(t=>t.clave)).toEqual(claves.slice(0,2));
    await aceptarTemario(a.ctxDe("tutora"),planId);
    await aceptarTemario(a.ctxDe("otroProfesor"),planId);
    expect((await temasPublicadosDelAlumno(ctx,acceso,"matematica")).map(t=>t.clave)).toEqual([claves[1]]);
  });
});
