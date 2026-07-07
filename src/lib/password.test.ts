import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("hashPassword / verifyPassword", () => {
  it("verifica la contraseña correcta", () => {
    const stored = hashPassword("secreto123");
    expect(verifyPassword("secreto123", stored)).toBe(true);
  });

  it("rechaza contraseñas incorrectas", () => {
    const stored = hashPassword("secreto123");
    expect(verifyPassword("secreto124", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("genera un salt distinto en cada hash", () => {
    expect(hashPassword("igual")).not.toBe(hashPassword("igual"));
  });

  it("rechaza formatos almacenados corruptos", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "scrypt:solo-salt")).toBe(false);
    expect(verifyPassword("x", "bcrypt:aa:bb")).toBe(false);
    expect(verifyPassword("x", "scrypt:aabb:1234")).toBe(false);
  });
});
