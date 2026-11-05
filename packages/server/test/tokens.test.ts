import { describe, expect, it } from "vitest";
import { generateRoomCode } from "../src/ids";
import { createRecoveryCode, createToken, hashToken, verifyToken } from "../src/tokens";
describe("ids and tokens", () => {
  it("كود الغرفة 6 أحرف بلا 0/O/1/I", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
  it("التوكن لا يُخزَّن خامًا", () => {
    const token = createToken();
    const hash = hashToken(token);
    expect(hash).not.toBe(token);
    expect(verifyToken(token, hash)).toBe(true);
    expect(verifyToken(token + "x", hash)).toBe(false);
  });
  it("كود الاسترجاع 8 أحرف", () => {
    expect(createRecoveryCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
});
