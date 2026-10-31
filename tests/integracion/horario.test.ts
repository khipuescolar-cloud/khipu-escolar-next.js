// Requiere la BD local. Crea sus propios colegios de prueba (Pro, Base y otro Pro) y los borra al terminar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sembrarHorario } from "../../prisma/seed-horario";
import { crucesDe } from "@/lib/horario";
import { modulosDeCodigo } from "@/lib/modulos";
import { db } from "@/lib/server/db";
import {
  asignarBloque, cargaDocente, copiarHorario, crearPeriodosSugeridos, cursosDeHoy, guardarPeriodos, horarioDeHoy, horarioDelProfesor, horarioDelSalon,
  periodosDelNivel, quitarBloque,
} from "@/lib/server/horario";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let pro: ColegioPrueba;
let base: ColegioPrueba;
let otro: ColegioPrueba;

beforeAll(async () => {
  pro = await crearColegioPrueba({ plan: "pro", prefijo: "test-horario" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-horario-base" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-horario-otro" });
}, 30_000);

afterAll(async () => {
  await pro?.limpiar();
  await base?.limpiar();
  await otro?.limpiar();
}, 30_000);

async function primeraClase(c: ColegioPrueba) {
  const periodos = await periodosDelNivel(c.ctxDe("direccion"), "primaria");
  return periodos.filter((p) => p.tipo === "clase");
}

describe("plan", () => {
  it("el módulo horario está en Khipu Base y en Khipu Pro", () => {
    expect(modulosDeCodigo("base").has("horario")).toBe(true);
    expect(modulosDeCodigo("pro").has("horario")).toBe(true);
  });

  it("un colegio Base arma y consulta su horario", async () => {
    expect((await crearPeriodosSugeridos(base.ctxDe("direccion"), "primaria")).ok).toBe(true);
    const [p1] = await primeraClase(base);
    const r = await asignarBloque(base.ctxDe("direccion"), { salonId: base.salon.id, dia: 1, periodoId: p1.id, cursoId: base.cursoTutora.id });
    expect(r).toEqual({ ok: true, mensaje: "Guardamos el horario." });
    const vista = await horarioDelSalon(base.ctxDe("madre"), base.salon.id);
    expect(vista.bloques.map((b) => [b.titulo, b.profesorNombre])).toEqual([["Matemática", "Lucia Prueba"]]);
  });
});

describe("horas del día", () => {
  it("crea las sugeridas una sola vez y valida al editar", async () => {
    const ctx = pro.ctxDe("direccion");
    expect((await crearPeriodosSugeridos(ctx, "primaria")).ok).toBe(true);
    expect(await crearPeriodosSugeridos(ctx, "primaria")).toEqual({ ok: false, error: "Este nivel ya tiene sus horas del día." });
    const periodos = await periodosDelNivel(ctx, "primaria");
    expect(periodos.length).toBe(7);
    const cruzadas = periodos.map((p, i) => (i === 1 ? { ...p, horaInicio: "08:30" } : p));
    expect(await guardarPeriodos(ctx, "primaria", cruzadas)).toMatchObject({ ok: false, error: expect.stringMatching(/se cruzan/) });
    await esperarProhibido(guardarPeriodos(pro.ctxDe("tutora"), "primaria", periodos));
  });

  it("quitar una hora vacía sus casilleros y queda auditado", async () => {
    const ctx = pro.ctxDe("direccion");
    const periodos = await periodosDelNivel(ctx, "primaria");
    const extra = { nombre: "8.ª hora", horaInicio: "13:00", horaFin: "13:45", tipo: "clase" as const };
    expect((await guardarPeriodos(ctx, "primaria", [...periodos, extra])).ok).toBe(true);
    const nueva = (await periodosDelNivel(ctx, "primaria")).find((p) => p.nombre === "8.ª hora")!;
    await asignarBloque(ctx, { salonId: pro.salon.id, dia: 3, periodoId: nueva.id, titulo: "Taller" });
    const r = await guardarPeriodos(ctx, "primaria", periodos);
    expect(r).toMatchObject({ ok: true, mensaje: expect.stringContaining("Se vació 1 casillero") });
    expect(await pro.db.bloqueHorario.count({ where: { periodoId: nueva.id } })).toBe(0);
    expect(await db.auditoria.count({ where: { tenantId: pro.tenant.id, entidad: "horario_periodos", accion: "editar" } })).toBe(2);
  });
});

describe("armar el horario", () => {
  it("asigna, reemplaza y vacía un casillero; rechaza el recreo y horas de otro nivel", async () => {
    const ctx = pro.ctxDe("direccion");
    const [p1] = await primeraClase(pro);
    expect((await asignarBloque(ctx, { salonId: pro.salon.id, dia: 1, periodoId: p1.id, cursoId: pro.cursoTutora.id, aula: "Aula 3" })).ok).toBe(true);
    expect((await asignarBloque(ctx, { salonId: pro.salon.id, dia: 1, periodoId: p1.id, titulo: "Formación" })).ok).toBe(true);
    const vista = await horarioDelSalon(ctx, pro.salon.id);
    expect(vista.bloques.filter((b) => b.dia === 1 && b.periodoId === p1.id).map((b) => [b.titulo, b.cursoId, b.aula])).toEqual([["Formación", null, null]]);
    expect((await quitarBloque(ctx, { salonId: pro.salon.id, dia: 1, periodoId: p1.id })).ok).toBe(true);
    expect(await quitarBloque(ctx, { salonId: pro.salon.id, dia: 1, periodoId: p1.id })).toEqual({ ok: false, error: "Ese casillero ya estaba vacío." });

    const recreo = (await periodosDelNivel(ctx, "primaria")).find((p) => p.tipo === "recreo")!;
    expect(await asignarBloque(ctx, { salonId: pro.salon.id, dia: 1, periodoId: recreo.id, cursoId: pro.cursoTutora.id })).toEqual({ ok: false, error: "En el recreo no se programan clases." });
    await crearPeriodosSugeridos(ctx, "secundaria");
    const [sec] = await periodosDelNivel(ctx, "secundaria");
    expect(await asignarBloque(ctx, { salonId: pro.salon.id, dia: 1, periodoId: sec.id, cursoId: pro.cursoTutora.id })).toEqual({ ok: false, error: "Esa hora no es del nivel de este salón." });
    expect(await asignarBloque(ctx, { salonId: pro.salon.id, dia: 1, periodoId: p1.id, cursoId: pro.cursoAjeno.id })).toEqual({ ok: false, error: "Ese curso no es de este salón." });
    expect(await asignarBloque(ctx, { salonId: pro.salon.id, dia: 6, periodoId: p1.id, titulo: "Taller" })).toEqual({ ok: false, error: "Elige un día de lunes a viernes." });
    expect(await db.auditoria.count({ where: { tenantId: pro.tenant.id, entidad: "horario", entidadId: pro.salon.id } })).toBeGreaterThanOrEqual(3);
  });

  it("no deja a un profesor en dos salones a la vez, aunque sea con otras horas", async () => {
    const ctx = pro.ctxDe("direccion");
    const [p1, p2] = await primeraClase(pro);
    // La tutora dicta Matemática en 3.° B; en 5.° A le damos «Tutoría» a la misma hora.
    expect((await asignarBloque(ctx, { salonId: pro.salon.id, dia: 2, periodoId: p1.id, cursoId: pro.cursoTutora.id })).ok).toBe(true);
    const r = await asignarBloque(ctx, { salonId: pro.otroSalon.id, dia: 2, periodoId: p1.id, titulo: "Tutoría", profesorId: pro.miembros.tutora.membership.id });
    expect(r).toEqual({ ok: false, error: "Lucia Prueba ya tiene Matemática en 3.° B el martes de 08:00–08:45. Elige otra hora u otro curso." });
    // Otra hora del mismo día: sí puede.
    expect((await asignarBloque(ctx, { salonId: pro.otroSalon.id, dia: 2, periodoId: p2.id, titulo: "Tutoría", profesorId: pro.miembros.tutora.membership.id })).ok).toBe(true);
    // Reemplazar su propio casillero por el mismo curso no es un cruce.
    expect((await asignarBloque(ctx, { salonId: pro.salon.id, dia: 2, periodoId: p1.id, cursoId: pro.cursoTutora.id, aula: "Lab" })).ok).toBe(true);

    const { cruces, bloques } = await horarioDelProfesor(ctx, pro.miembros.tutora.membership.id);
    expect(cruces).toEqual([]);
    expect(bloques.map((b) => b.salonNombre).sort()).toEqual(["3.° B", "5.° A"]);
    const carga = await cargaDocente(ctx);
    expect(carga.find((p) => p.id === pro.miembros.tutora.membership.id)).toMatchObject({ bloques: 2, salones: 2, cruces: 0, minutosSemana: 90 });
  });

  it("copia el horario a otro salón del mismo grado emparejando cursos por nombre", async () => {
    const ctx = pro.ctxDe("direccion");
    const [p1] = await primeraClase(pro);
    const tercero = await pro.db.salon.create({ data: { tenantId: pro.tenant.id, nombre: "3.° C", nivel: "primaria", grado: 3, anio: 2026 } });
    await pro.db.salon.update({ where: { id: pro.salon.id }, data: { grado: 3 } });
    const mate = await pro.db.curso.create({ data: { tenantId: pro.tenant.id, salonId: tercero.id, nombre: "Matemática", profesorId: pro.miembros.otroProfesor.membership.id } });
    expect((await asignarBloque(ctx, { salonId: pro.salon.id, dia: 4, periodoId: p1.id, titulo: "Plan lector" })).ok).toBe(true);
    const r = await copiarHorario(ctx, tercero.id, pro.salon.id);
    expect(r.ok).toBe(true);
    const copia = await horarioDelSalon(ctx, tercero.id);
    expect(copia.bloques.filter((b) => b.cursoId).every((b) => b.cursoId === mate.id && b.profesorId === pro.miembros.otroProfesor.membership.id)).toBe(true);
    expect(copia.bloques.some((b) => b.titulo === "Plan lector")).toBe(true);
    expect(await copiarHorario(ctx, pro.otroSalon.id, pro.salon.id)).toEqual({ ok: false, error: "Solo se copia entre salones del mismo grado." });
  });
});

describe("permisos y aislamiento", () => {
  it("solo dirección edita; profesor, familia y alumno solo ven lo suyo", async () => {
    const [p1] = await primeraClase(pro);
    const datos = { salonId: pro.salon.id, dia: 5, periodoId: p1.id, cursoId: pro.cursoTutora.id };
    await esperarProhibido(asignarBloque(pro.ctxDe("tutora"), datos));
    await esperarProhibido(asignarBloque(pro.ctxDe("madre"), datos));
    await esperarProhibido(quitarBloque(pro.ctxDe("tutora"), datos));
    await esperarProhibido(crearPeriodosSugeridos(pro.ctxDe("tutora"), "inicial"));
    // Portería no usa el módulo.
    await esperarProhibido(horarioDelSalon(pro.ctxDe("porteria"), pro.salon.id));
    // La madre de Mateo (3.° B) ve 3.° B, pero no 5.° A.
    expect((await horarioDelSalon(pro.ctxDe("madre"), pro.salon.id)).salon.nombre).toBe("3.° B");
    await esperarProhibido(horarioDelSalon(pro.ctxDe("madre"), pro.otroSalon.id));
    // El profesor solo ve su semana, aunque pida la de otro.
    const suya = await horarioDelProfesor(pro.ctxDe("otroProfesor"), pro.miembros.tutora.membership.id);
    expect(suya.profesor.id).toBe(pro.miembros.otroProfesor.membership.id);
    await esperarProhibido(cargaDocente(pro.ctxDe("tutora")));
  });

  it("un colegio no ve ni usa las horas ni los salones de otro", async () => {
    const [p1] = await primeraClase(pro);
    await crearPeriodosSugeridos(otro.ctxDe("direccion"), "primaria");
    // Hora de Pro en un salón de «otro»: no la encuentra.
    expect(await asignarBloque(otro.ctxDe("direccion"), { salonId: otro.salon.id, dia: 1, periodoId: p1.id, cursoId: otro.cursoTutora.id })).toEqual({ ok: false, error: "Esa hora no es del nivel de este salón." });
    expect(await asignarBloque(otro.ctxDe("direccion"), { salonId: pro.salon.id, dia: 1, periodoId: p1.id, titulo: "Taller" })).toEqual({ ok: false, error: "No encontramos ese salón." });
    expect((await periodosDelNivel(otro.ctxDe("direccion"), "primaria")).some((p) => p.id === p1.id)).toBe(false);
    await expect(horarioDelSalon(otro.ctxDe("direccion"), pro.salon.id)).rejects.toThrow();
  });
});

describe("hoy", () => {
  it("la tarjeta «Hoy» muestra el bloque en curso al profesor y a la familia; el pasar lista se ordena por horario", async () => {
    const ctx = pro.ctxDe("direccion");
    const [p1, p2] = await primeraClase(pro);
    // Miércoles 4 de noviembre de 2026, 08:10 en Lima.
    const miercoles = new Date("2026-11-04T08:10:00-05:00");
    await asignarBloque(ctx, { salonId: pro.salon.id, dia: 3, periodoId: p1.id, cursoId: pro.cursoTutora.id });
    await asignarBloque(ctx, { salonId: pro.salon.id, dia: 3, periodoId: p2.id, titulo: "Tutoría", profesorId: pro.miembros.tutora.membership.id });
    const prof = await horarioDeHoy(pro.ctxDe("tutora"), miercoles);
    expect(prof?.grupos[0].ahora).toMatchObject({ titulo: "Matemática", salonNombre: "3.° B" });
    expect(prof?.grupos[0].despues).toMatchObject({ titulo: "Tutoría" });
    const familia = await horarioDeHoy(pro.ctxDe("madre"), miercoles);
    expect(familia?.grupos.map((g) => [g.etiqueta, g.ahora?.titulo])).toEqual([["Mateo · 3.° B", "Matemática"]]);
    expect(await horarioDeHoy(pro.ctxDe("direccion"), miercoles)).toBeNull();
    expect(await horarioDeHoy(pro.ctxDe("tutora"), new Date("2026-11-07T09:00:00-05:00"))).toBeNull();
    const cursos = await cursosDeHoy(pro.ctxDe("tutora"), miercoles);
    expect(cursos.get(pro.cursoTutora.id)).toEqual({ horaInicio: "08:00", horaFin: "08:45", ahora: true });
  });
});

describe("seed", () => {
  it("arma el horario de todos los salones sin cruzar profesores y es idempotente", async () => {
    const c = await crearColegioPrueba({ plan: "pro", prefijo: "test-horario-seed" });
    try {
      // Más salones y cursos compartidos por la misma profesora.
      for (const nombre of ["3.° C", "4.° A"]) {
        const s = await c.db.salon.create({ data: { tenantId: c.tenant.id, nombre, nivel: "primaria", anio: 2026, tutorId: c.miembros.otroProfesor.membership.id } });
        await c.db.curso.createMany({ data: ["Matemática", "Comunicación", "Arte"].map((n) => ({ tenantId: c.tenant.id, salonId: s.id, nombre: n, profesorId: c.miembros.tutora.membership.id })) });
      }
      const sec = await c.db.salon.create({ data: { tenantId: c.tenant.id, nombre: "1.° Sec", nivel: "secundaria", anio: 2026 } });
      await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: sec.id, nombre: "Física", profesorId: c.miembros.tutora.membership.id } });

      await sembrarHorario(db, { tenantIds: [c.tenant.id] });
      const total = await c.db.bloqueHorario.count();
      expect(total).toBeGreaterThan(20);
      expect(await c.db.horarioPeriodo.count({ where: { nivel: "secundaria" } })).toBe(8);
      const ctx = c.ctxDe("direccion");
      const carga = await cargaDocente(ctx);
      expect(carga.every((p) => p.cruces === 0)).toBe(true);
      const { bloques } = await horarioDelProfesor(ctx, c.miembros.tutora.membership.id);
      expect(crucesDe(bloques.map((b) => ({ ...b, profesorId: b.profesorId! })))).toEqual([]);
      expect(await c.db.bloqueHorario.count({ where: { titulo: "Tutoría" } })).toBe(4);

      await sembrarHorario(db, { tenantIds: [c.tenant.id] });
      expect(await c.db.bloqueHorario.count()).toBe(total);
    } finally {
      await c.limpiar();
    }
  }, 30_000);
});
