import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState } from "../src";
import { makeQuestion } from "./fixtures";

const judge = (state: any, command: any, expectedState: any, seq = 1) =>
  applyCommand(state, { id: `c${seq}`, actorId: "judge", role: "judge", expectedState, command }, { at: 5_000, seq });

describe("دورة السؤال", () => {
  it("لا يبدأ السؤال قبل اختياره", () => {
    let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }] });
    let r: any = judge(s, { type: "judge:openPowerupSelection" }, "lobby");
    s = r.state; r = judge(s, { type: "judge:startGame" }, "powerup_selection", 2); s = r.state;
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }, "ready", 3); s = r.state;
    r = judge(s, { type: "judge:beginRound" }, "round_intro", 4); s = r.state;
    r = judge(s, { type: "judge:startQuestion" }, "question_setup", 5);
    expect(r.ok ? null : r.code).toBe("wrong_phase");
  });

  it("يخزّن السؤال ويبدأه ويفتح الجرس", () => {
    let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }] });
    let r: any = judge(s, { type: "judge:openPowerupSelection" }, "lobby"); s = r.state;
    r = judge(s, { type: "judge:startGame" }, "powerup_selection", 2); s = r.state;
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }, "ready", 3); s = r.state;
    r = judge(s, { type: "judge:beginRound" }, "round_intro", 4); s = r.state;
    r = judge(s, { type: "judge:selectQuestion", question: makeQuestion() }, "question_setup", 5); s = r.state;
    expect(s.currentQuestion?.id).toBe("q1");
    expect(s.state).toBe("question_setup");
    r = judge(s, { type: "judge:startQuestion" }, "question_setup", 6); s = r.state;
    expect(s.state).toBe("question_active");
    expect(s.currentQuestion).not.toBeNull();
  });

  it("كوبري يفرض تصنيف السؤال التالي مرة واحدة", () => {
    let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    let r: any = judge(s, { type: "judge:openPowerupSelection" }, "lobby"); s = r.state;
    r = applyCommand(s, { id: "c2", actorId: "p2", role: "player", expectedState: "powerup_selection", command: { type: "player:choosePowerup", key: "cobri" } }, { at: 5_000, seq: 2 }); s = r.state;
    r = judge(s, { type: "judge:startGame" }, "powerup_selection", 3); s = r.state;
    r = applyCommand(s, { id: "c4", actorId: "p2", role: "player", expectedState: "ready", command: { type: "player:activatePowerup", categorySlug: "history" } }, { at: 5_000, seq: 4 }); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: true }, "ready", 5); s = r.state;
    expect(s.nextCategoryOverride).toBe("history");
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }, "ready", 6); s = r.state;
    r = judge(s, { type: "judge:beginRound" }, "round_intro", 7); s = r.state;
    r = judge(s, { type: "judge:selectCategory", categorySlug: "geography" }, "question_setup", 8); s = r.state;
    r = judge(s, { type: "judge:selectQuestion", question: makeQuestion({ categorySlug: "geography" }) }, "question_setup", 9); s = r.state;
    expect(r.ok).toBe(true);
    expect(s.currentQuestion?.categorySlug).toBe("geography");
    expect(s.nextCategoryOverride).toBeNull();
  });
});
