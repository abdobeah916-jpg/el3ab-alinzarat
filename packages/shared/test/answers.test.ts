import { describe, expect, it } from "vitest";
import { answersMatch, groupDuplicates, normalizeAnswer } from "../src/answers";

describe("normalizeAnswer", () => {
  it("يوحّد الهمزات والتاء المربوطة والياء والتشكيل", () => {
    expect(normalizeAnswer("أَحْمَد")).toBe(normalizeAnswer("احمد"));
    expect(normalizeAnswer("مدرسة")).toBe(normalizeAnswer("مدرسه"));
    expect(normalizeAnswer("مصطفى")).toBe(normalizeAnswer("مصطفي"));
  });
  it("يشيل ال التعريف والمسافات الزائدة", () => {
    expect(normalizeAnswer("  القاهرة ")).toBe(normalizeAnswer("قاهره"));
    expect(normalizeAnswer("أبو ظبي")).toBe(normalizeAnswer("ابوظبي"));
  });
  it("يطابق الإجابات البديلة", () => {
    expect(answersMatch("الاردن", "الأردن")).toBe(true);
    expect(answersMatch("عمّان", "عمان", ["عمان"])).toBe(true);
    expect(answersMatch("بيروت", "عمان")).toBe(false);
  });
});

describe("groupDuplicates", () => {
  it("يجمع الإجابات المتطابقة بعد التطبيع", () => {
    const groups = groupDuplicates([
      { playerId: "p1", answer: "القاهرة" },
      { playerId: "p2", answer: "قاهره" },
      { playerId: "p3", answer: "اسكندرية" },
    ]);
    expect(groups.get(normalizeAnswer("القاهرة"))).toEqual(["p1", "p2"]);
    expect(groups.size).toBe(2);
  });
});
