import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, loadSession, saveSession } from "../src/lib/tokenStore";
describe("tokenStore", () => {
  beforeEach(() => localStorage.clear());
  it("يحفظ ويسترجع جلسة اللاعب", () => {
    saveSession({ role: "player", code: "ABC123", token: "t", playerId: "p1" });
    expect(loadSession()).toEqual({ role: "player", code: "ABC123", token: "t", playerId: "p1" });
  });
  it("يمسح الجلسة", () => {
    saveSession({ role: "judge", code: "ABC123", token: "t" });
    clearSession();
    expect(loadSession()).toBeNull();
  });
  it("يتجاهل JSON تالف", () => {
    localStorage.setItem("casino.session", "{bad");
    expect(loadSession()).toBeNull();
  });
});
