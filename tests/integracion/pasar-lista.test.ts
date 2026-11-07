import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaDb, momentoEnZona, restarDias } from "@/lib/fechas";
import { mosaicosParaRol } from "@/lib/navegacion";
import { AsistenciaPorCursoDesactivada, guardarLista, obtenerLista, opcionesDeLista } from "@/lib/server/asistencia";
import { actualizarAsistenciaPorCurso } from "@/lib/server/configuracion";
import { db } from "@/lib/server/db";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("pasar lista", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba();
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  const lista = (estadoMateo: "llego" | "tarde" | "falta" | "problema", nota?: string) => ({
    salonId: c.salon.id,
    ambito: "dia",
    registros: [
      { alumnoId: c.alumnos.mateo.id, estado: estadoMateo, ...(nota ? { nota } : {}) },
      { alumnoId: c.alumnos.valentina.id, estado: "llego" },
    ],
  });

  it("guarda con upsert idempotente: repetir la misma lista no crea filas ni avisos nuevos", async () => {
    const primera = await guardarLista(c.ctxDe("tutora"), lista("llego"));
    expect(primera).toEqual({ guardados: 2, cambios: 2, familiasAvisadas: 1, omitidos: 0 });
    const segunda = await guardarLista(c.ctxDe("tutora"), lista("llego"));
    expect(segunda).toEqual({ guardados: 2, cambios: 0, familiasAvisadas: 0, omitidos: 0 });
    expect(await c.db.asistencia.count()).toBe(2);
    expect(await c.db.aviso.count()).toBe(1);
  });

  it("solo avisa a familias con consentimiento vigente", async () => {
    const avisos = await c.db.aviso.findMany();
    expect(avisos.every((a) => a.apoderadoId === c.miembros.madre.membership.id)).toBe(true);
  });

  it("al corregir el estado envía un aviso nuevo; la falta lleva token de justificar (solo hash)", async () => {
    const r = await guardarLista(c.ctxDe("tutora"), lista("falta"));
    expect(r.cambios).toBe(1);
    expect(r.familiasAvisadas).toBe(1);
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_falta" } });
    expect(aviso.canal).toBe("correo");
    const payload = aviso.payload as { justificacionTokenId: string; urlJustificar?: string };
    expect(payload.urlJustificar).toBeUndefined();
    const token = await c.db.justificacionToken.findUniqueOrThrow({ where: { id: payload.justificacionTokenId } });
    expect(token.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(token.expiraAt.getTime() - Date.now()).toBeGreaterThan(1.9 * 86_400_000);
  });

  it("registra la auditoría de cada cambio", async () => {
    const n = await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "asistencia", accion: { in: ["crear", "editar"] } } });
    expect(n).toBe(3);
  });

  it("respeta la preferencia de no recibir correos", async () => {
    await c.db.preferenciaAviso.create({ data: { tenantId: c.tenant.id, apoderadoId: c.miembros.madre.membership.id, correo: false, push: true } });
    const r = await guardarLista(c.ctxDe("tutora"), lista("tarde"));
    expect(r.familiasAvisadas).toBe(0);
    await c.db.preferenciaAviso.deleteMany({});
  });

  it("en la lista de un curso nunca se avisa la llegada", async () => {
    await guardarLista(c.ctxDe("tutora"), lista("llego"));
    const r = await guardarLista(c.ctxDe("tutora"), { ...lista("llego"), ambito: c.cursoTutora.id });
    expect(r.cambios).toBe(2);
    expect(r.familiasAvisadas).toBe(0);
  });

  it("el profesor no puede pasar lista en un curso ajeno ni la del día de otro salón", async () => {
    await esperarProhibido(
      guardarLista(c.ctxDe("tutora"), { salonId: c.otroSalon.id, ambito: c.cursoAjeno.id, registros: [{ alumnoId: c.alumnos.thiago.id, estado: "llego" }] }),
    );
    await esperarProhibido(obtenerLista(c.ctxDe("tutora"), c.otroSalon.id, "dia"));
    await esperarProhibido(obtenerLista(c.ctxDe("otroProfesor"), c.salon.id, c.cursoTutora.id));
  });

  it("el tutor solo ve y pasa lista en los cursos que dicta; de su salón le queda la «Asistencia del día»", async () => {
    // Inglés de 3.° B lo dicta otro profesor: la tutora de 3.° B no lo ve ni lo puede pasar (specs/04).
    const ingles = await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Inglés", profesorId: c.miembros.otroProfesor.membership.id } });
    try {
      const deTutora = await opcionesDeLista(c.ctxDe("tutora"));
      expect(deTutora.filter((o) => o.salonId === c.salon.id).map((o) => o.titulo)).toEqual(["Asistencia del día", "Matemática"]);
      expect(deTutora.some((o) => o.salonId === c.otroSalon.id)).toBe(false);
      await esperarProhibido(obtenerLista(c.ctxDe("tutora"), c.salon.id, ingles.id));
      await esperarProhibido(
        guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: ingles.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] }),
      );
      // Quien dicta Inglés sí la ve, sin la «Asistencia del día» de 3.° B; dirección ve todas.
      const delProfesor = (await opcionesDeLista(c.ctxDe("otroProfesor"))).filter((o) => o.salonId === c.salon.id);
      expect(delProfesor.map((o) => o.titulo)).toEqual(["Inglés"]);
      expect((await obtenerLista(c.ctxDe("otroProfesor"), c.salon.id, ingles.id)).curso?.nombre).toBe("Inglés");
      expect((await opcionesDeLista(c.ctxDe("direccion"))).filter((o) => o.salonId === c.salon.id).map((o) => o.titulo)).toEqual(["Asistencia del día", "Inglés", "Matemática"]);
    } finally {
      await db.curso.delete({ where: { id: ingles.id } });
    }
  });

  it("no acepta alumnos de otro salón en la lista", async () => {
    await esperarProhibido(
      guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.thiago.id, estado: "falta" }] }),
    );
  });

  it("el apoderado no puede pasar lista", async () => {
    await esperarProhibido(guardarLista(c.ctxDe("madre"), lista("llego")));
  });
});

describe("aviso a las familias de los presentes al cerrar la lista", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba();
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("el resumen previo sabe cuántas familias recibirán aviso por alumno", async () => {
    const l = await obtenerLista(c.ctxDe("tutora"), c.salon.id, "dia");
    const porId = new Map(l.alumnos.map((a) => [a.id, a]));
    expect(porId.get(c.alumnos.mateo.id)).toMatchObject({ familiasConAviso: 1, ingreso: null });
    expect(porId.get(c.alumnos.valentina.id)).toMatchObject({ familiasConAviso: 0 }); // consentimiento revocado
  });

  it("al guardar la lista encola la llegada a cada apoderado con consentimiento", async () => {
    const r = await guardarLista(c.ctxDe("tutora"), {
      salonId: c.salon.id, ambito: "dia",
      registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }, { alumnoId: c.alumnos.valentina.id, estado: "llego" }],
    });
    expect(r.familiasAvisadas).toBe(1);
    const avisos = await c.db.aviso.findMany({ where: { plantilla: "asistencia_llego" } });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ apoderadoId: c.miembros.madre.membership.id, destinatario: c.miembros.madre.user.email, canal: "correo", estado: "pendiente" });
  });

  it("la lista de un curso trae el ingreso al colegio de cada alumno y no repite la llegada", async () => {
    const l = await obtenerLista(c.ctxDe("tutora"), c.salon.id, c.cursoTutora.id);
    expect(l.alumnos.find((a) => a.id === c.alumnos.mateo.id)).toMatchObject({ ingreso: { estado: "llego" } });
    const r = await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
    expect(r).toMatchObject({ cambios: 1, familiasAvisadas: 0 });
    expect(await c.db.aviso.count({ where: { plantilla: "asistencia_llego" } })).toBe(1);
  });

  it("si el alumno ingresó al colegio, su falta a clase se avisa con la hora de ingreso y el curso", async () => {
    const ingreso = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id, ambito: "dia" } });
    const falta = await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] });
    expect(falta.familiasAvisadas).toBe(1);
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_falta" } });
    expect(aviso.asunto).toBe("Mateo no estuvo en Matemática");
    expect(aviso.payload).toMatchObject({ curso: "Matemática", ingreso: ingreso.hora, momento: "a Matemática" });
    expect((aviso.payload as { justificacionTokenId?: string }).justificacionTokenId).toBeTruthy();
  });

  it("la tardanza a clase se avisa con el curso; volver a «Llegó» en el curso no avisa", async () => {
    const tarde = await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "tarde" }] });
    expect(tarde.familiasAvisadas).toBe(1);
    expect((await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_tarde" } })).asunto).toBe("Mateo llegó tarde a Matemática");
    const antes = await c.db.aviso.count();
    const llego = await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
    expect(llego).toMatchObject({ cambios: 1, familiasAvisadas: 0 });
    expect(await c.db.aviso.count()).toBe(antes);
  });

  it("sin ingreso al colegio (o con falta en el día) la falta a clase no se avisa aparte", async () => {
    await c.db.aviso.deleteMany({});
    await c.db.asistencia.deleteMany({});
    const sinIngreso = await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] });
    expect(sinIngreso).toMatchObject({ cambios: 1, familiasAvisadas: 0 });
    // La lista del día marca la falta: la familia recibe «no llegó» una sola vez.
    const dia = await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] });
    expect(dia.familiasAvisadas).toBe(1);
    await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
    const otraVez = await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] });
    expect(otraVez.familiasAvisadas).toBe(0);
    const faltas = await c.db.aviso.findMany({ where: { plantilla: "asistencia_falta" } });
    expect(faltas.map((f) => f.asunto)).toEqual(["Mateo no llegó hoy"]);
  });

  it("una llegada registrada antes en un curso no impide el aviso de llegada del ingreso al colegio", async () => {
    await c.db.aviso.deleteMany({});
    await c.db.asistencia.deleteMany({});
    await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
    const r = await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
    expect(r.familiasAvisadas).toBe(1);
    expect(await c.db.aviso.count({ where: { plantilla: "asistencia_llego" } })).toBe(1);
  });
});

describe("asistencia por curso configurable por nivel", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba({ asistenciaPorCurso: [] });
  });
  afterAll(async () => {
    await c?.limpiar();
  });
  const conNiveles = (quien: "tutora" | "direccion", niveles: ("primaria" | "secundaria")[]) => {
    const ctx = c.ctxDe(quien);
    return { ...ctx, tenant: { ...ctx.tenant, asistenciaPorCursoNiveles: niveles } };
  };
  const listaCurso = () => ({ salonId: c.salon.id, ambito: c.cursoTutora.id, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" as const }] });

  it("apagado: no se ofrecen listas de curso y guardar una falla con un mensaje claro (también para dirección)", async () => {
    const opciones = await opcionesDeLista(c.ctxDe("tutora"));
    expect(opciones.map((o) => o.ambito)).toEqual(["dia"]);
    await expect(guardarLista(c.ctxDe("tutora"), listaCurso())).rejects.toThrow(AsistenciaPorCursoDesactivada);
    await expect(guardarLista(c.ctxDe("tutora"), listaCurso())).rejects.toThrow("La asistencia por curso está desactivada para primaria. Dirección puede activarla en Configuración.");
    await expect(obtenerLista(c.ctxDe("direccion"), c.salon.id, c.cursoTutora.id)).rejects.toThrow(AsistenciaPorCursoDesactivada);
    expect(await c.db.asistencia.count()).toBe(0);
    // La asistencia al colegio no depende de esto.
    await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
  });

  it("dirección lo activa por nivel, queda auditado y el profesor ya puede pasar la lista del curso", async () => {
    await expect(actualizarAsistenciaPorCurso(c.ctxDe("direccion"), ["kinder"])).rejects.toThrow();
    await expect(actualizarAsistenciaPorCurso(c.ctxDe("tutora"), ["primaria"])).rejects.toThrow();
    expect(await actualizarAsistenciaPorCurso(c.ctxDe("direccion"), ["secundaria", "primaria", "primaria"])).toEqual(["primaria", "secundaria"]);
    const tenant = await c.db.tenant.findUniqueOrThrow({ where: { id: c.tenant.id } });
    expect(tenant.asistenciaPorCursoNiveles).toEqual(["primaria", "secundaria"]);
    const auditoria = await db.auditoria.findFirstOrThrow({ where: { tenantId: c.tenant.id, entidad: "configuracion" }, orderBy: { createdAt: "desc" } });
    expect(auditoria.detalle).toMatchObject({ asistenciaPorCursoNiveles: { antes: [], ahora: ["primaria", "secundaria"] } });

    const tutora = conNiveles("tutora", ["primaria"]);
    expect((await opcionesDeLista(tutora)).map((o) => o.titulo)).toEqual(["Asistencia del día", "Matemática"]);
    expect(await guardarLista(tutora, listaCurso())).toMatchObject({ cambios: 1 });
  });

  it("al apagarlo otra vez, los registros pasados se conservan pero no se aceptan listas nuevas", async () => {
    await actualizarAsistenciaPorCurso(c.ctxDe("direccion"), []);
    await expect(guardarLista(conNiveles("tutora", ["secundaria"]), listaCurso())).rejects.toThrow(AsistenciaPorCursoDesactivada);
    expect(await c.db.asistencia.count({ where: { ambito: c.cursoTutora.id } })).toBe(1);
  });
});

describe("dirección no pasa lista: ve y corrige", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba();
  });
  afterAll(async () => {
    await c?.limpiar();
  });
  const ayer = () => restarDias(momentoEnZona(new Date(), "America/Lima").isoFecha, 1);

  it("«Pasar lista» no está en el menú de dirección (sí en el del profesor)", () => {
    expect(mosaicosParaRol("direccion").some((m) => m.titulo === "Pasar lista")).toBe(false);
    expect(mosaicosParaRol("profesor").some((m) => m.titulo === "Pasar lista")).toBe(true);
    expect(mosaicosParaRol("direccion").some((m) => m.href === "/asistencia/reportes")).toBe(true);
  });

  it("corrige hoy una entrada: queda auditada como corrección y sigue la regla de avisos", async () => {
    await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
    const hoy = momentoEnZona(new Date(), "America/Lima").isoFecha;
    const r = await guardarLista(c.ctxDe("direccion"), { salonId: c.salon.id, ambito: "dia", fecha: hoy, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }] });
    expect(r).toMatchObject({ cambios: 1, familiasAvisadas: 1 });
    const auditoria = await db.auditoria.findFirstOrThrow({ where: { tenantId: c.tenant.id, entidad: "asistencia", actorId: c.miembros.direccion.user.id, accion: "editar" } });
    expect(auditoria.detalle).toMatchObject({ antes: "llego", ahora: "falta", correccion: true, fecha: hoy });
  });

  it("corrige un día pasado sin avisar a las familias, y abre esa lista con sus registros", async () => {
    const fecha = ayer();
    await c.db.asistencia.create({
      data: { tenantId: c.tenant.id, alumnoId: c.alumnos.mateo.id, ambito: "dia", fecha: fechaDb(fecha), hora: "07:40", estado: "falta", registradoPorId: c.miembros.tutora.membership.id },
    });
    const lista = await obtenerLista(c.ctxDe("direccion"), c.salon.id, "dia", fecha);
    expect(lista).toMatchObject({ esHoy: false, hoy: { isoFecha: fecha } });
    expect(lista.alumnos.find((a) => a.id === c.alumnos.mateo.id)?.registro).toMatchObject({ estado: "falta" });
    const avisos = await c.db.aviso.count();
    const r = await guardarLista(c.ctxDe("direccion"), { salonId: c.salon.id, ambito: "dia", fecha, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] });
    expect(r).toMatchObject({ cambios: 1, familiasAvisadas: 0 });
    expect(await c.db.aviso.count()).toBe(avisos);
    const fila = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id, ambito: "dia", fecha: fechaDb(fecha) } });
    expect(fila).toMatchObject({ estado: "llego", hora: "07:40" }); // conserva la hora del registro de ese día
  });

  it("el profesor no puede abrir ni corregir otro día, y nadie corrige un día futuro", async () => {
    const fecha = ayer();
    await esperarProhibido(obtenerLista(c.ctxDe("tutora"), c.salon.id, "dia", fecha));
    await esperarProhibido(guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", fecha, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] }));
    const manana = restarDias(momentoEnZona(new Date(), "America/Lima").isoFecha, -1);
    await expect(guardarLista(c.ctxDe("direccion"), { salonId: c.salon.id, ambito: "dia", fecha: manana, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] })).rejects.toThrow(/aún no llega/);
  });
});
