import { describe, expect, it } from "vitest";
import { applyCommand } from "../src";
import { startBusRound } from "./helpers";
const send = (state: any, command: any, actorId = "judge", role: "judge" | "player" = "judge") =>
  applyCommand(state, { id: crypto.randomUUID(), actorId, role, expectedState: state.state, command }, { at: 20_000, seq: state.seq + 1 });
describe("أتوبيس", () => {
  it("أول «أتوبيس» يقفل الإرسال والثاني يُرفض", () => {
    let s = startBusRound();
    let r: any = send(s, { type: "player:callBus" }, "p2", "player"); s = r.state;
    expect(s.state).toBe("submissions_closed");
    r = send(s, { type: "player:callBus" }, "p3", "player");
    expect(r.ok ? null : r.code).toBe("wrong_phase");
  });
  it("يقبل إجابة واحدة فقط لكل لاعب", () => {
    let s = startBusRound();
    const payload = { kind: "bus", answers: { "اسم": "أحمد", "بلد": "أسوان" } };
    let r: any = send(s, { type: "player:submitRound", payload }, "p1", "player"); s = r.state;
    r = send(s, { type: "player:submitRound", payload }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("already_used");
  });
  it("يرفض فئة غير موجودة أو إجابة فارغة", () => {
    const s = startBusRound();
    const bad = { kind: "bus", answers: { "كوكب": "المريخ" } };
    const r = send(s, { type: "player:submitRound", payload: bad }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("invalid_payload");
  });
  it("كل خلية مقبولة +1، والتبديل لا يضاعف", () => {
    let s = startBusRound();
    const payload = { kind: "bus", answers: { "اسم": "أحمد", "بلد": "أسوان" } };
    let r: any = send(s, { type: "player:submitRound", payload }, "p1", "player"); s = r.state;
    r = send(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = send(s, { type: "judge:openReveal" }); s = r.state;
    r = send(s, { type: "judge:judgeBusCell", playerId: "p1", category: "اسم", accepted: true }); s = r.state;
    r = send(s, { type: "judge:judgeBusCell", playerId: "p1", category: "اسم", accepted: true }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(1);
    r = send(s, { type: "judge:judgeBusCell", playerId: "p1", category: "اسم", accepted: false }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(0);
  });
});
