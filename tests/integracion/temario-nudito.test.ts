import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { temasDe } from "@/lib/nudito/catalogo";
import { huellaActualDeTema } from "@/lib/curriculum/huella";
import { aprobarTodosLosTemas } from "../../scripts/curriculum/aprobar-todo";
import { randomUUID } from "node:crypto";
import { crearTemario, agregarTemasTemario, quitarTemaTemario, aceptarTemario, detalleTemario } from "@/lib/server/plan-anual/temario";
import { temasPublicadosDelAlumno } from "@/lib/server/nudito/plan-publicado";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";
vi.stubEnv("KHIPU_TEST_NUDITO_PLUS","1");
let a:ColegioPrueba,b:ColegioPrueba,planId:string;
const adminId=randomUUID(), adminCorreo=`aprobar-temario-${adminId.slice(0,8)}@test.local`;
const originales=new Map<string, Awaited<ReturnType<typeof db.temaCurricular.findUnique>>>();
const claves=temasDe("matematica","primaria",3).slice(0,3).map(t=>t.clave);
const grupo={anio:2026,nivel:"primaria" as const,grado:3,area:"matematica",nombreCurso:"Matemática"};
beforeAll(async()=>{
  a=await crearColegioPrueba({plan:"pro",prefijo:"temario-a"});b=await crearColegioPrueba({plan:"pro",prefijo:"temario-b"});
  await db.salon.update({where:{id:a.salon.id},data:{grado:3}});
  await db.salon.update({where:{id:a.otroSalon.id},data:{grado:3}});
  await db.curso.update({where:{id:a.cursoTutora.id},data:{areaCneb:"matematica"}});
  await db.curso.update({where:{id:a.cursoAjeno.id},data:{areaCneb:"matematica",nombre:"Matemática"}});
  await db.profile.create({data:{id:adminId,email:adminCorreo,nombres:"Equipo",apellidos:"Khipu"}});
  await db.adminPlataforma.create({data:{userId:adminId}});
  for(const clave of claves){
    originales.set(clave,await db.temaCurricular.findUnique({where:{clave}}));
    const huella=await huellaActualDeTema(clave);
    if(!huella) throw new Error(`Sin huella para ${clave}`);
    await db.temaCurricular.upsert({where:{clave},create:{clave,areaCneb:"matematica",disciplinas:["medicion"],nivel:"primaria",grado:3,procedencia:"test-temario",fuenteId:"fuente-test",fuenteLocator:"CNEB",estado:"revisado",revisadoPorId:adminId,revisadoAt:new Date(),huellaContenidoRevisado:huella},update:{estado:"revisado",revisadoPorId:adminId,revisadoAt:new Date(),huellaContenidoRevisado:huella}});
  }
  planId=(await crearTemario(a.ctxDe("tutora"),grupo)).id;
},30000);
afterAll(async()=>{
  for(const [clave,original] of originales){if(!original) await db.temaCurricular.deleteMany({where:{clave}}); else await db.temaCurricular.update({where:{clave},data:{areaCneb:original.areaCneb,disciplinas:original.disciplinas,nivel:original.nivel,grado:original.grado,procedencia:original.procedencia,fuenteId:original.fuenteId,fuenteLocator:original.fuenteLocator,version:original.version,estado:original.estado,revisadoPorId:original.revisadoPorId,revisadoAt:original.revisadoAt,huellaContenidoRevisado:original.huellaContenidoRevisado}});}
  await db.auditoriaPlataforma.deleteMany({where:{actorId:adminId}});await db.adminPlataforma.deleteMany({where:{userId:adminId}});await db.profile.deleteMany({where:{id:adminId}});
  await a?.limpiar();await b?.limpiar();
},30000);
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
  it("modo hijo: el apoderado del alumno ve los temas publicados; un apoderado ajeno no",async()=>{
    const hijo={alumno:a.alumnos.mateo,modo:"hijo" as const};
    expect((await temasPublicadosDelAlumno(a.ctxDe("madre"),hijo,"matematica")).map(t=>t.clave)).toEqual([claves[1]]);
    await expect(temasPublicadosDelAlumno(a.ctxDe("padreSinConsentimiento"),hijo,"matematica")).rejects.toThrow(/403/);
  });
  it("oculta borradores y huellas vencidas y los publica con aprobar-todo",async()=>{
    const ctx=a.ctxDe("direccion"),acceso={alumno:a.alumnos.mateo,modo:"alumno" as const};
    await db.temaCurricular.update({where:{clave:claves[1]},data:{estado:"revisado",huellaContenidoRevisado:"0".repeat(64)}});
    expect((await temasPublicadosDelAlumno(ctx,acceso,"matematica")).map(t=>t.clave)).not.toContain(claves[1]);
    await db.temaCurricular.update({where:{clave:claves[1]},data:{estado:"borrador",huellaContenidoRevisado:null}});
    expect((await temasPublicadosDelAlumno(ctx,acceso,"matematica")).map(t=>t.clave)).not.toContain(claves[1]);
    await aprobarTodosLosTemas(db as never,adminCorreo,[claves[1]]);
    expect((await temasPublicadosDelAlumno(ctx,acceso,"matematica")).map(t=>t.clave)).toEqual([claves[1]]);
    expect((await db.temaCurricular.findUniqueOrThrow({where:{clave:claves[1]}})).huellaContenidoRevisado).toBe(await huellaActualDeTema(claves[1]));
  },30000);
});
