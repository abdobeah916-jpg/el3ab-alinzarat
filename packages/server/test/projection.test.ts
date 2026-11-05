import { describe, expect, it } from "vitest";
import { toJudgeView, toPlayerEvent, toPlayerView } from "../src/projection";
import { createInitialState } from "@casino/game-core";

function activeQuestionState(over: any = {}): any {
  const s: any = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أحمد" }, { id: "p2", name: "سارة" }] });
  s.state = "question_active";
  s.settings = { ...s.settings, showQuestionToPlayers: over.showQuestionToPlayers ?? false };
  s.currentQuestion = { id: "q1", categorySlug: "geography", text: "ما هي عاصمة مصر؟", answer: "القاهرة", acceptedAnswers: [], type: "capital", difficulty: "easy" };
  return s;
}
describe("DTO projection", () => {
  it("الحكم يرى الإجابة والتصنيف", () => {
    const view = toJudgeView(activeQuestionState());
    expect(view.question?.answer).toBe("القاهرة");
    expect(view.question?.categorySlug).toBe("geography");
  });
  it("اللاعب لا يرى الإجابة ولا الخيارات الصحيحة حتى مع إظهار السؤال", () => {
    const state = activeQuestionState({ showQuestionToPlayers: true });
    const view = toPlayerView(state, "p1");
    expect(view.question?.text).toBe("ما هي عاصمة مصر؟");
    expect(JSON.stringify(view)).not.toContain("القاهرة");
    expect((view.question as any).answer).toBeUndefined();
    expect((view.question as any).correctIndex).toBeUndefined();
  });
  it("اللاعب لا يرى نص السؤال لو الإعداد مغلق", () => {
    const view = toPlayerView(activeQuestionState({ showQuestionToPlayers: false }), "p1");
    expect(view.question).toBeNull();
  });
  it("اللاعب لا يرى إجابات الآخرين قبل الكشف", () => {
    const state = activeQuestionState();
    state.state = "simultaneous_active";
    state.submissions = [
      { playerId: "p1", payload: { kind: "rumble", answer: "القاهرة" } },
      { playerId: "p2", payload: { kind: "rumble", answer: "أسوان" } },
    ];
    const view = toPlayerView(state, "p1");
    expect(view.submissions).toEqual([{ playerId: "p1", payload: { kind: "rumble", answer: "القاهرة" } }]);
  });
  it("اللاعب يرى إجابات الجميع بعد الكشف", () => {
    const state = activeQuestionState();
    state.state = "reveal";
    state.submissions = [
      { playerId: "p1", payload: { kind: "rumble", answer: "القاهرة" } },
      { playerId: "p2", payload: { kind: "rumble", answer: "أسوان" } },
    ];
    const view = toPlayerView(state, "p1");
    expect(view.submissions.map((s: any) => s.playerId)).toEqual(["p1", "p2"]);
  });
  it("حدث question_selected لا يسرّب الإجابة للاعب", () => {
    const event = { id: "e1", roomCode: "A", seq: 1, at: 1, type: "question_selected", payload: { question: { text: "عاصمة مصر؟", answer: "القاهرة" } } } as any;
    expect(JSON.stringify(toPlayerEvent(event))).not.toContain("القاهرة");
  });
});
