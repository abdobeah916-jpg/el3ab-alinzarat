import { describe, expect, it } from "vitest";
import { applyCommand } from "../src";
import { startRumble, submitAll } from "./helpers";
const judge = (state: any, command: any) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId: "judge", role: "judge", expectedState: state.state, command }, { at: 30_000, seq: state.seq + 1 });
describe("رويال رامبل", () => {
  it("الإجابة المكررة تقصي أصحابها والفريد الصحيح يبقى ويأخذ +2", () => {
    let s = startRumble({ answer: "الجيزة" });
    s = submitAll(s, { p1: "القاهرة", p2: "قاهره", p3: "الجيزة" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.filter((p: any) => p.isEliminated).map((p: any) => p.id).sort()).toEqual(["p1", "p2"]);
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(2);
    expect(s.round.winnerId).toBe("p3");
  });
  it("إقصاء واحد ← الاثنان الباقيان +1 لكل واحد", () => {
    let s = startRumble({ answer: "القاهرة", acceptedAnswers: ["مصر"] });
    s = submitAll(s, { p1: "أسوان", p2: "القاهرة", p3: "مصر" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").isEliminated).toBe(true);
    expect(s.players.find((p: any) => p.id === "p2").score).toBe(1);
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(1);
  });
  it("خروج الكل ← إعادة الجولة وكل اللاعبين يرجعون", () => {
    let s = startRumble({ answer: "القاهرة" });
    s = submitAll(s, { p1: "قاهرة", p2: "القاهرة", p3: "أسوان" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.every((p: any) => p.isEliminated === false)).toBe(true);
    expect(s.state).toBe("question_setup");
    expect(s.rumble?.replayed).toBe(true);
  });
  it("الإجابة الصحيحة الفريدة تنجّي صاحبها كآخر لاعب باقٍ وتأخذ +2", () => {
    let s = startRumble({ answer: "القاهرة" });
    s = submitAll(s, { p1: "القاهرة", p2: "أسوان", p3: "طنطا" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(2);
  });
  it("الغلط الفريد يقصي صاحبه حتى لو لم يتكرر", () => {
    let s = startRumble({ answer: "القاهرة", acceptedAnswers: ["مصر"] });
    s = submitAll(s, { p1: "أسوان", p2: "القاهرة", p3: "مصر" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:setRumbleVerdict", playerId: "p1", verdict: "wrong" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").isEliminated).toBe(true);
  });
});
