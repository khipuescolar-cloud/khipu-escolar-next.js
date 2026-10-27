import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  carnetsParaImprimir, generarCarnetsSalon, MENSAJE_CARNET_INVALIDO, regenerarCarnet, registrarLlegadaManual, registrarLlegadaPorQr, urlDeCarnet,
} from "@/lib/server/porteria";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("portería con carnet QR", () => {
  let a: ColegioPrueba;
  let b: ColegioPrueba;
  let qrMateo: string;
  beforeAll(async () => {
    [a, b] = await Promise.all([crearColegioPrueba(), crearColegioPrueba()]);
    expect(await generarCarnetsSalon(a.ctxDe("direccion"), a.salon.id)).toBe(2);
    const carnet = await a.db.carnetQr.findFirstOrThrow({ where: { alumnoId: a.alumnos.mateo.id, activo: true } });
    qrMateo = urlDeCarnet(carnet.id);
  });
  afterAll(async () => {
    await Promise.all([a?.limpiar(), b?.limpiar()]);
  });

  it("solo guarda el hash del token y el carnet se puede reimprimir con el mismo QR", async () => {
    const carnet = await a.db.carnetQr.findFirstOrThrow({ where: { alumnoId: a.alumnos.mateo.id } });
    const token = qrMateo.split("/q/")[1];
    expect(carnet.tokenHash).not.toContain(token);
    const impresion = await carnetsParaImprimir(a.ctxDe("direccion"), a.salon.id);
    expect(impresion.carnets.every((c) => c.qr?.startsWith("data:image/png;base64,"))).toBe(true);
    expect(await generarCarnetsSalon(a.ctxDe("direccion"), a.salon.id)).toBe(0);
  });

  it("rechaza el QR de otro colegio", async () => {
    const r = await registrarLlegadaPorQr(b.ctxDe("porteria"), qrMateo);
    expect(r).toEqual({ ok: false, mensaje: MENSAJE_CARNET_INVALIDO });
    expect(await b.db.asistencia.count()).toBe(0);
  });

  it("registra la llegada del día (tarde desde la hora límite) y no duplica", async () => {
    const ahora = new Date("2026-10-21T13:10:00Z"); // 08:10 en Lima
    const r = await registrarLlegadaPorQr(a.ctxDe("porteria"), qrMateo, ahora);
    expect(r).toMatchObject({ ok: true, tipo: "registrado", estado: "tarde", hora: "08:10" });
    const fila = await a.db.asistencia.findFirstOrThrow({ where: { alumnoId: a.alumnos.mateo.id } });
    expect(fila).toMatchObject({ ambito: "dia", origen: "porteria", cursoId: null });
    expect(await a.db.aviso.count({ where: { plantilla: "asistencia_tarde" } })).toBe(1);

    const otra = await registrarLlegadaPorQr(a.ctxDe("porteria"), qrMateo, new Date("2026-10-21T13:20:00Z"));
    expect(otra).toMatchObject({ ok: true, tipo: "ya-registrado", mensaje: "Ya registrado 8:10 a. m." });
    expect(await a.db.asistencia.count({ where: { alumnoId: a.alumnos.mateo.id } })).toBe(1);
    expect(await a.db.aviso.count()).toBe(1);
  });

  it("antes de la hora límite registra «Llegó»", async () => {
    const r = await registrarLlegadaManual(a.ctxDe("porteria"), a.alumnos.valentina.id, new Date("2026-10-21T12:45:00Z"));
    expect(r).toMatchObject({ ok: true, estado: "llego", hora: "07:45" });
  });

  it("un carnet regenerado invalida el QR anterior", async () => {
    await regenerarCarnet(a.ctxDe("direccion"), a.alumnos.mateo.id);
    const r = await registrarLlegadaPorQr(a.ctxDe("porteria"), qrMateo, new Date("2026-10-22T12:45:00Z"));
    expect(r).toEqual({ ok: false, mensaje: MENSAJE_CARNET_INVALIDO });
    expect(await a.db.carnetQr.count({ where: { alumnoId: a.alumnos.mateo.id, activo: true } })).toBe(1);
  });

  it("solo portería o dirección registran; solo dirección genera carnets", async () => {
    await esperarProhibido(registrarLlegadaPorQr(a.ctxDe("tutora"), qrMateo));
    await esperarProhibido(generarCarnetsSalon(a.ctxDe("porteria"), a.salon.id));
  });
});
