import type { Question } from "@casino/shared";
export const makeQuestion = (over: Partial<Question> = {}): Question => ({
  id: "q1", categorySlug: "general", text: "ما هي عاصمة مصر؟", answer: "القاهرة",
  acceptedAnswers: ["القاهره"], type: "capital", difficulty: "easy", ...over,
});
