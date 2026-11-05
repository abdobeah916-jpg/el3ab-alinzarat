import { hashQuestion, validateQuestion } from "@casino/shared";
import type { Question } from "@casino/shared";

export function validateBank(items: Question[]): { errors: { id: string; messages: string[] }[]; duplicates: string[] } {
  const errors: { id: string; messages: string[] }[] = [];
  const seen = new Map<string, number>();
  for (const q of items) {
    const messages = validateQuestion(q);
    if (messages.length) errors.push({ id: q.id, messages });
    const h = hashQuestion(q);
    seen.set(h, (seen.get(h) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, n]) => n > 1).map(([h]) => h);
  return { errors, duplicates };
}
