import { describe, expect, it } from "vitest";
import {
  isShareActive,
  isWellFormedShareToken,
  SHARE_TTL_MS,
  shareExpiresAt,
  sharePath,
  shareRemainingLabel,
} from "@/lib/account-share";

const NOW = new Date(2026, 8, 8, 10, 0, 0);

describe("shareExpiresAt", () => {
  it("caduca exactamente 24 h después de crearse", () => {
    expect(shareExpiresAt(NOW).getTime() - NOW.getTime()).toBe(SHARE_TTL_MS);
    expect(SHARE_TTL_MS).toBe(86_400_000);
  });
});

describe("isShareActive", () => {
  it("es vigente si no está revocado y aún no caduca", () => {
    expect(
      isShareActive({ expiresAt: shareExpiresAt(NOW), revokedAt: null }, NOW)
    ).toBe(true);
  });

  it("deja de serlo al caducar (límite inclusive)", () => {
    expect(isShareActive({ expiresAt: NOW, revokedAt: null }, NOW)).toBe(false);
    expect(
      isShareActive(
        { expiresAt: new Date(NOW.getTime() - 1), revokedAt: null },
        NOW
      )
    ).toBe(false);
  });

  it("revocado no es vigente aunque no haya caducado", () => {
    expect(
      isShareActive({ expiresAt: shareExpiresAt(NOW), revokedAt: NOW }, NOW)
    ).toBe(false);
  });
});

describe("shareRemainingLabel", () => {
  const at = (ms: number) => new Date(NOW.getTime() + ms);

  it("horas y minutos, redondeando hacia abajo", () => {
    expect(
      shareRemainingLabel(at(23 * 3_600_000 + 10 * 60_000 + 59_000), NOW)
    ).toBe("23 h 10 min");
  });

  it("solo horas cuando los minutos son cero", () => {
    expect(shareRemainingLabel(at(2 * 3_600_000), NOW)).toBe("2 h");
  });

  it("solo minutos por debajo de una hora", () => {
    expect(shareRemainingLabel(at(45 * 60_000), NOW)).toBe("45 min");
  });

  it("menos de un minuto y caducado", () => {
    expect(shareRemainingLabel(at(30_000), NOW)).toBe("menos de 1 min");
    expect(shareRemainingLabel(NOW, NOW)).toBe("Caducado");
    expect(shareRemainingLabel(at(-1), NOW)).toBe("Caducado");
  });
});

describe("sharePath / isWellFormedShareToken", () => {
  it("construye la ruta pública", () => {
    expect(sharePath("abc_DEF-123")).toBe("/compartir/abc_DEF-123");
  });

  it("acepta la forma base64url del token y rechaza basura", () => {
    expect(isWellFormedShareToken("Zm9vYmFyYmF6cXV4MTIzNDU2Nzg")).toBe(true);
    expect(isWellFormedShareToken("corto")).toBe(false);
    expect(isWellFormedShareToken("con espacios y/barras")).toBe(false);
    expect(isWellFormedShareToken("")).toBe(false);
  });
});
