// Preferencias de aviso del personal (specs/06) y push + enlace directo de comunicados (specs/09).
// Crea su propio colegio (test-prefs-<azar>) y lo borra al terminar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { publicarComunicado, urlComunicado } from "@/lib/server/comunicados";
import { db } from "@/lib/server/db";
import { abrirConversacion, enviarMensaje } from "@/lib/server/mensajes";
import { guardarPreferencias, obtenerPreferencias } from "@/lib/server/notificaciones/preferencias";
import { procesarEventoSes } from "@/lib/server/notificaciones/ses";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("preferencias de aviso del personal y comunicados con push", () => {
  let c: ColegioPrueba;
  const endpoints: string[] = [];
  beforeAll(async () => {
    c = await crearColegioPrueba({ plan: "fase2", prefijo: "test-prefs" });
  });
  afterAll(async () => {
    await db.pushSuscripcion.deleteMany({ where: { endpoint: { in: endpoints } } });
    await c?.limpiar();
  });

  async function suscribir(userId: string, clave: string) {
    const endpoint = `https://push.test-prefs.local/${c.tenant.id}/${clave}`;
    endpoints.push(endpoint);
    await db.pushSuscripcion.create({ data: { userId, endpoint, p256dh: "p".repeat(20), auth: "a".repeat(10) } });
    return endpoint;
  }

  it("el profesor recibe correo y push por defecto y respeta lo que elija en su perfil", async () => {
    const tutora = c.ctxDe("tutora");
    const madre = c.ctxDe("madre");
    expect(await obtenerPreferencias(tutora)).toEqual({ correo: true, push: true });
    const endpoint = await suscribir(c.miembros.tutora.user.id, "tutora");
    const convId = await abrirConversacion(madre, { alumnoId: c.alumnos.mateo.id, contraparteId: c.miembros.tutora.membership.id });
    const alProfesor = () => c.db.aviso.findMany({ where: { plantilla: "mensaje_nuevo", apoderadoId: null }, orderBy: { canal: "asc" } });
    const limpiar = () => c.db.aviso.deleteMany({});

    expect((await enviarMensaje(madre, { conversacionId: convId, cuerpo: "Hola" })).avisos).toBe(2);
    expect((await alProfesor()).map((a) => a.canal)).toEqual(["correo", "push"]);
    await limpiar();

    await guardarPreferencias(tutora, { correo: false, push: true });
    expect((await enviarMensaje(madre, { conversacionId: convId, cuerpo: "Solo push" })).avisos).toBe(1);
    expect((await alProfesor()).map((a) => [a.canal, a.destinatario])).toEqual([["push", endpoint]]);
    await limpiar();

    await guardarPreferencias(tutora, { correo: true, push: false });
    expect((await alProfesor()).length).toBe(0);
    await enviarMensaje(madre, { conversacionId: convId, cuerpo: "Solo correo" });
    expect((await alProfesor()).map((a) => a.canal)).toEqual(["correo"]);
    await limpiar();

    await guardarPreferencias(tutora, { correo: false, push: false });
    expect((await enviarMensaje(madre, { conversacionId: convId, cuerpo: "Nada" })).avisos).toBe(0);
    expect(await alProfesor()).toHaveLength(0);
    // La preferencia es por membresía: la de otro profesor no cambia.
    expect(await obtenerPreferencias(c.ctxDe("otroProfesor"))).toEqual({ correo: true, push: true });
  });

  it("la alerta de rebote a dirección respeta sus preferencias (correo y push)", async () => {
    const dir = c.ctxDe("direccion");
    const madreId = c.miembros.madre.membership.id;
    const endpoint = await suscribir(c.miembros.direccion.user.id, "direccion");
    const rebotar = async (i: number) => {
      const aviso = await c.db.aviso.create({
        data: {
          tenantId: c.tenant.id, tipo: "comunicado", canal: "correo", destinatario: c.miembros.madre.user.email, plantilla: "comunicado",
          asunto: "x", estado: "enviado", apoderadoId: madreId, providerMessageId: `rebote-prefs-${c.tenant.id}-${i}`,
        },
      });
      let encolo = 0;
      await procesarEventoSes({ eventType: "Bounce", bounce: { bounceType: "Permanent" }, mail: { messageId: aviso.providerMessageId! } }, { alEncolarAlerta: () => encolo++ });
      return encolo;
    };
    const alertas = () => c.db.aviso.findMany({ where: { plantilla: "alerta_rebote" }, orderBy: { canal: "asc" } });

    await guardarPreferencias(dir, { correo: false, push: true });
    expect(await rebotar(1)).toBe(1); // dispara el envío inmediato (after) solo si encoló algo
    expect((await alertas()).map((a) => [a.canal, a.destinatario])).toEqual([["push", endpoint]]);
    await c.db.aviso.deleteMany({});

    await guardarPreferencias(dir, { correo: false, push: false });
    expect(await rebotar(2)).toBe(0);
    expect(await alertas()).toHaveLength(0);
  });

  it("al publicar un comunicado se encola correo y push (según preferencias) con enlace directo al comunicado", async () => {
    const madre = c.ctxDe("madre");
    // El rebote simulado antes desactivó los avisos de esta familia: se reactivan.
    await c.db.apoderadoAlumno.updateMany({ where: { apoderadoId: madre.membership.id }, data: { recibeAvisos: true } });
    const endpoint = await suscribir(c.miembros.madre.user.id, "madre");
    const dir = c.ctxDe("direccion");
    const { id, avisados } = await publicarComunicado(dir, { titulo: "Día del logro", cuerpo: "Habrá exposición", salonId: null }, []);
    expect(avisados).toBe(1); // solo la madre con consentimiento
    const avisos = await c.db.aviso.findMany({ where: { plantilla: "comunicado", referenciaId: id }, orderBy: { canal: "asc" } });
    expect(avisos.map((a) => [a.canal, a.destinatario])).toEqual([["correo", c.miembros.madre.user.email], ["push", endpoint]]);
    for (const a of avisos) expect((a.payload as { url: string }).url).toBe(urlComunicado(c.tenant.slug, id));
    expect(urlComunicado(c.tenant.slug, id)).toMatch(/\/comunicados#comunicado-[0-9a-f-]{36}$/);

    // Con el push apagado solo sale el correo; sin ningún canal, no se avisa.
    await guardarPreferencias(madre, { correo: true, push: false });
    const solo = await publicarComunicado(dir, { titulo: "Otro", cuerpo: "x", salonId: null }, []);
    expect((await c.db.aviso.findMany({ where: { referenciaId: solo.id } })).map((a) => a.canal)).toEqual(["correo"]);
    await guardarPreferencias(madre, { correo: false, push: false });
    expect((await publicarComunicado(dir, { titulo: "Tercero", cuerpo: "x", salonId: null }, [])).avisados).toBe(0);
  });
});
