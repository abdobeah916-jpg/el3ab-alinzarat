import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState } from "../src";

const ctx = { at: 1_000, seq: 1 };
const env = (command: any, over: Partial<any> = {}) => ({ id: `c${ctx.seq}`, actorId: "judge", role: "judge", expectedState: "lobby", command, ...over });

describe("lobby", () => {
  it("يرفض اللاعب الرابع", () => {
    let s = createInitialState({ roomCode: "ABC123" });
    for (const p of ["p1", "p2", "p3"]) {
      const r = applyCommand(s, env({ type: "system:addPlayer", player: { id: p, name: p } }, { role: "system" }), ctx);
      expect(r.ok).toBe(true); if (r.ok) s = r.state;
    }
    const r = applyCommand(s, env({ type: "system:addPlayer", player: { id: "p4", name: "p4" } }, { role: "system" }), ctx);
    expect(r).toEqual(expect.objectContaining({ ok: false, code: "room_full" }));
  });

  it("يرفض أمرًا في حالة غير متوقعة", () => {
    const s = createInitialState({ roomCode: "ABC123" });
    const r = applyCommand(s, { ...env({ type: "judge:startGame" }), expectedState: "finished" }, ctx);
    expect(r.ok ? null : r.code).toBe("wrong_state");
  });

  it("يحجز الكارت مرة واحدة فقط", () => {
    let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    let r = applyCommand(s, env({ type: "judge:openPowerupSelection" }), ctx);
    expect(r.ok).toBe(true); if (r.ok) s = r.state;
    r = applyCommand(s, { id: "c2", actorId: "p1", role: "player", expectedState: "powerup_selection", command: { type: "player:choosePowerup", key: "shank" } }, ctx);
    expect(r.ok).toBe(true); if (r.ok) s = r.state;
    r = applyCommand(s, { id: "c3", actorId: "p2", role: "player", expectedState: "powerup_selection", command: { type: "player:choosePowerup", key: "shank" } }, ctx);
    expect(r.ok ? null : r.code).toBe("duplicate_powerup");
  });

  it("يمنع اللاعب من التصرف بدور الحكم", () => {
    const s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }] });
    const r = applyCommand(s, env({ type: "judge:startGame" }, { actorId: "p1", role: "player" }), ctx);
    expect(r.ok ? null : r.code).toBe("not_allowed");
  });
});
