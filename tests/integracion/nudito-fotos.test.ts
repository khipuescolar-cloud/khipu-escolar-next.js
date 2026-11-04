// Fotos de ejercicios en Nudito (specs/44). Requiere la BD local; crea un colegio `test-nudito-foto-*` y lo borra.
// El proveedor de IA se inyecta (hoy no hay IA real); los archivos van al almacenamiento local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccesoNudito, LecturaImagen, ProveedorTutorIA } from "@/lib/nudito/contratos";
import { db } from "@/lib/server/db";
import { MENSAJE_FOTO_ILEGIBLE, MENSAJE_FOTO_ROSTRO, MENSAJE_FOTO_TAMANO, MENSAJE_FOTO_TIPO, MENSAJE_FOTOS_APAGADAS, subirFoto, urlFotoNudito } from "@/lib/server/nudito/fotos";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let sesionId: string;
let acceso: AccesoNudito;

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PDF = Buffer.from("%PDF-1.4 hola");

function proveedor(lectura: LecturaImagen): ProveedorTutorIA {
  return {
    nombre: "prueba",
    simulado: true,
    interpretarImagen: async () => ({ datos: lectura, consumo: { proveedor: "prueba", modelo: null, tokensEntrada: 0, tokensSalida: 0, latenciaMs: 1, cache: false, simulado: true } }),
  } as unknown as ProveedorTutorIA;
}
const legible = proveedor({ transcripcion: "3/4 + 1/4 = 1", contieneRostro: false, legible: true, confianza: 0.9 });
const ilegible = proveedor({ transcripcion: "", contieneRostro: false, legible: false, confianza: 0.1 });
const conRostro = proveedor({ transcripcion: "3/4", contieneRostro: true, legible: true, confianza: 0.9 });
const archivosDeSesion = () => db.archivo.count({ where: { nuditoSesionId: sesionId } });

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito-foto" });
  const s = await db.nuditoSesion.create({ data: { tenantId: c.tenant.id, alumnoId: c.alumnos.mateo.id, membershipId: c.miembros.madre.membership.id, modo: "hijo", semilla: 7 } });
  sesionId = s.id;
  const m = c.alumnos.mateo;
  acceso = { alumno: { id: m.id, nombres: m.nombres, apellidos: m.apellidos, salonId: m.salonId }, modo: "hijo" };
  await db.nuditoConfigColegio.create({ data: { tenantId: c.tenant.id, activo: true } });
});

afterAll(async () => {
  await c.limpiar();
  await db.$disconnect();
});

describe("fotos de ejercicios", () => {
  it("están apagadas por defecto", async () => {
    await expect(subirFoto(c.ctxDe("madre"), acceso, { sesionId, archivo: { nombre: "f.jpg", buffer: JPG } }, { proveedor: legible })).rejects.toThrow(MENSAJE_FOTOS_APAGADAS);
    expect(await archivosDeSesion()).toBe(0);
  });

  it("valida el tipo real (no la extensión) y el tamaño", async () => {
    await db.nuditoConfigColegio.update({ where: { tenantId: c.tenant.id }, data: { permitirFotos: true } });
    await expect(subirFoto(c.ctxDe("madre"), acceso, { sesionId, archivo: { nombre: "f.jpg", buffer: PDF } }, { proveedor: legible })).rejects.toThrow(MENSAJE_FOTO_TIPO);
    const grande = Buffer.concat([JPG, Buffer.alloc(5 * 1024 * 1024)]);
    await expect(subirFoto(c.ctxDe("madre"), acceso, { sesionId, archivo: { nombre: "f.jpg", buffer: grande } }, { proveedor: legible })).rejects.toThrow(MENSAJE_FOTO_TAMANO);
    expect(await archivosDeSesion()).toBe(0);
  });

  it("legible: se guarda PRIVADA en la sesión y solo el propio alumno obtiene su URL temporal", async () => {
    const r = await subirFoto(c.ctxDe("madre"), acceso, { sesionId, archivo: { nombre: "f.jpg", buffer: JPG } }, { proveedor: legible });
    expect(r.lectura.transcripcion).toContain("3/4");
    const a = await db.archivo.findUniqueOrThrow({ where: { id: r.archivoId } });
    expect(a).toMatchObject({ privado: true, url: null, nuditoSesionId: sesionId, mimeType: "image/jpeg" });
    expect(await urlFotoNudito(c.ctxDe("madre"), acceso, r.archivoId)).toBeTruthy();
    const otro = { ...acceso, alumno: { ...acceso.alumno, id: c.alumnos.valentina.id } };
    await expect(urlFotoNudito(c.ctxDe("madre"), otro, r.archivoId)).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? e).includes("404"));
  });

  it("ilegible → pide escribirla o tomar otra; con rostro → se descarta; en ambos casos no queda archivo", async () => {
    const antes = await archivosDeSesion();
    await expect(subirFoto(c.ctxDe("madre"), acceso, { sesionId, archivo: { nombre: "f.jpg", buffer: JPG } }, { proveedor: ilegible })).rejects.toThrow(MENSAJE_FOTO_ILEGIBLE);
    await expect(subirFoto(c.ctxDe("madre"), acceso, { sesionId, archivo: { nombre: "f.jpg", buffer: JPG } }, { proveedor: conRostro })).rejects.toThrow(MENSAJE_FOTO_ROSTRO);
    expect(await archivosDeSesion()).toBe(antes);
  });

  it("solo en sesiones del propio alumno", async () => {
    const ajena = await db.nuditoSesion.create({ data: { tenantId: c.tenant.id, alumnoId: c.alumnos.valentina.id, membershipId: c.miembros.madre.membership.id, semilla: 1 } });
    await expect(subirFoto(c.ctxDe("madre"), acceso, { sesionId: ajena.id, archivo: { nombre: "f.jpg", buffer: JPG } }, { proveedor: legible })).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? e).includes("404"));
  });
});
