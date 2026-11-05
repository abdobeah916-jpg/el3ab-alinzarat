import { describe, expect, it } from "vitest";
import { applyCommand } from "../src";
import { readyRoomWithPowerups } from "./helpers";
import { makeQuestion } from "./fixtures";

const player = (state: any, command: any, actorId: string) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId, role: "player", expectedState: state.state, command }, { at: 1, seq: state.seq + 1 });
const judge = (state: any, command: any) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId: "judge", role: "judge", expectedState: state.state, command }, { at: 1, seq: state.seq + 1 });

describe("Power-ups", () => {
  it("شنك الحرمية يخصم ٣ بعد موافقة الحكم ويستهلك الكارت", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", targetId: "p3" }, "p1"); s = r.state;
    expect(s.pendingPowerup?.key).toBe("shank");
    r = judge(s, { type: "judge:resolvePowerup", approve: true }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(-3);
    expect(s.players.find((p: any) => p.id === "p1").powerupState).toBe("used");
  });

  it("رفض الحكم لا يخصم لكن يستهلك الكارت", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", targetId: "p3" }, "p1"); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: false }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(0);
    expect(s.players.find((p: any) => p.id === "p1").powerupState).toBe("used");
  });

  it("كوبري يفرض التصنيف مرة واحدة", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", categorySlug: "history" }, "p2"); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: true }); s = r.state;
    expect(s.nextCategoryOverride).toBe("history");
  });

  it("سلم وتعبان: غلط ← -1 للمالك", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", targetId: "p1" }, "p3"); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: true }); s = r.state;
    expect(s.salem).toEqual({ ownerId: "p3", targetId: "p1", state: "active" });
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }); s = r.state;
    r = judge(s, { type: "judge:beginRound" }); s = r.state;
    r = judge(s, { type: "judge:selectQuestion", question: makeQuestion() }); s = r.state;
    r = judge(s, { type: "judge:startQuestion" }); s = r.state;
    expect(s.state).toBe("answering");
    expect(s.answererId).toBe("p3");
    r = judge(s, { type: "judge:markWrong" }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(-1);
  });

  it("سلم وتعبان: صح ← يختار هدفًا ويخصم 3", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", targetId: "p1" }, "p3"); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: true }); s = r.state;
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }); s = r.state;
    r = judge(s, { type: "judge:beginRound" }); s = r.state;
    r = judge(s, { type: "judge:selectQuestion", question: makeQuestion() }); s = r.state;
    r = judge(s, { type: "judge:startQuestion" }); s = r.state;
    r = judge(s, { type: "judge:markCorrect" }); s = r.state;
    expect(s.state).toBe("card_action");
    r = player(s, { type: "player:chooseSalemTarget", targetId: "p1" }, "p3"); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(-3);
    expect(s.state).toBe("result");
  });
});
