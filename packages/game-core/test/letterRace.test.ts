import { describe, expect, it } from "vitest";
import { computeLetterRaceWinner } from "../src/letterRace";
import { applyCommand } from "../src";
import { startLetterRace } from "./helpers";
const send = (state: any, command: any, actorId = "judge", role: "judge" | "player" = "judge") =>
  applyCommand(state, { id: crypto.randomUUID(), actorId, role, expectedState: state.state, command }, { at: 20_000, seq: state.seq + 1 });
describe("أكتر كلمات", () => {
  it("ينظّف التكرار داخل قائمة اللاعب فقط", () => {
    let s = startLetterRace("س");
    const r: any = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سمك", "سمك", " سلم ", ""] } }, "p1", "player");
    expect(r.state.submissions[0].payload.words).toEqual(["سمك", "سلم"]);
  });
  it("لا يقبل إرسالًا ثانيًا ولا كلمة بعد الإغلاق", () => {
    let s = startLetterRace("س");
    let r: any = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سمك"] } }, "p1", "player"); s = r.state;
    r = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سلم"] } }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("already_used");
  });
  it("+1 لكل كلمة مقبولة بحد أقصى 5", () => {
    let s = startLetterRace("س");
    let r: any = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["س1","س2","س3","س4","س5","س6","س7"] } }, "p1", "player"); s = r.state;
    r = send(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = send(s, { type: "judge:openReveal" }); s = r.state;
    for (let i = 0; i < 7; i++) { r = send(s, { type: "judge:judgeWord", playerId: "p1", wordIndex: i, accepted: true }); s = r.state; }
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(5);
  });
  it("الفايز صاحب أعلى عدد كلمات مقبولة", () => {
    let s = startLetterRace("س");
    let r: any = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سمك","سلم"] } }, "p1", "player"); s = r.state;
    r = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سحاب"] } }, "p2", "player"); s = r.state;
    s.submissions[0].acceptedWords = [true, true];
    s.submissions[1].acceptedWords = [true];
    expect(computeLetterRaceWinner(s)).toBe("p1");
  });
});
