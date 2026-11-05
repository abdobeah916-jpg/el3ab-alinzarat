import { describe, expect, it } from "vitest";
import { hashQuestion, validateQuestion } from "../src/questions";

const base = { id: "q1", categorySlug: "geography", text: "ما هي عاصمة مصر؟", answer: "القاهرة", acceptedAnswers: [], type: "capital" as const, difficulty: "easy" as const };

describe("validateQuestion", () => {
  it("يقبل سؤالًا سليمًا", () => {
    expect(validateQuestion(base)).toEqual([]);
  });
  it("يرفض النص الفارغ", () => {
    expect(validateQuestion({ ...base, text: " " })).toContain("text empty");
  });
  it("يرفض العلم بلا credit", () => {
    expect(validateQuestion({ ...base, type: "flag", mediaUrl: "/media/eg.svg" as const })).toContain("mediaCredit required");
  });
  it("hash مستقر ويفصل التطبيع", () => {
    expect(hashQuestion(base)).toBe(hashQuestion({ text: "ما هي عاصمه مصر؟", categorySlug: "geography" }));
  });
});
