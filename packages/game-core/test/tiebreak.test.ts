import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState } from "../src";
import { computeWinner } from "../src/tiebreak";

const judge = (state: any, command: any) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId: "judge", role: "judge", expectedState: state.state, command }, { at: 1, seq: state.seq + 1 });

describe("نهاية اللعبة والتعادل", () => {
  it("يكتشف التعادل بين الأعلى نقاطًا", () => {
    const s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    s.players[0].score = 5; s.players[1].score = 5;
    expect(computeWinner(s)).toEqual({ winnerId: null, tied: ["p1", "p2"] });
  });

  it("ينهي اللعبة بفايز واحد", () => {
    let s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    s.players[0].score = 5; s.players[1].score = 2; s.state = "result";
    const r: any = judge(s, { type: "judge:endGame" });
    expect(r.state.state).toBe("finished");
    expect(r.state.round.winnerId).toBe("p1");
  });

  it("يفتح سؤالًا فاصلًا ويحسمه", () => {
    let s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    s.state = "finished"; s.round.winnerId = null;
    let r: any = judge(s, { type: "judge:startTieBreaker" }); s = r.state;
    expect(s.state).toBe("tie_breaker");
    expect(s.round.tieBreaker).toBe(true);
  });

  it("يزيد رقم الجولة مع كل nextQuestion", () => {
    let s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }] });
    s.state = "result";
    const r: any = judge(s, { type: "judge:nextQuestion" });
    expect(r.state.state).toBe("next_question");
    expect(r.state.round.index).toBe(1);
  });
});
