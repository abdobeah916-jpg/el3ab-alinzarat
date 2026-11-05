import { describe, expect, it } from "vitest";
import { applyCommand } from "../src";
import { orderedPresses } from "../src/buzzer";
import { startBuzzerRound } from "./helpers";

const at = (state: any, ms: number, seq: number, command: any, actorId = "judge", role: "judge" | "player" = "judge") =>
  applyCommand(state, { id: `c${seq}`, actorId, role, expectedState: state.state, command }, { at: ms, seq });

describe("Ø§Ù„Ø¬Ø±Ø³", () => {
  it("ÙŠØ±ØªØ¨ Ø¶ØºØ·ØªÙŠÙ† ÙÙŠ Ù†ÙØ³ Ø§Ù„Ù…Ù„Ù„ÙŠ Ø«Ø§Ù†ÙŠØ© Ø¨Ù€ seq", () => {
    let s = startBuzzerRound();
    let r: any = at(s, 10_000, 10, { type: "player:buzz" }, "p2", "player"); s = r.state;
    r = at(s, 10_000, 11, { type: "player:buzz" }, "p1", "player"); s = r.state;
    expect(orderedPresses(s).map((p: any) => p.playerId)).toEqual(["p2", "p1"]);
  });

  it("ÙŠØ±ÙØ¶ Ø§Ù„Ø¶ØºØ· Ø¨Ø¹Ø¯ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ù…Ù‡Ù„Ø©", () => {
    const s = startBuzzerRound(1_000, 10);
    const r = at(s, 11_001, 10, { type: "player:buzz" }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("wrong_phase");
  });

  it("ÙŠØ±ÙØ¶ Ø¶ØºØ· Ù†ÙØ³ Ø§Ù„Ù„Ø§Ø¹Ø¨ Ù…Ø±ØªÙŠÙ†", () => {
    let s = startBuzzerRound();
    let r: any = at(s, 2_000, 10, { type: "player:buzz" }, "p1", "player"); s = r.state;
    r = at(s, 2_100, 11, { type: "player:buzz" }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("already_used");
  });

  it("ÙŠÙ‚ÙÙ„ Ø§Ù„Ø¬Ø±Ø³ ÙˆÙŠØ®ØªØ§Ø± Ø§Ù„Ù…Ø¬ÙŠØ¨", () => {
    let s = startBuzzerRound();
    let r: any = at(s, 2_000, 10, { type: "judge:closeBuzzer" }); s = r.state;
    expect(s.state).toBe("buzzer_locked");
    r = at(s, 2_100, 11, { type: "judge:selectAnswerer", playerId: "p1" }); s = r.state;
    expect(s.state).toBe("answering");
    expect(s.answererId).toBe("p1");
  });

  it("Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ÙØªØ­ ØªØ³ØªØ¨Ø¹Ø¯ Ù…Ù† Ø¶ØºØ· Ø¨Ø§Ù„ÙØ¹Ù„", () => {
    let s = startBuzzerRound();
    let r: any = at(s, 2_000, 10, { type: "player:buzz" }, "p1", "player"); s = r.state;
    r = at(s, 2_100, 11, { type: "judge:openBuzzer" }); s = r.state;
    r = at(s, 2_200, 12, { type: "player:buzz" }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("already_used");
  });
});
