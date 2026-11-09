import { describe, expect, it } from "vitest";
import {
  adjustScore,
  addLocalPlayer,
  buzz,
  createLocalState,
  drawQuestion,
  judgeAnswer,
  nextQuestion,
  playCard,
  setCategory,
  startLocalGame,
  winnerOf,
} from "../src/local/engine";
import { pickQuestion, LOCAL_QUESTIONS } from "../src/local/questions";

describe("وضع الجهاز الواحد", () => {
  it("يبدأ اللعبة بأسماء منظّفة وبحد أقصى ٣ لاعبين", () => {
    const table = startLocalGame(createLocalState(), ["  أحمد  ", "سارة", "محمود", "زيادة"]);
    expect(table.phase).toBe("playing");
    expect(table.players.map((p) => p.name)).toEqual(["أحمد", "سارة", "محمود"]);
    expect(table.players.every((p) => p.score === 0 && p.cards.length === 0)).toBe(true);
  });

  it("يسحب سؤالاً من التصنيف المختار", () => {
    const table = setCategory(createLocalState(), "sport");
    const next = drawQuestion(table);
    expect(next.question).not.toBeNull();
    expect(next.question?.categorySlug).toBe("sport");
    expect(next.usedIds).toContain(next.question!.id);
  });

  it("يسجّل الجرس والإجابة الصح مرة واحدة فقط", () => {
    const base = startLocalGame(createLocalState(), ["أحمد", "سارة"]);
    const drawn = drawQuestion(base);
    const player = drawn.players[0]!;

    const firstBuzz = buzz(drawn, player.id);
    expect(firstBuzz.answer).toBe("buzzed");
    expect(firstBuzz.buzzedId).toBe(player.id);

    // ضغطة تانية من لاعب مختلف مرفوضة لأن الجرس محجوز
    const secondBuzz = buzz(firstBuzz, drawn.players[1]!.id);
    expect(secondBuzz.buzzedId).toBe(player.id);

    const correct = judgeAnswer(firstBuzz, true);
    expect(correct.answer).toBe("correct");
    expect(correct.players[0]!.score).toBe(1);

    // لا يمكن الحكم مرتين على نفس الضغطة
    const again = judgeAnswer(correct, true);
    expect(again.players[0]!.score).toBe(1);
  });

  it("يخصم الكروت ويحترم إعداد النقط السالبة", () => {
    const base = startLocalGame(createLocalState(), ["أحمد"]);
    const player = base.players[0]!;

    const yellow = playCard(base, player.id, "yellow");
    expect(yellow.players[0]!.score).toBe(-1);
    expect(yellow.players[0]!.cards).toEqual(["yellow"]);

    const red = playCard(yellow, player.id, "red");
    expect(red.players[0]!.score).toBe(-4);

    const noNegative = startLocalGame(createLocalState(), ["أحمد"], { allowNegative: false });
    const clamped = playCard(noNegative, noNegative.players[0]!.id, "red");
    expect(clamped.players[0]!.score).toBe(0);
  });

  it("يعدل النقط يدوياً وينتقل للسؤال التالي", () => {
    const base = startLocalGame(createLocalState(), ["أحمد", "سارة"]);
    const player = base.players[0]!;

    const adjusted = adjustScore(base, player.id, 5);
    expect(adjusted.players[0]!.score).toBe(5);

    const next = nextQuestion(adjusted);
    expect(next.roundIndex).toBe(2);
    expect(next.question).toBeNull();
    expect(next.answer).toBe("idle");
  });

  it("يحسم الفايز والتعادل", () => {
    const base = startLocalGame(createLocalState(), ["أحمد", "سارة"]);
    expect(winnerOf(base.players)).toEqual({ winnerId: null, tied: base.players.map((p) => p.id) });

    const won = adjustScore(base, base.players[0]!.id, 3);
    expect(winnerOf(won.players).winnerId).toBe(base.players[0]!.id);
  });

  it("يضيف لاعب من داخل الطاولة ويحترم الحد الأقصى", () => {
    const base = startLocalGame(createLocalState(), ["أحمد", "سارة"]);
    const added = addLocalPlayer(base, "  محمود ");
    expect(added.players.map((p) => p.name)).toEqual(["أحمد", "سارة", "محمود"]);

    const dup = addLocalPlayer(added, "محمود");
    expect(dup.players).toHaveLength(3);

    const full = addLocalPlayer(added, "رابع");
    expect(full.players).toHaveLength(3);
  });

  it("يعيد تدوير التصنيف لو كل أسئلته اتلعبت", () => {
    const sports = LOCAL_QUESTIONS.filter((q) => q.categorySlug === "sport").map((q) => q.id);
    const picked = pickQuestion("sport", sports, () => 0);
    expect(picked).not.toBeNull();
    expect(picked?.categorySlug).toBe("sport");
  });
});
