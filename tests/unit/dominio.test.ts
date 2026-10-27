import { describe, expect, it } from "vitest";
import { dominioDeCorreo, esCorreoPersonal, slugDesdeHost } from "@/lib/dominio";

describe("slugDesdeHost", () => {
  it("devuelve el slug de un subdominio de colegio", () => {
    expect(slugDesdeHost("nuevohorizonte.lvh.me:3000", "lvh.me:3000")).toBe("nuevohorizonte");
    expect(slugDesdeHost("losolivos.khipuescolar.pe", "khipuescolar.pe")).toBe("losolivos");
  });

  it("devuelve null en el dominio raíz, subdominios reservados o anidados", () => {
    expect(slugDesdeHost("lvh.me:3000", "lvh.me:3000")).toBeNull();
    expect(slugDesdeHost("www.khipuescolar.pe", "khipuescolar.pe")).toBeNull();
    expect(slugDesdeHost("a.b.khipuescolar.pe", "khipuescolar.pe")).toBeNull();
    expect(slugDesdeHost("otro-sitio.com", "khipuescolar.pe")).toBeNull();
    expect(slugDesdeHost(null)).toBeNull();
  });

  it("no acepta un dominio que solo termina igual", () => {
    expect(slugDesdeHost("evilkhipuescolar.pe", "khipuescolar.pe")).toBeNull();
  });
});

describe("correos", () => {
  it("extrae el dominio en minúsculas", () => {
    expect(dominioDeCorreo(" Lucia.Garcia@NuevoHorizonte.demo ")).toBe("nuevohorizonte.demo");
    expect(dominioDeCorreo("sin-arroba")).toBe("");
  });

  it("reconoce correos personales", () => {
    expect(esCorreoPersonal("rosa.quispe@gmail.com")).toBe(true);
    expect(esCorreoPersonal("lucia@nuevohorizonte.demo")).toBe(false);
  });
});
