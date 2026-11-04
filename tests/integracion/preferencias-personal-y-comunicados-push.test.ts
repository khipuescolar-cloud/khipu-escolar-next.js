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
    c = await crearColegioPrueba({ plan: "pro", prefijo: "test-prefs" });
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

  it("el profesor recibe push por un mensaje (sin correo, specs/38) y respeta lo que elija en su perfil", async () => {
    const tutora = c.ctxDe("tutora");
    const madre = c.ctxDe("madre");
    expect(await obtenerPreferencias(tutora)).toMatchObject({ correo: true, push: true });
    const endpoint = await suscribir(c.miembros.tutora.user.id, "tutora");
    const convId = await abrirConversacion(madre, { alumnoId: c.alumnos.mateo.id, contraparteId: c.miembros.tutora.membership.id });
    const alProfesor = () => c.db.aviso.findMany({ where: { plantilla: "mensaje_nuevo", apoderadoId: null }, orderBy: { canal: "asc" } });
    // Cada caso parte limpio (también la ventana de 15 min, que se cuenta en la bandeja).
    const limpiar = async () => { await c.db.aviso.deleteMany({}); await c.db.notificacion.deleteMany({}); };
    const bandeja = () => c.db.notificacion.count({ where: { membershipId: c.miembros.tutora.membership.id, tipo: "mensaje" } });

    expect((await enviarMensaje(madre, { conversacionId: convId, cuerpo: "Hola" })).avisos).toBe(1);
    expect((await alProfesor()).map((a) => [a.canal, a.destinatario])).toEqual([["push", endpoint]]);
    expect(await bandeja()).toBe(1);
    await limpiar();

    await guardarPreferencias(tutora, { correo: true, push: false });
    expect((await enviarMensaje(madre, { conversacionId: convId, cuerpo: "Sin push" })).avisos).toBe(0);
    expect(await alProfesor()).toHaveLength(0); // ni push ni correo
    expect(await bandeja()).toBe(1); // la bandeja no depende de las preferencias
    await limpiar();
    // La preferencia es por membresía: la de otro profesor no cambia.
    expect(await obtenerPreferencias(c.ctxDe("otroProfesor"))).toMatchObject({ correo: true, push: true });
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

  it("un comunicado normal va por bandeja y push; el importante también por correo (según preferencias)", async () => {
    const madre = c.ctxDe("madre");
    // El rebote simulado antes desactivó los avisos de esta familia: se reactivan.
    await c.db.apoderadoAlumno.updateMany({ where: { apoderadoId: madre.membership.id }, data: { recibeAvisos: true } });
    const endpoint = await suscribir(c.miembros.madre.user.id, "madre");
    const dir = c.ctxDe("direccion");
    const avisosDe = (id: string) => c.db.aviso.findMany({ where: { plantilla: "comunicado", referenciaId: id }, orderBy: { canal: "asc" } });

    const normal = await publicarComunicado(dir, { titulo: "Día del logro", cuerpo: "Habrá exposición", salonId: null }, []);
    expect(normal.avisados).toBe(2); // madre y padre sin consentimiento, en su bandeja
    expect((await avisosDe(normal.id)).map((a) => [a.canal, a.destinatario])).toEqual([["push", endpoint]]); // sin correo
    const notif = await c.db.notificacion.findFirstOrThrow({ where: { membershipId: madre.membership.id, clave: `comunicado:${normal.id}` } });
    expect(notif).toMatchObject({ tipo: "comunicado", url: `/comunicados#comunicado-${normal.id}` });
    // El push abre la notificación (la marca leída) y de ahí el comunicado.
    expect(((await avisosDe(normal.id))[0].payload as { url: string }).url).toMatch(new RegExp(`/notificaciones/${notif.id}/abrir$`));

    const importante = await publicarComunicado(dir, { titulo: "Suspensión de clases", cuerpo: "Mañana no hay clases", salonId: null, importante: true }, []);
    expect((await c.db.comunicado.findUniqueOrThrow({ where: { id: importante.id } })).importante).toBe(true);
    const avisos = await avisosDe(importante.id);
    expect(avisos.map((a) => [a.canal, a.destinatario])).toEqual([["correo", c.miembros.madre.user.email], ["push", endpoint]]);
    expect((avisos[0].payload as { url: string }).url).toBe(urlComunicado(c.tenant.slug, importante.id));
    expect(urlComunicado(c.tenant.slug, importante.id)).toMatch(/\/comunicados#comunicado-[0-9a-f-]{36}$/);

    // Con el push apagado el importante sale solo por correo; sin ningún canal, queda solo la bandeja.
    await guardarPreferencias(madre, { correo: true, push: false });
    const solo = await publicarComunicado(dir, { titulo: "Otro", cuerpo: "x", salonId: null, importante: true }, []);
    expect((await c.db.aviso.findMany({ where: { referenciaId: solo.id } })).map((a) => a.canal)).toEqual(["correo"]);
    await guardarPreferencias(madre, { correo: false, push: false });
    const nada = await publicarComunicado(dir, { titulo: "Tercero", cuerpo: "x", salonId: null, importante: true }, []);
    expect(nada.encolados).toBe(0);
    expect(await c.db.notificacion.count({ where: { clave: `comunicado:${nada.id}` } })).toBe(2);
  });
});
