import { describe, expect, it } from "vitest";
import { loadSeed } from "../src/seed";
import { validateBank } from "../src/validateBank";
describe("بنك الأسئلة", () => {
  const { questions } = loadSeed();
  it("٤٠٠ سؤال على الأقل وكل التصنيفات ممثلة", () => {
    expect(questions.length).toBeGreaterThanOrEqual(400);
    const cats = new Set(questions.map((q) => q.categorySlug));
    expect(cats.size).toBe(11);
  });
  it("لا أخطاء ولا تكرار", () => {
    const result = validateBank(questions);
    expect(result.errors).toEqual([]);
    expect(result.duplicates).toEqual([]);
  });
  it("كل نوع سؤال له ١٠ أمثلة على الأقل", () => {
    const counts = new Map<string, number>();
    for (const q of questions) counts.set(q.type, (counts.get(q.type) ?? 0) + 1);
    for (const type of ["open","mcq","true_false","capital","quote","proverb","actor","reversed","reversed_song","description","song","singer_song","movie_line","movie_scene","number_guess","flag","city_image"]) {
      expect(counts.get(type) ?? 0).toBeGreaterThanOrEqual(10);
    }
  });
  it("كل سؤال صورة له credit وملف محلي", () => {
    for (const q of questions.filter((x) => x.mediaUrl)) {
      expect(q.mediaCredit?.trim().length).toBeGreaterThan(10);
      expect(q.mediaUrl).toMatch(/^\/media\//);
    }
  });
});
