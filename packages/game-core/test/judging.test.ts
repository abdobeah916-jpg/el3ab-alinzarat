import { describe, expect, it } from "vitest";
import { applyScoreChange, playCard } from "../src/scoring";
import { applyCommand, createInitialState } from "../src";
import { startAnswering } from "./helpers";

describe("النقاط والكروت", () => {
  it("الإجابة الصحيحة +1", () => {
    let s = startAnswering();
    const r: any = applyCommand(s, { id: "c1", actorId: "judge", role: "judge", expectedState: "answering", command: { type: "judge:markCorrect" } }, { at: 9_000, seq: 1 });
    expect(r.state.players.find((p: any) => p.id === "p1").score).toBe(1);
    expect(r.state.state).toBe("result");
  });

  it("الكارت الأصفر -1 والأحمر -3 مع السماح بالسالب", () => {
    const s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }] });
    expect(applyScoreChange(s.players[0], -1, s.settings)).toBe(-1);
    expect(applyScoreChange(s.players[0], -3, s.settings)).toBe(-3);
    const clamped = { ...s.settings, allowNegative: false };
    expect(applyScoreChange(s.players[0], -3, clamped)).toBe(0);
  });

  it("لا يطبّق الكارت خارج card_action", () => {
    const s = startAnswering();
    const r: any = playCard(s, "p2", "yellow", 9_000);
    expect(r.ok ? null : r.code).toBe("wrong_state");
  });
});
