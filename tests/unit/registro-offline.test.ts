import { describe, expect, it } from "vitest";
import { esErrorDeRed, estaAgotado, instanteDeRegistro, MAX_INTENTOS_COLA, textoPendientes, vaciarCola, type ResultadoEnvio } from "@/lib/registro-offline";
import { tokenDesdeQr } from "@/lib/token-qr";

const AHORA = new Date("2026-10-27T15:00:00Z");

describe("instante de un registro hecho sin conexión", () => {
  it("sin hora del dispositivo usa la del servidor", () => {
    expect(instanteDeRegistro(undefined, AHORA)).toBe(AHORA);
    expect(instanteDeRegistro("basura", AHORA)).toBe(AHORA);
  });

  it("respeta una hora pasada razonable", () => {
    const hace3h = "2026-10-27T12:00:00.000Z";
    expect(instanteDeRegistro(hace3h, AHORA).toISOString()).toBe(hace3h);
    expect(instanteDeRegistro("2026-10-26T15:30:00.000Z", AHORA).toISOString()).toBe("2026-10-26T15:30:00.000Z");
  });

  it("descarta horas futuras o demasiado viejas", () => {
    expect(instanteDeRegistro("2026-10-27T15:10:00.000Z", AHORA)).toBe(AHORA);
    expect(instanteDeRegistro("2026-10-27T15:03:00.000Z", AHORA).toISOString()).toBe("2026-10-27T15:03:00.000Z"); // desfase de reloj tolerado
    expect(instanteDeRegistro("2026-10-24T15:00:00.000Z", AHORA)).toBe(AHORA);
  });
});

describe("cola sin conexión", () => {
  it("redacta el contador en singular y plural", () => {
    expect(textoPendientes(1, "lista", "listas")).toBe("1 lista pendiente de enviar");
    expect(textoPendientes(3, "lista", "listas")).toBe("3 listas pendientes de enviar");
    expect(textoPendientes(2, "llegada", "llegadas", "guardada")).toBe("2 llegadas guardadas de enviar");
  });

  it("envía en orden, quita lo enviado y lo descartado, y se detiene al fallar la red", async () => {
    const quitados: string[] = [];
    const respuestas: Record<string, ResultadoEnvio> = { a: "enviado", b: "descartar", c: "reintentar", d: "enviado" };
    const r = await vaciarCola(["a", "b", "c", "d"], async (x) => respuestas[x], async (x) => void quitados.push(x));
    expect(r).toEqual({ enviados: 1, descartados: 1, pendientes: 2, agotados: 0 });
    expect(quitados).toEqual(["a", "b"]);
  });

  it("una cola vacía no envía nada", async () => {
    expect(await vaciarCola([], async () => "enviado", async () => {})).toEqual({ enviados: 0, descartados: 0, pendientes: 0, agotados: 0 });
  });

  describe("reintentos acotados", () => {
    type Item = { id: string; intentos?: number };
    const correr = async (items: Item[], respuestas: Record<string, ResultadoEnvio>) => {
      const quitados: string[] = [];
      const fallos: Record<string, number> = {};
      const r = await vaciarCola(items, async (x) => respuestas[x.id], async (x) => void quitados.push(x.id), async (x, n) => void (fallos[x.id] = n));
      return { r, quitados, fallos };
    };

    it("un fallo del servidor suma un intento y sigue con los demás (no bloquea la cola)", async () => {
      const { r, quitados, fallos } = await correr([{ id: "a" }, { id: "b" }], { a: "fallo", b: "enviado" });
      expect(r).toEqual({ enviados: 1, descartados: 0, pendientes: 1, agotados: 0 });
      expect(quitados).toEqual(["b"]);
      expect(fallos).toEqual({ a: 1 });
    });

    it("al llegar al tope queda agotado y deja de reenviarse", async () => {
      const antes = { id: "a", intentos: MAX_INTENTOS_COLA - 1 };
      expect(estaAgotado(antes)).toBe(false);
      const { r, fallos } = await correr([antes], { a: "fallo" });
      expect(fallos).toEqual({ a: MAX_INTENTOS_COLA });
      expect(r).toMatchObject({ pendientes: 0, agotados: 1 });

      let envios = 0;
      const agotado = { id: "a", intentos: MAX_INTENTOS_COLA };
      expect(estaAgotado(agotado)).toBe(true);
      const r2 = await vaciarCola([agotado, { id: "b" }], async (x) => (envios++, x.id === "b" ? "enviado" : "fallo"), async () => {});
      expect(envios).toBe(1); // solo «b»
      expect(r2).toMatchObject({ enviados: 1, pendientes: 0, agotados: 0 });
    });

    it("sin conexión no cuenta intento y se detiene", async () => {
      const { r, fallos } = await correr([{ id: "a", intentos: 2 }, { id: "b" }], { a: "reintentar", b: "enviado" });
      expect(r).toEqual({ enviados: 0, descartados: 0, pendientes: 2, agotados: 0 });
      expect(fallos).toEqual({});
    });
  });

  it("reconoce un fallo de red", () => {
    expect(esErrorDeRed(new TypeError("Failed to fetch"), true)).toBe(true);
    expect(esErrorDeRed(new Error("500"), true)).toBe(false);
    expect(esErrorDeRed(new Error("x"), false)).toBe(true);
  });
});

describe("token del carnet en el navegador", () => {
  const TOKEN = "a".repeat(43);
  it("saca el token de la URL del QR o del texto solo", () => {
    expect(tokenDesdeQr(`https://khipu.pe/q/${TOKEN}`)).toBe(TOKEN);
    expect(tokenDesdeQr(TOKEN)).toBe(TOKEN);
    expect(tokenDesdeQr("hola")).toBeNull();
  });
});
