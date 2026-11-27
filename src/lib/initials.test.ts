import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("usa la primera y la última palabra", () => {
    expect(initials("Ana María Pérez")).toBe("AP");
    expect(initials("juan gómez")).toBe("JG");
  });

  it("con una palabra toma sus dos primeras letras", () => {
    expect(initials("Juan")).toBe("JU");
    expect(initials("x")).toBe("X");
  });

  it("ignora espacios sobrantes", () => {
    expect(initials("   Luis    Alberto  ")).toBe("LA");
  });

  it("devuelve el comodín si no hay nombre", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
    expect(initials("", "U")).toBe("U");
  });

  it("no parte caracteres fuera del plano básico", () => {
    expect(initials("😀 Ñico")).toBe("😀Ñ");
  });
});
