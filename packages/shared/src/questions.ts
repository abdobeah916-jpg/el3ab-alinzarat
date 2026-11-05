import { createHash } from "node:crypto";
import { normalizeAnswer } from "./answers";
import type { Question } from "./types";

export function validateQuestion(q: Question): string[] {
  const errors: string[] = [];
  if (!q.text.trim()) errors.push("text empty");
  if (!q.answer.trim()) errors.push("answer empty");
  if (!q.id.trim() || !q.categorySlug.trim()) errors.push("id/category empty");
  if (q.type === "mcq") {
    if (!q.options || q.options.length !== 4) errors.push("mcq needs 4 options");
    if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex > 3) errors.push("correctIndex invalid");
    if (q.options) {
      const normalized = q.options.map((o) => normalizeAnswer(o));
      if (new Set(normalized).size !== normalized.length) errors.push("duplicate options");
    }
  }
  if ((q.type === "flag" || q.type === "city_image") && !q.mediaUrl) errors.push("mediaUrl required");
  if ((q.type === "flag" || q.type === "city_image") && !q.mediaCredit?.trim()) errors.push("mediaCredit required");
  if (q.type === "number_guess" && !/\d/.test(q.answer) && !/\d/.test(q.acceptedAnswers.join(" "))) errors.push("number_guess needs digit");
  return errors;
}

export function hashQuestion(q: Pick<Question, "text" | "categorySlug">): string {
  return createHash("sha256").update(`${normalizeAnswer(q.text)}|${q.categorySlug}`).digest("hex");
}
